// Efeitos sonoros 8-bit gerados com WebAudio (sem arquivos externos).
let ctx = null;
let muted = false;
try { muted = localStorage.getItem('hotel-muted') === '1'; } catch { /* ignore */ }

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'square', vol = 0.06, delay = 0, slide = 0) {
  if (muted) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const Sfx = {
  click: () => tone(660, 0.05, 'square', 0.04),
  select: () => { tone(520, 0.06); tone(780, 0.08, 'square', 0.05, 0.05); },
  bell: () => { tone(1568, 0.35, 'triangle', 0.08); tone(2093, 0.3, 'sine', 0.04, 0.01); },
  coin: () => { tone(988, 0.07, 'square', 0.05); tone(1319, 0.18, 'square', 0.05, 0.07); },
  build: () => { [262, 330, 392, 523].forEach((f, i) => tone(f, 0.1, 'square', 0.05, i * 0.07)); },
  error: () => { tone(200, 0.15, 'sawtooth', 0.05); tone(150, 0.2, 'sawtooth', 0.05, 0.12); },
  angry: () => tone(300, 0.3, 'sawtooth', 0.04, 0, -150),
  clean: () => { tone(1200, 0.05, 'triangle', 0.03); tone(1500, 0.05, 'triangle', 0.03, 0.06); tone(1800, 0.1, 'triangle', 0.03, 0.12); },
  day: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.15, 'triangle', 0.05, i * 0.1)); },
};

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('hotel-muted', m ? '1' : '0'); } catch { /* ignore */ }
}
export function unlockAudio() { ac(); }
