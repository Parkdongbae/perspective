// 학습: 1소점 — 정면 도형을 소점 쪽으로 밀어 입체 만들기
import { lerp, sub, cross, dist, rnd, deepIn, clamp, bbox } from './geom.js';

const SH = {
  sq: [[0, 0], [1, 0], [1, 1], [0, 1]],
  wide: [[0, 0], [1.6, 0], [1.6, 0.9], [0, 0.9]],
  tall: [[0, 0], [0.85, 0], [0.85, 1.45], [0, 1.45]],
  tri: [[0.5, 0], [1, 0.9], [0, 0.9]],
  house: [[0.5, 0], [1, 0.45], [1, 1.1], [0, 1.1], [0, 0.45]],
  L: [[0, 0], [0.5, 0], [0.5, 0.7], [1.1, 0.7], [1.1, 1.2], [0, 1.2]],
  stair: [[0, 0.8], [0.4, 0.8], [0.4, 0.4], [0.8, 0.4], [0.8, 0], [1.2, 0], [1.2, 1.2], [0, 1.2]],
  T: [[0, 0], [1.2, 0], [1.2, 0.4], [0.8, 0.4], [0.8, 1.2], [0.4, 1.2], [0.4, 0.4], [0, 0.4]],
  plus: [[0.4, 0], [0.8, 0], [0.8, 0.4], [1.2, 0.4], [1.2, 0.8], [0.8, 0.8], [0.8, 1.2], [0.4, 1.2], [0.4, 0.8], [0, 0.8], [0, 0.4], [0.4, 0.4]],
};

export const STAGES1 = [
  { name: '정사각형', diff: 0, shapes: [['sq', 230]] },
  { name: '가로 직사각형', diff: 0, shapes: [['wide', 200]] },
  { name: '세로 직사각형', diff: 0, shapes: [['tall', 200]] },
  { name: '삼각형', diff: 0, shapes: [['tri', 280]] },
  { name: '집 모양', diff: 1, shapes: [['house', 230]] },
  { name: 'ㄴ자 블록', diff: 1, shapes: [['L', 220]] },
  { name: '계단', diff: 1, shapes: [['stair', 210]] },
  { name: 'T자 블록', diff: 2, shapes: [['T', 220]] },
  { name: '십자 블록', diff: 2, shapes: [['plus', 220]] },
  { name: '두 도형', diff: 2, shapes: [['sq', 190], ['tri', 230]] },
];

const FACE = { h: '#ffd8a8', v: '#a5d8ff', s: '#b2f2bb', front: '#fff9e6' };

function struct1(P) {
  const V = P.V;
  const given = [], rays = [], edges = [], faces = [], guides = [];
  const seen = new Set();
  let bad = false;
  const vis = [];
  P.polys.forEach((poly, j) => {
    const n = poly.length;
    let cnt = 0;
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n, a = poly[i], b = poly[i2];
      given.push([`p${j}_${i}`, `p${j}_${i2}`]);
      const c = cross(sub(b, a), sub(V, a)) / ((dist(a, b) * dist(V, a)) || 1);
      if (c >= 0) continue;
      if (c > -0.16) bad = true; // 너무 얇게 보이는 면
      cnt++;
      for (const q of [i, i2]) {
        const id = `r${j}_${q}`;
        if (seen.has(id)) continue;
        seen.add(id);
        rays.push({ id, from: `p${j}_${q}`, vp: 'V', to: `b${j}_${q}`, cut: { g: 1 } });
      }
      edges.push({ id: `e${j}_${i}`, a: `b${j}_${i}`, b: `b${j}_${i2}` });
      const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
      faces.push({
        id: `f${j}_${i}`, pts: [`p${j}_${i}`, `p${j}_${i2}`, `b${j}_${i2}`, `b${j}_${i}`],
        needs: [`r${j}_${i}`, `r${j}_${i2}`, `e${j}_${i}`],
        color: dy < dx * 0.2 ? FACE.h : dx < dy * 0.2 ? FACE.v : FACE.s,
        key: dist(lerp(a, b, 0.5), V),
      });
      guides.push({ id: `g${j}_${i}`, a: `b${j}_${i}`, b: `b${j}_${i2}`, e0: 45, e1: 45, j, i });
    }
    vis.push(cnt);
  });
  faces.sort((a, b) => b.key - a.key); // 소점에서 먼 면부터 칠한다
  P.polys.forEach((poly, j) => faces.push({ id: `F${j}`, front: true, needs: [], color: FACE.front, pts: poly.map((_, i) => `p${j}_${i}`) }));
  return { given, rays, edges, faces, guides, bad, vis };
}

function build(stage) {
  const n = stage.shapes.length;
  const polys = stage.shapes.map(([key, s], j) => {
    const raw = SH[key].map(([x, y]) => ({ x: x * s, y: y * s }));
    const b = bbox(raw);
    const zone = n === 1 ? [110, 1490] : j === 0 ? [110, 740] : [860, 1490];
    const ox = rnd(zone[0], zone[1] - b.x1), oy = rnd(100, 800 - b.y1);
    return raw.map((p) => ({ x: p.x + ox, y: p.y + oy }));
  });
  const P = { V: { x: rnd(90, 1510), y: rnd(90, 810) }, k: rnd(0.28, 0.48), polys };
  const m = {
    kind: 1, P, painter: true, dynamic: true, vps: { V: '소점' },
    compute() {
      const pt = { V: P.V };
      P.polys.forEach((poly, j) => poly.forEach((p, i) => {
        pt[`p${j}_${i}`] = p;
        pt[`b${j}_${i}`] = lerp(p, P.V, P.k);
      }));
      return pt;
    },
    struct: () => struct1(P),
    handles(S) {
      const hs = S.guides.map((g) => ({
        kind: 'guide', gid: g.id,
        drag(p) {
          const poly = P.polys[g.j], a = poly[g.i], b = poly[(g.i + 1) % poly.length];
          const d = sub(b, a), den = cross(sub(P.V, a), d);
          if (Math.abs(den) < 1e-6) return;
          P.k = clamp(cross(sub(p, a), d) / den, 0.08, 0.9);
        },
      }));
      hs.push({ kind: 'vp', name: 'V', drag(p) { P.V = { x: clamp(p.x, 30, 1570), y: clamp(p.y, 30, 870) }; } });
      return hs;
    },
  };
  return m;
}

function valid(m) {
  const P = m.P, S = m.struct(), pt = m.compute();
  if (S.bad) return false;
  if (S.vis.some((c) => c < 1) || S.vis.reduce((a, b) => a + b, 0) < 2) return false;
  for (const poly of P.polys) {
    const b = bbox(poly);
    const dx = Math.max(b.x0 - P.V.x, 0, P.V.x - b.x1), dy = Math.max(b.y0 - P.V.y, 0, P.V.y - b.y1);
    if (Math.hypot(dx, dy) < 230) return false;
  }
  const quads = S.faces.filter((f) => !f.front).map((f) => f.pts.map((n) => pt[n]));
  const segs = [...S.rays.map((r) => [pt[r.from], pt[r.to]]), ...S.edges.map((e) => [pt[e.a], pt[e.b]])];
  for (const [a, b] of segs) {
    for (let t = 0.08; t < 1; t += 0.14) {
      const q = lerp(a, b, t);
      if (P.polys.some((poly) => deepIn(q, poly, 3))) return false;
      if (quads.some((poly) => deepIn(q, poly, 3))) return false;
    }
  }
  return true;
}

export function make1(stage) {
  let m;
  for (let i = 0; i < 3000; i++) {
    m = build(stage);
    if (valid(m)) return m;
  }
  return m;
}
