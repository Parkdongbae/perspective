// 따라하기: 널리 쓰이는 투시도 튜토리얼의 순서를 단계별로 따라 그린다
import { lerp, lineInt } from './geom.js';
import { DECOR } from './followdeco.js';

function B(kind, vps, hy) {
  const pt = {}, steps = [];
  const S = { given: [], rays: [], edges: [], faces: [], guides: [] };
  let n = 0;
  const cur = () => Math.max(0, steps.length - 1);
  const o = {
    p: pt,
    pt(name, x, y) { pt[name] = { x, y }; return o; },
    int(name, a, b, c, d) { pt[name] = lineInt(pt[a], pt[b], pt[c], pt[d]); return o; },
    atX(name, a, b, x) { pt[name] = lineInt(pt[a], pt[b], { x, y: 0 }, { x, y: 100 }); return o; },
    atY(name, a, b, y) { pt[name] = lineInt(pt[a], pt[b], { x: 0, y }, { x: 100, y }); return o; },
    lerp(name, a, b, t) { pt[name] = lerp(pt[a], pt[b], t); return o; },
    step(title, text) { steps.push({ title, text }); return o; },
    given(...names) { for (let i = 0; i + 1 < names.length; i++) S.given.push([names[i], names[i + 1], cur()]); return o; },
    ray(from, vp, to, opt = {}) { S.rays.push({ id: 'r' + n++, from, vp, to: to || vp, cut: to ? { g: 1 } : null, step: cur(), ...opt }); return o; },
    edge(a, b, opt = {}) { S.edges.push({ id: 'e' + n++, a, b, step: cur(), ...opt }); return o; },
    face(names, color, under) { const f = { id: 'f' + n++, pts: names, after: cur(), color }; under ? S.faces.unshift(f) : S.faces.push(f); return o; },
    guide(a, b, e = 40) { S.guides.push({ id: 'g' + n++, a, b, e0: e, e1: e, step: cur() }); return o; },
    decor(fn) { o.decorFn = fn; return o; },
    model() { return { kind, steps, vps, hy: () => hy, compute: () => pt, struct: () => S, decor: o.decorFn }; },
  };
  return o;
}

// ---------- 1소점 ----------
function room() {
  const b = B(1, { V: '소점' }, null);
  b.pt('V', 800, 430);
  b.pt('b1', 560, 270).pt('b2', 1040, 270).pt('b3', 1040, 590).pt('b4', 560, 590);
  b.pt('c1', 200, 30).pt('c2', 1400, 30).pt('c3', 1400, 830).pt('c4', 200, 830);
  b.step('방의 모서리선', '가운데 사각형은 방의 뒷벽이에요. 뒷벽의 네 꼭짓점에서 바깥 점까지 선을 그어요. 이 선들을 거꾸로 늘이면 모두 소점에서 만나요.');
  b.given('b1', 'b2', 'b3', 'b4', 'b1');
  b.edge('b1', 'c1').edge('b2', 'c2').edge('b3', 'c3').edge('b4', 'c4');
  b.face(['c1', 'c2', 'b2', 'b1'], '#f1f3f5').face(['c4', 'c3', 'b3', 'b4'], '#f3d9b1');
  b.face(['c1', 'b1', 'b4', 'c4'], '#d6ecff').face(['c2', 'b2', 'b3', 'c3'], '#c3e2fb').face(['b1', 'b2', 'b3', 'b4'], '#eaf5ff');
  b.step('왼쪽 벽의 문', '문의 세로선은 수직이에요. 문 위쪽 선은 소점을 향해 그은 뒤 점선 뒤쪽을 지우고, 마지막으로 뒤쪽 세로선을 그어요.');
  b.atX('d1', 'b4', 'c4', 250).pt('d2', 250, 300).given('d1', 'd2');
  b.atX('d3', 'd2', 'V', 400).atX('d4', 'b4', 'c4', 400).guide('d3', 'd4');
  b.ray('d2', 'V', 'd3').edge('d3', 'd4').face(['d1', 'd2', 'd3', 'd4'], '#c9a27a');
  b.step('오른쪽 벽의 창문', '창문의 위아래 선도 소점으로 모여요. 두 선을 소점까지 긋고 점선 뒤쪽을 지운 다음, 세로선으로 닫아요.');
  b.pt('w1', 1350, 280).pt('w2', 1350, 520).given('w1', 'w2');
  b.atX('w3', 'w1', 'V', 1170).atX('w4', 'w2', 'V', 1170).guide('w3', 'w4');
  b.ray('w1', 'V', 'w3').ray('w2', 'V', 'w4').edge('w3', 'w4').face(['w1', 'w3', 'w4', 'w2'], '#fff3bf');
  b.step('바닥 위의 침대', '정면을 보는 사각형에서 시작해요. 위쪽 두 꼭짓점을 소점으로 잇고, 점선 뒤쪽을 지운 뒤 뒤 모서리를 그으면 상자가 돼요.');
  b.pt('r1', 640, 700).pt('r2', 960, 700).pt('r3', 960, 810).pt('r4', 640, 810).given('r1', 'r2', 'r3', 'r4', 'r1');
  b.atY('r5', 'r1', 'V', 630).atY('r6', 'r2', 'V', 630).guide('r5', 'r6');
  b.ray('r1', 'V', 'r5').ray('r2', 'V', 'r6').edge('r5', 'r6');
  b.face(['r1', 'r2', 'r6', 'r5'], '#ffc9c9').face(['r1', 'r2', 'r3', 'r4'], '#ffa8a8');
  b.step('뒷벽의 액자', '뒷벽처럼 정면을 보는 면에 있는 것은 모양이 변하지 않아요. 점을 차례로 이어 네모난 액자를 그려요.');
  b.pt('k1', 700, 330).pt('k2', 900, 330).pt('k3', 900, 460).pt('k4', 700, 460);
  b.edge('k1', 'k2').edge('k2', 'k3').edge('k3', 'k4').edge('k4', 'k1').face(['k1', 'k2', 'k3', 'k4'], '#ffe066');
  return b.model();
}

