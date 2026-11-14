// 손 핀치 조작: 카메라로 손을 읽어 포인터 입력으로 바꾼다
//   엄지+검지 = 누르기(긋기),  엄지+중지 = 지우개로 누르기
const LIB = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const ZONE = { x0: 0.15, x1: 0.85, y0: 0.12, y1: 0.8 }; // 카메라 화면에서 화면 전체로 대응시킬 영역
const DOWN = 0.25, UP = 0.4; // 핀치 누름·뗌 기준 (손가락 끝 거리 ÷ 손 크기)
const HOLD = 2;              // 이 프레임 수만큼 이어져야 누름·뗌으로 본다
const LOST = 300;            // 손이 이만큼(ms) 안 보이면 누름을 끝낸다
const PID = 9001;
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
const ERR = {
  NotAllowedError: '카메라 사용을 허용해 주세요. 주소창의 카메라 아이콘에서 바꿀 수 있어요.',
  NotFoundError: '카메라를 찾을 수 없어요.',
  NotReadableError: '다른 프로그램이 카메라를 쓰고 있어요.',
  NoApi: '이 브라우저(또는 주소)에서는 카메라를 쓸 수 없어요.',
};

// 손떨림 줄이기 (One Euro 필터): 느릴 땐 부드럽게, 빠를 땐 지연 없이
function euro(minCut, beta) {
  let x, dx = 0, t = 0;
  const al = (cut, dt) => { const r = 2 * Math.PI * cut * dt; return r / (r + 1); };
  return (v, now) => {
    if (x === undefined || now - t > 500) { x = v; dx = 0; t = now; return v; }
    const dt = Math.max((now - t) / 1000, 1e-3);
    t = now;
    dx += al(1, dt) * ((v - x) / dt - dx);
    x += al(minCut + beta * Math.abs(dx), dt) * (v - x);
    return x;
  };
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function initHand() {
  const box = document.createElement('div');
  box.className = 'hand';
  box.innerHTML = `
    <div class="hand-msg" hidden></div>
    <div class="hand-view" hidden>
      <canvas width="208" height="156"></canvas>
      <div class="hand-st"></div>
      <div class="hand-help">👌 엄지+검지 <b>긋기</b> · 엄지+중지 <b class="er">지우기</b></div>
    </div>
    <button class="hand-btn" type="button">🖐 손으로 그리기</button>`;
  const dot = document.createElement('div');
  dot.className = 'hand-cur';
  dot.hidden = true;
  document.body.append(box, dot);
  const btn = box.querySelector('.hand-btn'), view = box.querySelector('.hand-view');
  const pv = view.querySelector('canvas'), g = pv.getContext('2d');
  const stEl = box.querySelector('.hand-st'), msgEl = box.querySelector('.hand-msg');
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true;

  let on = false, busy = false, stream = null, landmarker = null, raf = 0, lastT = -1, msgT;
  let asp = 4 / 3, seen = 0, pos = { x: 0, y: 0 }, fx = euro(1, 0.008), fy = euro(1, 0.008);
  let pinch = null, pend = null, n = 0, hover = null;

  const say = (text) => {
    msgEl.textContent = text; msgEl.hidden = false;
    clearTimeout(msgT); msgT = setTimeout(() => (msgEl.hidden = true), 6000);
  };
  const setSt = (text, cls) => { if (stEl.textContent !== text) stEl.textContent = text; stEl.className = 'hand-st ' + (cls || ''); };
  const under = () => document.elementFromPoint(pos.x, pos.y);
  const clickable = (el) => el && el.closest('button, a, label, input, select');
  const setHover = (el) => {
    if (hover === el) return;
    if (hover) hover.classList.remove('hand-hover');
    hover = el;
    if (hover) hover.classList.add('hand-hover');
  };
  function fire(el, type, kind, pressed) {
    const er = kind === 'erase';
    el.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, composed: true, clientX: pos.x, clientY: pos.y,
      pointerId: PID, pointerType: 'touch', isPrimary: true,
      button: type === 'pointermove' ? -1 : er ? 5 : 0, buttons: pressed ? (er ? 32 : 1) : 0,
    }));
  }

  function press(kind) {
    const el = under(), ui = clickable(el); // 버튼 안의 미리보기 그림(canvas)은 버튼으로 본다
    pinch = { kind, target: null, clickEl: null };
    n = 0; pend = null;
    if (ui) { if (kind === 'draw') pinch.clickEl = ui; }
    else if (el && el.tagName === 'CANVAS') { pinch.target = el; fire(el, 'pointerdown', kind, true); }
    setHover(pinch.clickEl);
  }
  function release(cancel) {
    const p = pinch;
    pinch = null; n = 0; pend = null;
    if (!p) return;
    if (p.target) { if (p.target.isConnected) fire(p.target, cancel ? 'pointercancel' : 'pointerup', p.kind, false); }
    else if (p.clickEl && !cancel && p.clickEl.isConnected && p.clickEl.contains(under())) p.clickEl.click();
  }

  // 손 좌표(21개 점, 0~1) 한 프레임을 처리한다. 손이 안 보이면 lm = null
  function process(lm, now) {
    if (!lm) {
      if (now - seen > LOST) { release(true); setHover(null); dot.hidden = true; setSt('손을 카메라에 보여 주세요'); }
      return;
    }
    seen = now;
    const d = (a, b) => Math.hypot((lm[a].x - lm[b].x) * asp, lm[a].y - lm[b].y);
    const size = Math.max(d(0, 9), d(5, 17) * 1.2) || 1e-6;
    const ri = d(4, 8) / size, rm = d(4, 12) / size;
    // 커서 = 엄지 끝 (두 핀치에 공통이라 튀지 않는다). 거울처럼 좌우를 뒤집는다
    const u = clamp01((1 - lm[4].x - ZONE.x0) / (ZONE.x1 - ZONE.x0)), v = clamp01((lm[4].y - ZONE.y0) / (ZONE.y1 - ZONE.y0));
    pos = { x: fx(u * innerWidth, now), y: fy(v * innerHeight, now) };

    if (!pinch) {
      const kind = Math.min(ri, rm) < DOWN ? (rm < ri * 0.8 ? 'erase' : 'draw') : null;
      if (kind && kind === pend) n++; else { pend = kind; n = kind ? 1 : 0; }
      if (kind && n >= HOLD) press(kind);
    } else {
      n = (pinch.kind === 'erase' ? rm : ri) > UP ? n + 1 : 0;
      if (n >= HOLD) release(false);
    }

    if (pinch) {
      if (pinch.target && !pinch.target.isConnected) pinch.target = null;
      if (pinch.target) fire(pinch.target, 'pointermove', pinch.kind, true);
    } else {
      const el = under(), ui = clickable(el);
      setHover(ui);
      if (!ui && el && el.tagName === 'CANVAS') fire(el, 'pointermove', 'draw', false);
    }
    dot.hidden = false;
    dot.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    dot.className = 'hand-cur' + (pinch ? ' ' + pinch.kind : '');
    if (pinch) setSt(pinch.kind === 'erase' ? '🧽 지우는 중' : '✏️ 긋는 중', pinch.kind);
    else setSt('손가락을 맞대 보세요');
  }

  function drawView(lm) {
    const w = pv.width, h = pv.height;
    g.save(); g.scale(-1, 1); g.drawImage(video, -w, 0, w, h); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.5; g.setLineDash([5, 4]);
    g.strokeRect((1 - ZONE.x1) * w, ZONE.y0 * h, (ZONE.x1 - ZONE.x0) * w, (ZONE.y1 - ZONE.y0) * h);
    g.setLineDash([]);
    if (!lm) return;
    const P = (i) => [(1 - lm[i].x) * w, lm[i].y * h];
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath();
    for (const [a, b] of BONES) { g.moveTo(...P(a)); g.lineTo(...P(b)); }
    g.stroke();
    for (const [i, col] of [[4, '#ffd43b'], [8, '#4c6ef5'], [12, '#fa5252']]) {
      g.fillStyle = col; g.beginPath(); g.arc(...P(i), 5, 0, 7); g.fill();
    }
  }

  function tick() {
    if (!on) return;
    if (video.readyState >= 2 && video.currentTime !== lastT) {
      lastT = video.currentTime;
      const now = performance.now();
      let lm = null;
      try { lm = landmarker.detectForVideo(video, now).landmarks[0] || null; } catch { /* 이 프레임은 건너뛴다 */ }
      process(lm, now);
      drawView(lm);
    }
    raf = requestAnimationFrame(tick);
  }

  async function load() {
    const { FilesetResolver, HandLandmarker } = await import(`${LIB}/vision_bundle.mjs`);
    const files = await FilesetResolver.forVisionTasks(`${LIB}/wasm`);
    const opt = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numHands: 1 });
    try { return await HandLandmarker.createFromOptions(files, opt('GPU')); }
    catch { return await HandLandmarker.createFromOptions(files, opt('CPU')); }
  }
  function stopCam() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null; video.srcObject = null;
  }
  async function start() {
    busy = true; btn.textContent = '⏳ 손 인식 준비 중…'; msgEl.hidden = true;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('no camera api'), { name: 'NoApi' });
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
      video.srcObject = stream;
      await video.play();
      landmarker = landmarker || await load();
      asp = (video.videoWidth / video.videoHeight) || 4 / 3;
      pv.height = Math.round(pv.width / asp);
      on = true; lastT = -1; seen = 0;
      view.hidden = false; btn.textContent = '🖐 손 조작 끄기'; btn.classList.add('on');
      setSt('손을 카메라에 보여 주세요');
      raf = requestAnimationFrame(tick);
    } catch (e) {
      stopCam();
      btn.textContent = '🖐 손으로 그리기';
      say(ERR[e && e.name] || '손 인식을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');
      console.warn('hand:', e);
    }
    busy = false;
  }
  function stop() {
    on = false; cancelAnimationFrame(raf);
    release(true); setHover(null); stopCam();
    view.hidden = true; dot.hidden = true;
    btn.textContent = '🖐 손으로 그리기'; btn.classList.remove('on');
  }
  btn.onclick = () => { if (!busy) (on ? stop() : start()); };

  // 점검용: 카메라 없이 손 좌표를 직접 넣어 본다
  window.__hand = { process, get pinch() { return pinch; }, get pos() { return pos; } };
}
