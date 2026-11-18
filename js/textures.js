// Texturas procedurais (lisas, estilo cartoon) e ícones vetoriais desenhados em <canvas>.
import * as THREE from 'three';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }
export function shade(c, f) {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
}

let maxAniso = 4;
export function setAnisotropy(a) { maxAniso = a; }

function makeTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}
// cópia com repetição própria (compartilha a imagem)
export function rep(tex, rx, ry) {
  const t = tex.clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

export const Tex = {
  // piso de tábuas de madeira
  wood: (base = 0xc8935c) => cached('wood' + base, () => makeTex(256, (g, s) => {
    const r = rng(base);
    const rows = 8, h = s / rows;
    for (let row = 0; row < rows; row++) {
      let x = -Math.floor(r() * 120);
      while (x < s) {
        const len = 90 + r() * 110;
        g.fillStyle = hex(shade(base, 0.88 + r() * 0.2));
        g.fillRect(x, row * h, len, h);
        g.strokeStyle = 'rgba(80,40,10,0.12)';
        g.lineWidth = 1;
        for (let k = 0; k < 4; k++) {
          const y = row * h + 4 + r() * (h - 8);
          g.beginPath(); g.moveTo(x + 4, y);
          g.bezierCurveTo(x + len * 0.3, y + 2, x + len * 0.6, y - 2, x + len - 4, y + 1);
          g.stroke();
        }
        g.fillStyle = 'rgba(70,35,10,0.35)';
        g.fillRect(x, row * h, 2, h);
        x += len;
      }
      g.fillStyle = 'rgba(70,35,10,0.3)';
      g.fillRect(0, row * h, s, 2);
    }
  })),

  // lajotas quadriculadas
  tiles: (a = 0xf3e6cf, b = 0xd9b48a, n = 4) => cached(`tiles${a}_${b}_${n}`, () => makeTex(256, (g, s) => {
    const r = rng(a ^ b);
    const t = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = hex(shade((x + y) % 2 ? a : b, 0.96 + r() * 0.06));
      g.fillRect(x * t, y * t, t, t);
    }
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 3;
    for (let k = 0; k <= n; k++) {
      g.beginPath(); g.moveTo(k * t, 0); g.lineTo(k * t, s); g.stroke();
      g.beginPath(); g.moveTo(0, k * t); g.lineTo(s, k * t); g.stroke();
    }
  })),

  // carpete com padrão de losangos
  carpet: (base) => cached('carpet' + base, () => makeTex(128, (g, s) => {
    g.fillStyle = hex(base); g.fillRect(0, 0, s, s);
    g.strokeStyle = hex(shade(base, 1.18)); g.lineWidth = 3;
    for (let k = -s; k < s * 2; k += 32) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k + s, s); g.stroke();
      g.beginPath(); g.moveTo(k + s, 0); g.lineTo(k, s); g.stroke();
    }
    const r = rng(base);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
      g.fillRect(r() * s, r() * s, 2, 2);
    }
  })),

  // parede com textura sutil
  wall: (base = 0xf7f3ec) => cached('wall' + base, () => makeTex(128, (g, s) => {
    g.fillStyle = hex(base); g.fillRect(0, 0, s, s);
    const r = rng(base);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '120,100,80'},${0.04 + r() * 0.05})`;
      g.beginPath(); g.arc(r() * s, r() * s, 1 + r() * 3, 0, Math.PI * 2); g.fill();
    }
  })),

  poolTiles: () => cached('pooltiles', () => makeTex(128, (g, s) => {
    g.fillStyle = '#4fb6e8'; g.fillRect(0, 0, s, s);
    const r = rng(4);
    const t = s / 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      g.fillStyle = hex(shade(0x56bdf0, 0.92 + r() * 0.14));
      g.fillRect(x * t + 1, y * t + 1, t - 2, t - 2);
    }
  })),

  water: () => cached('water', () => makeTex(256, (g, s) => {
    g.fillStyle = '#38b6e6'; g.fillRect(0, 0, s, s);
    const r = rng(8);
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const x = r() * s, y = r() * s, w = 12 + r() * 30;
      g.lineWidth = 2 + r() * 2;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 5, x + w, y); g.stroke();
    }
  })),

  grass: () => cached('grass', () => makeTex(256, (g, s) => {
    g.fillStyle = '#6cbf4a'; g.fillRect(0, 0, s, s);
    const r = rng(5);
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(140,210,90,0.5)' : 'rgba(70,140,50,0.45)';
      g.fillRect(r() * s, r() * s, 2, 3 + r() * 3);
    }
  })),

  cobble: () => cached('cobble', () => makeTex(256, (g, s) => {
    g.fillStyle = '#9d9a94'; g.fillRect(0, 0, s, s);
    const r = rng(13);
    const n = 8, t = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const off = (y % 2) * t / 2;
      g.fillStyle = hex(shade(0xd8d4cc, 0.85 + r() * 0.2));
      const px = x * t + off + 3, py = y * t + 3;
      g.beginPath();
      g.roundRect ? g.roundRect(px, py, t - 6, t - 6, 8) : g.rect(px, py, t - 6, t - 6);
      g.fill();
      if (px + t > s) { g.beginPath(); g.roundRect ? g.roundRect(px - s, py, t - 6, t - 6, 8) : g.rect(px - s, py, t - 6, t - 6); g.fill(); }
    }
  })),

  asphalt: () => cached('asphalt', () => makeTex(256, (g, s) => {
    g.fillStyle = '#5b5e66'; g.fillRect(0, 0, s, s);
    const r = rng(9);
    for (let i = 0; i < 3000; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.08})`;
      g.fillRect(r() * s, r() * s, 2, 2);
    }
  })),

  // fachada com janelas (andares de baixo)
  facade: () => cached('facade', () => makeTex(256, (g, s) => {
    g.fillStyle = '#f4efe6'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#e6ddcf'; g.fillRect(0, s - 18, s, 18);
    // janela arqueada
    const wx = s * 0.3, ww = s * 0.4, wy = s * 0.22, wh = s * 0.52;
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(wx - 8, wy + wh + 8); g.lineTo(wx - 8, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2 + 8, Math.PI, 0); g.lineTo(wx + ww + 8, wy + wh + 8); g.fill();
    const grd = g.createLinearGradient(0, wy, 0, wy + wh);
    grd.addColorStop(0, '#7fc8ee'); grd.addColorStop(1, '#3f8fc9');
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh * 0.55); g.lineTo(wx + ww, wy + wh * 0.55); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(wx + 8, wy + ww / 2, 10, wh * 0.4);
  })),

  roof: () => cached('roof', () => makeTex(256, (g, s) => {
    g.fillStyle = '#c96a4a'; g.fillRect(0, 0, s, s);
    const r = rng(17);
    for (let y = 0; y < s; y += 16) {
      for (let x = -(y / 16 % 2) * 16; x < s; x += 32) {
        g.fillStyle = hex(shade(0xc96a4a, 0.85 + r() * 0.25));
        g.beginPath(); g.ellipse(x + 16, y + 10, 16, 10, 0, 0, Math.PI); g.fill();
      }
    }
  })),

  // sujeira no chão (transparente)
  dirt: () => cached('dirt', () => makeTex(256, (g, s) => {
    g.clearRect(0, 0, s, s);
    const r = rng(21);
    for (let i = 0; i < 26; i++) {
      const x = r() * s, y = r() * s, rad = 6 + r() * 18;
      g.fillStyle = r() > 0.5 ? 'rgba(120,90,40,0.5)' : 'rgba(90,110,50,0.45)';
      g.beginPath(); g.ellipse(x, y, rad, rad * (0.5 + r() * 0.5), r() * 3, 0, Math.PI * 2); g.fill();
    }
  })),

  // estampa de cobertor
  quilt: (color) => cached('quilt' + color, () => makeTex(128, (g, s) => {
    g.fillStyle = hex(color); g.fillRect(0, 0, s, s);
    g.strokeStyle = hex(shade(color, 1.25)); g.lineWidth = 3;
    for (let k = 16; k < s; k += 32) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k, s); g.stroke();
      g.beginPath(); g.moveTo(0, k); g.lineTo(s, k); g.stroke();
    }
  })),

  // quadros na parede
  painting: (seed) => cached('paint' + seed, () => makeTex(128, (g, s) => {
    const r = rng(seed * 77 + 3);
    const sky = g.createLinearGradient(0, 0, 0, s);
    sky.addColorStop(0, '#9fd6f5'); sky.addColorStop(1, '#f6e3b4');
    g.fillStyle = sky; g.fillRect(0, 0, s, s);
    g.fillStyle = hex(0x5aa860 + Math.floor(r() * 0x30));
    g.beginPath(); g.moveTo(0, s * 0.7);
    for (let x = 0; x <= s; x += 16) g.lineTo(x, s * (0.5 + r() * 0.25));
    g.lineTo(s, s); g.lineTo(0, s); g.fill();
    g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(s * 0.75, s * 0.25, 12, 0, Math.PI * 2); g.fill();
  })),
};