// 땅에서 하늘을 똑바로 올려다본 마천루: 세로 모서리가 하늘 한가운데 소점으로 모인다
function cityWalls() {
  const b = B(1, { V: '소점' }, null);
  b.pt('V', 800, 450).pt('TL', 30, 30).pt('TR', 1570, 30).pt('BL', 30, 870).pt('BR', 1570, 870);
  const out = (name, c) => { // 소점에서 c를 지나 화면 가장자리에 닿는 점
    const v = b.p.V, dx = b.p[c].x - v.x, dy = b.p[c].y - v.y;
    const t = Math.min(dx ? ((dx > 0 ? 1570 : 30) - v.x) / dx : 1e9, dy ? ((dy > 0 ? 870 : 30) - v.y) / dy : 1e9);
    b.pt(name, v.x + dx * t, v.y + dy * t);
  };
  b.pt('P1', 600, 330).pt('Pa', 30, 330).pt('Pb', 600, 30).pt('Q1', 770, 330).pt('Q2', 860, 330);
  b.pt('R1', 1100, 240).pt('Ra', 1570, 240).pt('Rb', 1100, 30);
  b.pt('S1', 520, 560).pt('Sa', 30, 560).pt('Sb', 520, 870).pt('U1', 720, 600).pt('U2', 940, 600);
  b.pt('W1', 1250, 540).pt('Wa', 1570, 540).pt('Wb', 1250, 870);
  ['P1', 'Q1', 'Q2', 'R1', 'S1', 'U1', 'U2', 'W1'].forEach((c) => out('o' + c, c));
  const front = '#ffffff', side = '#aab2bb';
  b.step('위쪽 마천루의 꼭대기 선', '빌딩 숲 한가운데에 서서 하늘을 똑바로 올려다본 모습이에요. 건물 꼭대기의 테두리는 가로선과 세로선 그대로 보여요. 점과 점을 이어 위쪽 마천루 세 채의 꼭대기 선을 그려요.');
  b.edge('Pa', 'P1').edge('P1', 'Pb').edge('Q1', 'Q2').edge('R1', 'Ra').edge('R1', 'Rb');
  b.face(['TL', 'TR', 'BR', 'BL'], '#cfe8fc');
  b.step('위쪽 마천루의 세로 모서리', '올려다보면 건물의 세로 모서리가 모두 하늘 한가운데의 소점으로 모여요. 화면 가장자리의 점(건물의 아래쪽)에서 소점까지 긋고, 건물 꼭대기를 지난 부분은 눌러서 지워요.');
  ['P1', 'Q1', 'Q2', 'R1'].forEach((c) => b.ray('o' + c, 'V', c));
  b.face(['Pa', 'P1', 'oP1', 'TL'], front).face(['P1', 'Pb', 'oP1'], side);
  b.face(['Q1', 'Q2', 'oQ2', 'oQ1'], front);
  b.face(['R1', 'Ra', 'TR', 'oR1'], front).face(['R1', 'Rb', 'oR1'], side);
  b.step('아래쪽 마천루의 꼭대기 선', '내 뒤쪽에도 마천루 세 채가 솟아 있어요. 같은 방법으로 꼭대기 선을 이어요.');
  b.edge('Sa', 'S1').edge('S1', 'Sb').edge('U1', 'U2').edge('W1', 'Wa').edge('W1', 'Wb');
  b.step('아래쪽 마천루의 세로 모서리', '이 마천루들의 세로 모서리도 같은 소점을 향해요. 가장자리의 점에서 소점까지 긋고 꼭대기를 지난 부분을 지워요. 다 그리면 하늘에 해가 뜨고 유리벽이 빛나요!');
  ['S1', 'U1', 'U2', 'W1'].forEach((c) => b.ray('o' + c, 'V', c));
  b.face(['Sa', 'S1', 'oS1'], front).face(['S1', 'Sb', 'BL', 'oS1'], side);
  b.face(['U1', 'U2', 'oU2', 'oU1'], front);
  b.face(['W1', 'Wa', 'oW1'], front).face(['W1', 'Wb', 'BR', 'oW1'], side);
  // 완성되면 태양과 유리벽에 빛나는 선이 나타난다
  const walls = [[['Pa', 'P1', 'oP1', 'TL'], 1], [['P1', 'Pb', 'oP1'], 0], [['Q1', 'Q2', 'oQ2', 'oQ1'], 1], [['R1', 'Ra', 'TR', 'oR1'], 1], [['R1', 'Rb', 'oR1'], 0],
    [['Sa', 'S1', 'oS1'], 1], [['S1', 'Sb', 'BL', 'oS1'], 0], [['U1', 'U2', 'oU2', 'oU1'], 1], [['W1', 'Wa', 'oW1'], 1], [['W1', 'Wb', 'BR', 'oW1'], 0]];
  b.decor((c, P) => {
    const v = P.V, sun = { x: 668, y: 452 };
    c.save();
    c.lineCap = 'round';
    for (const [names, lit] of walls) {
      c.save();
      c.beginPath();
      names.forEach((n, i) => (i ? c.lineTo(P[n].x, P[n].y) : c.moveTo(P[n].x, P[n].y)));
      c.closePath(); c.clip();
      for (let k = 0; k < 90; k++) {
        const a = (k + 0.5) * Math.PI / 45, strong = k % 3 === 0;
        c.strokeStyle = lit ? (strong ? 'rgba(255,196,46,.95)' : 'rgba(255,214,102,.6)') : 'rgba(255,255,255,.55)';
        c.lineWidth = strong ? 3 : 1.6;
        c.beginPath(); c.moveTo(v.x, v.y); c.lineTo(v.x + Math.cos(a) * 2000, v.y + Math.sin(a) * 2000); c.stroke();
      }
      c.restore();
    }
    const g = c.createRadialGradient(sun.x, sun.y, 20, sun.x, sun.y, 120);
    g.addColorStop(0, 'rgba(255,236,153,.95)'); g.addColorStop(1, 'rgba(255,236,153,0)');
    c.fillStyle = g; c.beginPath(); c.arc(sun.x, sun.y, 120, 0, 7); c.fill();
    c.strokeStyle = '#ffc42e'; c.lineWidth = 4;
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6;
      c.beginPath(); c.moveTo(sun.x + Math.cos(a) * 54, sun.y + Math.sin(a) * 54); c.lineTo(sun.x + Math.cos(a) * 72, sun.y + Math.sin(a) * 72); c.stroke();
    }
    c.fillStyle = '#fffbe6'; c.strokeStyle = '#f5a700'; c.lineWidth = 3;
    c.beginPath(); c.arc(sun.x, sun.y, 44, 0, 7); c.fill(); c.stroke();
    c.restore();
  });
  return b.model();
}

