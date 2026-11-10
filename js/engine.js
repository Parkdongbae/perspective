// 투시도 게임 엔진: 드래그로 선 잇기, 눌러서 지우기, 면 완성, 클리어 후 안내선 조작
import { dist, distSeg, lerp, sub, add, mul, clamp, bbox } from './geom.js';
import { sfx } from './sfx.js';

export const W = 1600, H = 900;
const COL = {
  ink: '#1e2a4a', red: '#e03131', guide: '#f08c00', vp: '#3157d5',
  paper: '#fdfcf8', grid: '#eceef4', hz: '#8492b8', aux: '#9aa3b8',
};
const FONT = '"Noto Sans KR","Malgun Gothic",sans-serif';

export class Game {
  constructor(canvas, model, cb = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.m = model;
    this.cb = cb;
    this.follow = !!model.steps;
    this.st = {};            // 항목 상태: 0 없음, 1 그림, 2 잘라냄
    this.fdone = new Map();  // 완성된 면 → 완성 시각
    this.cur = 0;            // 따라하기 단계
    this.cleared = false;
    this.free = false;       // 클리어 후 자유 조작
    this.score = 0; this.combo = 0; this.mistakes = 0; this.hints = 0;
    this.floats = []; this.conf = []; this.trimAt = {};
    this.drag = null; this.hdrag = null; this.hintFx = null; this.shake = 0;
    this.pv = null; this.pvDirty = true;
    this.rebuild(true);
    this._on = {
      down: (e) => this._down(e), move: (e) => this._move(e), up: (e) => this._up(e),
    };
    canvas.addEventListener('pointerdown', this._on.down);
    canvas.addEventListener('pointermove', this._on.move);
    canvas.addEventListener('pointerup', this._on.up);
    canvas.addEventListener('pointercancel', this._on.up);
    this._loop = (t) => { this._frame(t); this._raf = requestAnimationFrame(this._loop); };
    this._raf = requestAnimationFrame(this._loop);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    const c = this.cv;
    c.removeEventListener('pointerdown', this._on.down);
    c.removeEventListener('pointermove', this._on.move);
    c.removeEventListener('pointerup', this._on.up);
    c.removeEventListener('pointercancel', this._on.up);
  }

  rebuild(first) {
    this.pt = this.m.compute();
    if (first || this.m.dynamic) {
      const S = this.m.struct();
      S.rays.forEach((r) => (r.t = 'r'));
      S.edges.forEach((e) => (e.t = 'e'));
      this.S = S;
      this.items = [...S.rays, ...S.edges];
      this.base = new Set();
      S.given.forEach((g) => { this.base.add(g[0]); this.base.add(g[1]); });
      this.handles = this.m.handles ? this.m.handles(S) : [];
    }
    this.pvDirty = true;
  }

  // ---------- 상태 판정 ----------
  state(id) { return this.st[id] || 0; }
  done(it) {
    if (this.cleared) return true;
    const s = this.state(it.id);
    return it.t === 'r' && it.cut ? s === 2 : s >= 1;
  }
  stepOk(it) { return !this.follow || (it.step || 0) === this.cur; }
  shown(o) { return !this.follow || (o.step || o[2] || 0) <= this.cur; }
  exists(n) {
    if (this.follow) return true;
    const need = this.S.ptNeeds && this.S.ptNeeds[n];
    if (need) return need.every((id) => this.state(id) >= 1);
    if (this.base.has(n)) return true;
    return this.S.rays.some((r) => r.to === n && this.state(r.id) === 2);
  }
  avail(it) {
    if (this.cleared || !this.stepOk(it) || this.state(it.id) > 0) return false;
    return it.t === 'r' ? this.exists(it.from) : this.exists(it.a) && this.exists(it.b);
  }
  canTrim(r) {
    if (this.cleared || !r.cut || this.state(r.id) !== 1 || !this.stepOk(r)) return false;
    return r.cut.g ? true : this.state(r.cut.r) >= 1;
  }
  starts() {
    const out = [];
    for (const it of this.items) {
      if (!this.avail(it)) continue;
      if (it.t === 'r') out.push({ n: it.from, tg: it.vp, it });
      else { out.push({ n: it.a, tg: it.b, it }); out.push({ n: it.b, tg: it.a, it }); }
    }
    return out;
  }
  counts() {
    const R = this.S.rays, E = this.S.edges, F = this.S.faces.filter((f) => !f.front);
    const cutR = R.filter((r) => r.cut);
    return {
      rays: [R.filter((r) => this.state(r.id) >= 1).length, R.length],
      trims: [cutR.filter((r) => this.state(r.id) === 2).length, cutR.length],
      edges: [E.filter((e) => this.state(e.id) >= 1).length, E.length],
      faces: [F.filter((f) => this.fdone.has(f.id)).length, F.length],
    };
  }
  result() {
    const err = this.mistakes + this.hints;
    return { score: this.score, stars: err <= 1 ? 3 : err <= 4 ? 2 : 1, mistakes: this.mistakes, hints: this.hints };
  }

