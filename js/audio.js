// Áudio: contexto WebAudio compartilhado, configurações (música, efeitos, qualidade) e efeitos sonoros.
const SETTINGS_KEY = 'hotel-settings-v1';
const DEFAULTS = { music: 0.6, sfx: 0.8, quality: 'high' };

export const Settings = (() => {
  let s = { ...DEFAULTS };
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (raw) s = { ...s, ...raw };
    // compatibilidade com a chave antiga de "mudo"
    if (localStorage.getItem('hotel-muted') === '1' && !raw) { s.music = 0; s.sfx = 0; }
  } catch { /* ignore */ }
  const listeners = [];
  return {
    get: (k) => s[k],
    set(k, v) {
      s[k] = v;
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
      listeners.forEach((fn) => fn(k, v));
    },
    on(fn) { listeners.push(fn); },
  };
})();

let ctx = null;
let sfxBus = null;
let musicBus = null;

export function getAudio() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = Settings.get('sfx') * 0.9; sfxBus.connect(comp);
    musicBus = ctx.createGain(); musicBus.gain.value = Settings.get('music') * 0.55; musicBus.connect(comp);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return { ctx, sfxBus, musicBus };
}

Settings.on((k, v) => {
  if (!ctx) return;
  if (k === 'sfx') sfxBus.gain.setTargetAtTime(v * 0.9, ctx.currentTime, 0.05);
  if (k === 'music') musicBus.gain.setTargetAtTime(v * 0.55, ctx.currentTime, 0.05);
});

function tone(freq, dur, type = 'triangle', vol = 0.12, delay = 0, slide = 0) {
  if (!Settings.get('sfx')) return;
  const a = getAudio();
  if (!a) return;
  const { ctx: c, sfxBus: bus } = a;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// efeitos com timbre mais suave ("cartoon")
export const Sfx = {
  click: () => tone(880, 0.06, 'sine', 0.08),
  select: () => { tone(660, 0.08, 'sine', 0.1); tone(990, 0.12, 'sine', 0.1, 0.06); },
  bell: () => { tone(1568, 0.5, 'sine', 0.12); tone(2350, 0.35, 'sine', 0.05, 0.01); },
  coin: () => { tone(1319, 0.08, 'triangle', 0.1); tone(1976, 0.22, 'triangle', 0.09, 0.07); },
  build: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', 0.1, i * 0.07)); },
  error: () => { tone(220, 0.16, 'square', 0.05); tone(170, 0.22, 'square', 0.05, 0.12); },
  angry: () => tone(330, 0.32, 'sawtooth', 0.05, 0, -160),
  clean: () => { [1568, 1976, 2349].forEach((f, i) => tone(f, 0.12, 'sine', 0.06, i * 0.06)); },
  day: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'sine', 0.09, i * 0.1)); },
  star: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.3, 'sine', 0.1, i * 0.09)); },
};

export function isMuted() { return !Settings.get('sfx') && !Settings.get('music'); }
export function setMuted(m) {
  Settings.set('sfx', m ? 0 : DEFAULTS.sfx);
  Settings.set('music', m ? 0 : DEFAULTS.music);
}
export function unlockAudio() { getAudio(); }