// 위에서 내려다본 도시: 큰길 양쪽에 지붕이 보이는 건물
function cityAbove() {
  const b = B(1, { V: '소점' }, null);
  b.pt('V', 800, 450).pt('TL', 30, 30).pt('TR', 1570, 30).pt('BL', 30, 870).pt('BR', 1570, 870);
  b.pt('e1', 30, 390).pt('e2', 1570, 390).pt('e3', 30, 510).pt('e4', 1570, 510);
  const roof = (p, x0, y0, x1, y1) => b.pt(p + 1, x0, y0).pt(p + 2, x1, y0).pt(p + 3, x1, y1).pt(p + 4, x0, y1)
    .given(p + 1, p + 2, p + 3, p + 4, p + 1);
  const foot = (c, k) => b.lerp(c + 'f', 'V', c, k);
  const wall = '#e9ecef', side = '#868e96', top = '#ffffff';
  b.step('큰길 그리기', '도시를 위에서 내려다본 그림이에요. 화면과 나란한 큰길의 양쪽 가장자리는 가로선 그대로예요. 왼쪽 점에서 오른쪽 점으로 이어요.');
  b.edge('e1', 'e2').edge('e3', 'e4');
  b.face(['TL', 'TR', 'BR', 'BL'], '#f1f3f5').face(['e1', 'e2', 'e4', 'e3'], '#ced4da');
  b.step('위쪽 넓은 건물', '네모는 건물의 지붕이에요. 길 쪽 두 꼭짓점에서 소점으로 선을 긋고, 큰길 선을 지난 부분은 눌러서 지워요. 지붕과 길 사이가 건물의 벽이에요.');
  roof('a', 200, 30, 880, 170); foot('a4', 60 / 280); foot('a3', 60 / 280);
  b.ray('a4', 'V', 'a4f').ray('a3', 'V', 'a3f');
  b.face(['a4', 'a3', 'a3f', 'a4f'], wall).face(['a1', 'a2', 'a3', 'a4'], top);
  b.step('위쪽 오른쪽 건물', '소점보다 오른쪽에 있는 건물은 왼쪽 옆벽도 보여요. 꼭짓점 세 개에서 소점으로 긋고, 큰길 선과 점선을 지난 부분을 지운 뒤 짧은 세로선으로 닫아요.');
  roof('c', 1000, 30, 1420, 120); ['c4', 'c3', 'c1'].forEach((c) => foot(c, 60 / 330));
  b.guide('c1f', 'c4f', 45);
  b.ray('c4', 'V', 'c4f').ray('c3', 'V', 'c3f').ray('c1', 'V', 'c1f').edge('c1f', 'c4f');
  b.face(['c1', 'c4', 'c4f', 'c1f'], side).face(['c4', 'c3', 'c3f', 'c4f'], wall).face(['c1', 'c2', 'c3', 'c4'], top);
  b.step('아래 왼쪽 건물', '길 아래쪽 건물도 같은 소점을 써요. 소점보다 왼쪽에 있으니 이번에는 오른쪽 옆벽이 보여요.');
  roof('s', 180, 740, 560, 880); ['s1', 's2', 's3'].forEach((c) => foot(c, 60 / 290));
  b.guide('s2f', 's3f', 45);
  b.ray('s1', 'V', 's1f').ray('s2', 'V', 's2f').ray('s3', 'V', 's3f').edge('s2f', 's3f');
  b.face(['s2', 's3', 's3f', 's2f'], side).face(['s1', 's2', 's2f', 's1f'], wall).face(['s1', 's2', 's3', 's4'], top);
  b.step('아래 오른쪽 건물', '마지막 건물은 소점의 바로 아래에 걸쳐 있어서 길 쪽 벽만 보여요. 두 꼭짓점에서 소점으로 긋고 큰길 선을 지난 부분을 지워요.');
  roof('u', 780, 800, 1400, 880); foot('u1', 60 / 350); foot('u2', 60 / 350);
  b.ray('u1', 'V', 'u1f').ray('u2', 'V', 'u2f');
  b.face(['u1', 'u2', 'u2f', 'u1f'], wall).face(['u1', 'u2', 'u3', 'u4'], top);
  return b.model();
}

