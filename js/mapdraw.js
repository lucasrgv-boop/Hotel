// Mapa-múndi ilustrado (estilo livro infantil): continentes verdes com desertos, neve, árvores,
// montanhas e animais; oceano claro com redemoinhos; fitas com os nomes e bússola.
import { LAND_SHAPES } from './levels.js';

// projeção equiretangular deslocada para não cortar a Ásia/Alasca
export const MAP_PROJ = { LON0: -170, LON1: 190, LAT0: 84, LAT1: -80 };
export const MAP_ASPECT = (MAP_PROJ.LON1 - MAP_PROJ.LON0) / (MAP_PROJ.LAT0 - MAP_PROJ.LAT1) * 0.92;
export function project(lon, lat) {
  if (lon < MAP_PROJ.LON0) lon += 360;
  return [(lon - MAP_PROJ.LON0) / (MAP_PROJ.LON1 - MAP_PROJ.LON0), (MAP_PROJ.LAT0 - lat) / (MAP_PROJ.LAT0 - MAP_PROJ.LAT1)];
}

const RINGS = (() => {
  const bin = atob(LAND_SHAPES);
  const v = new Int16Array(bin.length / 2);
  for (let i = 0; i < v.length; i++) v[i] = (bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8)) << 16 >> 16;
  const out = [];
  for (let i = 0; i < v.length;) {
    const n = v[i++];
    const r = [];
    for (let k = 0; k < n; k++) { r.push([v[i] / 10, v[i + 1] / 10]); i += 2; }
    out.push(r);
  }
  return out;
})();

