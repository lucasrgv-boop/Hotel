// Música de fundo sintetizada em tempo real (WebAudio), sem arquivos externos.
// Trilhas dos países: composições originais inspiradas no estilo musical de cada lugar.
// Menu e mapa: peças clássicas de domínio público (Minueto em Sol, de Christian Petzold,
// e Ode à Alegria, de Beethoven), em arranjo próprio.
import { getAudio, Settings } from './audio.js';

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midiOf(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error('nota inválida: ' + name);
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// "D5:2 G4 A4 | r:2 C4+E4+G4:4" -> [[passo, [midis], duração]]
function seq(str, def = 1, start = 0) {
  const out = [];
  let t = start;
  for (const tok of str.trim().split(/\s+/)) {
    if (tok === '|' || !tok) continue;
    const [n, d] = tok.split(':');
    const dur = d ? +d : def;
    if (n !== 'r') out.push([t, n.split('+').map(midiOf), dur]);
    t += dur;
  }
  return { events: out, length: t };
}
// padrão rítmico repetido: hits = passos dentro do compasso
function rhythm(hits, bars, barLen, vel = 1) {
  const out = [];
  for (let b = 0; b < bars; b++) for (const h of hits) out.push([b * barLen + (Array.isArray(h) ? h[0] : h), null, 1, Array.isArray(h) ? h[1] : vel]);
  return out;
}
// acordes por compasso em batidas indicadas (ex.: "pah-pah" da valsa)
function comp(chords, hits, barLen, dur = 1) {
  const out = [];
  chords.forEach((ch, b) => {
    const notes = ch.split('+').map(midiOf);
    for (const h of hits) out.push([b * barLen + h, notes, dur]);
  });
  return out;
}
function bassline(roots, hits, barLen, dur = 1) {
  const out = [];
  roots.forEach((r, b) => {
    const list = Array.isArray(r) ? r : [r];
    hits.forEach((h, k) => out.push([b * barLen + h, [midiOf(list[k % list.length])], dur]));
  });
  return out;
}

// ======================= Trilhas =======================
const SONGS = {
  // Minueto em Sol maior (Petzold, séc. XVIII) — domínio público
  menu: (() => {
    const mel = seq(`D5:2 G4 A4 B4 C5 | D5:2 G4:2 G4:2 | E5:2 C5 D5 E5 F#5 | G5:2 G4:2 G4:2 |
      C5:2 D5 C5 B4 A4 | B4:2 C5 B4 A4 G4 | F#4:2 G4 A4 B4 G4 | A4:6 |
      D5:2 G4 A4 B4 C5 | D5:2 G4:2 G4:2 | E5:2 C5 D5 E5 F#5 | G5:2 G4:2 G4:2 |
      C5:2 D5 C5 B4 A4 | B4:2 C5 B4 A4 G4 | A4:2 B4 A4 G4 F#4 | G4:6`);
    const roots = ['G2', 'B2', 'C3', 'B2', 'A2', 'G2', 'D3', 'D3', 'G2', 'B2', 'C3', 'B2', 'A2', 'G2', 'D3', 'G2'];
    const pads = ['G3+B3+D4', 'G3+B3+D4', 'C4+E4+G4', 'G3+B3+D4', 'A3+C4+E4', 'G3+B3+D4', 'F#3+A3+D4', 'F#3+A3+D4',
      'G3+B3+D4', 'G3+B3+D4', 'C4+E4+G4', 'G3+B3+D4', 'A3+C4+E4', 'G3+B3+D4', 'F#3+A3+D4', 'G3+B3+D4'];
    return {
      bpm: 100, spb: 2, length: mel.length,
      tracks: [
        { inst: 'harp', vol: 0.5, events: mel.events },
        { inst: 'cello', vol: 0.35, events: bassline(roots, [0], 6, 6) },
        { inst: 'strings', vol: 0.12, events: comp(pads, [0], 6, 6) },
      ],
    };
  })(),

  // Ode à Alegria (Beethoven, 9ª Sinfonia) — domínio público
  map: (() => {
    const mel = seq(`E5 E5 F5 G5 | G5 F5 E5 D5 | C5 C5 D5 E5 | E5:3 D5:1 D5:4 |
      E5 E5 F5 G5 | G5 F5 E5 D5 | C5 C5 D5 E5 | D5:3 C5:1 C5:4 |
      D5 D5 E5 C5 | D5 E5:1 F5:1 E5 C5 | D5 E5:1 F5:1 E5 D5 | C5 D5 G4:4 |
      E5 E5 F5 G5 | G5 F5 E5 D5 | C5 C5 D5 E5 | D5:3 C5:1 C5:4`, 2);
    const ch = ['C', 'G', 'C', 'G', 'C', 'G', 'C', 'G', 'G', 'C', 'G', 'G', 'C', 'G', 'C', 'C'];
    const tri = { C: ['C4', 'E4', 'G4'], G: ['B3', 'D4', 'G4'] };
    const arp = [];
    ch.forEach((c, b) => tri[c].concat([tri[c][1]]).forEach((n, k) => { arp.push([b * 8 + k * 2, [midiOf(n)], 2]); }));
    return {
      bpm: 92, spb: 2, length: mel.length,
      tracks: [
        { inst: 'flute', vol: 0.36, events: mel.events },
        { inst: 'harp', vol: 0.25, events: arp },
        { inst: 'cello', vol: 0.32, events: bassline(ch.map((c) => (c === 'C' ? 'C3' : 'G2')), [0], 8, 8) },
        { inst: 'strings', vol: 0.1, events: comp(ch.map((c) => tri[c].join('+')), [0], 8, 8) },
      ],
    };
  })(),

  // Brasil — bossa nova original
  br: (() => {
    const mel = seq(`E5:4 G5:2 E5:2 D5:4 C5:4 | r:2 E5:2 C5:2 A4:2 B4:4 C5:4 |
      F5:4 A5:2 F5:2 E5:4 D5:4 | r:2 D5:2 B4:2 G4:2 A4:4 B4:4 |
      G5:4 B5:2 G5:2 F#5:4 E5:4 | r:2 E5:2 C#5:2 A4:2 G5:6 r:2 |
      F5:3 E5:1 D5:4 A4:4 C5:4 | B4:6 D5:2 G5:8`);
    const chords = ['E4+G4+B4', 'G3+C4+E4', 'F4+A4+C5', 'F3+B3+D4', 'G4+B4+D5', 'G3+C#4+E4', 'F4+A4+C5', 'F3+B3+D4'];
    const roots = [['C3', 'G2'], ['A2', 'E2'], ['D3', 'A2'], ['G2', 'D2'], ['E2', 'B2'], ['A2', 'E2'], ['D3', 'A2'], ['G2', 'D2']];
    return {
      bpm: 108, spb: 4, length: 128,
      tracks: [
        { inst: 'flute', vol: 0.3, events: mel.events },
        { inst: 'guitar', vol: 0.3, events: comp(chords, [0, 3, 6, 10, 12], 16, 2) },
        { inst: 'bass', vol: 0.5, events: bassline(roots, [0, 8], 16, 6) },
        { inst: 'shaker', vol: 0.18, events: rhythm([[0, 0.6], [1, 0.3], [2, 0.8], [3, 0.3], [4, 0.6], [5, 0.3], [6, 0.8], [7, 0.3], [8, 0.6], [9, 0.3], [10, 0.8], [11, 0.3], [12, 0.6], [13, 0.3], [14, 0.8], [15, 0.3]], 8, 16) },
        { inst: 'surdo', vol: 0.5, events: rhythm([[4, 0.5], [12, 1]], 8, 16) },
        { inst: 'tamborim', vol: 0.18, events: rhythm([0, 3, 6, 10, 13], 8, 16) },
      ],
    };
  })(),

  // EUA — jazz swing (blues em Fá) original
  us: (() => {
    const mel = seq(`C5 D5 F5:2 Ab5 F5 r:2 | C5 D5 F5:2 A5:2 r:2 | C6:2 A5 F5 Ab5 F5 D5 C5 | F5:6 r:2 |
      D5 F5 Ab5:2 Bb5 Ab5 r:2 | D5 F5 Ab5:2 F5:2 r:2 | C6:2 A5 F5 Ab5 F5 Eb5 C5 | F5:4 r:4 |
      G5:2 E5 C5 Bb5:2 G5:2 | F5:2 D5 Bb4 Ab5:2 F5:2 | A5 G5 F5 Eb5 D5 C5 A4 C5 | E5:2 G5:2 Bb5:2 r:2`);
    const chords = ['F', 'F', 'F', 'F', 'Bb', 'Bb', 'F', 'F', 'C', 'Bb', 'F', 'C'];
    const shells = { F: 'A3+Eb4', Bb: 'Ab3+D4', C: 'Bb3+E4' };
    const walk = { F: ['F2', 'A2', 'C3', 'D3'], Bb: ['Bb2', 'D3', 'F3', 'Ab2'], C: ['C3', 'E3', 'G3', 'Bb2'] };
    return {
      bpm: 150, spb: 2, swing: 0.64, length: 96,
      tracks: [
        { inst: 'sax', vol: 0.3, events: mel.events },
        { inst: 'piano', vol: 0.22, events: comp(chords.map((c) => shells[c]), [0, 3], 8, 1) },
        { inst: 'bass', vol: 0.55, events: bassline(chords.map((c) => walk[c]), [0, 2, 4, 6], 8, 2) },
        { inst: 'ride', vol: 0.16, events: rhythm([0, 2, 3, 4, 6, 7], 12, 8) },
        { inst: 'hat', vol: 0.18, events: rhythm([2, 6], 12, 8) },
        { inst: 'kick', vol: 0.25, events: rhythm([0], 12, 8) },
      ],
    };
  })(),

  // França — valsa musette original (acordeão)
  fr: (() => {
    const mel = seq(`E5:2 A5:2 C6:2 | B5:3 A5:1 G#5:2 | A5:2 E5:2 C5:2 | E5:6 |
      F5:2 A5:2 D6:2 | C6:3 B5:1 A5:2 | G#5:2 B5:2 E5:2 | B5:6 |
      E5:2 A5:2 C6:2 | B5:3 A5:1 G#5:2 | A5:2 F5:2 D5:2 | C5:3 B4:1 A4:2 |
      B4:2 D5:2 G#5:2 | B5:3 A5:1 G#5:2 | A5:2 E5:2 C5:2 | A4:6`);
    const ch = ['Am', 'E', 'Am', 'Am', 'Dm', 'Am', 'E', 'E', 'Am', 'E', 'F', 'Am', 'E', 'E', 'Am', 'Am'];
    const tri = { Am: 'A3+C4+E4', E: 'G#3+B3+E4', Dm: 'A3+D4+F4', F: 'A3+C4+F4' };
    const rt = { Am: 'A2', E: 'E2', Dm: 'D2', F: 'F2' };
    return {
      bpm: 168, spb: 2, length: 96,
      tracks: [
        { inst: 'accordion', vol: 0.3, events: mel.events },
        { inst: 'accordion', vol: 0.13, events: comp(ch.map((c) => tri[c]), [2, 4], 6, 1) },
        { inst: 'bass', vol: 0.5, events: bassline(ch.map((c) => rt[c]), [0], 6, 2) },
        { inst: 'hat', vol: 0.08, events: rhythm([2, 4], 16, 6) },
      ],
    };
  })(),

  // Japão — escala In (miyako-bushi), koto e shakuhachi, original
  jp: (() => {
    const mel = seq(`B4:6 A4:2 | B4:4 C5:4 | E5:6 F5:2 | E5:8 | C5:4 B4:2 A4:2 | B4:4 F4:4 | E4:6 F4:2 | E4:8`);
    const P = {
      1: 'E4 B4 E5 F5 E5 B4 A4 B4', 2: 'A3 E4 A4 B4 C5 B4 A4 E4',
      3: 'F4 C5 F5 E5 C5 B4 A4 F4', 4: 'E4 B4 E5 B4 A4 F4 E4 B3',
    };
    const order = [1, 1, 3, 1, 2, 3, 4, 1];
    const koto = [];
    order.forEach((p, b) => seq(P[p], 1, b * 8).events.forEach((e) => koto.push(e)));
    return {
      bpm: 72, spb: 2, length: 64,
      tracks: [
        { inst: 'shakuhachi', vol: 0.32, events: mel.events },
        { inst: 'koto', vol: 0.32, events: koto },
        { inst: 'taiko', vol: 0.45, events: rhythm([[0, 1], [6, 0.45]], 8, 8) },
        { inst: 'tek', vol: 0.12, events: rhythm([4], 8, 8) },
      ],
    };
  })(),

  // Suíça — ländler alpino original (acordeão, tuba e sino de vaca)
  ch: (() => {
    const mel = seq(`D5:2 G5:2 B5:2 | D6:3 B5:1 G5:2 | A5:2 F#5:2 D5:2 | A5:4 r:2 |
      C6:2 A5:2 F#5:2 | A5:3 G5:1 F#5:2 | G5:2 B5:2 D6:2 | B5:4 r:2 |
      D5:2 G5:2 B5:2 | E6:3 C6:1 G5:2 | D6:2 B5:2 G5:2 | F#5:2 A5:2 D6:2 |
      E5:2 G5:2 C6:2 | D6:2 C6:2 A5:2 | G5:2 D5:2 B4:2 | G4:4 r:2`);
    const ch = ['G', 'G', 'D', 'D', 'D', 'D', 'G', 'G', 'G', 'C', 'G', 'D', 'C', 'D', 'G', 'G'];
    const tri = { G: 'G3+B3+D4', D: 'F#3+A3+D4', C: 'G3+C4+E4' };
    const rt = { G: 'G2', D: 'D2', C: 'C2' };
    return {
      bpm: 152, spb: 2, length: 96,
      tracks: [
        { inst: 'accordion', vol: 0.28, events: mel.events },
        { inst: 'accordion', vol: 0.12, events: comp(ch.map((c) => tri[c]), [2, 4], 6, 1) },
        { inst: 'tuba', vol: 0.45, events: bassline(ch.map((c) => rt[c]), [0], 6, 2) },
        { inst: 'cowbell', vol: 0.1, events: rhythm([0], 16, 6).filter((_, k) => k % 2 === 0) },
      ],
    };
  })(),

  // Dubai — escala Hijaz, oud, ney e darbuka (ritmo maqsum), original
  ae: (() => {
    const mel = seq(`A5:6 Bb5:2 A5:8 | G5:4 F#5:4 G5:4 A5:4 | Bb5:8 A5:4 G5:4 | F#5:12 r:4 |
      D5:4 Eb5:4 F#5:4 G5:4 | A5:8 G5:4 F#5:4 | Eb5:4 F#5:4 Eb5:4 D5:4 | D5:12 r:4`);
    const oud = [];
    for (let b = 0; b < 8; b++) seq(b % 2 ? 'A4:2 Bb4:2 A4:2 G4:2 F#4:4 Eb4:2 D4:2' : 'D4:2 Eb4:2 F#4:2 G4:2 A4:4 G4:2 F#4:2', 1, b * 16).events.forEach((e) => oud.push(e));
    return {
      bpm: 96, spb: 4, length: 128,
      tracks: [
        { inst: 'ney', vol: 0.28, events: mel.events },
        { inst: 'oud', vol: 0.3, events: oud },
        { inst: 'strings', vol: 0.08, events: comp(Array(8).fill('D3+A3'), [0], 16, 16) },
        { inst: 'doum', vol: 0.5, events: rhythm([0, 8], 8, 16) },
        { inst: 'tek', vol: 0.22, events: rhythm([2, 6, 12, [14, 0.5], [15, 0.4]], 8, 16) },
      ],
    };
  })(),
};

// ======================= Instrumentos =======================
let noiseBuf = null;
let reverb = null;
function noise(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  return s;
}
function getReverb(c, out) {
  if (reverb) return reverb;
  const len = c.sampleRate * 2.2;
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  const conv = c.createConvolver();
  conv.buffer = buf;
  const wet = c.createGain(); wet.gain.value = 0.22;
  conv.connect(wet).connect(out);
  reverb = conv;
  return conv;
}

function env(c, g, t, a, peak, d, sustain, rel, end) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  if (sustain !== null) {
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * sustain), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0002, peak * sustain), end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
  } else {
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
}
function osc(c, type, f, t, stop, detune = 0) {
  const o = c.createOscillator();
  o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  o.start(t); o.stop(stop);
  return o;
}
function vibrato(c, o, t, stop, depth = 8, rate = 5.5, delay = 0.25) {
  const l = c.createOscillator(); l.frequency.value = rate;
  const lg = c.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(depth, t + delay + 0.2);
  l.connect(lg).connect(o.detune);
  l.start(t); l.stop(stop);
}

