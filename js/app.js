// 화면 전환, 진행 상황 저장, 플레이 화면 구성
import { Game } from './engine.js';
import { STAGES1, make1 } from './learn1.js';
import { STAGES2, STAGES3, makeBox } from './learn23.js';
import { LESSONS } from './follow.js';
import { isMuted, setMuted } from './sfx.js';
import { openSketch } from './sketch.js';
import { initHand } from './hand.js';

const app = document.getElementById('app');
const DIFF = [
  { name: '쉬움', col: '#2f9e44' },
  { name: '보통', col: '#f08c00' },
  { name: '어려움', col: '#e03131' },
];
const WORLDS = {
  1: {
    name: '1소점 투시', sub: '정면에서 바라본 깊이', stages: STAGES1, make: (i) => make1(STAGES1[i]),
    tip: '① 꼭짓점에서 소점까지 드래그해요. ② 점선(안내선)을 지나 소점까지 가는 부분을 눌러 지워요. ③ 점선 위의 점끼리 이어 뒤 모서리를 그려요.',
    art: '<circle cx="250" cy="34" r="5" fill="#3157d5"/><path d="M40 60h70v60H40zM110 60L250 34M110 120L250 34M40 60L250 34" fill="none" stroke="#1e2a4a" stroke-width="2.5"/><path d="M40 60h70v60H40z" fill="#fff9e6" stroke="#1e2a4a" stroke-width="2.5"/>',
  },
  2: {
    name: '2소점 투시', sub: '모서리에서 바라본 건물', stages: STAGES2, make: (i) => makeBox(2, STAGES2[i]),
    tip: '① 앞 모서리의 위·아래 끝에서 양쪽 소점으로 드래그해요. ② 점선 뒤쪽을 눌러 지워요. ③ 점선 위의 두 점을 수직으로 이어요. 윗면은 양 끝에서 반대쪽 소점으로 그어 만나게 해요.',
    art: '<path d="M0 60h300" stroke="#8492b8" stroke-width="2"/><circle cx="20" cy="60" r="5" fill="#3157d5"/><circle cx="280" cy="60" r="5" fill="#3157d5"/><path d="M150 25v80L90 87V41zM150 25v80l60-18V41z" fill="#c5dcff" stroke="#1e2a4a" stroke-width="2.5" stroke-linejoin="round"/>',
  },
  3: {
    name: '3소점 투시', sub: '내려다보고 올려다본 세상', stages: STAGES3, make: (i) => makeBox(3, STAGES3[i]),
    tip: '① 앞 모서리 끝에서 좌우 소점으로 긋고 점선 뒤쪽을 지워요. ② 세로 모서리는 세 번째 소점으로 그어요. 두 선이 만난 뒤의 부분을 서로 지워요. ③ 윗면은 양 끝에서 반대쪽 소점으로!',
    art: '<path d="M0 18h300" stroke="#8492b8" stroke-width="2"/><circle cx="20" cy="18" r="5" fill="#3157d5"/><circle cx="280" cy="18" r="5" fill="#3157d5"/><circle cx="150" cy="122" r="5" fill="#3157d5"/><path d="M150 52l-48-9 12 46 36 12zM150 52l48-9-12 46-36 12zM150 52l-48-9 48-7 48 7z" fill="#c5dcff" stroke="#1e2a4a" stroke-width="2.5" stroke-linejoin="round"/>',
  },
};