// ---------- dados do mapa ilustrado ----------
const P_ = (pts) => pts; // listas de [lon, lat]
const DESERTS = [
  P_([[-17, 27], [-8, 33], [10, 32.5], [24, 31.5], [32, 30.5], [34, 22], [31, 15.5], [15, 14.5], [-5, 16], [-16, 18]]), // Saara
  P_([[35.5, 29.5], [47, 30], [55.5, 25.5], [56, 21], [52, 16.5], [44, 13.5], [39, 19], [36, 26]]),                    // Arábia
  P_([[116, -20.5], [126, -18.5], [136, -19.5], [143, -23], [143, -29.5], [134, -32], [122, -31], [115, -26]]),          // Austrália
  P_([[-121, 39], [-106, 39], [-103, 31], [-109, 27.5], [-115, 29], [-119, 33]]),                                       // sudoeste dos EUA
  P_([[88, 46], [106, 46.5], [114, 42], [102, 38.5], [90, 39], [80, 41]]),                                               // Gobi/Taklamakan
  P_([[16.5, -18.5], [25.5, -18.5], [26.5, -26.5], [20, -29], [15, -24]]),                                               // Kalahari
  P_([[55, 30], [68, 31], [71, 25], [62, 25.5], [56, 27]]),                                                               // Irã/Paquistão
];
const SNOW = [
  P_([[-75, 85], [-10, 85], [-17, 69], [-30, 59], [-46, 59], [-55, 66], [-72, 76]]), // Groenlândia
  P_([[-180, 85], [195, 85], [195, 73], [-180, 73]]),                                  // Ártico
];
const MOUNTAINS = [
  [-116, 50, 1.1], [-110, 44, 1], [-122, 58, 0.9], [-106, 37, 0.8],      // Rochosas
  [-75, -8, 0.9], [-70, -20, 1.1], [-71, -32, 1], [-72, -44, 0.8],       // Andes
  [8, 46, 0.8], [43, 42.5, 0.7],                                          // Alpes, Cáucaso
  [80, 33, 1], [86, 29.5, 1.2], [92, 30, 1], [72, 38, 0.8],              // Himalaia, Pamir
  [-6, 31.5, 0.6], [38, 9, 0.6], [100, 55, 0.7], [150, -32, 0.6], [171, -43.5, 0.6],
];
// [emoji, lon, lat, escala]
const CRITTERS = [
  ['🐻', -122, 60, 1], ['🦅', -100, 64, 0.9], ['🦬', -102, 43, 1], ['🦌', -78, 51, 0.9], ['🌵', -110, 32, 0.8],
  ['🦜', -58, -5, 0.9], ['🐒', -67, -10, 0.9], ['🦙', -68, -24, 0.9], ['🐆', -52, -18, 0.9],
  ['🦉', 12, 51, 0.8], ['🦌', 25, 62, 0.8],
  ['🦁', 22, -6, 1], ['🦒', 33, 3, 1], ['🐘', 22, -18, 1], ['🦓', 36, -14, 0.9], ['🐪', 4, 23, 1], ['🦏', 14, 9, 0.9],
  ['🐼', 106, 31, 1], ['🐅', 80, 22, 1], ['🐫', 63, 41, 0.9], ['🐘', 102, 17, 0.9], ['🦌', 128, 62, 0.9], ['🐻', 95, 62, 0.9],
  ['🦘', 125, -25, 1], ['🐨', 147, -30, 0.9],
  ['🐧', 30, -71, 0.9], ['🐧', 45, -72.5, 0.8], ['🐧', -60, -70.5, 0.9], ['🦭', 110, -69, 0.9], ['🐻‍❄️', -40, 79, 0.9],
  ['🐋', -32, -42, 1.3], ['🐬', -140, -22, 1.1], ['🐙', 75, -8, 1.1], ['🐢', 160, -14, 1], ['🦈', 58, -38, 1.1],
  ['🐠', -150, 14, 0.9], ['🐟', -45, 5, 0.8], ['🐡', 120, 8, 0.8], ['🚢', 88, -32, 1.2], ['⛵', -25, 30, 1], ['🛳️', 150, 25, 1.1],
  ['✈️', 172, 66, 1.3], ['🌴', 160, -9, 0.8],
];
const CONT_LABELS = [
  ['América do Norte', -112, 61], ['América do Sul', -61, -7], ['Europa', 18, 56], ['África', 20, 6],
  ['Ásia', 96, 50], ['Oceania', 134, -36], ['Antártida', 10, -74],
];
const OCEANS = [
  ['Oceano\nPacífico', -138, 4], ['Oceano\nPacífico', 172, 30], ['Oceano\nAtlântico', -40, 30], ['Oceano\nAtlântico', -18, -22],
  ['Oceano\nÍndico', 78, -18], ['Oceano Ártico', 0, 80], ['Oceano Glacial Antártico', -110, -60],
];

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// o navegador desenha emoji colorido? (em alguns sistemas sem fonte de emoji, não)
let emojiOK = null;
function canEmoji() {
  if (emojiOK !== null) return emojiOK;
  try {
    const c = document.createElement('canvas'); c.width = c.height = 20;
    const g = c.getContext('2d');
    g.font = '16px sans-serif'; g.textBaseline = 'top';
    g.fillText('🐧', 0, 0);
    const d = g.getImageData(0, 0, 20, 20).data;
    let colored = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && (Math.abs(d[i] - d[i + 1]) > 30 || Math.abs(d[i + 1] - d[i + 2]) > 30)) colored++;
    emojiOK = colored > 4;
  } catch { emojiOK = false; }
  return emojiOK;
}

