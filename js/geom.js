// 2D 기하 도우미
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
export const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const cross = (a, b) => a.x * b.y - a.y * b.x;
export const dot = (a, b) => a.x * b.x + a.y * b.y;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const rnd = (a, b) => a + Math.random() * (b - a);

// 두 직선(ab, cd)의 교점
export function lineInt(a, b, c, d) {
  const r = sub(b, a), s = sub(d, c);
  const k = cross(r, s);
  if (Math.abs(k) < 1e-9) return null;
  const t = cross(sub(c, a), s) / k;
  return add(a, mul(r, t));
}

// p를 선분 ab에 투영했을 때의 매개변수
export function segT(p, a, b) {
  const ab = sub(b, a);
  const l = dot(ab, ab) || 1;
  return dot(sub(p, a), ab) / l;
}

export function distSeg(p, a, b) {
  const t = clamp(segT(p, a, b), 0, 1);
  return dist(p, lerp(a, b, t));
}

export function inPoly(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

// 경계에서 m 이상 떨어진 내부에 있는가
export function deepIn(p, poly, m = 3) {
  if (!inPoly(p, poly)) return false;
  for (let i = 0; i < poly.length; i++) {
    if (distSeg(p, poly[i], poly[(i + 1) % poly.length]) < m) return false;
  }
  return true;
}

export function bbox(points) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of points) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1 };
}