// ---------- 2소점 ----------
const VP2 = { L: '왼쪽 소점', R: '오른쪽 소점' };

function walls(b, gxL, gxR, cl, cr) {
  b.atX('AL', 'A', 'L', gxL).atX('BL', 'B', 'L', gxL).atX('AR', 'A', 'R', gxR).atX('BR', 'B', 'R', gxR);
  b.given('A', 'B').guide('AL', 'BL').guide('AR', 'BR');
  b.ray('A', 'L', 'AL').ray('B', 'L', 'BL').ray('A', 'R', 'AR').ray('B', 'R', 'BR');
  b.step('벽 세우기', '점선 위의 두 점을 수직으로 이어 건물의 양쪽 끝 모서리를 세워요. 2소점에서 세로선은 언제나 수직이에요.');
  b.edge('AL', 'BL').edge('AR', 'BR');
  b.face(['A', 'AL', 'BL', 'B'], cl).face(['A', 'AR', 'BR', 'B'], cr);
}

function house() {
  const b = B(2, { L: '왼쪽 소점', R: '오른쪽 소점' }, 430);
  b.pt('L', 100, 430).pt('R', 1500, 430).pt('A', 700, 330).pt('B', 700, 640);
  b.step('벽의 위아래 선', '집의 가장 가까운 세로 모서리에서 시작해요. 위·아래 끝에서 양쪽 소점으로 선을 긋고, 점선을 지난 부분은 눌러서 지워요.');
  walls(b, 440, 1000, '#ffe8cc', '#ffd8a8');
  b.step('벽의 중심 찾기', '오른쪽 벽에 대각선 두 개로 X를 그어요. 두 대각선이 만나는 곳이 투시도에서의 벽 한가운데예요.');
  b.edge('A', 'BR', { aux: 1 }).edge('B', 'AR', { aux: 1 }).int('M', 'A', 'BR', 'B', 'AR');
  b.step('지붕 높이 정하기', '벽의 중심에서 수직선을 위로 올려요. 이 선의 끝이 지붕 꼭대기가 돼요.');
  b.pt('K', b.p.M.x, 170).edge('M', 'K', { aux: 1 });
  b.step('박공 그리기', '지붕 꼭대기에서 벽의 위쪽 두 모서리로 선을 이으면 세모난 박공이 생겨요.');
  b.edge('K', 'A').edge('K', 'AR').face(['A', 'K', 'AR'], '#ffc078');
  b.step('용마루 그리기', '용마루는 왼쪽 벽과 나란하니까 왼쪽 소점을 향해요. 꼭대기에서 왼쪽 소점으로 긋고 점선 뒤쪽을 지워요.');
  b.int('Ah', 'AL', 'R', 'AR', 'L').int('Bh', 'BL', 'R', 'BR', 'L').int('Mh', 'AL', 'Bh', 'BL', 'Ah');
  b.atX('KL', 'K', 'L', b.p.Mh.x).pt('KL2', b.p.Mh.x, b.p.KL.y + 110).guide('KL', 'KL2', 50);
  b.ray('K', 'L', 'KL');
  b.step('지붕 마무리', '용마루 끝에서 왼쪽 벽의 뒤 모서리 위로 이으면 지붕이 완성돼요.');
  b.edge('KL', 'AL').face(['A', 'K', 'KL', 'AL'], '#ff922b');
  b.step('문 달기', '오른쪽 벽에 문을 그려요. 세로선은 수직으로, 문 위쪽 선은 오른쪽 소점을 향해 그은 뒤 점선 뒤쪽을 지워요.');
  b.atX('d1', 'B', 'BR', 790).pt('d2', 790, 480).atX('d3', 'd2', 'R', 880).atX('d4', 'B', 'BR', 880).guide('d3', 'd4', 30);
  b.edge('d1', 'd2').ray('d2', 'R', 'd3').edge('d3', 'd4').face(['d1', 'd2', 'd3', 'd4'], '#8d6e63');
  return b.model();
}

