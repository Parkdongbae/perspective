// 간단한 효과음 (WebAudio)
let ctx = null;
let muted = localStorage.getItem('persp.mute') === '1';

export const isMuted = () => muted;
export function setMuted(v) {
  muted = v;
  localStorage.setItem('persp.mute', v ? '1' : '0');
}

function tone(freq, t0, dur, type = 'sine', vol = 0.12) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  draw: (t) => { tone(520, t, 0.09, 'triangle'); tone(780, t + 0.06, 0.1, 'triangle'); },
  snip: (t) => { tone(1400, t, 0.04, 'square', 0.05); tone(900, t + 0.05, 0.06, 'square', 0.05); },
  face: (t) => { [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.07, 0.18, 'sine', 0.13)); },
  step: (t) => { tone(660, t, 0.12, 'sine'); tone(880, t + 0.1, 0.16, 'sine'); },
  clear: (t) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.1, 0.3, 'triangle', 0.14)); },
  miss: (t) => { tone(200, t, 0.16, 'sawtooth', 0.06); },
};

export function sfx(name) {
  if (muted) return;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    SOUNDS[name]?.(ctx.currentTime);
  } catch { /* 소리를 낼 수 없는 환경은 조용히 넘어간다 */ }
}