// ---------- 진행 상황 ----------
const KEY = 'persp.v1';
let prog = { learn: { 1: [], 2: [], 3: [] }, follow: {} };
try { prog = Object.assign(prog, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* 처음 실행 */ }
const save = () => localStorage.setItem(KEY, JSON.stringify(prog));
const rec = (w, i) => (prog.learn[w] || [])[i] || null;
const doneCount = (w) => WORLDS[w].stages.filter((_, i) => rec(w, i)).length;
const starSum = (w) => WORLDS[w].stages.reduce((a, _, i) => a + (rec(w, i)?.stars || 0), 0);
const unlocked = (w, i) => i === 0 || !!rec(w, i - 1);
const starsHtml = (n) => `<span class="stars">${'★'.repeat(n)}<i>${'★'.repeat(3 - n)}</i></span>`;

let game = null;
function clear() {
  if (game) { game.destroy(); game = null; }
  app.innerHTML = '';
}
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

// 완성 모습을 작은 그림으로 그린다
function thumb(cv, model) {
  const tmp = new Game(document.createElement('canvas'), model, {});
  tmp.pv = cv;
  tmp.drawPreview();
  tmp.destroy();
}

// ---------- 홈 ----------
function home() {
  clear();
  const stars = [1, 2, 3].reduce((a, w) => a + starSum(w), 0) + Object.values(prog.follow).reduce((a, r) => a + r.stars, 0);
  const cleared = [1, 2, 3].reduce((a, w) => a + doneCount(w), 0);
  let rays = '';
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    rays += `<line x1="50%" y1="42%" x2="${50 + Math.cos(a) * 120}%" y2="${42 + Math.sin(a) * 120}%" stroke="#cfd7ec" stroke-width="1.5"/>`;
  }
  const el = h(`
    <main class="home">
      <svg class="rays" aria-hidden="true">${rays}</svg>
      <div class="home-in">
        <h1>투시도 <span>놀이터</span></h1>
        <p class="lead">선을 긋고, 지우고, 면을 완성하며 1·2·3소점 투시도를 익혀요</p>
        <div class="modes">
          <button class="mode learn" data-go="worlds">
            <div class="ico">📐</div><h3>학습</h3>
            <p>단순한 도형부터 차근차근. 소점마다 쉬움 4 · 보통 3 · 어려움 3단계를 모두 깨면 마스터!</p>
          </button>
          <button class="mode follow" data-go="follow">
            <div class="ico">🏙️</div><h3>따라하기</h3>
            <p>방, 도시, 집, 마천루… 완성 그림을 보고 그리기 순서를 한 단계씩 따라 그려요.</p>
          </button>
          <button class="mode sketch" data-go="sketch">
            <div class="ico">✏️</div><h3>연습장</h3>
            <p>소점을 직접 찍고, 투영선을 긋고, 마음대로 그림을 그려요. 소점은 종이 밖에도 둘 수 있어요.</p>
          </button>
        </div>
        <div class="total"><span class="pill">⭐ 모은 별 ${stars}</span><span class="pill">✅ 학습 ${cleared} / 30</span><span class="pill">🖌️ 따라하기 ${Object.keys(prog.follow).length} / ${LESSONS.length}</span></div>
        <div><button class="reset" id="reset">↺ 리셋</button></div>
      </div>
    </main>`);
  el.querySelector('[data-go=worlds]').onclick = worlds;
  el.querySelector('[data-go=follow]').onclick = followList;
  el.querySelector('[data-go=sketch]').onclick = sketch;
  el.querySelector('#reset').onclick = resetDialog;
  app.append(el);
}

// 리셋: 학습·따라하기 기록을 지우고 처음부터
function resetDialog() {
  const m = h(`
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="resetTitle">
      <div class="modal-box">
        <div class="ico">🌱</div>
        <h3 id="resetTitle">새롭게 시작해 보아요.</h3>
        <p>앞에서 한 기록(별, 클리어, 연습장 그림)을 모두 지우고 처음부터 다시 시작해요.</p>
        <div class="modal-btns"><button class="btn" data-no>취소</button><button class="btn primary" data-yes>새로 시작</button></div>
      </div>
    </div>`);
  const close = () => m.remove();
  m.onclick = (e) => { if (e.target === m) close(); };
  m.querySelector('[data-no]').onclick = close;
  m.querySelector('[data-yes]').onclick = () => {
    prog = { learn: { 1: [], 2: [], 3: [] }, follow: {} };
    save();
    localStorage.removeItem('persp.sketch'); // 연습장 그림도 지운다
    home();
  };
  app.append(m);
  m.querySelector('[data-yes]').focus();
}

// ---------- 학습: 소점 선택 ----------
function worlds() {
  clear();
  const el = h(`<main class="page"><div class="top"><button class="back" aria-label="뒤로">←</button><h2>학습</h2></div><div class="grid3"></div></main>`);
  el.querySelector('.back').onclick = home;
  const g = el.querySelector('.grid3');
  for (const w of [1, 2, 3]) {
    const W = WORLDS[w], d = doneCount(w);
    const c = h(`
      <button class="world">
        <svg viewBox="0 0 300 140" preserveAspectRatio="xMidYMid meet">${W.art}</svg>
        <h3>${W.name} ${d === 10 ? '👑' : ''}</h3><p>${W.sub}</p>
        <div class="meter"><b style="width:${d * 10}%"></b></div>
        <div class="row"><span>${d} / 10 단계</span><span>⭐ ${starSum(w)} / 30</span></div>
      </button>`);
    c.onclick = () => stages(w);
    g.append(c);
  }
  app.append(el);
}

