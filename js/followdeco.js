// 따라하기: 그림을 완성했을 때 나타나는 장식
import { lerp } from './geom.js';
import {
  SCREEN, Q, paramOf, even, poly, patch, qline, qcircle, seg, disc, clipOut,
  windows, pane, sun, cloud, bird, treeTop, tree, carTop, lamp,
} from './deco.js';

const centroid = (...ps) => ({ x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length });
const WOOD = 'rgba(120,72,30,.6)';

function doorDetail(c, q) {
  patch(c, q, 0.14, 0.07, 0.86, 0.45, null, WOOD, 2.5);
  patch(c, q, 0.14, 0.55, 0.86, 0.93, null, WOOD, 2.5);
  const k = q(0.84, 0.51);
  disc(c, k.x, k.y, 7, '#ffd43b', '#b8860b', 2);
}
// 옥상 헬기장
function helipad(c, q, cu = 0.5, cv = 0.5, r = 0.3) {
  qcircle(c, q, cu, cv, r, '#868e96', '#ffffff', 4);
  const w = r * 0.35, hh = r * 0.5;
  qline(c, q, cu - w, cv - hh, cu - w, cv + hh, '#ffffff', 4);
  qline(c, q, cu + w, cv - hh, cu + w, cv + hh, '#ffffff', 4);
  qline(c, q, cu - w, cv, cu + w, cv, '#ffffff', 4);
}
function antenna(c, base, top) {
  seg(c, base, top, '#495057', 4);
  disc(c, top.x, top.y, 6, '#ff6b6b', '#c92a2a', 1.5);
}
function sky(c, P, hy, holes, col = 'rgba(150,205,250,.42)') {
  c.save();
  clipOut(c, P, SCREEN, holes);
  const g = c.createLinearGradient(0, 0, 0, hy);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,.15)');
  c.fillStyle = g; c.fillRect(0, 0, 1600, hy);
  c.restore();
}
function ground(c, P, hy, holes, col) {
  c.save();
  clipOut(c, P, SCREEN, holes);
  c.fillStyle = col; c.fillRect(0, hy, 1600, 900 - hy);
  c.restore();
}

// 내려다본 장면의 땅과 길
function streets(c, P, holes) {
  sky(c, P, 90, holes);
  c.save();
  clipOut(c, P, SCREEN, holes);
  c.fillStyle = 'rgba(105,219,124,.3)'; c.fillRect(0, 90, 1600, 810);
  const G = lerp(P.F, P.T, 0.3), M = lerp(P.F, G, 0.5);
  for (const v of ['L', 'R']) poly(c, [lerp(P.F, P[v], -1.5), P[v], lerp(G, P[v], -1.5)], 'rgba(134,142,150,.6)');
  c.setLineDash([22, 18]);
  for (const v of ['L', 'R']) seg(c, lerp(M, P[v], -1.5), P[v], 'rgba(255,255,255,.9)', 3);
  c.setLineDash([]);
  c.restore();
}