// toca uma nota; out = destino seco, rv = reverb
function play(c, out, rv, inst, midi, t, dur, vol) {
  const f = midi ? hz(midi) : 0;
  const g = c.createGain();
  const send = (node, wet = true) => { node.connect(out); if (wet) node.connect(rv); };
  switch (inst) {
    case 'piano': case 'harp': {
      const end = t + (inst === 'harp' ? 1.6 : 1.2) + dur * 0.3;
      const o1 = osc(c, 'triangle', f, t, end); const o2 = osc(c, 'sine', f * 2, t, end);
      const g2 = c.createGain(); g2.gain.value = 0.25; o2.connect(g2).connect(g); o1.connect(g);
      env(c, g, t, 0.006, vol, end - t - 0.01, null);
      send(g); break;
    }
    case 'guitar': case 'koto': case 'oud': {
      const end = t + (inst === 'koto' ? 1.4 : 0.9);
      const o = osc(c, 'sawtooth', f, t, end);
      if (inst === 'koto') { o.frequency.setValueAtTime(f * 1.03, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); }
      const lp = c.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(inst === 'oud' ? 2200 : 3000, t); lp.frequency.exponentialRampToValueAtTime(inst === 'guitar' ? 500 : 700, end);
      o.connect(lp).connect(g);
      env(c, g, t, 0.004, vol * 0.8, end - t - 0.01, null);
      send(g); break;
    }
    case 'bass': case 'cello': case 'tuba': {
      const end = t + dur + (inst === 'cello' ? 0.3 : 0.08);
      const o = osc(c, inst === 'bass' ? 'triangle' : 'sawtooth', f, t, end + 0.2);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = inst === 'bass' ? 700 : inst === 'tuba' ? 520 : 900;
      o.connect(lp).connect(g);
      if (inst === 'cello') vibrato(c, o, t, end + 0.2, 6, 5, 0.3);
      env(c, g, t, inst === 'cello' ? 0.08 : 0.015, vol, 0.25, inst === 'bass' ? 0.55 : 0.8, 0.12, end);
      send(g, inst === 'cello'); break;
    }
    case 'accordion': case 'sax': case 'strings': {
      const end = t + dur;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.value = inst === 'strings' ? 1600 : inst === 'sax' ? 1900 : 2600;
      const dets = inst === 'accordion' ? [-9, 9] : inst === 'strings' ? [-7, 0, 7] : [0];
      for (const dt of dets) {
        const o = osc(c, inst === 'accordion' ? 'square' : 'sawtooth', f, t, end + 0.6, dt);
        if (inst === 'sax') vibrato(c, o, t, end + 0.6, 12, 5.5, 0.18);
        o.connect(lp);
      }
      lp.connect(g);
      const att = inst === 'strings' ? 0.25 : inst === 'sax' ? 0.04 : 0.03;
      env(c, g, t, att, vol / Math.sqrt(dets.length), 0.15, 0.85, inst === 'strings' ? 0.5 : 0.1, end);
      send(g); break;
    }
    case 'flute': case 'shakuhachi': case 'ney': {
      const end = t + dur;
      const o = osc(c, 'sine', f, t, end + 0.5);
      if (inst !== 'flute') { o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); }
      vibrato(c, o, t, end + 0.5, inst === 'flute' ? 9 : 16, 5, 0.25);
      const o2 = osc(c, 'triangle', f, t, end + 0.5);
      const g2 = c.createGain(); g2.gain.value = 0.25; o2.connect(g2).connect(g);
      o.connect(g);
      if (inst !== 'flute') { // sopro
        const n = noise(c); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 3;
        const ng = c.createGain(); ng.gain.value = 0.15; n.connect(bp).connect(ng).connect(g); n.start(t); n.stop(end + 0.5);
      }
      env(c, g, t, inst === 'flute' ? 0.05 : 0.12, vol, 0.2, 0.8, 0.25, end);
      send(g); break;
    }
    case 'cowbell': {
      const end = t + 0.5;
      for (const ff of [562, 845]) { const o = osc(c, 'square', ff, t, end); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; o.connect(bp).connect(g); }
      env(c, g, t, 0.002, vol, 0.45, null);
      send(g); break;
    }
    case 'kick': case 'surdo': case 'taiko': case 'doum': {
      const f0 = { kick: 130, surdo: 95, taiko: 110, doum: 140 }[inst];
      const f1 = { kick: 45, surdo: 55, taiko: 48, doum: 70 }[inst];
      const d = { kick: 0.3, surdo: 0.55, taiko: 0.8, doum: 0.35 }[inst];
      const o = osc(c, 'sine', f0, t, t + d + 0.05);
      o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.6);
      o.connect(g);
      env(c, g, t, 0.003, vol, d, null);
      send(g, inst === 'taiko'); break;
    }
    case 'snare': case 'hat': case 'ride': case 'shaker': case 'tamborim': case 'tek': {
      const cfg = { snare: ['bandpass', 1800, 0.16], hat: ['highpass', 7500, 0.05], ride: ['highpass', 5200, 0.28], shaker: ['bandpass', 6500, 0.07], tamborim: ['bandpass', 3800, 0.06], tek: ['bandpass', 3200, 0.07] }[inst];
      const n = noise(c);
      const flt = c.createBiquadFilter(); flt.type = cfg[0]; flt.frequency.value = cfg[1]; flt.Q.value = 1.2;
      n.connect(flt).connect(g);
      n.start(t, Math.random() * 0.5); n.stop(t + cfg[2] + 0.02);
      if (inst === 'tamborim' || inst === 'tek') { const o = osc(c, 'triangle', inst === 'tek' ? 700 : 900, t, t + 0.05); const og = c.createGain(); og.gain.value = 0.5; o.connect(og).connect(g); }
      env(c, g, t, 0.002, vol, cfg[2], null);
      send(g, false); break;
    }
    default: return;
  }
}