// 모서리를 마주 보는 방
function roomCorner() {
  const b = B(2, VP2, 450);
  b.pt('L', 60, 450).pt('R', 1540, 450).pt('A', 800, 250).pt('B', 800, 640);
  b.pt('c1', 150, 30).pt('c2', 1450, 30).pt('f1', 150, 870).pt('f2', 1450, 870);
  b.atX('lt', 'R', 'A', 150).atX('lb', 'R', 'B', 150).atX('rt', 'L', 'A', 1450).atX('rb', 'L', 'B', 1450);
  b.step('천장과 바닥 선', '가운데 세로선은 방의 구석 모서리예요. 방 안에서는 벽의 선이 모서리를 지나 반대쪽 소점으로 향해요. 바깥 점 네 개에서 건너편 소점으로 긋고, 모서리를 지난 부분은 눌러서 지워요.');
  b.given('A', 'B');
  b.ray('lt', 'R', 'A').ray('lb', 'R', 'B').ray('rt', 'L', 'A').ray('rb', 'L', 'B');
  b.face(['c1', 'c2', 'rt', 'A', 'lt'], '#f1f3f5').face(['f1', 'f2', 'rb', 'B', 'lb'], '#f3e3c8');
  b.face(['lt', 'A', 'B', 'lb'], '#dcecfb').face(['rt', 'A', 'B', 'rb'], '#c7e0f7');
  b.step('왼쪽 벽의 액자', '왼쪽 벽에 걸린 것은 오른쪽 소점을 써요. 액자의 세로선 위·아래 끝에서 오른쪽 소점으로 긋고, 점선 뒤쪽을 지운 뒤 세로선으로 닫아요.');
  b.pt('p1', 300, 230).pt('p2', 300, 430).given('p1', 'p2');
  b.atX('p3', 'p1', 'R', 440).atX('p4', 'p2', 'R', 440).guide('p3', 'p4');
  b.ray('p1', 'R', 'p3').ray('p2', 'R', 'p4').edge('p3', 'p4').face(['p1', 'p3', 'p4', 'p2'], '#adb5bd');
  b.step('왼쪽 벽의 문', '문은 바닥 선 위에 서 있어요. 문 위쪽 끝에서 오른쪽 소점으로 긋고 점선 뒤쪽을 지운 다음, 세로선을 바닥까지 내려요.');
  b.atX('d1', 'lb', 'B', 560).pt('d2', 560, 300).given('d1', 'd2');
  b.atX('d3', 'd2', 'R', 680).atX('d4', 'lb', 'B', 680).guide('d3', 'd4', 30);
  b.ray('d2', 'R', 'd3').edge('d3', 'd4').face(['d1', 'd2', 'd3', 'd4'], '#ffffff');
  b.step('오른쪽 벽의 창문', '오른쪽 벽에 있는 것은 왼쪽 소점을 써요. 창문의 위·아래 끝에서 왼쪽 소점으로 긋고, 점선 뒤쪽을 지운 뒤 세로선으로 닫아요.');
  b.pt('w1', 1250, 220).pt('w2', 1250, 560).given('w1', 'w2');
  b.atX('w3', 'w1', 'L', 980).atX('w4', 'w2', 'L', 980).guide('w3', 'w4');
  b.ray('w1', 'L', 'w3').ray('w2', 'L', 'w4').edge('w3', 'w4').face(['w1', 'w3', 'w4', 'w2'], '#fff9db');
  // 바닥 타일: g{i}{j} = (왼쪽 소점으로 가는 i번째 선) ∩ (오른쪽 소점으로 가는 j번째 선)
  const mx = [800, 720, 635, 540];
  for (let i = 0; i < 4; i++) { b.atX('m' + i, 'lb', 'B', mx[i]).atX('n' + i, 'rb', 'B', 1600 - mx[i]); }
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) b.int('g' + i + j, 'L', 'm' + i, 'R', 'n' + j);
  b.pt('g00', 800, 640);
  for (let i = 1; i < 4; i++) { b.p['g' + i + '0'] = b.p['m' + i]; b.p['g0' + i] = b.p['n' + i]; }
  b.step('바닥 타일 ①', '바닥 타일의 선도 소점으로 모여요. 앞쪽 점 세 개에서 왼쪽 소점으로 긋고, 왼쪽 벽의 바닥 선을 지난 부분을 지워요.');
  for (let i = 1; i < 4; i++) b.ray('g' + i + '3', 'L', 'm' + i);
  b.step('바닥 타일 ②', '이번에는 반대쪽이에요. 앞쪽 점 세 개에서 오른쪽 소점으로 긋고, 오른쪽 벽의 바닥 선을 지난 부분을 지워요. 멀어질수록 타일이 작아 보여요.');
  for (let j = 1; j < 4; j++) b.ray('g3' + j, 'R', 'n' + j);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    b.face(['g' + i + j, 'g' + (i + 1) + j, 'g' + (i + 1) + (j + 1), 'g' + i + (j + 1)], (i + j) % 2 ? '#fdf6e9' : '#b9a48a');
  }
  return b.model();
}