export const DECOR = {
  // ---------- 1소점 ----------
  room(c, P) {
    // 마룻바닥 (침대는 피해서)
    const F = Q(P, 'b4', 'b3', 'c3', 'c4');
    c.save();
    clipOut(c, P, ['b4', 'b3', 'c3', 'c4'], [['r4', 'r1', 'r5', 'r6', 'r2', 'r3']]);
    for (let i = 1; i < 12; i++) qline(c, F, i / 12, 0, i / 12, 1, 'rgba(140,90,40,.38)', 2);
    for (let i = 0; i < 12; i++) { const v = ((i * 5) % 7) / 7 * 0.8 + 0.1; qline(c, F, i / 12, v, (i + 1) / 12, v, 'rgba(140,90,40,.3)', 1.5); }
    // 러그
    qcircle(c, F, 0.2, 0.55, 0.13, 'rgba(116,192,252,.55)', 'rgba(28,126,214,.6)', 3);
    c.restore();
    // 걸레받이, 천장 몰딩
    c.fillStyle = 'rgba(141,110,99,.55)'; c.fillRect(560, 576, 480, 14);
    patch(c, Q(P, 'c1', 'b1', 'b4', 'c4'), 0, 0.965, 1, 1, 'rgba(141,110,99,.4)');
    patch(c, Q(P, 'b2', 'c2', 'c3', 'b3'), 0, 0.965, 1, 1, 'rgba(141,110,99,.4)');
    // 창문과 커튼
    const W = Q(P, 'w3', 'w1', 'w2', 'w4');
    pane(c, W, 0, 0, 1, 1, '#ffffff', '#a5d8ff');
    patch(c, W, -0.06, -0.08, 0.14, 1.06, 'rgba(255,146,43,.75)', 'rgba(180,90,10,.6)', 1.5);
    patch(c, W, 0.86, -0.08, 1.06, 1.06, 'rgba(255,146,43,.75)', 'rgba(180,90,10,.6)', 1.5);
    qline(c, W, -0.1, -0.1, 1.1, -0.1, '#5c3d1e', 5);
    // 문
    doorDetail(c, Q(P, 'd2', 'd3', 'd4', 'd1'));
    // 액자 속 풍경
    c.fillStyle = '#d0ebff'; c.fillRect(712, 342, 176, 106);
    disc(c, 852, 368, 12, '#ffd43b');
    poly(c, [{ x: 712, y: 448 }, { x: 760, y: 392 }, { x: 800, y: 426 }, { x: 836, y: 400 }, { x: 888, y: 448 }], '#51cf66', '#2f9e44', 1.5);
    c.strokeStyle = '#7a4a21'; c.lineWidth = 7; c.strokeRect(704, 334, 192, 122);
    // 침대: 베개와 이불
    const T = Q(P, 'r5', 'r6', 'r2', 'r1');
    patch(c, T, 0.08, 0.08, 0.46, 0.42, '#ffffff', 'rgba(30,42,74,.4)', 1.5);
    patch(c, T, 0.54, 0.08, 0.92, 0.42, '#ffffff', 'rgba(30,42,74,.4)', 1.5);
    patch(c, T, 0, 0.56, 1, 1, 'rgba(240,101,149,.55)');
    qline(c, T, 0, 0.56, 1, 0.56, '#c2255c', 3);
    c.fillStyle = 'rgba(240,101,149,.5)'; c.fillRect(640, 700, 320, 60);
    c.fillStyle = '#7a4a21'; c.fillRect(646, 810, 14, 12); c.fillRect(940, 810, 14, 12);
    // 천장 등
    lamp(c, 800, 150, 196);
  },
  skyup(c) {
    cloud(c, 250, 455, 0.9); cloud(c, 985, 475, 0.75);
    bird(c, 930, 395, 0.9); bird(c, 975, 412, 0.7);
  },
  cityabove(c, P) {
    // 도로 표시
    c.save();
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(30, 400); c.lineTo(1570, 400); c.moveTo(30, 500); c.lineTo(1570, 500); c.stroke();
    c.strokeStyle = '#ffd43b'; c.lineWidth = 4; c.setLineDash([38, 26]);
    c.beginPath(); c.moveTo(30, 450); c.lineTo(740, 450); c.moveTo(860, 450); c.lineTo(1570, 450); c.stroke();
    c.setLineDash([]);
    c.fillStyle = 'rgba(255,255,255,.92)';
    for (let y = 404; y < 496; y += 15) { c.fillRect(1180, y, 64, 8); c.fillRect(96, y, 64, 8); }
    c.restore();
    carTop(c, 330, 425, '#e03131'); carTop(c, 560, 476, '#1c7ed6'); carTop(c, 1010, 425, '#f59f00'); carTop(c, 1390, 476, '#2f9e44'); carTop(c, 1470, 425, '#ffffff');
    // 가로수
    [[150, 345], [300, 368], [470, 376], [1100, 368], [1300, 350], [1480, 372], [120, 560], [300, 536], [480, 530], [1100, 532], [1300, 548], [1480, 600]].forEach(([x, y]) => treeTop(c, x, y, 17));
    // 벽의 창문
    const dark = { fill: 'rgba(30,42,74,.45)', lit: 'rgba(255,224,102,.8)' };
    windows(c, Q(P, 'a4', 'a3', 'a3f', 'a4f'), 13, even(5));
    windows(c, Q(P, 'c4', 'c3', 'c3f', 'c4f'), 8, even(6), { seed: 2 });
    windows(c, Q(P, 'c1', 'c4', 'c4f', 'c1f'), 3, even(6), dark);
    windows(c, Q(P, 's1', 's2', 's2f', 's1f'), 7, even(5), { seed: 4 });
    windows(c, Q(P, 's2', 's3', 's3f', 's2f'), 3, even(5), dark);
    windows(c, Q(P, 'u1', 'u2', 'u2f', 'u1f'), 12, even(6), { seed: 1 });
    // 옥상
    const box = (x, y, w, h, f = '#dee2e6') => { c.fillStyle = 'rgba(30,42,74,.15)'; c.fillRect(x + 5, y + 5, w, h); c.fillStyle = f; c.strokeStyle = 'rgba(30,42,74,.55)'; c.lineWidth = 1.5; c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h); };
    const solar = (x, y, w, h) => { box(x, y, w, h, '#364fc7'); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x + w * i / 4, y); c.lineTo(x + w * i / 4, y + h); c.stroke(); } c.beginPath(); c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); c.stroke(); };
    disc(c, 320, 100, 46, '#adb5bd', '#ffffff', 4);
    c.fillStyle = '#ffffff'; c.font = '700 50px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('H', 320, 103);
    box(470, 60, 70, 44); box(560, 60, 70, 44); box(690, 80, 130, 60, '#a5d8ff');
    c.strokeStyle = 'rgba(30,42,74,.3)'; c.lineWidth = 2; c.strokeRect(212, 42, 656, 116);
    disc(c, 1070, 76, 25, '#ced4da', 'rgba(30,42,74,.55)', 1.5); disc(c, 1140, 76, 25, '#ced4da', 'rgba(30,42,74,.55)', 1.5);
    solar(1210, 50, 80, 50); solar(1310, 50, 80, 50);
    box(202, 760, 170, 100, '#8ce99a'); [[240, 790], [300, 830], [340, 785]].forEach(([x, y]) => treeTop(c, x, y, 16));
    box(420, 775, 100, 70); disc(c, 470, 810, 22, '#adb5bd', 'rgba(30,42,74,.5)', 1.5);
    for (let i = 0; i < 6; i++) solar(815 + i * 96, 818, 76, 44);
  },

  // ---------- 2소점 ----------
  house(c, P) {
    const body = ['K', 'AR', 'BR', 'B', 'BL', 'AL', 'KL'];
    sky(c, P, 430, [body]);
    ground(c, P, 430, [body], 'rgba(105,219,124,.4)');
    sun(c, 1330, 130, 40); cloud(c, 230, 150, 1); cloud(c, 1040, 80, 0.7); bird(c, 520, 110); bird(c, 570, 135, 0.7);
    // 현관 앞 길
    const e1 = lerp(P.d1, P.L, -0.3), e4 = lerp(P.d4, P.L, -0.3);
    poly(c, [P.d1, P.d4, e4, e1], '#f1dfb6', 'rgba(140,110,60,.5)', 1.5);
    // 지붕 기와
    const R = Q(P, 'A', 'AL', 'KL', 'K');
    for (let i = 1; i < 8; i++) qline(c, R, 0, i / 8, 1, i / 8, 'rgba(130,50,0,.5)', 2);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 9; j++) { const u = (j + (i % 2) * 0.5) / 9; if (u > 0.02 && u < 0.98) qline(c, R, u, i / 8, u, (i + 1) / 8, 'rgba(130,50,0,.28)', 1.5); }
    // 굴뚝
    const ch = R(0.62, 0.55);
    poly(c, [{ x: ch.x - 18, y: ch.y }, { x: ch.x - 18, y: ch.y - 62 }, { x: ch.x + 18, y: ch.y - 62 }, { x: ch.x + 18, y: ch.y + 8 }], '#c9695a', '#7a2e22', 2.5);
    c.fillStyle = '#7a2e22'; c.fillRect(ch.x - 23, ch.y - 70, 46, 10);
    [[0, -92, 13], [10, -116, 17], [-4, -144, 21]].forEach(([dx, dy, r]) => disc(c, ch.x + dx, ch.y + dy, r, 'rgba(206,212,218,.75)'));
    // 창문과 문
    const WL = Q(P, 'A', 'AL', 'BL', 'B'), WR = Q(P, 'A', 'AR', 'BR', 'B');
    pane(c, WL, 0.14, 0.3, 0.42, 0.68); pane(c, WL, 0.58, 0.3, 0.86, 0.68);
    pane(c, WR, 0.72, 0.3, 0.93, 0.64);
    const gc = centroid(P.A, P.K, P.AR);
    c.beginPath(); c.ellipse(gc.x, gc.y + 6, 17, 21, 0, 0, 7); c.fillStyle = '#a5d8ff'; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.stroke();
    doorDetail(c, Q(P, 'd2', 'd3', 'd4', 'd1'));
    // 덤불과 나무
    disc(c, P.BL.x - 34, P.BL.y + 4, 30, '#40c057', '#2b8a3e', 2); disc(c, P.BL.x - 70, P.BL.y + 16, 22, '#51cf66', '#2b8a3e', 2);
    disc(c, P.BR.x + 34, P.BR.y + 6, 26, '#40c057', '#2b8a3e', 2);
    tree(c, 1210, 600, 2.2); tree(c, 250, 560, 1.6);
  },
  roomcorner(c, P) {
    const WL = Q(P, 'lt', 'A', 'B', 'lb'), WR = Q(P, 'A', 'rt', 'rb', 'B');
    // 걸레받이 (문은 피해서)
    c.save(); clipOut(c, P, ['lt', 'A', 'B', 'lb'], [['d1', 'd2', 'd3', 'd4']]);
    patch(c, WL, 0, 0.955, 1, 1, 'rgba(120,90,60,.5)'); c.restore();
    patch(c, WR, 0, 0.955, 1, 1, 'rgba(120,90,60,.5)');
    patch(c, WL, 0, 0, 1, 0.03, 'rgba(255,255,255,.7)'); patch(c, WR, 0, 0, 1, 0.03, 'rgba(255,255,255,.7)');
    // 액자 속 그림
    const A = Q(P, 'p1', 'p3', 'p4', 'p2');
    patch(c, A, 0.08, 0.08, 0.92, 0.92, '#fff3bf');
    poly(c, [A(0.08, 0.92), A(0.32, 0.45), A(0.52, 0.7), A(0.68, 0.5), A(0.92, 0.92)], '#69db7c', '#2f9e44', 1.5);
    const s = A(0.72, 0.28); disc(c, s.x, s.y, 9, '#ff922b');
    patch(c, A, 0.08, 0.08, 0.92, 0.92, null, 'rgba(30,42,74,.4)', 1.2);
    patch(c, A, 0, 0, 1, 1, null, '#6b4423', 7);
    // 문
    doorDetail(c, Q(P, 'd2', 'd3', 'd4', 'd1'));
    // 창문, 커튼
    const W = Q(P, 'w3', 'w1', 'w2', 'w4');
    pane(c, W, 0, 0, 1, 1);
    patch(c, W, -0.05, -0.06, 0.15, 1.05, 'rgba(250,82,82,.7)', 'rgba(160,30,30,.6)', 1.5);
    patch(c, W, 0.85, -0.06, 1.05, 1.05, 'rgba(250,82,82,.7)', 'rgba(160,30,30,.6)', 1.5);
    qline(c, W, -0.09, -0.08, 1.09, -0.08, '#5c3d1e', 5);
    // 화분
    poly(c, [{ x: 1150, y: 786 }, { x: 1216, y: 786 }, { x: 1204, y: 846 }, { x: 1162, y: 846 }], '#d9480f', '#7a2e0b', 2.5);
    [[1183, 730, 34], [1156, 752, 24], [1212, 750, 24], [1183, 696, 22]].forEach(([x, y, r]) => disc(c, x, y, r, '#40c057', '#2b8a3e', 2));
    // 천장 등
    lamp(c, 800, 70, 128);
  },
  cityblock(c, P) {
    const b = (p) => [p + 'AL', p + 'A', p + 'AR', p + 'BR', p + 'B', p + 'BL'];
    const holes = [b('c'), b('l'), b('r'), ['pAL', 'pC', 'pAR', 'pBR', 'pB', 'pBL']];
    sky(c, P, 470, holes);
    ground(c, P, 470, holes, 'rgba(173,181,189,.3)');
    sun(c, 1390, 110, 38); cloud(c, 190, 150, 1); cloud(c, 770, 80, 0.7); cloud(c, 1330, 300, 0.6); bird(c, 720, 170); bird(c, 680, 195, 0.7);
    const walls = (p, cols, vs, seed) => {
      windows(c, Q(P, p + 'A', p + 'AL', p + 'BL', p + 'B'), cols, vs, { rows: 2, seed });
      windows(c, Q(P, p + 'A', p + 'AR', p + 'BR', p + 'B'), cols, vs, { rows: 2, seed: seed + 3, fill: 'rgba(37,99,180,.8)' });
    };
    walls('l', 3, even(5), 0); walls('r', 3, even(5), 2);
    walls('c', 3, [0, (400 - 260) / 460, (570 - 260) / 460, 1], 1);
    // 가운데 빌딩 입구
    const CR = Q(P, 'cA', 'cAR', 'cBR', 'cB');
    patch(c, CR, 0.3, 0.87, 0.72, 1, '#343a40', '#ffffff', 2);
    qline(c, CR, 0.51, 0.87, 0.51, 1, '#ffffff', 2);
    patch(c, CR, 0.24, 0.84, 0.78, 0.87, '#f59f00');
    // 옥상 안테나, 바닥 판의 나무와 선
    antenna(c, lerp(P.lA, P.lAR, 0.4), { x: lerp(P.lA, P.lAR, 0.4).x, y: lerp(P.lA, P.lAR, 0.4).y - 70 });
    antenna(c, lerp(P.rA, P.rAL, 0.4), { x: lerp(P.rA, P.rAL, 0.4).x, y: lerp(P.rA, P.rAL, 0.4).y - 55 });
    const S = Q(P, 'pA', 'pAL', 'pC', 'pAR');
    [[0.28, 0.035], [0.52, 0.035], [0.74, 0.035], [0.035, 0.28], [0.035, 0.52], [0.035, 0.74]].forEach(([u, v]) => { const t = S(u, v); tree(c, t.x, t.y, 0.8); });
  },

  // ---------- 3소점 ----------
  bird(c, P) {
    streets(c, P, [['NL', 'C', 'NR', 'FR', 'F', 'FL']]);
    const WL = Q(P, 'N', 'NL', 'FL', 'F'), WR = Q(P, 'N', 'NR', 'FR', 'F');
    const vs = [0, paramOf(WL, P.m0), paramOf(WL, P.m1), 1];
    windows(c, WL, 4, vs, { rows: 3 });
    windows(c, WR, 4, vs, { rows: 3, seed: 3, fill: 'rgba(37,99,180,.8)' });
    const R = Q(P, 'N', 'NL', 'C', 'NR');
    patch(c, R, 0.04, 0.04, 0.96, 0.96, null, 'rgba(30,42,74,.3)', 2);
    helipad(c, R, 0.56, 0.56, 0.28);
    patch(c, R, 0.08, 0.1, 0.24, 0.3, '#dee2e6', 'rgba(30,42,74,.55)', 1.5);
    patch(c, R, 0.1, 0.72, 0.26, 0.9, '#dee2e6', 'rgba(30,42,74,.55)', 1.5);
    // 입구와 차양
    patch(c, WR, 0.3, 0.9, 0.7, 1, '#343a40', '#ffffff', 2);
    patch(c, WR, 0.24, 0.875, 0.76, 0.9, '#f59f00');
  },
  worm(c, P) {
    const body = ['N', 'NL', 'FL', 'F', 'FR', 'NR'];
    sky(c, P, 820, [body]);
    ground(c, P, 820, [body], 'rgba(173,181,189,.5)');
    sun(c, 290, 170, 46); cloud(c, 1240, 230, 1.1); cloud(c, 240, 470, 0.8); cloud(c, 1310, 560, 0.7);
    bird(c, 1120, 120); bird(c, 1170, 150, 0.7); bird(c, 470, 300, 0.8);
    const WL = Q(P, 'N', 'NL', 'FL', 'F'), WR = Q(P, 'N', 'NR', 'FR', 'F');
    const vs = [0, paramOf(WL, P.m0), paramOf(WL, P.m1), paramOf(WL, P.m2), 1];
    const uL = paramOf(WL, P.q1, false), uR = paramOf(WR, P.q2, false);
    windows(c, WL, 2, vs, { rows: 2, u1: uL }); windows(c, WL, 2, vs, { rows: 2, u0: uL, seed: 2 });
    const o = { rows: 2, fill: 'rgba(37,99,180,.8)' };
    windows(c, WR, 2, vs, { ...o, u1: uR, seed: 1 }); windows(c, WR, 2, vs, { ...o, u0: uR, seed: 4 });
    // 정문
    patch(c, WR, uR - 0.2, 0, uR + 0.2, vs[1] * 0.42, '#343a40', '#ffffff', 2.5);
    qline(c, WR, uR, 0, uR, vs[1] * 0.42, '#ffffff', 2.5);
    patch(c, WR, uR - 0.26, vs[1] * 0.42, uR + 0.26, vs[1] * 0.5, '#f59f00');
    antenna(c, P.F, lerp(P.F, P.T, 0.22));
  },
  penthouse(c, P) {
    streets(c, P, [['NL', 'C', 'NR', 'FR', 'F', 'FL'], ['N2L', 'C2', 'N2R', 'F2R', 'N', 'F2L']]);
    const o2 = { rows: 2, seed: 3, fill: 'rgba(37,99,180,.8)' };
    windows(c, Q(P, 'N', 'NL', 'FL', 'F'), 6, even(2), { rows: 2 });
    windows(c, Q(P, 'N', 'NR', 'FR', 'F'), 6, even(2), o2);
    windows(c, Q(P, 'N2', 'N2L', 'F2L', 'N'), 3, even(2), { rows: 1, fill: 'rgba(116,66,200,.7)' });
    windows(c, Q(P, 'N2', 'N2R', 'F2R', 'N'), 3, even(2), { rows: 1, seed: 2, fill: 'rgba(90,50,170,.8)' });
    // 아래 건물 옥상 정원 (옥탑은 피해서)
    const R = Q(P, 'N', 'NL', 'C', 'NR');
    c.save();
    clipOut(c, P, ['N', 'NL', 'C', 'NR'], [['N2L', 'C2', 'N2R', 'F2R', 'N', 'F2L']]);
    patch(c, R, 0.04, 0.04, 0.96, 0.96, null, 'rgba(30,42,74,.3)', 2);
    patch(c, R, 0.55, 0.55, 0.9, 0.9, 'rgba(105,219,124,.8)', '#2b8a3e', 2);
    [[0.64, 0.64], [0.8, 0.66], [0.66, 0.8], [0.82, 0.82]].forEach(([u, v]) => qcircle(c, R, u, v, 0.05, '#2f9e44', '#237032', 1.5));
    patch(c, R, 0.62, 0.1, 0.9, 0.3, '#364fc7', 'rgba(255,255,255,.7)', 1.5);
    patch(c, R, 0.1, 0.62, 0.3, 0.9, '#364fc7', 'rgba(255,255,255,.7)', 1.5);
    c.restore();
    // 옥탑 지붕
    const R2 = Q(P, 'N2', 'N2L', 'C2', 'N2R');
    helipad(c, R2, 0.5, 0.5, 0.3);
  },
};
