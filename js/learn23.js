// 학습: 2소점·3소점 — 앞 모서리에서 시작해 상자 만들기
import { lerp, dist, rnd, deepIn, clamp, bbox, lineInt, segT } from './geom.js';

export const STAGES2 = [
  { name: '눈높이에 걸친 상자', diff: 0, boxes: [{ t: 'mid', z: [650, 950] }] },
  { name: '높은 빌딩', diff: 0, boxes: [{ t: 'mid', tall: 1, z: [650, 950], w: [110, 160] }] },
  { name: '눈높이 아래 상자', diff: 0, boxes: [{ t: 'low', z: [650, 950] }] },
  { name: '눈높이 위 상자', diff: 0, boxes: [{ t: 'high', z: [650, 950] }] },
  { name: '건물 두 채', diff: 1, boxes: [{ t: 'mid', z: [420, 540], w: [110, 160] }, { t: 'mid', tall: 1, z: [1060, 1180], w: [110, 160] }] },
  { name: '위·아래 상자', diff: 1, boxes: [{ t: 'high', z: [450, 750] }, { t: 'low', z: [850, 1150] }] },
  { name: '2단 쌓기', diff: 1, stack: 1, boxes: [{ t: 'low', z: [650, 950], kids: 1, w: [200, 260] }] },
  { name: '3단 탑', diff: 2, stack: 1, boxes: [{ t: 'low', z: [650, 950], kids: 2, w: [230, 280] }] },
  { name: '상자 세 개', diff: 2, boxes: [{ t: 'mid', z: [380, 480], w: [100, 140] }, { t: 'high', z: [1000, 1200], w: [120, 170] }, { t: 'low', z: [1000, 1200], w: [120, 170] }] },
  { name: '2단 쌓기와 떠 있는 상자', diff: 2, stack: 1, boxes: [{ t: 'low', z: [450, 650], kids: 1, w: [180, 230] }, { t: 'high', z: [1000, 1150], w: [120, 170] }] },
];

export const STAGES3 = [
  { name: '내려다본 상자', diff: 0, view: 'bird', boxes: [{ z: [650, 950] }] },
  { name: '내려다본 빌딩', diff: 0, view: 'bird', boxes: [{ tall: 1, z: [650, 950], w: [120, 170] }] },
  { name: '올려다본 상자', diff: 0, view: 'worm', boxes: [{ z: [650, 950] }] },
  { name: '올려다본 빌딩', diff: 0, view: 'worm', boxes: [{ tall: 1, z: [650, 950], w: [120, 170] }] },
  { name: '내려다본 상자 두 개', diff: 1, view: 'bird', boxes: [{ z: [400, 520], w: [110, 160] }, { z: [1080, 1200], w: [110, 160] }] },
  { name: '내려다본 2단 쌓기', diff: 1, view: 'bird', boxes: [{ z: [650, 950], kids: 1, w: [210, 260] }] },
  { name: '올려다본 상자 두 개', diff: 1, view: 'worm', boxes: [{ z: [400, 520], w: [110, 160] }, { z: [1080, 1200], w: [110, 160] }] },
  { name: '내려다본 3단 탑', diff: 2, view: 'bird', boxes: [{ z: [700, 900], kids: 2, w: [240, 290] }] },
  { name: '내려다본 건물 세 채', diff: 2, view: 'bird', boxes: [{ z: [330, 400], w: [90, 120] }, { tall: 1, z: [760, 840], w: [100, 130] }, { z: [1200, 1270], w: [90, 120] }] },
  { name: '올려다본 2단 블록', diff: 2, view: 'worm', boxes: [{ z: [650, 950], kids: 1, w: [210, 260] }] },
];

const FACE = { l: '#c5dcff', r: '#8fbdf5', c: '#ffd8a8' };