// 바닥 판 위에 선 빌딩 단지
function box2(b, p, x, yTop, yBot, gxL, gxR, cl, cr) {
  const A = p + 'A', Bt = p + 'B';
  b.pt(A, x, yTop).pt(Bt, x, yBot);
  b.atX(A + 'L', A, 'L', gxL).atX(Bt + 'L', Bt, 'L', gxL).atX(A + 'R', A, 'R', gxR).atX(Bt + 'R', Bt, 'R', gxR);
  b.given(A, Bt).guide(A + 'L', Bt + 'L').guide(A + 'R', Bt + 'R');
  b.ray(A, 'L', A + 'L').ray(Bt, 'L', Bt + 'L').ray(A, 'R', A + 'R').ray(Bt, 'R', Bt + 'R');
  b.edge(A + 'L', Bt + 'L').edge(A + 'R', Bt + 'R');
  b.face([A, A + 'L', Bt + 'L', Bt], cl).face([A, A + 'R', Bt + 'R', Bt], cr);
}

function cityBlock() {
  const b = B(2, VP2, 470);
  b.pt('L', 60, 470).pt('R', 1540, 470);
  b.step('바닥 판', '빌딩들이 올라설 넓은 바닥 판부터 그려요. 앞 모서리의 위·아래 끝에서 양쪽 소점으로 긋고, 점선을 지난 부분을 지운 뒤 세로선으로 닫아요.');
  box2(b, 'p', 800, 760, 800, 250, 1350, '#ced4da', '#adb5bd');
  b.int('pC', 'pAL', 'R', 'pAR', 'L').face(['pA', 'pAL', 'pC', 'pAR'], '#e9ecef', true);
  b.step('가운데 빌딩', '바닥 판 위에 빌딩의 앞 모서리가 서 있어요. 눈높이(지평선)보다 위의 선은 소점으로 내려가고, 아래의 선은 올라가요. 네 선을 긋고 지운 뒤 양쪽 끝 모서리를 세워요.');
  box2(b, 'c', 800, 260, 720, 660, 930, '#ffffff', '#ced4da');
  b.step('왼쪽 뒤 빌딩', '뒤쪽에 더 높은 빌딩이 있어요. 같은 두 소점을 쓰면 어디에 있는 건물이든 같은 방향으로 놓여요.');
  box2(b, 'l', 480, 130, 600, 380, 600, '#ffffff', '#ced4da');
  b.step('오른쪽 뒤 빌딩', '오른쪽 빌딩도 같은 방법으로 그려요.');
  box2(b, 'r', 1120, 170, 600, 1000, 1220, '#ffffff', '#ced4da');
  b.step('층 나누기', '가운데 빌딩의 앞 모서리에 층을 나누는 점이 있어요. 각 점에서 양쪽 소점으로 긋고, 건물 끝을 지난 부분을 지워요.');
  [400, 570].forEach((y, i) => {
    b.pt('k' + i, 800, y).atX('kl' + i, 'k' + i, 'L', 660).atX('kr' + i, 'k' + i, 'R', 930);
    b.ray('k' + i, 'L', 'kl' + i).ray('k' + i, 'R', 'kr' + i);
  });
  return b.model();
}

// ---------- 3소점 ----------
const VP3 = { L: '왼쪽 소점', R: '오른쪽 소점', T: '세 번째 소점' };

function body3(b, s, cl, cr, t1, t2, t3) {
  b.lerp('NL', 'N', 'L', s).lerp('NR', 'N', 'R', s);
  b.int('FL', 'F', 'L', 'NL', 'T').int('FR', 'F', 'R', 'NR', 'T');
  b.lerp('gl0', 'NL', 'T', -0.07).lerp('gl1', 'NL', 'T', 0.13).lerp('gr0', 'NR', 'T', -0.07).lerp('gr1', 'NR', 'T', 0.13);
  b.step(...t1);
  b.given('N', 'F').guide('gl0', 'gl1', 0).guide('gr0', 'gr1', 0);
  b.ray('N', 'L', 'NL').ray('N', 'R', 'NR');
  b.step(...t2);
  b.guide('NL', 'FL', 30).guide('NR', 'FR', 30);
  b.ray('F', 'L', 'FL').ray('F', 'R', 'FR');
  b.step(...t3);
  b.ray('NL', 'T', 'FL').ray('NR', 'T', 'FR');
  b.face(['N', 'NL', 'FL', 'F'], cl).face(['N', 'NR', 'FR', 'F'], cr);
}

