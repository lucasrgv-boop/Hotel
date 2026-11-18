// Desenho do mapa-múndi no estilo "quebra-cabeça de madeira": continentes como peças coloridas
// com espessura e sombra, oceano azul com ondas, nomes dos oceanos, barquinhos e rosa dos ventos.
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

// regiões (lon/lat) que separam os continentes; a Ásia é o "resto"
const REGIONS = {
  eu: [[-30, 85], [-30, 34], [-10, 35.8], [10, 37.5], [27, 34.5], [28.5, 40.8], [37, 41.5], [47, 43], [53, 46], [59, 50], [66, 66], [69, 80], [69, 85]],
  af: [[-25, 37.5], [10, 37.6], [26, 33.5], [32.3, 31.6], [34.5, 29.5], [43.3, 12.4], [52, 12.2], [65, -2], [60, -45], [-25, -45]],
  na: [[-180, 85], [-12, 85], [-12, 58], [-52, 44], [-60, 18], [-77.5, 9.6], [-82, 7], [-180, 5]],
  sa: [[-92, 13], [-77.5, 9.6], [-60, 18], [-25, 10], [-25, -60], [-92, -60]],
  oc: [[110, -10.5], [128, -9.5], [131, -1.2], [141, -0.5], [180, -3], [195, -3], [195, -55], [110, -55]],
};
export const CONTINENTS = [
  { id: 'as', name: 'ÁSIA', top: '#e8392b', side: '#a3221a', label: [95, 52] },
  { id: 'eu', name: 'EUROPA', top: '#f7941d', side: '#b5620c', label: [24, 68] },
  { id: 'af', name: 'ÁFRICA', top: '#fcc22d', side: '#c08b0b', label: [20, 4] },
  { id: 'na', name: 'AMÉRICA\nDO NORTE', top: '#8cc63f', side: '#5c8a22', label: [-103, 50] },
  { id: 'sa', name: 'AMÉRICA\nDO SUL', top: '#2fa34a', side: '#1c6f31', label: [-64, -4] },
  { id: 'oc', name: 'OCEANIA', top: '#d4237a', side: '#93154f', label: [133, -25] },
];
const ANT = { top: '#5aa0e6', side: '#2f6bb0' };
const OCEANS = [
  ['OCEANO PACÍFICO', -140, 8, -90], ['OCEANO PACÍFICO', 170, 15, -90], ['OCEANO ATLÂNTICO', -35, 25, -78],
  ['OCEANO ÍNDICO', 78, -22, 0], ['OCEANO GLACIAL ÁRTICO', 20, 81, 0], ['OCEANO GLACIAL ANTÁRTICO', 30, -58, 0],
];

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function drawPuzzleMap(c) {
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const P = (lon, lat) => { const [x, y] = project(lon, lat); return [x * W, y * H]; };
  const u = W / 1000; // unidade relativa
  g.clearRect(0, 0, W, H);

  // ---- oceano ----
  const sea = g.createRadialGradient(W * 0.5, H * 0.45, W * 0.05, W * 0.5, H * 0.5, W * 0.7);
  sea.addColorStop(0, '#7fd0f2'); sea.addColorStop(1, '#46aee2');
  g.fillStyle = sea; g.fillRect(0, 0, W, H);
  // ondinhas
  const r = rng(7);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2 * u; g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * H, s = (6 + r() * 6) * u;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + s * 0.5, y - s * 0.5, x + s, y);
    g.quadraticCurveTo(x + s * 1.5, y + s * 0.5, x + s * 2, y);
    g.stroke();
  }
  // linhas pontilhadas de latitude
  g.setLineDash([3 * u, 7 * u]); g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1.5 * u;
  for (const lat of [66.5, 23.4, 0, -23.4]) { const [, y] = P(0, lat); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.setLineDash([]);

  // ---- caminho de toda a terra ----
  const land = new Path2D();
  for (const ring of RINGS) {
    ring.forEach(([lon, lat], k) => { const [x, y] = P(lon, lat); if (k) land.lineTo(x, y); else land.moveTo(x, y); });
    land.closePath();
  }
  // regiões: projeção sem "dobrar" a longitude (−180 fica na borda esquerda)
  const PR = (lon, lat) => [(lon - MAP_PROJ.LON0) / (MAP_PROJ.LON1 - MAP_PROJ.LON0) * W, (MAP_PROJ.LAT0 - lat) / (MAP_PROJ.LAT0 - MAP_PROJ.LAT1) * H];
  const regionPath = (pts) => { const p = new Path2D(); pts.forEach(([lon, lat], k) => { const [x, y] = PR(lon, lat); if (k) p.lineTo(x, y); else p.moveTo(x, y); }); p.closePath(); return p; };
  const regions = Object.fromEntries(Object.entries(REGIONS).map(([k, v]) => [k, regionPath(v)]));

  const thick = 7 * u;
  // sombra geral do "tabuleiro de peças"
  g.save(); g.translate(5 * u, thick + 6 * u); g.fillStyle = 'rgba(20,60,90,0.28)'; g.fill(land); g.restore();

  const piece = (clip, top, side, excludeClips = []) => {
    g.save();
    if (clip) g.clip(clip);
    for (const ex of excludeClips) { // recorta as outras regiões (para a Ásia)
      const p = new Path2D(); p.rect(0, 0, W, H); p.addPath(ex);
      g.clip(p, 'evenodd');
    }
    g.save(); g.translate(0, thick); g.fillStyle = side; g.fill(land); g.restore();       // espessura
    g.fillStyle = top; g.fill(land);                                                      // face
    // brilho na borda de cima e contorno
    g.save(); g.clip(land);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3 * u;
    g.translate(0, 1.5 * u); g.stroke(land); g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.2 * u; g.stroke(land);
    g.restore();
  };
  const others = ['eu', 'af', 'na', 'sa', 'oc'].map((k) => regions[k]);
  piece(null, CONTINENTS[0].top, CONTINENTS[0].side, others);
  for (const ct of CONTINENTS.slice(1)) piece(regions[ct.id], ct.top, ct.side);
  // fendas entre as peças (onde as regiões cortam a terra)
  g.save(); g.clip(land);
  g.strokeStyle = 'rgba(60,30,10,0.55)'; g.lineWidth = 2.2 * u;
  for (const k of ['eu', 'af', 'na', 'sa', 'oc']) g.stroke(regions[k]);
  g.restore();

  // ---- Antártida estilizada ----
  const ant = new Path2D();
  const pts = [];
  for (let lon = -160; lon <= 178; lon += 6) pts.push([lon, -66 - Math.sin(lon / 23) * 2.5 - Math.cos(lon / 11) * 1.2]);
  for (let lon = 178; lon >= -160; lon -= 6) pts.push([lon, -76 - Math.cos(lon / 30) * 1.5]);
  pts.forEach(([lon, lat], k) => { const [x, y] = P(lon, lat); if (k) ant.lineTo(x, y); else ant.moveTo(x, y); });
  ant.closePath();
  g.save(); g.translate(5 * u, thick + 6 * u); g.fillStyle = 'rgba(20,60,90,0.28)'; g.fill(ant); g.restore();
  g.save(); g.translate(0, thick); g.fillStyle = ANT.side; g.fill(ant); g.restore();
  g.fillStyle = ANT.top; g.fill(ant);
  g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 3 * u; g.stroke(ant);

  // ---- textos ----
  const label = (txt, x, y, size, fill, stroke, rot = 0, italic = false) => {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.font = `${italic ? 'italic ' : ''}700 ${size}px Fredoka, Nunito, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = txt.split('\n');
    lines.forEach((ln, k) => {
      const yy = (k - (lines.length - 1) / 2) * size * 1.05;
      if (stroke) { g.lineJoin = 'round'; g.lineWidth = size * 0.22; g.strokeStyle = stroke; g.strokeText(ln, 0, yy); }
      g.fillStyle = fill; g.fillText(ln, 0, yy);
    });
    g.restore();
  };
  for (const [txt, lon, lat, rotDeg] of OCEANS) {
    const [x, y] = P(lon, lat);
    label(txt, x, y, 13 * u, 'rgba(225,245,255,0.85)', null, (rotDeg * Math.PI) / 180, true);
  }
  for (const ct of CONTINENTS) {
    const [x, y] = P(ct.label[0], ct.label[1]);
    label(ct.name, x, y, 19 * u, '#ffffff', 'rgba(70,30,10,0.55)');
  }
  { const [x, y] = P(15, -71.5); label('ANTÁRTIDA', x, y, 19 * u, '#ffffff', 'rgba(20,50,100,0.5)'); }

  // ---- barquinhos e flocos de neve ----
  const boat = (lon, lat, s) => {
    const [x, y] = P(lon, lat);
    g.save(); g.translate(x, y); g.scale(s * u, s * u);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.lineTo(6, 5); g.lineTo(-6, 5); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0, -1); g.lineTo(0, -16); g.lineTo(9, -3); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-1.5, -2); g.lineTo(-1.5, -12); g.lineTo(-8, -3); g.closePath(); g.fill();
    g.restore();
  };
  boat(-140, 30, 1.3); boat(-30, -30, 1.2); boat(70, -5, 1.2); boat(165, -40, 1.1); boat(-60, 55, 1);
  const flake = (lon, lat, s) => {
    const [x, y] = P(lon, lat);
    g.save(); g.translate(x, y); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.6 * u; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-s * u, 0); g.lineTo(s * u, 0); g.stroke(); }
    g.restore();
  };
  flake(-150, 75, 7); flake(60, 80, 6); flake(150, 78, 7); flake(-120, -62, 6); flake(120, -60, 7);

  // ---- rosa dos ventos ----
  {
    const [x, y] = P(175, -38);
    const R = 34 * u;
    g.save(); g.translate(x, y);
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.5 * u;
    g.beginPath(); g.arc(0, 0, R * 0.62, 0, Math.PI * 2); g.stroke();
    for (let k = 0; k < 8; k++) {
      const long = k % 2 === 0;
      const L = long ? R : R * 0.55;
      g.save(); g.rotate((k * Math.PI) / 4);
      g.fillStyle = k === 0 ? '#e8392b' : '#ffffff';
      g.beginPath(); g.moveTo(0, -L); g.lineTo(L * 0.16, 0); g.lineTo(-L * 0.16, 0); g.closePath(); g.fill();
      g.fillStyle = 'rgba(30,70,110,0.35)';
      g.beginPath(); g.moveTo(0, -L); g.lineTo(L * 0.16, 0); g.lineTo(0, 0); g.closePath(); g.fill();
      g.restore();
    }
    g.fillStyle = '#ffffff'; g.font = `700 ${11 * u}px Fredoka, Nunito, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N', 0, -R - 9 * u);
    g.restore();
  }
}
