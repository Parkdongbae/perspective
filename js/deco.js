// 완성 장면을 꾸미는 그리기 도우미 (창문, 구름, 해, 나무 …)
import { dist } from './geom.js';

export const SCREEN = [{ x: 0, y: 0 }, { x: 1600, y: 0 }, { x: 1600, y: 900 }, { x: 0, y: 900 }];

// 사각형 면 위의 (u,v)를 투시에 맞게 화면 좌표로 바꾸는 함수를 만든다. 꼭짓점 순서: (0,0) (1,0) (1,1) (0,1)
export function quad(p0, p1, p2, p3) {
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, sx = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, sy = p0.y - p1.y + p2.y - p3.y;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + h * p3.x, d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + h * p3.y;
  return (u, v) => { const w = g * u + h * v + 1; return { x: (a * u + b * v + p0.x) / w, y: (d * u + e * v + p0.y) / w }; };
}
export const Q = (P, a, b, c2, d) => quad(P[a], P[b], P[c2], P[d]);

// 모서리 위의 점 p가 u(또는 v)로 얼마인지 찾는다
export function paramOf(q, p, alongV = true) {
  const f = (t) => (alongV ? q(0, t) : q(t, 0)), o = f(0), target = dist(o, p);
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (dist(o, f(m)) < target) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
export const even = (n) => Array.from({ length: n + 1 }, (_, i) => i / n);

const pts = (c, list) => { c.beginPath(); list.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); };
export function poly(c, list, fill, stroke, lw = 2) {
  pts(c, list); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
export function patch(c, q, u0, v0, u1, v1, fill, stroke, lw = 1.5) {
  poly(c, [q(u0, v0), q(u1, v0), q(u1, v1), q(u0, v1)], fill, stroke, lw);
}
export function qline(c, q, u0, v0, u1, v1, stroke, lw = 2) {
  pts(c, [q(u0, v0), q(u1, v1)]); c.strokeStyle = stroke; c.lineWidth = lw; c.stroke();
}
export function qcircle(c, q, cu, cv, r, fill, stroke, lw = 3) {
  const list = [];
  for (let i = 0; i < 40; i++) list.push(q(cu + Math.cos(i * Math.PI / 20) * r, cv + Math.sin(i * Math.PI / 20) * r));
  poly(c, list, fill, stroke, lw);
}
export function seg(c, a, b, stroke, lw = 2) { pts(c, [a, b]); c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
export function disc(c, x, y, r, fill, stroke, lw = 2) {
  c.beginPath(); c.arc(x, y, r, 0, 7);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}

// outer 안쪽이면서 holes 바깥쪽인 곳에만 그리도록 자른다 (c.save() 후에 쓸 것)
export function clipOut(c, P, outer, holes = []) {
  const add = (names) => {
    names.forEach((n, i) => { const p = typeof n === 'string' ? P[n] : n; i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); });
    c.closePath();
  };
  c.beginPath(); add(outer); c.clip();
  // 구멍끼리 겹쳐도 되도록 하나씩 잘라 낸다
  for (const h of holes) { c.beginPath(); add(SCREEN); add(h); c.clip('evenodd'); }
}

// 창문 줄: vs는 층을 나누는 v 값들, 층마다 cols개의 창
export function windows(c, q, cols, vs, o = {}) {
  const { pu = 0.2, pv = 0.22, fill = 'rgba(66,153,225,.78)', lit = '#ffe066', line = 'rgba(30,42,74,.5)', rows = 1, u0 = 0, u1 = 1, seed = 0 } = o;
  for (let b = 0; b + 1 < vs.length; b++) for (let r = 0; r < rows; r++) {
    const va = vs[b] + (vs[b + 1] - vs[b]) * r / rows, vb = vs[b] + (vs[b + 1] - vs[b]) * (r + 1) / rows, dv = (vb - va) * pv;
    for (let i = 0; i < cols; i++) {
      const ua = u0 + (u1 - u0) * i / cols, ub = u0 + (u1 - u0) * (i + 1) / cols, du = (ub - ua) * pu;
      patch(c, q, ua + du, va + dv, ub - du, vb - dv, (i * 7 + b * 3 + r * 5 + seed) % 6 === 0 ? lit : fill, line, 1.2);
    }
  }
}
// 십자 창살이 있는 창문
export function pane(c, q, u0, v0, u1, v1, frame = '#ffffff', glass = '#a5d8ff') {
  patch(c, q, u0, v0, u1, v1, glass);
  qline(c, q, u0, v0, u1, v1, 'rgba(255,255,255,.55)', 6);
  qline(c, q, (u0 + u1) / 2, v0, (u0 + u1) / 2, v1, frame, 3);
  qline(c, q, u0, (v0 + v1) / 2, u1, (v0 + v1) / 2, frame, 3);
  patch(c, q, u0, v0, u1, v1, null, frame, 5);
  patch(c, q, u0, v0, u1, v1, null, 'rgba(30,42,74,.45)', 1.2);
}
export function sun(c, x, y, r) {
  const g = c.createRadialGradient(x, y, r * 0.4, x, y, r * 2.8);
  g.addColorStop(0, 'rgba(255,236,153,.95)'); g.addColorStop(1, 'rgba(255,236,153,0)');
  disc(c, x, y, r * 2.8, g);
  c.lineCap = 'round';
  for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6;
    seg(c, { x: x + Math.cos(a) * r * 1.25, y: y + Math.sin(a) * r * 1.25 }, { x: x + Math.cos(a) * r * 1.65, y: y + Math.sin(a) * r * 1.65 }, '#ffc42e', 4);
  }
  disc(c, x, y, r, '#fffbe6', '#f5a700', 3);
}
export function cloud(c, x, y, s = 1) {
  const blobs = [[0, 0, 26], [30, -14, 32], [64, -2, 26], [32, 10, 28], [-22, 8, 18], [88, 8, 17]];
  c.fillStyle = 'rgba(120,150,190,.28)';
  blobs.forEach(([dx, dy, r]) => { c.beginPath(); c.arc(x + dx * s, y + (dy + 5) * s, r * s, 0, 7); c.fill(); });
  c.fillStyle = '#ffffff';
  blobs.forEach(([dx, dy, r]) => { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, 7); c.fill(); });
}
export function bird(c, x, y, s = 1) {
  c.strokeStyle = '#495057'; c.lineWidth = 2.5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - 14 * s, y - 4 * s); c.quadraticCurveTo(x - 6 * s, y - 10 * s, x, y);
  c.quadraticCurveTo(x + 6 * s, y - 10 * s, x + 14 * s, y - 4 * s); c.stroke();
}
// 위에서 본 나무
export function treeTop(c, x, y, r = 16) {
  disc(c, x + 4, y + 5, r, 'rgba(30,42,74,.18)');
  disc(c, x, y, r, '#2f9e44', '#237032', 1.5);
  disc(c, x - r * 0.25, y - r * 0.25, r * 0.5, '#69db7c');
}
// 옆에서 본 나무
export function tree(c, x, y, s = 1) {
  seg(c, { x, y }, { x, y: y - 26 * s }, '#7a4a21', 5 * s);
  disc(c, x, y - 40 * s, 20 * s, '#2f9e44', '#237032', 1.5);
  disc(c, x - 6 * s, y - 46 * s, 9 * s, '#69db7c');
}
// 위에서 본 자동차
export function carTop(c, x, y, col) {
  c.fillStyle = 'rgba(30,42,74,.2)'; c.beginPath(); c.roundRect(x - 27, y - 10, 60, 28, 8); c.fill();
  c.fillStyle = col; c.strokeStyle = 'rgba(30,42,74,.6)'; c.lineWidth = 1.5;
  c.beginPath(); c.roundRect(x - 30, y - 14, 60, 28, 8); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.75)';
  c.beginPath(); c.roundRect(x - 12, y - 10, 26, 20, 4); c.fill();
}
// 천장 등
export function lamp(c, x, y0, y1) {
  const g = c.createRadialGradient(x, y1 + 30, 6, x, y1 + 30, 130);
  g.addColorStop(0, 'rgba(255,236,153,.75)'); g.addColorStop(1, 'rgba(255,236,153,0)');
  disc(c, x, y1 + 30, 130, g);
  seg(c, { x, y: y0 }, { x, y: y1 }, '#495057', 3);
  poly(c, [{ x: x - 16, y: y1 }, { x: x + 16, y: y1 }, { x: x + 34, y: y1 + 34 }, { x: x - 34, y: y1 + 34 }], '#ffd43b', '#e8a800', 2.5);
  disc(c, x, y1 + 38, 9, '#fff9db', '#e8a800', 2);
}