function gen(kind, stage) {
  const P = { kind, boxes: [] };
  if (kind === 2) {
    P.hy = stage.stack ? rnd(300, 370) : rnd(390, 510);
    P.L = { x: rnd(60, 190), y: P.hy };
    P.R = { x: rnd(1410, 1540), y: P.hy };
  } else {
    const bird = stage.view === 'bird';
    P.hy = bird ? rnd(70, 130) : rnd(770, 830);
    P.L = { x: rnd(50, 150), y: P.hy };
    P.R = { x: rnd(1450, 1550), y: P.hy };
    P.T = { x: rnd(700, 900), y: bird ? rnd(850, 880) : rnd(20, 50) };
  }
  let n = 0;
  for (const sp of stage.boxes) {
    const x0 = rnd(sp.z[0], sp.z[1]);
    const [w0, w1] = sp.w || [140, 220];
    const kids = sp.kids || 0;
    let N, F, cap = true;
    if (kind === 2) {
      const hy = P.hy;
      if (sp.t === 'mid') {
        cap = false;
        N = { x: x0, y: hy - (sp.tall ? rnd(240, 320) : rnd(110, 200)) };
        F = { x: x0, y: hy + (sp.tall ? rnd(150, 250) : rnd(110, 200)) };
      } else if (sp.t === 'low') {
        N = { x: x0, y: hy + (kids === 2 ? rnd(330, 380) : kids === 1 ? rnd(250, 300) : rnd(110, 170)) };
        F = { x: x0, y: Math.min(N.y + (kids ? rnd(90, 130) : rnd(140, 220)), 858) };
      } else {
        N = { x: x0, y: hy - rnd(110, 170) };
        F = { x: x0, y: Math.max(N.y - rnd(140, 220), 40) };
      }
    } else {
      const sgn = stage.view === 'bird' ? 1 : -1;
      const off = kids ? rnd(330, 400) : sp.tall ? rnd(170, 220) : rnd(190, 300);
      N = { x: x0, y: P.hy + sgn * off };
      F = lerp(N, P.T, kids ? rnd(0.25, 0.35) : sp.tall ? rnd(0.55, 0.7) : rnd(0.3, 0.5));
    }
    let par = { id: 'b' + n++, N, F, cap, sL: rnd(w0, w1) / dist(N, P.L), sR: rnd(w0, w1) / dist(N, P.R), parent: null, kids: [] };
    P.boxes.push(par);
    for (let k = 0; k < kids; k++) {
      const N2 = kind === 2 ? { x: par.N.x, y: par.N.y - rnd(70, 100) } : lerp(par.N, P.T, -rnd(0.15, 0.21));
      const c = { id: 'b' + n++, N: N2, F: par.N, cap: true, sL: par.sL * rnd(0.5, 0.62), sR: par.sR * rnd(0.5, 0.62), parent: par, kids: [] };
      par.kids.push(c);
      P.boxes.push(c);
      par = c;
    }
  }
  return P;
}

function model(P) {
  const kind = P.kind;
  const vert = (p) => P.T || { x: p.x, y: p.y + 100 };
  const m = {
    kind, P, painter: true,
    vps: kind === 2 ? { L: '왼쪽 소점', R: '오른쪽 소점' } : { L: '왼쪽 소점', R: '오른쪽 소점', T: '세 번째 소점' },
    hy: () => P.hy,
    compute() {
      const pt = { L: P.L, R: P.R };
      if (P.T) pt.T = P.T;
      for (const b of P.boxes) {
        const NL = lerp(b.N, P.L, b.sL), NR = lerp(b.N, P.R, b.sR);
        pt[b.id + 'N'] = b.N; pt[b.id + 'F'] = b.F;
        pt[b.id + 'NL'] = NL; pt[b.id + 'NR'] = NR;
        pt[b.id + 'FL'] = lineInt(b.F, P.L, NL, vert(NL));
        pt[b.id + 'FR'] = lineInt(b.F, P.R, NR, vert(NR));
        if (b.cap) pt[b.id + 'C'] = lineInt(NL, P.R, NR, P.L);
      }
      return pt;
    },
    struct() {
      const S = { given: [], rays: [], edges: [], faces: [], guides: [], ptNeeds: {} };
      for (const b of P.boxes) {
        const i = b.id, par = b.parent;
        S.given.push([i + 'N', i + 'F']);
        for (const [s, vp] of [['L', 'L'], ['R', 'R']]) {
          const k = s.toLowerCase();
          const need = [i + 'n' + k];
          S.rays.push({ id: i + 'n' + k, from: i + 'N', vp, to: i + 'N' + s, cut: { g: 1 } });
          if (kind === 2) {
            if (par) S.ptNeeds[i + 'F' + s] = [par.id + 'n' + k];
            else { S.rays.push({ id: i + 'f' + k, from: i + 'F', vp, to: i + 'F' + s, cut: { g: 1 } }); need.push(i + 'f' + k); }
            S.edges.push({ id: i + 'e' + k, a: i + 'N' + s, b: i + 'F' + s });
            need.push(i + 'e' + k);
            S.guides.push({ id: i + 'g' + k, a: i + 'N' + s, b: i + 'F' + s, e0: 45, e1: 45, box: b, side: s });
          } else {
            if (par) S.rays.push({ id: i + 'v' + k, from: i + 'N' + s, vp: 'T', to: i + 'F' + s, cut: { r: par.id + 'n' + k } });
            else {
              S.rays.push({ id: i + 'f' + k, from: i + 'F', vp, to: i + 'F' + s, cut: { r: i + 'v' + k } });
              S.rays.push({ id: i + 'v' + k, from: i + 'N' + s, vp: 'T', to: i + 'F' + s, cut: { r: i + 'f' + k } });
              need.push(i + 'f' + k);
            }
            need.push(i + 'v' + k);
            S.guides.push({ id: i + 'g' + k, a: i + 'N' + s, b: i + 'F' + s, e0: 45, len: 85, box: b, side: s });
          }
          S.faces.push({ id: i + 'face' + k, pts: [i + 'N', i + 'N' + s, i + 'F' + s, i + 'F'], needs: need, color: s === 'L' ? FACE.l : FACE.r });
        }
        if (b.cap) {
          S.rays.push({ id: i + 'cl', from: i + 'NL', vp: 'R', to: i + 'C', cut: { r: i + 'cr' } });
          S.rays.push({ id: i + 'cr', from: i + 'NR', vp: 'L', to: i + 'C', cut: { r: i + 'cl' } });
          S.faces.push({ id: i + 'facec', pts: [i + 'N', i + 'NL', i + 'C', i + 'NR'], needs: [i + 'nl', i + 'nr', i + 'cl', i + 'cr'], color: FACE.c });
        }
      }
      return S;
    },
    handles(S) {
      const hs = S.guides.map((g) => ({
        kind: 'guide', gid: g.id,
        drag(p) {
          const b = g.box, key = 's' + g.side, V = P[g.side];
          const q = lineInt(b.N, V, p, vert(p));
          if (!q) return;
          let lo = 0.08, hi = 0.8;
          if (b.parent) hi = Math.min(hi, b.parent[key] * 0.85);
          b.kids.forEach((c) => (lo = Math.max(lo, c[key] / 0.85)));
          if (lo <= hi) b[key] = clamp(segT(q, b.N, V), lo, hi);
        },
      }));
      if (kind === 2) {
        const xs = P.boxes.map((b) => b.N.x);
        hs.push({ kind: 'vp', name: 'L', drag(p) { P.L = { x: clamp(p.x, 30, Math.min(...xs) - 380), y: P.hy }; } });
        hs.push({ kind: 'vp', name: 'R', drag(p) { P.R = { x: clamp(p.x, Math.max(...xs) + 380, 1570), y: P.hy }; } });
      }
      return hs;
    },
  };
  return m;
}