function floors3(b, list) {
  list.forEach((t, i) => {
    b.lerp('m' + i, 'N', 'F', t).int('ml' + i, 'm' + i, 'L', 'NL', 'FL').int('mr' + i, 'm' + i, 'R', 'NR', 'FR');
    b.ray('m' + i, 'L', 'ml' + i).ray('m' + i, 'R', 'mr' + i);
  });
}

function birdTower() {
  const b = B(3, VP3, 90);
  b.pt('L', 80, 90).pt('R', 1520, 90).pt('T', 800, 870).pt('N', 800, 280).lerp('F', 'N', 'T', 0.62);
  body3(b, 0.27, '#c5dcff', '#8fbdf5',
    ['옥상의 앞 모서리', '하늘에서 내려다본 빌딩이에요. 가장 가까운 옥상 꼭짓점에서 양쪽 소점으로 선을 긋고, 점선을 지난 부분을 지워요.'],
    ['바닥 쪽 선', '앞 모서리의 아래 끝에서도 양쪽 소점으로 선을 긋고, 점선(세로 모서리 자리)을 지난 부분을 지워요.'],
    ['세로 모서리', '3소점에서는 세로선도 수직이 아니에요! 옥상의 양 끝에서 아래의 세 번째 소점으로 선을 긋고, 바닥 선 아래쪽을 지워요.']);
  b.step('옥상 닫기', '옥상의 양 끝에서 서로 반대쪽 소점으로 선을 그어요. 두 선이 만나는 곳이 옥상의 뒤 꼭짓점이에요. 만난 뒤의 부분을 지워요.');
  b.int('C', 'NL', 'R', 'NR', 'L').ray('NL', 'R', 'C').ray('NR', 'L', 'C').face(['N', 'NL', 'C', 'NR'], '#ffd8a8');
  b.step('층 띠', '층을 나누는 선도 좌우 소점을 향해요. 앞 모서리의 점에서 양쪽 소점으로 긋고 건물 밖으로 나간 부분을 지워요.');
  floors3(b, [0.33, 0.66]);
  return b.model();
}

function wormTower() {
  const b = B(3, VP3, 820);
  b.pt('L', 80, 820).pt('R', 1520, 820).pt('T', 800, 40).pt('N', 800, 862).lerp('F', 'N', 'T', 0.62);
  body3(b, 0.3, '#c5dcff', '#8fbdf5',
    ['건물의 바닥 선', '땅에서 올려다본 빌딩이에요. 앞 모서리의 아래 끝에서 양쪽 소점으로 선을 긋고, 점선을 지난 부분을 지워요.'],
    ['건물의 꼭대기 선', '앞 모서리의 위 끝에서도 양쪽 소점으로 선을 그어요. 눈높이보다 한참 위라서 가파르게 내려와요. 점선 뒤쪽을 지워요.'],
    ['세로 모서리', '올려다보면 세로선이 하늘의 세 번째 소점으로 모여요. 바닥의 양 끝에서 세 번째 소점으로 긋고, 꼭대기 선 위쪽을 지워요.']);
  b.step('층 띠', '층을 나누는 선을 그려요. 위로 갈수록 간격이 좁아 보이는 것이 올려다본 느낌을 만들어요.');
  floors3(b, [0.3, 0.55, 0.76]);
  b.step('창문 세로줄', '벽 한가운데의 세로줄도 세 번째 소점을 향해요. 바닥 선의 점에서 세 번째 소점으로 긋고 꼭대기 선 위쪽을 지워요.');
  b.lerp('q1', 'N', 'NL', 0.5).int('q1t', 'q1', 'T', 'F', 'FL').ray('q1', 'T', 'q1t');
  b.lerp('q2', 'N', 'NR', 0.5).int('q2t', 'q2', 'T', 'F', 'FR').ray('q2', 'T', 'q2t');
  return b.model();
}