// ---------------- Ícones vetoriais ----------------
// Cada função desenha centrada em (0,0) numa caixa de ~ -1..1
const ICONS = {
  bed(g, c) {
    g.fillStyle = '#7a4a2a'; rr(g, -0.95, -0.45, 0.18, 0.95, 0.06); g.fill();
    g.fillStyle = c || '#4f9bd9'; rr(g, -0.8, -0.05, 1.75, 0.45, 0.12); g.fill();
    g.fillStyle = '#ffffff'; rr(g, -0.72, -0.32, 0.55, 0.3, 0.12); g.fill();
    g.fillStyle = '#7a4a2a'; g.fillRect(-0.85, 0.38, 0.12, 0.25); g.fillRect(0.8, 0.38, 0.12, 0.25);
  },
  burger(g) {
    g.fillStyle = '#f0a43a'; g.beginPath(); g.ellipse(0, -0.15, 0.85, 0.5, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#6cbf4a'; rr(g, -0.9, -0.12, 1.8, 0.18, 0.09); g.fill();
    g.fillStyle = '#7a3b1c'; rr(g, -0.85, 0.08, 1.7, 0.24, 0.12); g.fill();
    g.fillStyle = '#f0a43a'; rr(g, -0.82, 0.34, 1.64, 0.3, 0.14); g.fill();
    g.fillStyle = '#fff3c4'; [[-0.4, -0.38], [0, -0.48], [0.4, -0.36]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 0.07, 0.04, 0, 0, 7); g.fill(); });
  },
  dumbbell(g) {
    g.fillStyle = '#555c66'; rr(g, -0.6, -0.08, 1.2, 0.16, 0.06); g.fill();
    g.fillStyle = '#2f343b';
    rr(g, -0.95, -0.45, 0.3, 0.9, 0.1); g.fill(); rr(g, 0.65, -0.45, 0.3, 0.9, 0.1); g.fill();
    rr(g, -0.68, -0.3, 0.14, 0.6, 0.05); g.fill(); rr(g, 0.54, -0.3, 0.14, 0.6, 0.05); g.fill();
  },
  wave(g) {
    g.strokeStyle = '#2f9ad8'; g.lineWidth = 0.18; g.lineCap = 'round';
    for (const y of [-0.35, 0.05, 0.45]) {
      g.beginPath(); g.moveTo(-0.85, y);
      g.bezierCurveTo(-0.55, y - 0.3, -0.3, y + 0.3, 0, y);
      g.bezierCurveTo(0.3, y - 0.3, 0.55, y + 0.3, 0.85, y); g.stroke();
    }
  },
  broom(g) {
    g.strokeStyle = '#8a5a30'; g.lineWidth = 0.14; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0.7, -0.85); g.lineTo(-0.1, 0.15); g.stroke();
    g.fillStyle = '#f2c14e';
    g.beginPath(); g.moveTo(-0.15, 0.05); g.lineTo(0.15, 0.3); g.lineTo(-0.3, 0.9); g.lineTo(-0.85, 0.45); g.closePath(); g.fill();
    g.strokeStyle = '#c99528'; g.lineWidth = 0.05;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-0.1 - k * 0.1, 0.2 + k * 0.05); g.lineTo(-0.5 - k * 0.12, 0.7 - k * 0.02); g.stroke(); }
    g.fillStyle = '#9fe0ff';
    [[0.45, 0.45, 0.12], [0.7, 0.15, 0.08], [0.25, 0.75, 0.07]].forEach(([x, y, r]) => star4(g, x, y, r));
  },
  sparkle(g) {
    g.fillStyle = '#5ec8f2'; star4(g, -0.2, 0.1, 0.6);
    g.fillStyle = '#ffd34d'; star4(g, 0.5, -0.5, 0.3); star4(g, 0.55, 0.55, 0.22);
  },
  heart(g) {
    g.fillStyle = '#ef4b5c';
    g.beginPath(); g.moveTo(0, 0.8);
    g.bezierCurveTo(-1.1, 0, -0.75, -0.95, 0, -0.38);
    g.bezierCurveTo(0.75, -0.95, 1.1, 0, 0, 0.8); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-0.42, -0.3, 0.14, 0.09, -0.6, 0, 7); g.fill();
  },
  star(g) {
    g.fillStyle = '#ffc93c';
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 ? 0.4 : 0.92;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r + 0.05);
    }
    g.closePath(); g.fill();
  },
  angry(g) {
    g.fillStyle = '#ef4b5c'; g.beginPath(); g.arc(0, 0, 0.85, 0, 7); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 0.13; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-0.5, -0.4); g.lineTo(-0.15, -0.2); g.moveTo(0.5, -0.4); g.lineTo(0.15, -0.2); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-0.3, 0.02, 0.1, 0, 7); g.arc(0.3, 0.02, 0.1, 0, 7); g.fill();
    g.beginPath(); g.arc(0, 0.6, 0.32, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  },
  zz(g) {
    g.fillStyle = '#6b72d9';
    g.font = 'bold 1.1px Fredoka, Nunito, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('z', -0.35, 0.3);
    g.font = 'bold 0.75px Fredoka, Nunito, sans-serif';
    g.fillText('z', 0.35, -0.3);
  },
  dirty(g) {
    g.fillStyle = '#8a6a3a';
    [[-0.4, 0.35, 0.38], [0.3, 0.45, 0.3], [0.05, -0.05, 0.25]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, 7); g.fill(); });
    g.strokeStyle = '#7a9a3a'; g.lineWidth = 0.1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-0.3, -0.4); g.bezierCurveTo(-0.5, -0.6, -0.1, -0.7, -0.3, -0.9); g.stroke();
    g.beginPath(); g.moveTo(0.35, -0.25); g.bezierCurveTo(0.15, -0.45, 0.55, -0.55, 0.35, -0.75); g.stroke();
  },
  coin(g) {
    g.fillStyle = '#e8a91a'; g.beginPath(); g.arc(0, 0, 0.85, 0, 7); g.fill();
    g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(0, 0, 0.68, 0, 7); g.fill();
    g.fillStyle = '#c9861a'; g.font = 'bold 1px Fredoka, Nunito, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 0.06);
  },
  bell(g) {
    g.fillStyle = '#f0b323';
    g.beginPath(); g.moveTo(-0.8, 0.45); g.quadraticCurveTo(-0.8, -0.6, 0, -0.6); g.quadraticCurveTo(0.8, -0.6, 0.8, 0.45); g.closePath(); g.fill();
    g.fillStyle = '#8a5a30'; rr(g, -0.95, 0.45, 1.9, 0.22, 0.08); g.fill();
    g.fillStyle = '#f0b323'; g.beginPath(); g.arc(0, -0.72, 0.13, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-0.35, -0.1, 0.1, 0.25, 0.3, 0, 7); g.fill();
  },
  plant(g) {
    g.fillStyle = '#d9784a'; g.beginPath(); g.moveTo(-0.45, 0.2); g.lineTo(0.45, 0.2); g.lineTo(0.32, 0.9); g.lineTo(-0.32, 0.9); g.fill();
    g.fillStyle = '#4fa34a';
    [[-0.4, -0.2, -0.6], [0.4, -0.2, 0.6], [0, -0.5, 0], [-0.15, -0.05, -0.3], [0.2, -0.05, 0.3]].forEach(([x, y, a]) => {
      g.beginPath(); g.ellipse(x, y, 0.18, 0.42, a, 0, 7); g.fill();
    });
  },
  megaphone(g) {
    g.fillStyle = '#ef4b5c';
    g.beginPath(); g.moveTo(-0.6, -0.2); g.lineTo(0.6, -0.7); g.lineTo(0.6, 0.7); g.lineTo(-0.6, 0.2); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; rr(g, -0.9, -0.25, 0.35, 0.5, 0.08); g.fill();
    g.fillStyle = '#555c66'; rr(g, -0.55, 0.15, 0.2, 0.55, 0.06); g.fill();
  },
  building(g) {
    g.fillStyle = '#f4efe6'; rr(g, -0.7, -0.75, 1.4, 1.6, 0.08); g.fill();
    g.fillStyle = '#c96a4a'; g.beginPath(); g.moveTo(-0.85, -0.7); g.lineTo(0, -1.0); g.lineTo(0.85, -0.7); g.fill();
    g.fillStyle = '#4fa8dc';
    for (let y = 0; y < 3; y++) for (let x = 0; x < 2; x++) { rr(g, -0.5 + x * 0.6, -0.55 + y * 0.42, 0.4, 0.28, 0.05); g.fill(); }
    g.fillStyle = '#8a5a30'; rr(g, -0.15, 0.5, 0.3, 0.35, 0.04); g.fill();
  },
};

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}
function star4(g, x, y, r) {
  g.beginPath();
  g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
}

// desenha um ícone centrado em (cx, cy) com "raio" size
export function drawIcon(g, name, cx, cy, size, tint = null) {
  const f = ICONS[name];
  if (!f) return;
  g.save();
  g.translate(cx, cy);
  g.scale(size, size);
  f(g, tint);
  g.restore();
}

export function iconDataURL(name, px = 64, tint = null) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  drawIcon(c.getContext('2d'), name, px / 2, px / 2, px * 0.42, tint);
  return c.toDataURL();
}
