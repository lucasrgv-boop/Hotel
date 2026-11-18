// Texturas pixel art geradas proceduralmente em <canvas>.
import * as THREE from 'three';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }

function shade(c, f) {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
}

function makeTex(size, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

export const Tex = {
  wood: (base = 0x9c6b3e) => cached('wood' + base, () => makeTex(16, (g, s) => {
    const r = rng(7);
    for (let y = 0; y < s; y++) {
      const plank = Math.floor(y / 4);
      for (let x = 0; x < s; x++) {
        const off = (plank % 2) * 8;
        const edge = y % 4 === 3 || (x + off) % 16 === 0;
        const f = edge ? 0.72 : 0.92 + r() * 0.16;
        g.fillStyle = hex(shade(base, f));
        g.fillRect(x, y, 1, 1);
      }
    }
  })),

  carpet: (base) => cached('carpet' + base, () => makeTex(16, (g, s) => {
    const r = rng(base);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const pat = ((x + y) % 8 === 0) || ((x - y + 16) % 8 === 0);
      g.fillStyle = hex(shade(base, pat ? 1.15 : 0.93 + r() * 0.1));
      g.fillRect(x, y, 1, 1);
    }
  })),

  tiles: (a = 0xe8e4d8, b = 0xc9c2b0) => cached('tiles' + a + b, () => makeTex(16, (g, s) => {
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const checker = ((x >> 3) + (y >> 3)) % 2 === 0;
      const grout = x % 8 === 0 || y % 8 === 0;
      g.fillStyle = hex(grout ? shade(b, 0.8) : checker ? a : b);
      g.fillRect(x, y, 1, 1);
    }
  })),

  poolTiles: () => cached('pooltiles', () => makeTex(16, (g, s) => {
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const grout = x % 4 === 0 || y % 4 === 0;
      g.fillStyle = hex(grout ? 0xdff6ff : 0x7fd3ee);
      g.fillRect(x, y, 1, 1);
    }
  })),

  water: () => cached('water', () => makeTex(16, (g, s) => {
    const r = rng(3);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const wave = Math.sin((x + y * 0.5) * 0.8) > 0.85;
      g.fillStyle = hex(wave ? 0xbdf0ff : shade(0x2fa8d8, 0.95 + r() * 0.1));
      g.fillRect(x, y, 1, 1);
    }
  })),

  wallpaper: (base, stripe) => cached('wp' + base + '_' + stripe, () => makeTex(16, (g, s) => {
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      let c = base;
      if (x % 8 === 0 || x % 8 === 1) c = stripe;
      if (y >= 12) c = y === 12 ? shade(base, 0.6) : shade(base, 0.8); // rodapé
      g.fillStyle = hex(c);
      g.fillRect(x, y, 1, 1);
    }
  })),

  brick: (base = 0xb5563c) => cached('brick' + base, () => makeTex(16, (g, s) => {
    const r = rng(11);
    g.fillStyle = hex(0xd8cfc0);
    g.fillRect(0, 0, s, s);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 4 : 0;
      for (let col = -1; col < 2; col++) {
        const x0 = col * 8 + off;
        g.fillStyle = hex(shade(base, 0.85 + r() * 0.3));
        g.fillRect(x0 + 1, row * 4 + 1, 7, 3);
      }
    }
  })),

  grass: () => cached('grass', () => makeTex(16, (g, s) => {
    const r = rng(5);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const v = r();
      g.fillStyle = hex(v > 0.9 ? 0x8fd16a : v > 0.4 ? 0x5fa843 : 0x4e9138);
      g.fillRect(x, y, 1, 1);
    }
  })),

  asphalt: () => cached('asphalt', () => makeTex(16, (g, s) => {
    const r = rng(9);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      g.fillStyle = hex(shade(0x4a4a52, 0.85 + r() * 0.25));
      g.fillRect(x, y, 1, 1);
    }
  })),

  sidewalk: () => cached('sidewalk', () => makeTex(16, (g, s) => {
    const r = rng(13);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const grout = x % 8 === 0 || y % 8 === 0;
      g.fillStyle = hex(grout ? 0x9a978f : shade(0xc8c4b8, 0.92 + r() * 0.12));
      g.fillRect(x, y, 1, 1);
    }
  })),

  roof: () => cached('roof', () => makeTex(16, (g, s) => {
    const r = rng(17);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      g.fillStyle = hex(shade(0x7a7a80, 0.85 + r() * 0.2));
      g.fillRect(x, y, 1, 1);
    }
  })),

  dirt: () => cached('dirt', () => makeTex(16, (g, s) => {
    const r = rng(21);
    g.clearRect(0, 0, s, s);
    for (let i = 0; i < 18; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(90,70,30,0.85)' : 'rgba(60,90,40,0.8)';
      g.fillRect(Math.floor(r() * s), Math.floor(r() * s), 1 + Math.floor(r() * 2), 1);
    }
  })),

  sheet: (color) => cached('sheet' + color, () => makeTex(8, (g, s) => {
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      g.fillStyle = hex(y < 3 ? 0xf4f4f4 : ((x + y) % 4 === 0 ? shade(color, 1.15) : color));
      g.fillRect(x, y, 1, 1);
    }
  })),
};