// ---------- 학습: 단계 선택 ----------
function stages(w, justMastered) {
  clear();
  const W = WORLDS[w];
  const el = h(`<main class="page"><div class="top"><button class="back" aria-label="뒤로">←</button><h2>${W.name}</h2><span class="pill">⭐ ${starSum(w)} / 30</span></div></main>`);
  el.querySelector('.back').onclick = worlds;
  if (doneCount(w) === 10) el.append(h(`<div class="banner">👑 ${justMastered ? '축하해요! ' : ''}${W.name} 10단계를 모두 클리어했어요. 별 3개에 다시 도전해 보세요!</div>`));
  const next = W.stages.findIndex((_, i) => !rec(w, i));
  [0, 1, 2].forEach((d) => {
    const list = W.stages.map((s, i) => ({ s, i })).filter((x) => x.s.diff === d);
    const grp = h(`<section class="group"><h3><span class="dot" style="background:${DIFF[d].col}"></span>${DIFF[d].name} <small>${list.length}단계</small></h3><div class="nodes"></div></section>`);
    const box = grp.querySelector('.nodes');
    for (const { s, i } of list) {
      const r = rec(w, i), open = unlocked(w, i);
      const b = h(`
        <button class="node ${i === next ? 'next' : ''}" ${open ? '' : 'disabled'}>
          <canvas class="thumb" width="408" height="240"></canvas>
          <div class="num">${i + 1}단계</div><div class="nm">${s.name}</div>
          ${r ? `${starsHtml(r.stars)} <small>${r.score}점</small>` : open ? '<small>도전!</small>' : '<span class="lock">🔒</span><small>앞 단계를 먼저 깨요</small>'}
        </button>`);
      if (open) b.onclick = () => playLearn(w, i);
      thumb(b.querySelector('.thumb'), W.make(i));
      box.append(b);
    }
    el.append(grp);
  });
  app.append(el);
}

// ---------- 따라하기 목록 ----------
function followList() {
  clear();
  const el = h(`<main class="page"><div class="top"><button class="back" aria-label="뒤로">←</button><h2>따라하기</h2></div></main>`);
  el.querySelector('.back').onclick = home;
  for (const vp of [1, 2, 3]) {
    const grp = h(`<section class="group"><h3>${vp}소점 <small>완성 그림을 보고 순서대로 따라 그려요</small></h3><div class="nodes lessons"></div></section>`);
    const box = grp.querySelector('.nodes');
    LESSONS.filter((l) => l.vp === vp).forEach((l) => {
      const r = prog.follow[l.id];
      const b = h(`<button class="node lesson"><canvas class="thumb" width="544" height="320"></canvas><div class="nm">${l.name}</div><p>${l.desc}</p>${r ? `${starsHtml(r.stars)} <small>${r.score}점</small>` : '<small>도전!</small>'}</button>`);
      b.onclick = () => playFollow(l);
      thumb(b.querySelector('.thumb'), l.make());
      box.append(b);
    });
    el.append(grp);
  }
  app.append(el);
}

// ---------- 연습장 ----------
function sketch() {
  clear();
  game = openSketch(app, home);
}

// ---------- 플레이 화면 ----------
function playShell(title, sub, onBack) {
  clear();
  const el = h(`
    <div class="play">
      <header class="bar">
        <button class="back" aria-label="뒤로">←</button>
        <div class="ttl"><b>${title}</b><span>${sub}</span></div>
        <div class="stat combo"><small>콤보</small><b id="combo">0</b></div>
        <div class="stat"><small>점수</small><b id="score">0</b></div>
        <button class="back" id="mute" aria-label="소리">${isMuted() ? '🔇' : '🔊'}</button>
      </header>
      <div class="stage">
        <div class="cvwrap"><div class="cvbox"><canvas id="cv"></canvas><div class="toast" id="toast"></div></div></div>
        <aside class="panel">
          <div class="card"><h4>완성 모습</h4><canvas id="pv" width="544" height="320"></canvas></div>
          <div class="card" id="mission"></div>
          <div class="btns" id="btns"></div>
          <div class="card result" id="result" hidden></div>
        </aside>
      </div>
    </div>`);
  el.querySelector('.back').onclick = onBack;
  const mute = el.querySelector('#mute');
  mute.onclick = () => { setMuted(!isMuted()); mute.textContent = isMuted() ? '🔇' : '🔊'; };
  app.append(el);
  let timer;
  return {
    el, q: (s) => el.querySelector(s),
    toast(text, kind) {
      const t = el.querySelector('#toast');
      t.textContent = text;
      t.className = 'toast on ' + (kind === 'warn' ? 'warn' : '');
      clearTimeout(timer);
      timer = setTimeout(() => (t.className = 'toast'), 2200);
    },
    hud() { el.querySelector('#score').textContent = game.score; el.querySelector('#combo').textContent = game.combo; },
  };
}