export function drawIllustratedMap(c) {
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const P = (lon, lat) => { const [x, y] = project(lon, lat); return [x * W, y * H]; };
  const PR = (lon, lat) => [(lon - MAP_PROJ.LON0) / (MAP_PROJ.LON1 - MAP_PROJ.LON0) * W, (MAP_PROJ.LAT0 - lat) / (MAP_PROJ.LAT0 - MAP_PROJ.LAT1) * H];
  const u = W / 1000;
  const r = rng(11);
  g.clearRect(0, 0, W, H);
  const poly = (pts, proj = PR) => { const p = new Path2D(); pts.forEach(([lon, lat], k) => { const [x, y] = proj(lon, lat); if (k) p.lineTo(x, y); else p.moveTo(x, y); }); p.closePath(); return p; };

  // ---------- oceano claro com redemoinhos ----------
  const sea = g.createLinearGradient(0, 0, 0, H);
  sea.addColorStop(0, '#9fdcf6'); sea.addColorStop(0.5, '#7fcef2'); sea.addColorStop(1, '#93d7f5');
  g.fillStyle = sea; g.fillRect(0, 0, W, H);
  g.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const x = r() * W, y = r() * H, R = (10 + r() * 16) * u, a0 = r() * Math.PI * 2;
    g.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,0.45)' : 'rgba(70,160,215,0.35)';
    g.lineWidth = (2 + r() * 1.5) * u;
    g.beginPath();
    for (let k = 0; k <= 30; k++) {
      const t = k / 30, ang = a0 + t * Math.PI * 2.6, rad = R * (1 - t * 0.75);
      const px = x + Math.cos(ang) * rad + t * R * 1.6, py = y + Math.sin(ang) * rad;
      if (k) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.stroke();
  }
  for (let i = 0; i < 40; i++) { // ondinhas
    const x = r() * W, y = r() * H, s = (7 + r() * 7) * u;
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2 * u;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + s * 0.5, y - s * 0.6, x + s, y); g.quadraticCurveTo(x + s * 1.5, y + s * 0.6, x + s * 2, y); g.stroke();
  }

  // ---------- terra ----------
  const land = new Path2D();
  for (const ring of RINGS) {
    ring.forEach(([lon, lat], k) => { const [x, y] = P(lon, lat); if (k) land.lineTo(x, y); else land.moveTo(x, y); });
    land.closePath();
  }
  // Antártida estilizada (faixa de gelo)
  const ant = new Path2D();
  const ap = [];
  for (let lon = -168; lon <= 186; lon += 5) ap.push([lon, -64.5 - Math.sin(lon / 21) * 2.6 - Math.cos(lon / 9) * 1.1]);
  ap.push([186, -82], [-168, -82]);
  ap.forEach(([lon, lat], k) => { const [x, y] = PR(lon, lat); if (k) ant.lineTo(x, y); else ant.moveTo(x, y); });
  ant.closePath();

  // água rasa em volta das costas
  for (const [w, col] of [[22, 'rgba(200,238,252,0.75)'], [11, 'rgba(225,247,255,0.9)']]) {
    g.lineJoin = 'round'; g.lineWidth = w * u; g.strokeStyle = col; g.stroke(land); g.stroke(ant);
  }
  // sombra suave e relevo
  g.save(); g.translate(2 * u, 4 * u); g.fillStyle = 'rgba(30,90,60,0.35)'; g.fill(land); g.restore();
  const green = g.createLinearGradient(0, 0, 0, H);
  green.addColorStop(0, '#8ccf55'); green.addColorStop(0.5, '#6bbb3c'); green.addColorStop(1, '#5cae35');
  g.fillStyle = green; g.fill(land);
  g.save(); g.clip(land);
  // manchas de vegetação mais escura
  for (let i = 0; i < 160; i++) {
    const x = r() * W, y = r() * H * 0.85;
    g.fillStyle = r() > 0.5 ? 'rgba(60,140,40,0.35)' : 'rgba(150,215,95,0.35)';
    g.beginPath(); g.ellipse(x, y, (8 + r() * 22) * u, (5 + r() * 12) * u, r() * 3, 0, Math.PI * 2); g.fill();
  }
  // desertos e neve com bordas suaves
  const deserts = DESERTS.map((d) => poly(d, P));
  const snows = SNOW.map((d) => poly(d, PR));
  g.filter = `blur(${Math.max(1, 5 * u)}px)`;
  g.fillStyle = '#f2d683'; for (const d of deserts) g.fill(d);
  g.fillStyle = '#f7fbff'; for (const s of snows) g.fill(s);
  g.filter = 'none';
  // dunas
  g.strokeStyle = 'rgba(200,150,60,0.45)'; g.lineWidth = 2 * u;
  for (const d of deserts) for (let k = 0; k < 8; k++) {
    const x = r() * W, y = r() * H;
    if (!g.isPointInPath(d, x, y)) continue;
    g.beginPath(); g.arc(x, y + 6 * u, 8 * u, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  }
  g.restore();
  g.strokeStyle = '#3f8a2c'; g.lineWidth = 2.2 * u; g.stroke(land);
  g.save(); g.clip(land); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3 * u; g.translate(0, 1.5 * u); g.stroke(land); g.restore();
  // Antártida
  const ice = g.createLinearGradient(0, H * 0.8, 0, H);
  ice.addColorStop(0, '#ffffff'); ice.addColorStop(1, '#cfe9fb');
  g.fillStyle = ice; g.fill(ant);
  g.strokeStyle = '#8cc4e8'; g.lineWidth = 2.2 * u; g.stroke(ant);
  g.save(); g.clip(ant);
  g.strokeStyle = 'rgba(140,196,232,0.6)'; g.lineWidth = 2 * u;
  for (let k = 0; k < 14; k++) { const x = r() * W, y = H * (0.9 + r() * 0.08); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 * u, y - 6 * u); g.lineTo(x + 34 * u, y); g.stroke(); }
  g.restore();

  // ---------- árvores ----------
  const inAny = (paths, x, y) => paths.some((p) => g.isPointInPath(p, x, y));
  const step = 15 * u;
  const trees = [];
  for (let y = step; y < H * 0.86; y += step) for (let x = step / 2; x < W; x += step) {
    const px = x + (r() - 0.5) * step * 0.9, py = y + (r() - 0.5) * step * 0.9;
    if (!g.isPointInPath(land, px, py) || inAny(deserts, px, py) || inAny(snows, px, py)) continue;
    if (r() > 0.28) continue;
    trees.push([px, py]);
  }
  trees.sort((a, b) => a[1] - b[1]);
  const latOf = (py) => MAP_PROJ.LAT0 - (py / H) * (MAP_PROJ.LAT0 - MAP_PROJ.LAT1);
  for (const [x, y] of trees) {
    const lat = latOf(y);
    const s = (0.8 + r() * 0.5) * u;
    g.fillStyle = 'rgba(30,80,30,0.3)'; g.beginPath(); g.ellipse(x + 2 * s, y + 7 * s, 6 * s, 2.5 * s, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7a4a26'; g.fillRect(x - 1.2 * s, y, 2.4 * s, 7 * s);
    if (lat > 48 || lat < -42) { // pinheiro
      g.fillStyle = '#2f7a3a';
      g.beginPath(); g.moveTo(x, y - 12 * s); g.lineTo(x + 7 * s, y + 3 * s); g.lineTo(x - 7 * s, y + 3 * s); g.closePath(); g.fill();
      g.fillStyle = '#3f9a48';
      g.beginPath(); g.moveTo(x, y - 12 * s); g.lineTo(x + 3 * s, y - 2 * s); g.lineTo(x - 4 * s, y - 1 * s); g.closePath(); g.fill();
    } else {
      g.fillStyle = Math.abs(lat) < 20 ? '#2e8f3a' : '#3fa045';
      g.beginPath(); g.arc(x, y - 4 * s, 6.5 * s, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.beginPath(); g.arc(x - 2 * s, y - 6.5 * s, 2.6 * s, 0, Math.PI * 2); g.fill();
    }
  }

  // ---------- montanhas ----------
  for (const [lon, lat, sc] of MOUNTAINS) {
    const [x, y] = P(lon, lat);
    const s = sc * u;
    for (const [dx, h] of [[-9, 16], [7, 22], [18, 13]]) {
      const bx = x + dx * s, by = y + 6 * s, hh = h * s, w = hh * 0.85;
      g.fillStyle = '#8a7a6a'; g.beginPath(); g.moveTo(bx - w, by); g.lineTo(bx, by - hh); g.lineTo(bx + w, by); g.closePath(); g.fill();
      g.fillStyle = '#6e6052'; g.beginPath(); g.moveTo(bx, by - hh); g.lineTo(bx + w, by); g.lineTo(bx + w * 0.2, by); g.closePath(); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(bx - w * 0.32, by - hh * 0.62); g.lineTo(bx, by - hh); g.lineTo(bx + w * 0.32, by - hh * 0.62); g.lineTo(bx + w * 0.1, by - hh * 0.7); g.lineTo(bx - w * 0.08, by - hh * 0.6); g.closePath(); g.fill();
    }
  }

  // ---------- animais, barcos e avião ----------
  if (canEmoji()) {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [em, lon, lat, sc] of CRITTERS) {
      const [x, y] = P(lon, lat);
      g.font = `${Math.round(26 * sc * u)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      g.save(); g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 3 * u; g.shadowOffsetY = 2 * u;
      g.fillText(em, x, y); g.restore();
    }
  }

  // ---------- nomes ----------
  const text = (txt, x, y, size, fill, stroke, weight = 700) => {
    g.font = `${weight} ${size}px Fredoka, Nunito, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    txt.split('\n').forEach((ln, k, arr) => {
      const yy = y + (k - (arr.length - 1) / 2) * size * 1.05;
      if (stroke) { g.lineJoin = 'round'; g.lineWidth = size * 0.28; g.strokeStyle = stroke; g.strokeText(ln, x, yy); }
      g.fillStyle = fill; g.fillText(ln, x, yy);
    });
  };
  for (const [txt, lon, lat] of OCEANS) {
    const [x, y] = P(lon, lat);
    text(txt, x, y, 17 * u, '#1f78b8', 'rgba(255,255,255,0.9)', 600);
  }
  // faixas (fitas) com o nome dos continentes
  for (const [txt, lon, lat] of CONT_LABELS) {
    const [x, y] = P(lon, lat);
    const size = 15 * u;
    g.font = `700 ${size}px Fredoka, Nunito, sans-serif`;
    const w = g.measureText(txt).width + 22 * u, h = size * 1.6;
    // pontas dobradas
    g.fillStyle = '#d9a441';
    for (const sgn of [-1, 1]) {
      const ex = x + sgn * (w / 2);
      g.beginPath(); g.moveTo(ex - sgn * 6 * u, y - h / 2 + 5 * u); g.lineTo(ex + sgn * 12 * u, y - h / 2 + 5 * u);
      g.lineTo(ex + sgn * 6 * u, y + 5 * u); g.lineTo(ex + sgn * 12 * u, y + h / 2 + 5 * u); g.lineTo(ex - sgn * 6 * u, y + h / 2 + 5 * u); g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.roundRect ? g.roundRect(x - w / 2 + 2 * u, y - h / 2 + 3 * u, w, h, 5 * u) : g.rect(x - w / 2, y - h / 2, w, h); g.fill();
    const rib = g.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    rib.addColorStop(0, '#fff6d8'); rib.addColorStop(1, '#f5dc9a');
    g.fillStyle = rib; g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, y - h / 2, w, h, 5 * u) : g.rect(x - w / 2, y - h / 2, w, h); g.fill();
    g.strokeStyle = '#c99a3a'; g.lineWidth = 1.5 * u; g.stroke();
    text(txt, x, y + 1 * u, size, '#6b3a12', null);
  }

  // ---------- bússola ----------
  {
    const [x, y] = P(166, -50);
    const R = 42 * u;
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.arc(3 * u, 5 * u, R, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f39c12'; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2f5fb3'; g.beginPath(); g.arc(0, 0, R * 0.86, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, R * 0.74, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#9ab'; g.lineWidth = 1.2 * u;
    for (let k = 0; k < 16; k++) { g.save(); g.rotate((k * Math.PI) / 8); g.beginPath(); g.moveTo(0, -R * 0.74); g.lineTo(0, -R * (k % 4 ? 0.66 : 0.58)); g.stroke(); g.restore(); }
    for (const [ang, col] of [[0, '#e8392b'], [Math.PI, '#2f5fb3'], [Math.PI / 2, '#cfd6de'], [-Math.PI / 2, '#cfd6de']]) {
      g.save(); g.rotate(ang); g.fillStyle = col;
      g.beginPath(); g.moveTo(0, -R * 0.6); g.lineTo(R * 0.12, 0); g.lineTo(-R * 0.12, 0); g.closePath(); g.fill();
      g.restore();
    }
    g.fillStyle = '#3a3340'; g.beginPath(); g.arc(0, 0, R * 0.08, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.font = `700 ${11 * u}px Fredoka, Nunito, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N', 0, -R * 0.93);
    g.restore();
  }
}
// nome antigo mantido por compatibilidade
export const drawPuzzleMap = drawIllustratedMap;
