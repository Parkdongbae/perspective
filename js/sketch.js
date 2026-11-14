// 연습장: 소점을 직접 정하고, 투영선과 그림을 자유롭게 그린다
import { dist, distSeg, lineInt, segT } from './geom.js';

const PW = 1600, PH = 900, KEY = 'persp.sketch';
const DASH = { solid: [], dash: [12, 9], dot: [1, 7] };
const SW_PROJ = ['#9aa3b8', '#3157d5', '#e03131', '#2f9e44', '#f08c00', '#1e2a4a'];
const SW_DRAW = ['#1e2a4a', '#e03131', '#3157d5', '#2f9e44', '#f08c00', '#9c36b5'];
const FONT = '"Noto Sans KR","Malgun Gothic",sans-serif';
const HINT = {
  vp: '종이 안이든 밖이든 눌러서 소점을 찍어요. 찍은 소점은 끌어서 옮길 수 있어요. 종이 밖에 두려면 화면을 축소하거나, 소점을 화면 밖으로 끌어내요.',
  proj: '선을 시작할 곳에서 소점 쪽으로 끌어요. 끄는 방향과 가장 가까운 소점에 맞춰 투영선이 생겨요. 소점 반대쪽으로도 그을 수 있어요.',
  line: '두 점 사이를 끌어 곧은 선을 그려요. 자석을 켜면 점·교점·소점 방향·수평·수직에 착 붙어요.',
  pen: '손 가는 대로 자유롭게 그려요.',
  erase: '지울 선이나 소점을 누르거나 문질러요. 소점을 지우면 그 소점의 투영선도 함께 지워져요.',
  pan: '화면을 끌어서 옮겨요. 마우스 휠로 확대·축소할 수 있어요.',
};