// ======================= Sequenciador =======================
export const Music = {
  current: null,     // nome da trilha
  timer: null,
  bus: null,         // ganho próprio da faixa (para fade)
  play(name) {
    if (this.current === name) return;
    this.stop(0.8);
    this.current = name;
    const a = getAudio();
    if (!a || !SONGS[name]) return;
    const { ctx: c, musicBus } = a;
    const song = SONGS[name];
    const bus = c.createGain();
    bus.gain.setValueAtTime(0.0001, c.currentTime);
    bus.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.5);
    bus.connect(musicBus);
    const rv = getReverb(c, musicBus);
    this.bus = bus;
    const stepDur = 60 / song.bpm / song.spb;
    // lista plana e ordenada de eventos
    const evs = [];
    for (const tr of song.tracks) for (const [step, notes, len, vel] of tr.events) {
      if (notes) for (const n of notes) evs.push({ step, midi: n, len, vol: tr.vol * (vel ?? 1), inst: tr.inst });
      else evs.push({ step, midi: 0, len, vol: tr.vol * (vel ?? 1), inst: tr.inst });
    }
    evs.sort((x, y) => x.step - y.step);
    let t0 = c.currentTime + 0.15;
    let idx = 0;
    const timeOf = (step) => {
      let t = t0 + step * stepDur;
      if (song.swing && song.spb === 2 && step % 2 === 1) t += (song.swing - 0.5) * 2 * stepDur;
      return t;
    };
    const tick = () => {
      if (!this.bus || this.bus !== bus) return;
      const horizon = c.currentTime + 0.25;
      while (true) {
        if (idx >= evs.length) { idx = 0; t0 += song.length * stepDur; }
        const e = evs[idx];
        const t = timeOf(e.step);
        if (t > horizon) break;
        if (t > c.currentTime - 0.05) play(c, bus, rv, e.inst, e.midi, Math.max(t, c.currentTime), e.len * stepDur, e.vol);
        idx++;
      }
    };
    tick();
    this.timer = setInterval(tick, 60);
  },
  stop(fade = 0.5) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const a = this.bus && getAudio();
    if (a && this.bus) {
      const b = this.bus;
      b.gain.cancelScheduledValues(a.ctx.currentTime);
      b.gain.setValueAtTime(Math.max(0.0001, b.gain.value), a.ctx.currentTime);
      b.gain.exponentialRampToValueAtTime(0.0001, a.ctx.currentTime + fade);
      setTimeout(() => b.disconnect(), (fade + 0.5) * 1000);
    }
    this.bus = null;
    this.current = null;
  },
  // pausa quando a aba fica oculta (evita acumular notas)
  init() {
    document.addEventListener('visibilitychange', () => {
      const a = getAudio();
      if (!a) return;
      if (document.hidden) a.ctx.suspend(); else a.ctx.resume();
    });
    Settings.on((k, v) => { if (k === 'music' && !v) { const cur = this.current; this.stop(0.2); this.wanted = cur; } else if (k === 'music' && v && this.wanted && !this.current) this.play(this.wanted); });
  },
  // pede uma trilha; só começa depois do primeiro toque/clique (regra dos navegadores)
  want(name) {
    this.wanted = name;
    if (!Settings.get('music')) return;
    if (this.unlocked) this.play(name);
  },
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.wanted && Settings.get('music')) this.play(this.wanted);
  },
};
export const SONG_NAMES = Object.keys(SONGS);