function playLearn(w, i) {
  const W = WORLDS[w], s = W.stages[i];
  const diffIdx = W.stages.filter((x, k) => x.diff === s.diff && k <= i).length;
  const diffTot = W.stages.filter((x) => x.diff === s.diff).length;
  const ui = playShell(`${W.name} · ${DIFF[s.diff].name} ${diffIdx}/${diffTot}`, `${i + 1}단계 · ${s.name}`, () => stages(w));
  const mission = ui.q('#mission');
  const rows = [['rays', '꼭짓점 → 소점 잇기'], ['trims', '소점 쪽 남는 선 지우기'], ['edges', '뒤 모서리 잇기'], ['faces', '면 완성']];
  const paint = () => {
    ui.hud();
    const c = game.counts();
    mission.innerHTML = `<h4>할 일</h4><ul class="todo">${rows.filter(([k]) => c[k][1] > 0).map(([k, t], n) =>
      `<li class="${c[k][0] >= c[k][1] ? 'ok' : ''}"><span class="n">${c[k][0] >= c[k][1] ? '✓' : n + 1}</span>${t}<span class="c">${c[k][0]}/${c[k][1]}</span></li>`).join('')}</ul>${game.cleared ? '' : `<p class="tip">${W.tip}</p>`}`;
  };
  ui.q('#btns').append(
    Object.assign(h('<button class="btn">💡 힌트</button>'), { onclick: () => { game.hint(); paint(); } }),
    Object.assign(h('<button class="btn">🔀 새 배치</button>'), { onclick: () => playLearn(w, i) }),
  );
  game = new Game(ui.q('#cv'), W.make(i), {
    onMsg: ui.toast,
    onChange: paint,
    onClear(r) {
      const before = doneCount(w);
      const old = rec(w, i);
      prog.learn[w] = prog.learn[w] || [];
      prog.learn[w][i] = { stars: Math.max(r.stars, old?.stars || 0), score: Math.max(r.score, old?.score || 0) };
      save();
      const mastered = before < 10 && doneCount(w) === 10;
      const res = ui.q('#result');
      res.hidden = false;
      res.innerHTML = `<div class="big">${mastered ? '👑 ' + W.name + ' 마스터!' : '클리어!'}</div><div>${starsHtml(r.stars)}</div>
        <p><b>${r.score}점</b> · 실수 ${r.mistakes} · 힌트 ${r.hints}<br>이제 <b style="color:#f08c00">점선(안내선)</b>과 <b style="color:#3157d5">소점</b>을 드래그해 보세요. 모양이 어떻게 달라지나요?</p>`;
      const nextBtn = h(`<button class="btn primary">${i < 9 ? '다음 단계 ▶' : '단계 목록으로'}</button>`);
      nextBtn.onclick = () => (i < 9 ? playLearn(w, i + 1) : stages(w, mastered));
      res.append(nextBtn);
      ui.q('#btns').hidden = true;
      res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
  });
  game.pv = ui.q('#pv');
  paint();
  window.__game = game;
}

function playFollow(l) {
  const ui = playShell(`따라하기 · ${l.name}`, `${l.vp}소점 · ${l.desc}`, followList);
  const model = l.make();
  const mission = ui.q('#mission');
  const paint = () => {
    ui.hud();
    const n = model.steps.length, k = Math.min(game.cur, n - 1), st = model.steps[k];
    mission.innerHTML = `<div class="stepno">${game.cleared ? '완성!' : `${k + 1} / ${n} 단계`}</div><div class="steptitle">${st.title}</div><p class="steptext">${st.text}</p>
      <div class="meter" style="margin-top:12px"><b style="width:${(Math.min(game.cur, n) / n) * 100}%"></b></div>
      <div class="src">${l.src ? `참고한 그리기 순서: <a href="${l.src.url}" target="_blank" rel="noopener">${l.src.name}</a>` : '선생님이 주신 그림을 따라 그리는 과제예요.'}</div>`;
  };
  ui.q('#btns').append(
    Object.assign(h('<button class="btn">💡 힌트</button>'), { onclick: () => { game.hint(); paint(); } }),
    Object.assign(h('<button class="btn">↻ 처음부터</button>'), { onclick: () => playFollow(l) }),
  );
  game = new Game(ui.q('#cv'), model, {
    onMsg: ui.toast,
    onChange: paint,
    onStep: paint,
    onClear(r) {
      const old = prog.follow[l.id];
      prog.follow[l.id] = { stars: Math.max(r.stars, old?.stars || 0), score: Math.max(r.score, old?.score || 0) };
      save();
      const res = ui.q('#result');
      res.hidden = false;
      res.innerHTML = `<div class="big">그림 완성!</div><div>${starsHtml(r.stars)}</div><p><b>${r.score}점</b> · 실수 ${r.mistakes} · 힌트 ${r.hints}</p>`;
      const idx = LESSONS.indexOf(l);
      const nb = h(`<button class="btn primary">${idx < LESSONS.length - 1 ? '다음 그림 ▶' : '목록으로'}</button>`);
      nb.onclick = () => (idx < LESSONS.length - 1 ? playFollow(LESSONS[idx + 1]) : followList());
      res.append(nb);
      ui.q('#btns').hidden = true;
      res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
  });
  game.pv = ui.q('#pv');
  paint();
  window.__game = game;
}

home();
initHand();