export function openSketch(app, onBack) {
  let st = { vps: [], proj: [], lines: [], strokes: [] };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Array.isArray(s.vps)) st = Object.assign(st, s);
  } catch { /* 저장된 그림 없음 */ }
  const hist = [];
  const cfg = { tool: st.vps.length ? 'proj' : 'vp', pc: SW_PROJ[0], pd: 'solid', pw: 1.5, showProj: true, dc: SW_DRAW[0], dw: 4, snap: true };
  const view = { s: 1, cx: PW / 2, cy: PH / 2 };
  let cur = null, mark = null, dirty = true, raf = 0, cw = 0, ch = 0, z = 1, toastT;

  const sw = (list, key) => list.map((c) => `<button class="sw" data-${key}="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
  const t = document.createElement('template');
  t.innerHTML = `
    <div class="play">
      <header class="bar">
        <button class="back" aria-label="뒤로">←</button>
        <div class="ttl"><b>연습장</b><span>소점 찍기 → 투영선 긋기 → 그림 그리기</span></div>
        <button class="btn mini" id="undo">↶ 되돌리기</button>
        <button class="btn mini" id="wipe">🗑 모두 지우기</button>
        <button class="btn mini" id="png">💾 그림 저장</button>
      </header>
      <div class="stage">
        <div class="cvwrap"><div class="skbox"><canvas></canvas><div class="toast" id="toast"></div></div></div>
        <aside class="panel sk">
          <div class="card">
            <h4>도구</h4>
            <div class="tools">
              <button class="tool" data-tool="vp"><span>📍</span>소점</button>
              <button class="tool" data-tool="proj"><span>📏</span>투영선</button>
              <button class="tool" data-tool="line"><span>📐</span>직선</button>
              <button class="tool" data-tool="pen"><span>✏️</span>펜</button>
              <button class="tool" data-tool="erase"><span>🧽</span>지우개</button>
              <button class="tool" data-tool="pan"><span>✋</span>화면 이동</button>
            </div>
            <p class="tip" id="hint"></p>
          </div>
          <div class="card">
            <h4>투영선 모양</h4>
            <div class="sws">${sw(SW_PROJ, 'pc')}<input type="color" id="pcc" value="${SW_PROJ[0]}" aria-label="투영선 색 고르기"></div>
            <div class="rowf">모양<div class="seg"><button data-pd="solid">실선</button><button data-pd="dash">파선</button><button data-pd="dot">점선</button></div></div>
            <div class="rowf">두께<input type="range" id="pw" min="0.5" max="10" step="0.5" value="1.5"><output id="pwo">1.5</output></div>
            <div class="rowf"><button class="btn mini" id="applyProj">이미 그은 투영선에도 적용</button></div>
            <label class="chk"><input type="checkbox" id="showProj" checked> 투영선 보이기</label>
          </div>
          <div class="card">
            <h4>그림 (직선 · 펜)</h4>
            <div class="sws">${sw(SW_DRAW, 'dc')}<input type="color" id="dcc" value="${SW_DRAW[0]}" aria-label="그림 색 고르기"></div>
            <div class="rowf">두께<input type="range" id="dw" min="1" max="24" step="1" value="4"><output id="dwo">4</output></div>
            <label class="chk"><input type="checkbox" id="snap" checked> 자석 (점·소점 방향에 붙기)</label>
          </div>
          <div class="card">
            <h4>화면</h4>
            <div class="rowf">축소<input type="range" id="zoom" min="-2.3" max="1.4" step="0.01" value="0">확대</div>
            <div class="rowf"><button class="btn mini" id="fit">종이에 맞추기</button><output id="zo" style="width:auto">100%</output></div>
          </div>
        </aside>
      </div>
    </div>`;
  const el = t.content.firstElementChild;
  app.append(el);
  const q = (s) => el.querySelector(s), qa = (s) => [...el.querySelectorAll(s)];
  const cv = q('canvas'), c = cv.getContext('2d');

  const redraw = () => { dirty = true; };
  const toast = (text) => {
    const n = q('#toast');
    n.textContent = text; n.className = 'toast on';
    clearTimeout(toastT); toastT = setTimeout(() => (n.className = 'toast'), 2400);
  };
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* 저장 공간 부족 */ } redraw(); };
  const push = () => { hist.push(JSON.stringify(st)); if (hist.length > 80) hist.shift(); };
  const undo = () => {
    if (!hist.length) { toast('되돌릴 것이 없어요'); return; }
    st = JSON.parse(hist.pop()); cur = null; store();
  };

  // ---------- 좌표 ----------
  const toW = (e) => {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left - cw / 2) / z + view.cx, y: (e.clientY - r.top - ch / 2) / z + view.cy };
  };
  const toS = (p) => ({ x: (p.x - view.cx) * z + cw / 2, y: (p.y - view.cy) * z + ch / 2 });
  const projEnd = (l) => { const v = st.vps[l.vp]; return { x: l.a.x + (v.x - l.a.x) * l.t, y: l.a.y + (v.y - l.a.y) * l.t }; };
  const segs = () => [...(cfg.showProj ? st.proj.map((l) => [l.a, projEnd(l)]) : []), ...st.lines.map((l) => [l.a, l.b])];

  // 가까운 점(소점·끝점·교점)에 붙기
  function snapPt(p) {
    const r = 14 / z, S = segs();
    let best = null, bd = r;
    const tryP = (c2) => { const d = dist(p, c2); if (d < bd) { bd = d; best = { x: c2.x, y: c2.y }; } };
    st.vps.forEach(tryP);
    S.forEach(([a, b]) => { tryP(a); tryP(b); });
    if (S.length <= 160) {
      for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
        const x = lineInt(S[i][0], S[i][1], S[j][0], S[j][1]);
        if (!x || !isFinite(x.x)) continue;
        const t1 = segT(x, S[i][0], S[i][1]), t2 = segT(x, S[j][0], S[j][1]);
        if (t1 > -0.001 && t1 < 1.001 && t2 > -0.001 && t2 < 1.001) tryP(x);
      }
    }
    return best;
  }
  // 소점 방향·수평·수직에 붙기
  function magnet(a, p) {
    const d = { x: p.x - a.x, y: p.y - a.y }, len = Math.hypot(d.x, d.y);
    if (len < 20 / z) return null;
    const dirs = [{ x: 1, y: 0, n: '수평' }, { x: 0, y: 1, n: '수직' }];
    st.vps.forEach((v, i) => { const m = Math.hypot(v.x - a.x, v.y - a.y); if (m > 1) dirs.push({ x: (v.x - a.x) / m, y: (v.y - a.y) / m, n: `소점 ${i + 1} 방향` }); });
    let best = null, ba = 0.05; // 약 3도
    for (const u of dirs) {
      const s = Math.abs(d.x * u.y - d.y * u.x) / len;
      if (s < ba) { ba = s; best = u; }
    }
    if (!best) return null;
    const k = d.x * best.x + d.y * best.y;
    return { x: a.x + best.x * k, y: a.y + best.y * k, n: best.n };
  }
  function eraseAt(p) {
    const r = 12 / z;
    const before = st.proj.length + st.lines.length + st.strokes.length;
    const hitSeg = (a, b, w) => distSeg(p, a, b) < r + w / 2;
    const keepP = st.proj.filter((l) => !(cfg.showProj && hitSeg(l.a, projEnd(l), l.w)));
    const keepL = st.lines.filter((l) => !hitSeg(l.a, l.b, l.w));
    const keepS = st.strokes.filter((s) => {
      if (s.pts.length === 1) return dist(p, s.pts[0]) > r + s.w / 2;
      for (let i = 0; i + 1 < s.pts.length; i++) if (hitSeg(s.pts[i], s.pts[i + 1], s.w)) return false;
      return true;
    });
    if (keepP.length + keepL.length + keepS.length === before) return;
    if (!cur.pushed) { push(); cur.pushed = true; }
    st.proj = keepP; st.lines = keepL; st.strokes = keepS;
    redraw();
  }
  function removeVp(i) {
    st.vps.splice(i, 1);
    st.proj = st.proj.filter((l) => l.vp !== i);
    st.proj.forEach((l) => { if (l.vp > i) l.vp--; });
  }
  const vpAt = (p) => st.vps.findIndex((v) => dist(v, p) < 20 / z);

  // ---------- 포인터 ----------
  function down(e) {
    if (cur) return;
    try { cv.setPointerCapture(e.pointerId); } catch { /* 일부 브라우저 */ }
    // 지우개 버튼(펜 지우개, 손 조작의 엄지+중지 핀치)은 도구와 상관없이 지운다
    const p = toW(e), tool = e.button === 5 ? 'erase' : cfg.tool;
    mark = null;
    if (tool === 'vp') {
      let i = vpAt(p);
      push();
      if (i < 0) { st.vps.push(p); i = st.vps.length - 1; }
      cur = { k: 'vp', i };
    } else if (tool === 'proj') {
      if (!st.vps.length) { toast('먼저 📍 소점 도구로 소점을 찍어 주세요'); return; }
      cur = { k: 'proj', a: snapPt(p) || p, vp: -1, t: 0 };
    } else if (tool === 'line') {
      const a = (cfg.snap && snapPt(p)) || p;
      cur = { k: 'line', a, b: a };
    } else if (tool === 'pen') {
      cur = { k: 'pen', pts: [p] };
    } else if (tool === 'erase') {
      cur = { k: 'erase', pushed: false };
      const i = vpAt(p);
      if (i >= 0) { push(); cur.pushed = true; removeVp(i); } else eraseAt(p);
    } else if (tool === 'pan') {
      cur = { k: 'pan', x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
    }
    redraw();
  }
  function move(e) {
    const p = toW(e);
    if (!cur) {
      const m = (cfg.tool === 'proj' || (cfg.tool === 'line' && cfg.snap)) ? snapPt(p) : null;
      if (m || mark) { mark = m; redraw(); }
      return;
    }
    if (cur.k === 'vp') st.vps[cur.i] = p;
    else if (cur.k === 'proj') {
      const a = cur.a, d = { x: p.x - a.x, y: p.y - a.y }, len = Math.hypot(d.x, d.y);
      cur.vp = -1;
      if (len > 8 / z) {
        let bs = 2;
        st.vps.forEach((v, i) => {
          const u = { x: v.x - a.x, y: v.y - a.y }, m = Math.hypot(u.x, u.y);
          if (m < 2) return;
          const s = Math.abs(d.x * u.y - d.y * u.x) / (len * m);
          if (s < bs) { bs = s; cur.vp = i; cur.t = Math.min(1, (d.x * u.x + d.y * u.y) / (m * m)); if ((1 - cur.t) * m < 18 / z) cur.t = 1; }
        });
      }
    } else if (cur.k === 'line') {
      const s = cfg.snap ? (snapPt(p) || magnet(cur.a, p)) : null;
      cur.b = s || p; cur.note = s && s.n;
      mark = s && !s.n ? s : null;
    } else if (cur.k === 'pen') {
      if (dist(p, cur.pts[cur.pts.length - 1]) > 1.5 / z) cur.pts.push(p);
    } else if (cur.k === 'erase') eraseAt(p);
    else if (cur.k === 'pan') { view.cx = cur.cx - (e.clientX - cur.x) / z; view.cy = cur.cy - (e.clientY - cur.y) / z; }
    redraw();
  }
  function up() {
    if (!cur) return;
    const k = cur;
    cur = null; mark = null;
    if (k.k === 'proj' && k.vp >= 0) {
      const v = st.vps[k.vp];
      if (Math.abs(k.t) * dist(k.a, v) > 6 / z) { push(); st.proj.push({ a: k.a, vp: k.vp, t: k.t, c: cfg.pc, d: cfg.pd, w: cfg.pw }); }
    } else if (k.k === 'line') {
      if (dist(k.a, k.b) > 4 / z) { push(); st.lines.push({ a: k.a, b: { x: k.b.x, y: k.b.y }, c: cfg.dc, w: cfg.dw }); }
    } else if (k.k === 'pen') {
      push(); st.strokes.push({ pts: k.pts.map((p) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })), c: cfg.dc, w: cfg.dw });
    } else if (k.k === 'vp' && st.vps.length === 1 && !st.proj.length) {
      toast('소점을 찍었어요! 더 찍거나, 📏 투영선 도구로 넘어가요');
    }
    store();
  }
  function wheel(e) {
    e.preventDefault();
    setZoom(Math.log(view.s) - e.deltaY * 0.0012);
  }
  function setZoom(lg) {
    lg = Math.max(-2.3, Math.min(1.4, lg));
    view.s = Math.exp(lg);
    q('#zoom').value = lg;
    q('#zo').textContent = Math.round(view.s * 100) + '%';
    redraw();
  }
  const key = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); } };

  // ---------- 그리기 ----------
  const seg = (g, a, b) => { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); };
  function content(g, minW) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (cfg.showProj) {
      for (const l of st.proj) {
        const w = Math.max(l.w, minW);
        g.strokeStyle = l.c; g.lineWidth = w;
        g.setLineDash(DASH[l.d].map((v) => v * Math.max(1, w / 1.5)));
        seg(g, l.a, projEnd(l));
      }
      g.setLineDash([]);
    }
    for (const l of st.lines) { g.strokeStyle = l.c; g.lineWidth = Math.max(l.w, minW); seg(g, l.a, l.b); }
    for (const s of st.strokes) {
      g.strokeStyle = g.fillStyle = s.c; g.lineWidth = Math.max(s.w, minW);
      if (s.pts.length === 1) { g.beginPath(); g.arc(s.pts[0].x, s.pts[0].y, s.w / 2, 0, 7); g.fill(); continue; }
      g.beginPath();
      s.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.stroke();
    }
  }
  function paint() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = cv.clientWidth; ch = cv.clientHeight;
    if (!cw || !ch) return;
    const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    z = Math.min(cw / PW, ch / PH) * 0.94 * view.s;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#dfe4ee'; c.fillRect(0, 0, cw, ch);
    c.save();
    c.translate(cw / 2, ch / 2); c.scale(z, z); c.translate(-view.cx, -view.cy);
    // 종이
    c.fillStyle = '#fff'; c.fillRect(0, 0, PW, PH);
    c.strokeStyle = '#eceef4'; c.lineWidth = 1 / z;
    c.beginPath();
    for (let x = 50; x < PW; x += 50) { c.moveTo(x, 0); c.lineTo(x, PH); }
    for (let y = 50; y < PH; y += 50) { c.moveTo(0, y); c.lineTo(PW, y); }
    c.stroke();
    c.strokeStyle = '#aab3c8'; c.lineWidth = 2 / z; c.strokeRect(0, 0, PW, PH);
    content(c, 0.8 / z);
    // 진행 중인 선
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (cur && cur.k === 'proj' && cur.vp >= 0) {
      const v = st.vps[cur.vp], e = { x: cur.a.x + (v.x - cur.a.x) * cur.t, y: cur.a.y + (v.y - cur.a.y) * cur.t };
      c.strokeStyle = 'rgba(49,87,213,.25)'; c.lineWidth = 1.2 / z; c.setLineDash([6 / z, 6 / z]);
      seg(c, cur.a, v); c.setLineDash([]);
      c.strokeStyle = cfg.pc; c.lineWidth = Math.max(cfg.pw, 1.6 / z);
      seg(c, cur.a, e);
    } else if (cur && cur.k === 'line') {
      c.strokeStyle = cfg.dc; c.lineWidth = Math.max(cfg.dw, 0.8 / z); seg(c, cur.a, cur.b);
      if (cur.note) {
        c.font = `700 ${14 / z}px ${FONT}`; c.fillStyle = '#3157d5'; c.textAlign = 'left'; c.textBaseline = 'bottom';
        c.fillText(cur.note, cur.b.x + 10 / z, cur.b.y - 8 / z);
      }
    } else if (cur && cur.k === 'pen') {
      c.strokeStyle = cfg.dc; c.lineWidth = Math.max(cfg.dw, 0.8 / z);
      c.beginPath(); cur.pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
    }
    if ((cur && (cur.k === 'proj' || cur.k === 'line')) || mark) {
      const m = mark || cur.a;
      c.strokeStyle = '#f08c00'; c.lineWidth = 2.5 / z;
      c.beginPath(); c.arc(m.x, m.y, 9 / z, 0, 7); c.stroke();
    }
    // 소점
    st.vps.forEach((v, i) => {
      c.fillStyle = '#3157d5'; c.strokeStyle = '#fff'; c.lineWidth = 3 / z;
      c.beginPath(); c.arc(v.x, v.y, 9 / z, 0, 7); c.fill(); c.stroke();
      c.font = `700 ${15 / z}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'top';
      c.lineWidth = 4 / z; c.strokeStyle = 'rgba(255,255,255,.9)';
      c.strokeText(`소점 ${i + 1}`, v.x, v.y + 13 / z); c.fillText(`소점 ${i + 1}`, v.x, v.y + 13 / z);
    });
    c.restore();
    // 화면 밖 소점 알림
    st.vps.forEach((v, i) => {
      const s = toS(v);
      if (s.x >= 0 && s.x <= cw && s.y >= 0 && s.y <= ch) return;
      const x = Math.max(22, Math.min(cw - 22, s.x)), y = Math.max(22, Math.min(ch - 22, s.y));
      const a = Math.atan2(s.y - y, s.x - x);
      c.save(); c.translate(x, y); c.rotate(a);
      c.fillStyle = '#3157d5';
      c.beginPath(); c.moveTo(14, 0); c.lineTo(-8, -10); c.lineTo(-8, 10); c.closePath(); c.fill();
      c.restore();
      c.font = `700 13px ${FONT}`; c.fillStyle = '#3157d5';
      c.textAlign = x < 60 ? 'left' : x > cw - 60 ? 'right' : 'center';
      c.textBaseline = y < 60 ? 'top' : 'bottom';
      const tx = x < 60 ? x + 16 : x > cw - 60 ? x - 16 : x, ty = y < 60 ? y + 16 : y - 16;
      c.fillText(`소점 ${i + 1}`, tx, ty);
    });
  }
  const loop = () => { if (dirty) { dirty = false; paint(); } raf = requestAnimationFrame(loop); };

  function savePng() {
    const o = document.createElement('canvas');
    o.width = PW * 2; o.height = PH * 2;
    const g = o.getContext('2d');
    g.scale(2, 2);
    g.fillStyle = '#fff'; g.fillRect(0, 0, PW, PH);
    g.beginPath(); g.rect(0, 0, PW, PH); g.clip();
    content(g, 0);
    o.toBlob((b) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = '투시도-연습장.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }

  // ---------- 설정 UI ----------
  function sync() {
    qa('.tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === cfg.tool));
    qa('[data-pc]').forEach((b) => b.classList.toggle('on', b.dataset.pc === cfg.pc));
    qa('[data-dc]').forEach((b) => b.classList.toggle('on', b.dataset.dc === cfg.dc));
    qa('[data-pd]').forEach((b) => b.classList.toggle('on', b.dataset.pd === cfg.pd));
    q('#hint').textContent = HINT[cfg.tool];
    cv.style.cursor = cfg.tool === 'pan' ? 'grab' : 'crosshair';
  }
  qa('.tool').forEach((b) => (b.onclick = () => { cfg.tool = b.dataset.tool; mark = null; sync(); redraw(); }));
  qa('[data-pc]').forEach((b) => (b.onclick = () => { cfg.pc = b.dataset.pc; q('#pcc').value = cfg.pc; sync(); }));
  qa('[data-dc]').forEach((b) => (b.onclick = () => { cfg.dc = b.dataset.dc; q('#dcc').value = cfg.dc; sync(); }));
  qa('[data-pd]').forEach((b) => (b.onclick = () => { cfg.pd = b.dataset.pd; sync(); }));
  q('#pcc').oninput = (e) => { cfg.pc = e.target.value; sync(); };
  q('#dcc').oninput = (e) => { cfg.dc = e.target.value; sync(); };
  q('#pw').oninput = (e) => { cfg.pw = Number(e.target.value); q('#pwo').textContent = cfg.pw; };
  q('#dw').oninput = (e) => { cfg.dw = Number(e.target.value); q('#dwo').textContent = cfg.dw; };
  q('#showProj').onchange = (e) => { cfg.showProj = e.target.checked; redraw(); };
  q('#snap').onchange = (e) => { cfg.snap = e.target.checked; };
  q('#applyProj').onclick = () => {
    if (!st.proj.length) { toast('아직 그은 투영선이 없어요'); return; }
    push(); st.proj.forEach((l) => { l.c = cfg.pc; l.d = cfg.pd; l.w = cfg.pw; }); store();
  };
  q('#zoom').oninput = (e) => setZoom(Number(e.target.value));
  q('#fit').onclick = () => { view.cx = PW / 2; view.cy = PH / 2; setZoom(0); };
  q('#undo').onclick = undo;
  q('#wipe').onclick = () => {
    if (!st.vps.length && !st.lines.length && !st.strokes.length) return;
    push(); st = { vps: [], proj: [], lines: [], strokes: [] }; cfg.tool = 'vp'; sync(); store();
    toast('모두 지웠어요. ↶ 되돌리기로 되살릴 수 있어요');
  };
  q('#png').onclick = savePng;
  q('.back').onclick = onBack;

  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', wheel, { passive: false });
  window.addEventListener('keydown', key);
  const ro = new ResizeObserver(redraw);
  ro.observe(cv);
  sync();
  raf = requestAnimationFrame(loop);

  return {
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', key); clearTimeout(toastT); },
    // 점검용
    get state() { return st; }, cfg, view, setZoom,
  };
}