function valid(m) {
  const P = m.P, pt = m.compute();
  const names = (b) => ['N', 'F', 'NL', 'NR', 'FL', 'FR', ...(b.cap ? ['C'] : [])].map((s) => pt[b.id + s]);
  for (const b of P.boxes) {
    const ps = names(b);
    if (ps.some((p) => !p || p.x < 20 || p.x > 1580 || p.y < 20 || p.y > 880)) return false;
    if (b.cap && dist(pt[b.id + 'C'], b.N) < 44) return false;
    if (dist(pt[b.id + 'NL'], b.N) < 60 || dist(pt[b.id + 'NR'], b.N) < 60) return false;
    if (dist(b.N, b.F) < 70) return false;
    if (P.kind === 3 && Math.abs(b.N.y - P.hy) < 110) return false;
  }
  // 서로 다른 덩어리는 겹치지 않아야 한다
  const roots = P.boxes.filter((b) => !b.parent);
  const group = (r) => { const out = []; let c = r; while (c) { out.push(...names(c)); c = c.kids[0]; } return bbox(out); };
  const bbs = roots.map(group);
  for (let i = 0; i < bbs.length; i++) for (let j = i + 1; j < bbs.length; j++) {
    const a = bbs[i], b = bbs[j];
    if (a.x0 < b.x1 + 30 && b.x0 < a.x1 + 30 && a.y0 < b.y1 + 30 && b.y0 < a.y1 + 30) return false;
  }
  // 위에 쌓은 상자가 아래 상자의 윗면 모서리를 가리면 안 된다
  for (const b of P.boxes) {
    let c = b.kids[0];
    while (c) {
      const sil = ['F', 'FL', 'NL', 'C', 'NR', 'FR'].map((s) => pt[c.id + s]);
      for (const s of ['NL', 'NR']) {
        for (let t = 0.1; t <= 1; t += 0.1) if (deepIn(lerp(pt[b.id + s], pt[b.id + 'C'], t), sil, 2)) return false;
      }
      if (dist(pt[c.id + 'C'], pt[b.id + 'C']) < 30) return false;
      c = c.kids[0];
    }
  }
  return true;
}

export function makeBox(kind, stage) {
  let m;
  for (let i = 0; i < 4000; i++) {
    m = model(gen(kind, stage));
    if (valid(m)) return m;
  }
  return m;
}