  // ---------- 입력 ----------
  toW(e) {
    const r = this.cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  guideSeg(g) {
    const a = this.pt[g.a], b = this.pt[g.b];
    const l = dist(a, b) || 1;
    const u = mul(sub(b, a), 1 / l);
    const s = sub(a, mul(u, g.e0 ?? 40));
    const e = g.len != null ? add(a, mul(u, g.len)) : add(b, mul(u, g.e1 ?? 40));
    return [s, e];
  }
  hDist(h, p) {
    if (h.kind === 'vp') return dist(p, this.pt[h.name]) - 12;
    const g = this.S.guides.find((x) => x.id === h.gid);
    if (!g) return 1e9;
    const [a, b] = this.guideSeg(g);
    return distSeg(p, a, b);
  }
  _down(e) {
    e.preventDefault();
    try { this.cv.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    const p = this.toW(e);
    this.touch = e.pointerType !== 'mouse';
    if (this.cleared) {
      if (!this.free) return;
      let best = null, bd = this.touch ? 52 : 36;
      for (const h of this.handles) { const d = this.hDist(h, p); if (d < bd) { bd = d; best = h; } }
      if (best) { this.hdrag = best; this.moved = true; best.drag(p); this.rebuild(); }
      return;
    }
    let best = null, bd = this.touch ? 48 : 34;
    const st = this.starts();
    for (const s of st) { const d = dist(p, this.pt[s.n]); if (d < bd) { bd = d; best = s; } }
    if (best) {
      const o = this.pt[best.n];
      this.drag = { o, p, cands: st.filter((s) => dist(this.pt[s.n], o) < 8), snap: null };
      this.hintFx = null;
      return;
    }
    const tol = this.touch ? 28 : 17;
    for (const r of this.S.rays) {
      if (this.state(r.id) !== 1 || !r.cut || !this.stepOk(r)) continue;
      if (distSeg(p, this.pt[r.to], this.pt[r.vp]) < tol) {
        if (this.canTrim(r)) this.trim(r);
        else this.say('만나는 선을 먼저 그려야 지울 수 있어요');
        return;
      }
    }
    for (const r of this.S.rays) {
      if (this.state(r.id) === 1 && r.cut && distSeg(p, this.pt[r.from], this.pt[r.to]) < tol) {
        this.say('점선을 지나 소점까지 가는 부분을 눌러서 지워요');
        return;
      }
    }
  }
  _move(e) {
    const p = this.toW(e);
    if (this.hdrag) { this.hdrag.drag(p); this.rebuild(); return; }
    if (!this.drag) return;
    this.drag.p = p;
    const R = this.touch ? 58 : 44;
    let best = null, bd = R;
    for (const c of this.drag.cands) { const d = dist(p, this.pt[c.tg]); if (d < bd) { bd = d; best = c; } }
    this.drag.snap = best;
  }
  _up() {
    if (this.hdrag) { this.hdrag = null; return; }
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    if (d.snap) this.apply(d.snap.it);
    else if (dist(d.o, d.p) > 60) {
      const toVp = d.cands.some((c) => c.it.t === 'r');
      this.mistake(toVp ? '소점까지 끝까지 이어 주세요' : '점에서 점까지 정확히 이어 주세요');
    }
  }

  // ---------- 동작 ----------
  say(text, kind = 'info') { this.cb.onMsg && this.cb.onMsg(text, kind); }
  mistake(text) {
    this.combo = 0; this.mistakes++; this.shake = performance.now();
    sfx('miss'); this.say(text, 'warn'); this.cb.onChange && this.cb.onChange();
  }
  gain(base, p) {
    this.combo++;
    const v = Math.round(base * (1 + Math.min(this.combo - 1, 10) * 0.1));
    this.score += v;
    this.floats.push({ p, text: '+' + v, t0: performance.now(), col: COL.red, size: 30 });
  }
  bonus(v, p, label) {
    this.score += v;
    this.floats.push({ p, text: `${label} +${v}`, t0: performance.now(), col: '#2b8a3e', size: 38 });
  }
  apply(it) {
    this.st[it.id] = 1;
    const a = this.pt[it.t === 'r' ? it.from : it.a], b = this.pt[it.t === 'r' ? it.vp : it.b];
    this.gain(10, lerp(a, b, it.t === 'r' ? 0.2 : 0.5));
    sfx('draw');
    this.after();
  }
  trim(r) {
    this.st[r.id] = 2;
    this.trimAt[r.id] = performance.now();
    const m = lerp(this.pt[r.to], this.pt[r.vp], 0.3);
    this.gain(20, m);
    sfx('snip');
    this.hintFx = null;
    this.after();
  }
  faceReady(f) {
    if (this.follow) return f.after < this.cur;
    return f.needs.every((id) => { const it = this.items.find((i) => i.id === id); return it && this.done(it); });
  }
  centroid(names) {
    let x = 0, y = 0;
    names.forEach((n) => { x += this.pt[n].x; y += this.pt[n].y; });
    return { x: x / names.length, y: y / names.length };
  }
  after() {
    const now = performance.now();
    if (this.follow) {
      const n = this.m.steps.length;
      while (this.cur < n && this.items.filter((i) => (i.step || 0) === this.cur).every((i) => this.done(i))) {
        this.cur++;
        if (this.cur < n) { sfx('step'); this.cb.onStep && this.cb.onStep(this.cur); }
      }
    }
    for (const f of this.S.faces) {
      if (f.front || this.fdone.has(f.id) || !this.faceReady(f)) continue;
      this.fdone.set(f.id, now);
      this.bonus(50, this.centroid(f.pts), '면 완성');
      sfx('face');
    }
    if (!this.cleared && this.items.every((i) => this.done(i))) {
      this.bonus(200, { x: W / 2, y: H / 2 - 60 }, '클리어');
      this.cleared = true;
      this.free = this.handles.length > 0;
      this.hintFx = null;
      for (let i = 0; i < 140; i++) {
        this.conf.push({
          x: W / 2 + (Math.random() - 0.5) * 500, y: H / 2 - 120,
          vx: (Math.random() - 0.5) * 900, vy: -300 - Math.random() * 700,
          r: 6 + Math.random() * 8, a: Math.random() * 6, col: ['#e03131', '#f08c00', '#3157d5', '#2f9e44', '#ae3ec9'][i % 5], t0: now,
        });
      }
      setTimeout(() => sfx('clear'), 250);
      this.cb.onClear && this.cb.onClear(this.result());
    }
    this.pvDirty = true;
    this.cb.onChange && this.cb.onChange();
  }
  hint() {
    if (this.cleared) return;
    let h = null;
    const it = this.items.find((i) => this.avail(i));
    const r = this.S.rays.find((x) => this.canTrim(x));
    if (r) h = { k: 'trim', a: r.to, b: r.vp };
    else if (it) h = { k: 'line', a: it.t === 'r' ? it.from : it.a, b: it.t === 'r' ? it.vp : it.b };
    if (!h) return;
    this.hints++;
    h.t0 = performance.now();
    this.hintFx = h;
    this.say(h.k === 'trim' ? '반짝이는 부분을 눌러서 지워요' : '움직이는 점을 따라 드래그해요');
  }
  // 검증용: 가능한 동작을 n번 자동 수행
  autoSolve(n = 1e9) {
    while (n-- > 0 && !this.cleared) {
      const r = this.S.rays.find((x) => this.canTrim(x));
      if (r) { this.trim(r); continue; }
      const it = this.items.find((i) => this.avail(i));
      if (!it) break;
      this.apply(it);
    }
  }

  // ---------- 그리기 ----------
  line(c, a, b) { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  poly(c, names) {
    c.beginPath();
    names.forEach((n, i) => { const p = this.pt[n]; i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); });
    c.closePath();
  }
  // 완성된 모습
  paintFinal(c, lw) {
    const S = this.S;
    c.lineJoin = 'round'; c.lineCap = 'round';
    for (const f of S.faces) {
      this.poly(c, f.pts);
      c.fillStyle = f.color; c.fill();
      if (this.m.painter) { c.strokeStyle = COL.red; c.lineWidth = lw; c.stroke(); }
    }
    if (!this.m.painter) {
      c.lineWidth = lw * 1.1; c.strokeStyle = COL.ink;
      S.given.forEach((g) => this.line(c, this.pt[g[0]], this.pt[g[1]]));
      c.lineWidth = lw; c.strokeStyle = COL.red;
      S.rays.forEach((r) => { if (!r.aux) this.line(c, this.pt[r.from], this.pt[r.to]); });
      S.edges.forEach((e) => { if (!e.aux) this.line(c, this.pt[e.a], this.pt[e.b]); });
    }
    if (this.m.decor) this.m.decor(c, this.pt);
  }
  drawPreview() {
    const cv = this.pv;
    if (!cv) return;
    const c = cv.getContext('2d');
    const names = new Set();
    const S = this.S;
    S.faces.forEach((f) => f.pts.forEach((n) => names.add(n)));
    S.given.forEach((g) => { names.add(g[0]); names.add(g[1]); });
    S.rays.forEach((r) => { names.add(r.from); if (r.cut) names.add(r.to); });
    S.edges.forEach((e) => { names.add(e.a); names.add(e.b); });
    let bb = bbox([...names].map((n) => this.pt[n]).filter((p) => p && p.x > -50 && p.x < W + 50 && p.y > -50 && p.y < H + 50));
    let pad = 30;
    if (this.m.decor) { bb = { x0: 0, y0: 0, x1: W, y1: H }; pad = 0; } // 꾸며진 장면은 전체를 보여 준다
    const bw = bb.x1 - bb.x0 + pad * 2, bh = bb.y1 - bb.y0 + pad * 2;
    const s = Math.min(cv.width / bw, cv.height / bh);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
    c.setTransform(s, 0, 0, s, (cv.width - bw * s) / 2 - (bb.x0 - pad) * s, (cv.height - bh * s) / 2 - (bb.y0 - pad) * s);
    this.paintFinal(c, 3.2 / s);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  _frame(now) {
    const cv = this.cv, c = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(cv.clientWidth * dpr), ch = Math.round(cv.clientHeight * dpr);
    if (!cw || !ch) return;
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const k = cw / W;
    let sx = 0;
    if (this.shake && now - this.shake < 260) sx = Math.sin((now - this.shake) / 18) * 6 * (1 - (now - this.shake) / 260);
    c.setTransform(k, 0, 0, k, sx * k, 0);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const pt = this.pt, S = this.S;

    // 종이와 모눈
    c.fillStyle = COL.paper; c.fillRect(-20, 0, W + 40, H);
    c.strokeStyle = COL.grid; c.lineWidth = 1;
    c.beginPath();
    for (let x = 50; x < W; x += 50) { c.moveTo(x, 0); c.lineTo(x, H); }
    for (let y = 50; y < H; y += 50) { c.moveTo(0, y); c.lineTo(W, y); }
    c.stroke();

    // 눈높이(지평선)
    const hy = this.m.hy ? this.m.hy() : null;
    if (hy != null) {
      c.strokeStyle = COL.hz; c.lineWidth = 2; c.setLineDash([]);
      this.line(c, { x: 0, y: hy }, { x: W, y: hy });
      c.fillStyle = COL.hz; c.font = `600 20px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.fillText('눈높이 (지평선)', 14, hy - 6);
    }

    if (this.free && this.m.painter) {
      // 자유 조작: 소점으로 모이는 보조선 + 완성 모습
      c.strokeStyle = 'rgba(49,87,213,.22)'; c.lineWidth = 1.5;
      S.rays.forEach((r) => this.line(c, pt[r.to], pt[r.vp]));
      this.paintFinal(c, 4.5);
      this.drawGuides(c, now, true);
    } else {
      // 면
      for (const f of S.faces) {
        const t0 = this.fdone.get(f.id);
        if (!f.front && t0 == null) continue;
        this.poly(c, f.pts);
        c.globalAlpha = f.front ? 1 : clamp((now - t0) / 350, 0, 1);
        c.fillStyle = f.color; c.fill();
        c.globalAlpha = 1;
      }
      this.drawGuides(c, now, false);
      // 주어진 도형
      c.strokeStyle = COL.ink; c.lineWidth = 5; c.setLineDash([]);
      S.given.forEach((g) => { if (this.shown(g)) this.line(c, pt[g[0]], pt[g[1]]); });
      // 학생이 그린 선
      for (const r of S.rays) {
        const s = this.state(r.id);
        if (!s) continue;
        const a = pt[r.from], q = pt[r.to], v = pt[r.vp];
        const old = this.follow && r.aux && (r.step || 0) < this.cur;
        c.strokeStyle = old ? COL.aux : COL.red; c.lineWidth = old ? 2 : 4.5; c.setLineDash(old ? [6, 8] : []);
        if (!r.cut) { this.line(c, a, v); continue; }
        this.line(c, a, q);
        if (s === 1) {
          const ok = this.canTrim(r);
          c.globalAlpha = ok ? 0.45 + 0.2 * Math.sin(now / 220) : 0.5;
          this.line(c, q, v);
          c.globalAlpha = 1;
          if (ok) this.scissor(c, lerp(q, v, clamp(70 / (dist(q, v) || 1), 0.1, 0.5)), now);
        } else {
          const e = clamp((now - (this.trimAt[r.id] || 0)) / 320, 0, 1);
          if (e < 1) { c.globalAlpha = 0.5 * (1 - e); this.line(c, q, lerp(v, q, e)); c.globalAlpha = 1; }
        }
      }
      for (const e of S.edges) {
        if (!this.state(e.id)) continue;
        const old = this.follow && e.aux && (e.step || 0) < this.cur;
        c.strokeStyle = old ? COL.aux : COL.red; c.lineWidth = old ? 2 : 4.5; c.setLineDash(old ? [6, 8] : []);
        this.line(c, pt[e.a], pt[e.b]);
      }
      c.setLineDash([]);
      // 완성 후에만 나타나는 장식 (태양, 빛나는 선 등)
      if (this.cleared && this.m.decor) {
        c.save();
        c.globalAlpha = clamp((now - (this.clearAt || (this.clearAt = now))) / 900, 0, 1);
        this.m.decor(c, pt);
        c.restore();
      }
    }

    // 소점
    const vps = this.m.vps;
    for (const n in vps) {
      const p = pt[n];
      const isH = this.free && this.handles.some((h) => h.kind === 'vp' && h.name === n);
      if (isH) {
        const r = 22 + 4 * Math.sin(now / 250);
        c.strokeStyle = 'rgba(49,87,213,.45)'; c.lineWidth = 3; c.setLineDash([5, 6]);
        c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.stroke(); c.setLineDash([]);
      }
      c.fillStyle = COL.vp; c.strokeStyle = '#fff'; c.lineWidth = 3;
      c.beginPath(); c.arc(p.x, p.y, 10, 0, 7); c.fill(); c.stroke();
      c.font = `700 22px ${FONT}`; c.textAlign = 'center';
      c.textBaseline = p.y > H - 60 ? 'bottom' : 'top';
      c.lineWidth = 5; c.strokeStyle = 'rgba(253,252,248,.9)';
      const ty = p.y > H - 60 ? p.y - 16 : p.y + 16;
      const tx = clamp(p.x, 50, W - 50);
      c.strokeText(vps[n], tx, ty); c.fillText(vps[n], tx, ty);
    }

    if (!this.cleared) {
      // 시작할 수 있는 점
      const seen = [];
      const pulse = (now % 1200) / 1200;
      for (const s of this.starts()) {
        const p = pt[s.n];
        if (seen.some((q) => dist(q, p) < 4)) continue;
        seen.push(p);
        c.strokeStyle = `rgba(224,49,49,${0.55 * (1 - pulse)})`; c.lineWidth = 3;
        c.beginPath(); c.arc(p.x, p.y, 9 + pulse * 16, 0, 7); c.stroke();
        c.fillStyle = '#fff'; c.strokeStyle = COL.red; c.lineWidth = 3.5;
        c.beginPath(); c.arc(p.x, p.y, 8, 0, 7); c.fill(); c.stroke();
      }
      // 따라하기: 이번 단계의 도착점
      if (this.follow) {
        for (const s of this.starts()) {
          if (s.it.t !== 'e') continue;
          const p = pt[s.tg];
          c.fillStyle = '#fff'; c.strokeStyle = COL.red; c.lineWidth = 3.5;
          c.beginPath(); c.arc(p.x, p.y, 8, 0, 7); c.fill(); c.stroke();
        }
      }
      // 드래그 중인 선
      const d = this.drag;
      if (d) {
        const end = d.snap ? pt[d.snap.tg] : d.p;
        c.strokeStyle = COL.red; c.lineWidth = 4; c.globalAlpha = d.snap ? 1 : 0.7;
        this.line(c, d.o, end); c.globalAlpha = 1;
        for (const cd of d.cands) {
          const tp = pt[cd.tg];
          c.strokeStyle = d.snap === cd ? '#2f9e44' : 'rgba(47,158,68,.45)'; c.lineWidth = d.snap === cd ? 5 : 3;
          c.beginPath(); c.arc(tp.x, tp.y, d.snap === cd ? 26 : 20, 0, 7); c.stroke();
        }
      }
      // 힌트
      const h = this.hintFx;
      if (h) {
        const age = now - h.t0;
        if (age > 6000) this.hintFx = null;
        else {
          const a = pt[h.a], b = pt[h.b];
          if (h.k === 'line') {
            c.strokeStyle = 'rgba(47,158,68,.6)'; c.lineWidth = 3; c.setLineDash([10, 10]);
            this.line(c, a, b); c.setLineDash([]);
            const m = lerp(a, b, (age % 1400) / 1400);
            c.fillStyle = '#2f9e44'; c.beginPath(); c.arc(m.x, m.y, 12, 0, 7); c.fill();
          } else {
            c.strokeStyle = `rgba(47,158,68,${0.5 + 0.4 * Math.sin(age / 150)})`; c.lineWidth = 12;
            this.line(c, a, b);
          }
        }
      }
    }

    // 점수 글자
    this.floats = this.floats.filter((f) => now - f.t0 < 1100);
    for (const f of this.floats) {
      const e = (now - f.t0) / 1100;
      c.globalAlpha = 1 - e * e;
      c.font = `800 ${f.size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const x = clamp(f.p.x, 90, W - 90), y = clamp(f.p.y, 60, H - 30) - 20 - e * 60;
      c.lineWidth = 6; c.strokeStyle = '#fff'; c.strokeText(f.text, x, y);
      c.fillStyle = f.col; c.fillText(f.text, x, y);
      c.globalAlpha = 1;
    }
    // 색종이
    this.conf = this.conf.filter((p) => now - p.t0 < 2600);
    for (const p of this.conf) {
      const t = (now - p.t0) / 1000;
      const x = p.x + p.vx * t, y = p.y + p.vy * t + 700 * t * t;
      c.save(); c.translate(x, y); c.rotate(p.a + t * 6);
      c.globalAlpha = clamp(2.6 - t, 0, 1);
      c.fillStyle = p.col; c.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      c.restore();
    }
    c.globalAlpha = 1;

    if (this.pvDirty && this.pv) { this.pvDirty = false; this.drawPreview(); }
  }

  drawGuides(c, now, free) {
    if (this.follow && this.cleared) return; // 완성된 그림에서는 안내선을 치운다
    for (const g of this.S.guides) {
      if (!this.shown(g)) continue;
      const [a, b] = this.guideSeg(g);
      c.strokeStyle = COL.guide; c.lineWidth = free ? 4 : 3; c.setLineDash([13, 10]);
      this.line(c, a, b);
      c.setLineDash([]);
      if (free && this.handles.some((h) => h.gid === g.id)) {
        const m = lerp(a, b, 0.5);
        const r = 13 + 2.5 * Math.sin(now / 250);
        c.fillStyle = '#fff'; c.strokeStyle = COL.guide; c.lineWidth = 4;
        c.beginPath(); c.arc(m.x, m.y, r, 0, 7); c.fill(); c.stroke();
        c.fillStyle = COL.guide; c.beginPath(); c.arc(m.x, m.y, 5, 0, 7); c.fill();
      }
    }
  }
  scissor(c, p, now) {
    const r = 17 + 2 * Math.sin(now / 200);
    c.fillStyle = '#fff'; c.strokeStyle = COL.red; c.lineWidth = 3;
    c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.fill(); c.stroke();
    c.strokeStyle = COL.red; c.lineWidth = 3.5;
    this.line(c, { x: p.x - 7, y: p.y - 7 }, { x: p.x + 7, y: p.y + 7 });
    this.line(c, { x: p.x + 7, y: p.y - 7 }, { x: p.x - 7, y: p.y + 7 });
  }
}