// ---------- Ícones (sprites) em pixel art -----------
// Cada ícone é uma matriz de caracteres; cada caractere mapeia para uma cor.
const ICONS = {
  bed: [
    '..........',
    '..........',
    'w.........',
    'w.pp......',
    'wppppbbbbb',
    'wbbbbbbbbb',
    'wbbbbbbbbb',
    'w........w',
    '..........',
  ],
  star: [
    '....y....',
    '....y....',
    '...yyy...',
    'yyyyyyyyy',
    '.yyyyyyy.',
    '..yyyyy..',
    '..yy.yy..',
    '.yy...yy.',
    '.........',
  ],
  heart: [
    '.rr...rr.',
    'rrrr.rrrr',
    'rrrrrrrrr',
    'rrrrrrrrr',
    '.rrrrrrr.',
    '..rrrrr..',
    '...rrr...',
    '....r....',
  ],
  angry: [
    '.r.....r.',
    '..r...r..',
    '.........',
    '..rr.rr..',
    '..rr.rr..',
    '.........',
    '..rrrrr..',
    '.r.....r.',
  ],
  zz: [
    '.....bbbb',
    '.......b.',
    '......b..',
    'bbbb.bbbb',
    '..b......',
    '.b.......',
    'bbbb.....',
  ],
  broom: [
    '......k..',
    '.....k...',
    '....k....',
    '...k.....',
    '..yyy....',
    '.yyyyy...',
    'yyyyyy...',
    'y.y.y....',
  ],
  coin: [
    '..yyyy..',
    '.yYYYYy.',
    'yYYyyYYy',
    'yYyYYYYy',
    'yYyYYYYy',
    'yYYyyYYy',
    '.yYYYYy.',
    '..yyyy..',
  ],
  burger: [
    '..oooo..',
    '.oooooo.',
    'gggggggg',
    'rrrrrrrr',
    'kkkkkkkk',
    '.oooooo.',
  ],
  dumbbell: [
    'kk....kk',
    'kk....kk',
    'kkwwwwkk',
    'kk....kk',
    'kk....kk',
  ],
  wave: [
    '.b...b...b',
    'bbb.bbb.bb',
    'b.bbb.bbb.',
    '..........',
    '.b...b...b',
    'bbb.bbb.bb',
  ],
  dirty: [
    '..g...g..',
    '.ggg.....',
    '..g...k..',
    '.....kkk.',
    '.k....k..',
    'kkk......',
    '.k...g...',
  ],
};

const ICON_COLORS = {
  w: '#ffffff', p: '#f4f4f4', b: '#5b8def', y: '#f6c90e', Y: '#ffe680', r: '#e8433a',
  k: '#3b3b3b', o: '#d9902f', g: '#6abe30', '.': null,
};

export function drawIcon(g, name, ox, oy, scale = 1, tint = null) {
  const rows = ICONS[name];
  if (!rows) return;
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      let col = ICON_COLORS[ch];
      if (!col) continue;
      if (tint && ch === 'b') col = tint;
      g.fillStyle = col;
      g.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}

export function iconSize(name) {
  const rows = ICONS[name];
  return [rows[0].length, rows.length];
}

export function iconDataURL(name, scale = 3, tint = null) {
  const [w, h] = iconSize(name);
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  drawIcon(c.getContext('2d'), name, 0, 0, scale, tint);
  return c.toDataURL();
}

export { shade, hex };