function penthouse() {
  const b = B(3, VP3, 90);
  b.pt('L', 80, 90).pt('R', 1520, 90).pt('T', 800, 870).pt('N', 800, 470).lerp('F', 'N', 'T', 0.3);
  body3(b, 0.4, '#c5dcff', '#8fbdf5',
    ['아래 건물의 옥상 선', '넓고 낮은 건물부터 그려요. 가장 가까운 옥상 꼭짓점에서 양쪽 소점으로 선을 긋고 점선 뒤쪽을 지워요.'],
    ['아래 건물의 바닥 선', '앞 모서리의 아래 끝에서 양쪽 소점으로 선을 긋고, 점선을 지난 부분을 지워요.'],
    ['아래 건물의 세로 모서리', '옥상의 양 끝에서 세 번째 소점으로 선을 긋고 바닥 선 아래쪽을 지워요.']);
  b.step('아래 건물의 옥상', '옥상의 양 끝에서 반대쪽 소점으로 선을 그어 만나게 하고, 만난 뒤의 부분을 지워요.');
  b.int('C', 'NL', 'R', 'NR', 'L').ray('NL', 'R', 'C').ray('NR', 'L', 'C').face(['N', 'NL', 'C', 'NR'], '#ffd8a8');
  b.step('옥탑의 윗선', '옥상 모퉁이 위로 옥탑의 앞 모서리가 생겼어요. 그 위 끝에서 양쪽 소점으로 선을 긋고 점선 뒤쪽을 지워요.');
  b.lerp('N2', 'N', 'T', -0.25).given('N2', 'N');
  b.lerp('N2L', 'N2', 'L', 0.18).lerp('N2R', 'N2', 'R', 0.18);
  b.lerp('h0', 'N2L', 'T', -0.06).lerp('h1', 'N2L', 'T', 0.1).lerp('h2', 'N2R', 'T', -0.06).lerp('h3', 'N2R', 'T', 0.1);
  b.guide('h0', 'h1', 0).guide('h2', 'h3', 0);
  b.ray('N2', 'L', 'N2L').ray('N2', 'R', 'N2R');
  b.step('옥탑의 세로 모서리', '옥탑의 양 끝에서 세 번째 소점으로 선을 긋고, 아래 건물의 옥상 선을 지난 부분을 지워요.');
  b.int('F2L', 'N2L', 'T', 'N', 'L').int('F2R', 'N2R', 'T', 'N', 'R');
  b.ray('N2L', 'T', 'F2L').ray('N2R', 'T', 'F2R');
  b.face(['N2', 'N2L', 'F2L', 'N'], '#d0bfff').face(['N2', 'N2R', 'F2R', 'N'], '#b197fc');
  b.step('옥탑의 지붕', '옥탑 지붕도 같은 방법이에요. 양 끝에서 반대쪽 소점으로 긋고, 만난 뒤의 부분을 지워요.');
  b.int('C2', 'N2L', 'R', 'N2R', 'L').ray('N2L', 'R', 'C2').ray('N2R', 'L', 'C2').face(['N2', 'N2L', 'C2', 'N2R'], '#ffec99');
  return b.model();
}

export const LESSONS = [
  { id: 'room', vp: 1, name: '방 안 풍경', desc: '뒷벽에서 시작해 문·창문·침대가 있는 방', make: room,
    src: { name: 'Art Projects for Kids – Room in One Point Perspective', url: 'https://artprojectsforkids.org/how-to-draw-a-room-in-one-point-perspective/' } },
  { id: 'skyup', vp: 1, name: '마천루 올려다보기', desc: '하늘 한가운데 소점으로 모이는 마천루의 세로 모서리', make: cityWalls },
  { id: 'cityabove', vp: 1, name: '내려다본 도시', desc: '큰길 양쪽 건물을 지붕에서 바닥까지', make: cityAbove },
  { id: 'house', vp: 2, name: '박공지붕 집', desc: '대각선으로 벽의 중심을 찾아 지붕 올리기', make: house,
    src: { name: 'Artists Network – Draw a House Using Two-Point Perspective', url: 'https://artistsnetwork.com/art-techniques/draw-a-house-using-two-point-perspective' } },
  { id: 'roomcorner', vp: 2, name: '방 모서리 풍경', desc: '구석을 마주 보는 방의 액자·문·창문·바닥 타일', make: roomCorner },
  { id: 'cityblock', vp: 2, name: '빌딩 단지', desc: '바닥 판 위에 선 빌딩 세 채', make: cityBlock },
  { id: 'bird', vp: 3, name: '내려다본 마천루', desc: '세로선이 아래 소점으로 모이는 조감도', make: birdTower,
    src: { name: 'Envato Tuts+ – Technical Drawing for Beginners: Three Point Perspective', url: 'https://design.tutsplus.com/tutorials/technical-drawing-for-beginners-three-point-perspective--vector-23680' } },
  { id: 'worm', vp: 3, name: '올려다본 빌딩', desc: '세로선이 하늘의 소점으로 모이는 앙시도', make: wormTower,
    src: { name: 'Plaid – Learn How to Draw Perspective', url: 'https://plaidonline.com/inspire-and-create/article/learn-how-to-draw-perspective' } },
  { id: 'penthouse', vp: 3, name: '옥탑이 있는 건물', desc: '넓은 건물 위에 작은 건물 쌓기', make: penthouse,
    src: { name: 'Art in Context – Three Point Perspective Drawing', url: 'https://artincontext.org/three-point-perspective-drawing' } },
];

// 완성했을 때 나타나는 장식을 각 그림에 붙인다
for (const l of LESSONS) {
  const make = l.make, extra = DECOR[l.id];
  l.make = () => {
    const m = make(), own = m.decor;
    m.decor = (c, P) => { c.save(); if (extra) extra(c, P); c.restore(); if (own) own(c, P); };
    return m;
  };
}
