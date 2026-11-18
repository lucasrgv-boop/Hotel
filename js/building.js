// Construção visual do hotel em estilo "casa de bonecas" visto de lado:
// andares empilhados abertos na frente, móveis arredondados e cores vivas.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import {
  FLOOR_H, WALL_H, SLOT_W, ROOM_D, CORE_W, COLS, SLOTS_PER_FLOOR, BUILDING_W,
  BACK_Z, FRONT_Z, ELEV_X, DOOR_X, slotX0, TIERS,
} from './config.js';
import { Tex, rep, shade, hex } from './textures.js';
import { createPerson } from './characters.js';

const W = BUILDING_W;
const WT = 0.14; // espessura das paredes

// ---------- utilitários de geometria/material ----------
const geoCache = new Map();
function geoKey(k, fn) { if (!geoCache.has(k)) geoCache.set(k, fn()); return geoCache.get(k); }
const bgeo = (w, h, d) => geoKey(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d));
const rgeo = (w, h, d, r) => geoKey(`r${w}_${h}_${d}_${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)));

const matCache = new Map();
function std(color, rough = 0.8, extra = {}) {
  const k = `${color}_${rough}_${JSON.stringify(extra)}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra }));
  return matCache.get(k);
}
function texMat(tex, rx, ry, color = 0xffffff, rough = 0.85) {
  return new THREE.MeshStandardMaterial({ map: rep(tex, rx, ry), color, roughness: rough });
}
function asMat(m) { return typeof m === 'number' ? std(m) : m; }

// caixa posicionada pelo canto mínimo
function box(p, x0, y0, z0, w, h, d, m, shadow = true) {
  const o = new THREE.Mesh(bgeo(w, h, d), asMat(m));
  o.position.set(x0 + w / 2, y0 + h / 2, z0 + d / 2);
  o.castShadow = shadow; o.receiveShadow = true;
  p.add(o);
  return o;
}
// caixa arredondada (móveis)
function rbox(p, x0, y0, z0, w, h, d, m, r = 0.08) {
  const o = new THREE.Mesh(rgeo(w, h, d, r), asMat(m));
  o.position.set(x0 + w / 2, y0 + h / 2, z0 + d / 2);
  o.castShadow = true; o.receiveShadow = true;
  p.add(o);
  return o;
}
function cyl(p, x, y, z, rt, rb, h, m, seg = 16) {
  const o = new THREE.Mesh(geoKey(`c${rt}_${rb}_${h}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), asMat(m));
  o.position.set(x, y + h / 2, z);
  o.castShadow = true; o.receiveShadow = true;
  p.add(o);
  return o;
}
function sphere(p, x, y, z, r, m, sx = 1, sy = 1, sz = 1) {
  const o = new THREE.Mesh(geoKey(`s${r}`, () => new THREE.SphereGeometry(r, 16, 12)), asMat(m));
  o.position.set(x, y, z); o.scale.set(sx, sy, sz);
  o.castShadow = true;
  p.add(o);
  return o;
}
function floorPlane(p, x0, z0, w, d, m, y = 0.01) {
  const o = new THREE.Mesh(geoKey(`pl${w}_${d}`, () => new THREE.PlaneGeometry(w, d)), m);
  o.rotation.x = -Math.PI / 2;
  o.position.set(x0 + w / 2, y, z0 + d / 2);
  o.receiveShadow = true;
  p.add(o);
  return o;
}

function plant(p, x, z, s = 1, pot = 0xd9784a) {
  cyl(p, x, 0, z, 0.22 * s, 0.17 * s, 0.38 * s, std(pot, 0.7));
  const leaf = std(0x4fa34a, 0.7);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const l = sphere(p, x + Math.cos(a) * 0.14 * s, 0.6 * s, z + Math.sin(a) * 0.14 * s, 0.2 * s, leaf, 0.7, 1.6, 0.7);
    l.rotation.z = Math.cos(a) * 0.5; l.rotation.x = Math.sin(a) * 0.5;
  }
  sphere(p, x, 0.75 * s, z, 0.2 * s, std(0x5fb85a, 0.7), 1, 1.3, 1);
}

// placa de texto como sprite (sempre de frente para a câmera)
function textSprite(text, { bg = '#ffffff', fg = '#3a3340', w = 256, h = 96, size = 0.9, font = 'bold 56px Fredoka, Nunito, sans-serif', border = null } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const r = h / 2.4;
  g.fillStyle = 'rgba(0,0,0,0.18)';
  rr(g, 4, 8, w - 8, h - 10, r); g.fill();
  g.fillStyle = border || bg;
  rr(g, 2, 2, w - 6, h - 10, r); g.fill();
  if (border) { g.fillStyle = bg; rr(g, 8, 8, w - 18, h - 22, r - 4); g.fill(); }
  g.fillStyle = fg;
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2 - 2, h / 2 - 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: true }));
  s.scale.set(size * (w / h), size, 1);
  s.renderOrder = 4;
  return s;
}
function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

const WALL_MAT = () => std(0xfbf8f2, 0.9);
const TRIM = 0xe9e1d3;

// =============== Conteúdo dos espaços (frame local) ===============
// Frame local: x ∈ [0, SLOT_W], z ∈ [-ROOM_D, 0]. A frente (z = 0) é aberta,
// como numa casa de bonecas; o corredor fica logo à frente.

function buildShell(g, { floorMat }) {
  floorPlane(g, 0, -ROOM_D, SLOT_W, ROOM_D, floorMat, 0.012);
  const wm = WALL_MAT();
  // paredes laterais (meia espessura cada; a vizinha completa) e parede do fundo
  box(g, 0, 0, -ROOM_D, WT / 2, WALL_H, ROOM_D, wm, false);
  box(g, SLOT_W - WT / 2, 0, -ROOM_D, WT / 2, WALL_H, ROOM_D, wm, false);
  box(g, 0, 0, -ROOM_D - WT, SLOT_W, WALL_H, WT, wm, false);
  // rodapé e moldura frontal
  box(g, WT / 2, 0, -ROOM_D + 0.06, SLOT_W - WT, 0.12, 0.03, std(TRIM, 0.8), false);
  box(g, 0, WALL_H - 0.12, -0.12, SLOT_W, 0.12, 0.12, std(TRIM, 0.8), false);
}

// luminária pendente no teto
function pendant(g, x, z, color = 0xfff1c4) {
  const m = new THREE.MeshStandardMaterial({ color, emissive: 0x000000, roughness: 0.5 });
  cyl(g, x, WALL_H - 0.55, z, 0.01, 0.01, 0.55, std(0x3a3340));
  const shade = new THREE.Mesh(geoKey('pend', () => new THREE.ConeGeometry(0.28, 0.24, 16, 1, true)), std(0x3a3340, 0.6, { side: THREE.DoubleSide }));
  shade.position.set(x, WALL_H - 0.6, z);
  g.add(shade);
  sphere(g, x, WALL_H - 0.7, z, 0.1, m);
  return m;
}

function buildRoom(g, slot, num) {
  const tier = slot.tier || 0;
  const floorMat = tier === 0 ? texMat(Tex.wood(0xd9a46c), 2.2, 2) :
    tier === 1 ? texMat(Tex.wood(0xa86d43), 2.2, 2) : texMat(Tex.carpet(0x8f3348), 3, 3);
  buildShell(g, { floorMat });
  const accent = [0xcfe3f2, 0xe2d4f0, 0xf6e6b8][tier];
  // painel de papel de parede no fundo
  box(g, WT / 2, 0, -ROOM_D, SLOT_W - WT, WALL_H + 0.01, 0.06, std(accent, 0.9), false);

  const blanket = TIERS[tier].color;
  const bedW = tier === 2 ? 2.1 : tier === 1 ? 1.8 : 1.4;
  const bx = 3.0 - bedW / 2 + 0.3;
  const bz0 = -ROOM_D + 0.08;
  const wood = tier === 2 ? 0x6b3d22 : tier === 1 ? 0x8a5530 : 0xb07a48;
  // cama
  rbox(g, bx, 0, bz0 + 0.1, bedW, 0.38, 2.2, wood, 0.06);
  rbox(g, bx - 0.05, 0, bz0, bedW + 0.1, 0.95, 0.16, tier === 2 ? 0xd4a93a : wood, 0.06);
  rbox(g, bx + 0.06, 0.34, bz0 + 0.18, bedW - 0.12, 0.22, 2.05, std(0xfdfdfd, 0.9), 0.1);
  const quilt = rbox(g, bx + 0.02, 0.4, bz0 + 0.85, bedW - 0.04, 0.22, 1.42, new THREE.MeshStandardMaterial({ map: rep(Tex.quilt(blanket), 1, 1), roughness: 0.9 }), 0.1);
  const nP = tier === 0 ? 1 : 2;
  for (let k = 0; k < nP; k++) {
    const pw = (bedW - 0.3) / nP - 0.05;
    rbox(g, bx + 0.15 + k * (pw + 0.1), 0.52, bz0 + 0.25, pw, 0.16, 0.42, std(0xffffff, 0.9), 0.07);
  }
  // criados-mudos + abajur
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff1c4, emissive: 0x000000, roughness: 0.6 });
  const stands = tier === 0 ? [bx + bedW + 0.12] : [bx - 0.62, bx + bedW + 0.12];
  for (const nx of stands) {
    rbox(g, nx, 0, bz0 + 0.05, 0.5, 0.5, 0.45, wood, 0.05);
    cyl(g, nx + 0.25, 0.5, bz0 + 0.27, 0.04, 0.06, 0.2, std(0x5a5a62));
    cyl(g, nx + 0.25, 0.68, bz0 + 0.27, 0.13, 0.19, 0.2, lampMat, 12);
  }
  // tapete
  const rugC = [0xe9d8b5, 0x5b7fbf, 0xd4a93a][tier];
  rbox(g, bx - 0.2, 0, -2.1, bedW + 0.4, 0.025, 1.0, std(rugC, 0.95), 0.012);

  if (tier === 0) {
    rbox(g, 0.2, 0, -ROOM_D + 0.1, 1.0, 1.1, 0.55, 0xc49563, 0.04); // armário
    box(g, 0.69, 0.25, -ROOM_D + 0.66, 0.02, 0.6, 0.01, 0x7a4a2a, false);
    plant(g, 4.55, -0.6, 0.8);
  } else {
    // rack com TV na lateral
    rbox(g, 0.18, 0, -3.6, 0.5, 0.45, 1.3, wood, 0.04);
    rbox(g, 0.3, 0.45, -3.3, 0.08, 0.6, 0.75, 0x1d1d22, 0.02);
    box(g, 0.385, 0.5, -3.25, 0.01, 0.5, 0.65, new THREE.MeshStandardMaterial({ color: 0x2a3e5a, emissive: 0x16304a, roughness: 0.3 }), false);
    // poltrona
    const chairC = tier === 2 ? 0xb03a4e : 0x5b7fbf;
    rbox(g, 3.9, 0, -1.3, 0.75, 0.42, 0.7, chairC, 0.12);
    rbox(g, 3.9, 0.3, -0.72, 0.75, 0.45, 0.16, chairC, 0.08);
    plant(g, 0.5, -0.6, 0.9);
  }
  if (tier === 2) {
    // banheira de hidromassagem
    rbox(g, 0.15, 0, -2.0, 1.2, 0.5, 0.95, std(0xffffff, 0.4), 0.15);
    box(g, 0.27, 0.42, -1.88, 0.96, 0.05, 0.71, new THREE.MeshStandardMaterial({ color: 0x6fd0f2, emissive: 0x0b3a52, roughness: 0.15 }), false);
  }

  // sujeira (visível quando sujo)
  const dirt = new THREE.Group();
  const dm = new THREE.Mesh(new THREE.PlaneGeometry(SLOT_W - 0.4, ROOM_D - 0.4), new THREE.MeshBasicMaterial({ map: rep(Tex.dirt(), 2, 2), transparent: true, depthWrite: false }));
  dm.rotation.x = -Math.PI / 2;
  dm.position.set(SLOT_W / 2, 0.035, -ROOM_D / 2);
  dirt.add(dm);
  const messy = rbox(dirt, bx + 0.1, 0.42, bz0 + 0.5, bedW - 0.2, 0.3, 1.1, new THREE.MeshStandardMaterial({ map: rep(Tex.quilt(blanket), 1, 1) }), 0.14);
  messy.rotation.set(0.15, 0.3, 0.2);
  rbox(dirt, 2.0, 0, -1.4, 0.45, 0.12, 0.3, 0xffffff, 0.05).rotation.y = 0.6;    // toalha
  cyl(dirt, 1.7, 0, -0.7, 0.07, 0.08, 0.3, std(0x3c8d4f, 0.3));                  // garrafa
  cyl(dirt, 2.6, 0, -0.9, 0.08, 0.08, 0.12, std(0xd9473b, 0.6)).rotation.z = 1.4; // lata
  rbox(dirt, 3.2, 0, -1.9, 0.5, 0.06, 0.35, 0x34507a, 0.03).rotation.y = -0.4;   // roupa
  dirt.visible = false;
  g.add(dirt);

  const lbl = textSprite(String(num), { bg: '#ffffff', fg: '#3a3340', size: 0.5, w: 160, h: 96, font: 'bold 58px Fredoka, Nunito, sans-serif' });
  lbl.position.set(0.75, WALL_H - 0.8, -0.1);
  g.add(lbl);
  // quadro acima da cama e luminária
  rbox(g, bx + bedW / 2 - 0.55, 1.45, -ROOM_D + 0.05, 1.1, 0.75, 0.06, 0xffffff, 0.02);
  box(g, bx + bedW / 2 - 0.47, 1.52, -ROOM_D + 0.1, 0.94, 0.6, 0.01, new THREE.MeshStandardMaterial({ map: Tex.painting(num), roughness: 0.8 }), false);
  lampMat.userData.pendant = pendant(g, 2.5, -1.4);

  g.userData.quilt = quilt;
  g.userData.dirt = dirt;
  g.userData.lamps = [lampMat, lampMat.userData.pendant];
  g.userData.bedSpot = new THREE.Vector3(bx + bedW / 2, 0.82, bz0 + 1.85);
  g.userData.spots = [new THREE.Vector3(2.0, 0, -1.0)];
}

function buildSnack(g) {
  buildShell(g, { floorMat: texMat(Tex.tiles(0xfdf3e3, 0xe86a5a, 4), 2, 2) });
  box(g, WT / 2, 0, -ROOM_D, SLOT_W - WT, WALL_H + 0.01, 0.06, std(0xfbe0b8, 0.9), false);
  // balcão
  rbox(g, 0.4, 0, -3.3, 3.2, 0.95, 0.6, 0xe86a5a, 0.06);
  rbox(g, 0.35, 0.95, -3.35, 3.3, 0.08, 0.7, std(0xffffff, 0.4), 0.03);
  rbox(g, 3.8, 0, -ROOM_D + 0.1, 0.9, 1.15, 0.6, 0xdfe7ef, 0.06); // geladeira
  box(g, 3.86, 0.15, -ROOM_D + 0.71, 0.78, 0.85, 0.01, new THREE.MeshStandardMaterial({ color: 0x9fd8f0, emissive: 0x1a3a4a, roughness: 0.2 }), false);
  // lanches no balcão
  cyl(g, 1.0, 1.03, -3.05, 0.14, 0.14, 0.06, 0xf0a43a);
  cyl(g, 1.0, 1.09, -3.05, 0.15, 0.15, 0.03, 0x6cbf4a);
  sphere(g, 1.0, 1.14, -3.05, 0.14, std(0xf0a43a), 1, 0.55, 1);
  cyl(g, 1.6, 1.03, -3.0, 0.07, 0.06, 0.2, 0xd9473b);
  cyl(g, 2.1, 1.03, -3.05, 0.12, 0.12, 0.03, 0xffffff);
  // mesas redondas com cadeiras
  const tables = [[1.4, -1.5], [3.5, -1.5]];
  for (const [tx, tz] of tables) {
    cyl(g, tx, 0, tz, 0.06, 0.18, 0.7, 0x5a5a62);
    cyl(g, tx, 0.7, tz, 0.5, 0.5, 0.06, std(0xffffff, 0.5), 24);
    for (const dx of [-0.75, 0.75]) {
      rbox(g, tx + dx - 0.2, 0, tz - 0.2, 0.4, 0.42, 0.4, 0xe86a5a, 0.08);
    }
  }
  const cook = createPerson({ shirt: 0xffffff, pants: 0x333333, hat: 'chef' });
  cook.position.set(2.0, 0, -3.95);
  g.add(cook);
  g.userData.npcs = [cook];
  g.userData.spots = [
    new THREE.Vector3(0.65, 0, -1.5), new THREE.Vector3(2.15, 0, -1.5),
    new THREE.Vector3(2.75, 0, -1.5), new THREE.Vector3(4.25, 0, -1.5),
  ];
  g.userData.faceSpots = [Math.PI / 2, -Math.PI / 2, Math.PI / 2, -Math.PI / 2];
}

function buildGym(g) {
  buildShell(g, { floorMat: texMat(Tex.tiles(0x4a4f5a, 0x3f434d, 4), 2, 2) });
  box(g, WT / 2, 0, -ROOM_D, SLOT_W - WT, WALL_H + 0.01, 0.06, std(0xcfe0ea, 0.9), false);
  box(g, 0.4, 0.15, -ROOM_D + 0.07, 4.2, 1.0, 0.03, new THREE.MeshStandardMaterial({ color: 0xe6f4fb, emissive: 0x1e3440, roughness: 0.1 }), false);
  for (let i = 0; i < 2; i++) { // esteiras
    const x = 0.5 + i * 1.4;
    rbox(g, x, 0, -4.1, 0.9, 0.18, 1.7, 0x2f343b, 0.05);
    box(g, x + 0.08, 0.18, -4.0, 0.74, 0.02, 1.5, std(0x1d1d22, 0.95), false);
    cyl(g, x + 0.08, 0.18, -3.95, 0.035, 0.035, 0.95, 0x9aa0a8);
    cyl(g, x + 0.82, 0.18, -3.95, 0.035, 0.035, 0.95, 0x9aa0a8);
    rbox(g, x, 1.1, -4.05, 0.9, 0.12, 0.25, 0x4ec3e0, 0.04);
  }
  // suporte de halteres
  rbox(g, 3.6, 0, -4.2, 1.1, 0.6, 0.45, 0x5a5f68, 0.04);
  for (let k = 0; k < 4; k++) {
    sphere(g, 3.75 + k * 0.26, 0.7, -4.0, 0.08, std([0xd9473b, 0x4ec3e0, 0xf0b323, 0x6cbf4a][k]), 1, 1, 1.6);
  }
  // banco + tapete de yoga
  rbox(g, 3.2, 0, -2.3, 1.2, 0.4, 0.42, 0x2f343b, 0.05);
  rbox(g, 3.2, 0.4, -2.3, 1.2, 0.1, 0.42, 0xd9473b, 0.05);
  rbox(g, 0.6, 0, -1.6, 1.8, 0.03, 0.75, 0x9b6bd6, 0.015);
  sphere(g, 2.9, 0.32, -1.0, 0.32, std(0x4f9bd9, 0.5));
  g.userData.spots = [
    new THREE.Vector3(0.95, 0.2, -3.2), new THREE.Vector3(2.35, 0.2, -3.2),
    new THREE.Vector3(1.5, 0, -1.25), new THREE.Vector3(3.8, 0, -1.7),
  ];
  g.userData.faceSpots = [Math.PI, Math.PI, 0, Math.PI];
  g.userData.runSpots = 2;
}

function buildPool(g) {
  buildShell(g, { floorMat: texMat(Tex.tiles(0xf6f1e6, 0xe9dfcc, 4), 2, 2) });
  box(g, WT / 2, 0, -ROOM_D, SLOT_W - WT, WALL_H + 0.01, 0.06, std(0xd8f0f8, 0.9), false);
  const rim = std(0xffffff, 0.5);
  const tile = texMat(Tex.poolTiles(), 3, 0.5, 0xffffff, 0.4);
  // borda e paredes internas da piscina (elevada)
  const px0 = 0.35, pz0 = -4.15, pw = 4.3, pd = 2.5, ph = 0.4;
  box(g, px0, 0, pz0, pw, ph, 0.18, tile);
  box(g, px0, 0, pz0 + pd - 0.18, pw, ph, 0.18, tile);
  box(g, px0, 0, pz0, 0.18, ph, pd, tile);
  box(g, px0 + pw - 0.18, 0, pz0, 0.18, ph, pd, tile);
  rbox(g, px0 - 0.05, ph, pz0 - 0.05, pw + 0.1, 0.06, 0.26, rim, 0.03);
  rbox(g, px0 - 0.05, ph, pz0 + pd - 0.21, pw + 0.1, 0.06, 0.26, rim, 0.03);
  rbox(g, px0 - 0.05, ph, pz0 - 0.05, 0.26, 0.06, pd + 0.1, rim, 0.03);
  rbox(g, px0 + pw - 0.21, ph, pz0 - 0.05, 0.26, 0.06, pd + 0.1, rim, 0.03);
  floorPlane(g, px0 + 0.18, pz0 + 0.18, pw - 0.36, pd - 0.36, new THREE.MeshStandardMaterial({ map: rep(Tex.poolTiles(), 3, 2), roughness: 0.5 }), 0.02);
  const wtex = rep(Tex.water(), 2, 1.2);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(pw - 0.36, pd - 0.36), new THREE.MeshStandardMaterial({ map: wtex, transparent: true, opacity: 0.85, roughness: 0.05, metalness: 0.1, emissive: 0x0b4a6a, emissiveIntensity: 0.4 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(px0 + pw / 2, ph - 0.06, pz0 + pd / 2);
  g.add(water);
  // escada da piscina
  for (const dx of [0, 0.3]) cyl(g, 3.9 + dx, ph, pz0 + pd - 0.25, 0.025, 0.025, 0.4, std(0xc0c6cc, 0.3, { metalness: 0.6 }));
  // espreguiçadeiras e guarda-sol
  for (let i = 0; i < 2; i++) {
    const x = 0.5 + i * 1.5;
    rbox(g, x, 0.18, -1.25, 1.2, 0.1, 0.55, 0xffffff, 0.04);
    for (const lx of [0.05, 1.05]) box(g, x + lx, 0, -1.2, 0.08, 0.18, 0.45, 0xc0c6cc);
    const back = rbox(g, x + 0.9, 0.3, -1.25, 0.45, 0.08, 0.55, 0x4f9bd9, 0.03);
    back.rotation.z = 0.7;
  }
  cyl(g, 3.6, 0, -0.9, 0.035, 0.035, 1.7, 0xeeeeee);
  const umb = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.35, 12), std(0xef4b5c, 0.7));
  umb.position.set(3.6, 1.85, -0.9); umb.castShadow = true; g.add(umb);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.08, 10, 20), std(0xf5b82e, 0.5));
  ring.rotation.x = -Math.PI / 2; ring.position.set(3.4, ph - 0.03, -3.4); g.add(ring);
  plant(g, 4.6, -0.5, 0.8);
  g.userData.water = wtex;
  g.userData.ring = ring;
  g.userData.ringY = ph - 0.03;
  g.userData.spots = [
    new THREE.Vector3(1.2, 0, -3.0), new THREE.Vector3(2.4, 0, -3.3),
    new THREE.Vector3(1.1, 0.3, -0.98), new THREE.Vector3(2.6, 0.3, -0.98),
  ];
  g.userData.swimSpots = 2;
  g.userData.lieSpots = [2, 3];
}

function buildEmpty(g) {
  floorPlane(g, 0, -ROOM_D, SLOT_W, ROOM_D, std(0xc9c4ba, 0.95), 0.012);
  const wm = std(0xdcd6cb, 0.95);
  box(g, 0, 0, -ROOM_D, WT / 2, WALL_H, ROOM_D, wm, false);
  box(g, SLOT_W - WT / 2, 0, -ROOM_D, WT / 2, WALL_H, ROOM_D, wm, false);
  box(g, 0, 0, -ROOM_D - WT, SLOT_W, WALL_H, WT, wm, false);
  // andaime
  for (const x of [0.4, 4.2]) for (const z of [-4.2, -3.4]) box(g, x, 0, z, 0.06, 2.2, 0.06, std(0xf0a43a, 0.5), false);
  rbox(g, 0.35, 1.1, -4.3, 0.95, 0.06, 1.0, 0xc8935c, 0.02);
  rbox(g, 4.15, 1.1, -4.3, 0.95 - 0.5, 0.06, 1.0, 0xc8935c, 0.02);
  // fita de obra e cones
  const tape = std(0xf5c518, 0.6);
  for (const [x, z] of [[0.5, -0.5], [4.5, -0.5], [4.5, -4.0], [0.5, -4.0]]) {
    const cone = new THREE.Mesh(geoKey('cone', () => new THREE.ConeGeometry(0.17, 0.45, 12)), std(0xf28c28, 0.6));
    cone.position.set(x, 0.225, z); cone.castShadow = true; g.add(cone);
    cyl(g, x, 0.25, z, 0.18, 0.18, 0.05, std(0xffffff, 0.6));
  }
  box(g, 0.5, 0.38, -0.52, 4.0, 0.05, 0.02, tape, false);
  box(g, 0.5, 0.38, -4.02, 4.0, 0.05, 0.02, tape, false);
  // pilha de tijolos e tábuas
  for (let k = 0; k < 3; k++) rbox(g, 3.2 + k * 0.32, 0, -2.6, 0.3, 0.16, 0.5, 0xc96a4a, 0.02);
  rbox(g, 1.0, 0, -2.6, 1.4, 0.1, 0.35, 0xd9a46c, 0.02);
  rbox(g, 1.1, 0.1, -2.5, 1.3, 0.1, 0.35, 0xc8935c, 0.02);
  const plus = textSprite('+ Construir', { bg: '#ffd34d', fg: '#3a3340', size: 0.6, w: 320, h: 96, font: 'bold 50px Fredoka, Nunito, sans-serif' });
  plus.position.set(SLOT_W / 2, 1.4, -1.6);
  g.add(plus);
  g.userData.plus = plus;
}


// =============== Lobby (térreo, espaços 0 e 1) ===============
function buildLobby(parent) {
  const g = new THREE.Group();
  const x0 = CORE_W, x1 = CORE_W + SLOT_W * 2;
  floorPlane(g, x0, -ROOM_D, x1 - x0, ROOM_D + FRONT_Z, texMat(Tex.tiles(0xf3e6cf, 0xe0a678, 4), 5, 3.1), 0.012);
  const wm = WALL_MAT();
  box(g, x0, 0, -ROOM_D - WT, x1 - x0, WALL_H, WT, wm, false);
  box(g, x0 + WT / 2, 0, -ROOM_D, x1 - x0 - WT, WALL_H, 0.06, std(0xf6e2c4, 0.9), false);
  box(g, x0 + WT / 2, 0.0, -ROOM_D + 0.06, x1 - x0 - WT, 0.9, 0.04, std(0xc8935c, 0.8), false); // lambri
  box(g, x0, WALL_H - 0.12, -0.12, x1 - x0, 0.12, 0.12, std(TRIM, 0.8), false);
  box(g, x1 - WT / 2, 0, -ROOM_D, WT / 2, WALL_H, ROOM_D, wm, false);
  // balcão da recepção (de frente para a rua)
  const desk = 0x8a5530;
  rbox(g, 7.0, 0, -2.75, 3.4, 1.0, 0.65, desk, 0.05);
  rbox(g, 6.95, 1.0, -2.85, 3.5, 0.08, 0.85, std(0xf6f1e6, 0.35), 0.03);
  for (let k = 0; k < 3; k++) rbox(g, 7.25 + k * 1.05, 0.2, -2.12, 0.85, 0.6, 0.02, 0xa86d43, 0.01);
  rbox(g, 9.3, 1.08, -2.75, 0.55, 0.4, 0.08, 0x2a2a30, 0.02);
  box(g, 9.34, 1.13, -2.66, 0.47, 0.3, 0.01, new THREE.MeshStandardMaterial({ color: 0x6fd3ff, emissive: 0x1a5a7a, roughness: 0.3 }), false);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0xf0b323, 0.25, { metalness: 0.6 }));
  bell.position.set(7.5, 1.08, -2.4); g.add(bell);
  rbox(g, 8.2, 1.08, -2.55, 0.45, 0.05, 0.35, 0x34507a, 0.02);
  // quadro de chaves e placa na parede
  rbox(g, 7.4, 1.35, -ROOM_D + 0.06, 2.6, 1.1, 0.08, desk, 0.03);
  for (let k = 0; k < 12; k++) cyl(g, 7.65 + (k % 6) * 0.42, 1.5 + Math.floor(k / 6) * 0.45, -ROOM_D + 0.16, 0.06, 0.06, 0.12, std([0xd9473b, 0x4f9bd9, 0x6cbf4a, 0xf0b323, 0xa267d6, 0xe58fb8][k % 6], 0.5));
  const sign = textSprite('Recepção', { bg: '#8a5530', fg: '#fff3c4', size: 0.45, w: 300, h: 96, font: 'bold 54px Fredoka, Nunito, sans-serif' });
  sign.position.set(8.7, 2.7, -ROOM_D + 0.3);
  g.add(sign);
  // recepcionista
  const me = createPerson({ shirt: 0x8b1e3f, pants: 0x2a2a30, hair: 0x3a2416, hairStyle: 1 });
  me.position.set(8.7, 0, -3.35);
  g.add(me);
  // tapete de entrada e luminárias
  rbox(g, DOOR_X - 1.0, 0.012, 0.0, 2.0, 0.02, 1.3, 0x8b1e3f, 0.01);
  const lamps = [pendant(g, 5.5, -1.6), pendant(g, 11.0, -1.6)];

  // decoração nível 1: plantas, tapete, bebedouro
  const decor1 = new THREE.Group();
  plant(decor1, x0 + 0.5, -ROOM_D + 0.5, 1.3);
  plant(decor1, x1 - 0.5, -ROOM_D + 0.5, 1.3);
  plant(decor1, 6.5, -2.4, 1.0);
  rbox(decor1, 4.0, 0.012, -1.6, 2.6, 0.02, 1.3, 0x4f9bd9, 0.01);
  cyl(decor1, 11.4, 0, -3.6, 0.16, 0.16, 0.8, std(0xffffff, 0.5));
  cyl(decor1, 11.4, 0.8, -3.6, 0.13, 0.13, 0.3, std(0x9fd8f0, 0.2, { transparent: true, opacity: 0.8 }));
  // decoração nível 2: sofá, mesinha, poltrona e lustre
  const decor2 = new THREE.Group();
  const sofa = 0xd98a4a;
  rbox(decor2, 3.6, 0, -3.7, 2.4, 0.42, 0.75, sofa, 0.12);
  rbox(decor2, 3.6, 0.3, -3.95, 2.4, 0.5, 0.22, sofa, 0.1);
  for (const x of [3.5, 5.9]) rbox(decor2, x, 0, -3.95, 0.22, 0.6, 1.0, sofa, 0.1);
  for (let k = 0; k < 3; k++) rbox(decor2, 3.85 + k * 0.72, 0.42, -3.6, 0.62, 0.14, 0.55, std(shade(sofa, 1.1)), 0.07);
  cyl(decor2, 4.8, 0, -2.3, 0.45, 0.45, 0.35, 0x8a5530, 24);
  plant(decor2, 4.8, -2.3, 0.45, 0xffffff);
  rbox(decor2, 11.6, 0, -2.6, 0.75, 0.42, 0.75, 0x6cbf4a, 0.12);
  rbox(decor2, 12.15, 0.3, -2.6, 0.2, 0.45, 0.75, 0x6cbf4a, 0.08);
  const chand = new THREE.MeshStandardMaterial({ color: 0xfff1c4, emissive: 0x665522, roughness: 0.3 });
  sphere(decor2, 8.0, WALL_H - 0.75, -1.0, 0.3, chand, 1, 0.7, 1);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; sphere(decor2, 8.0 + Math.cos(a) * 0.45, WALL_H - 0.8, -1.0 + Math.sin(a) * 0.45, 0.08, chand); }
  cyl(decor2, 8.0, WALL_H - 0.6, -1.0, 0.015, 0.015, 0.6, std(0xd4a93a, 0.4));
  decor1.visible = false; decor2.visible = false;
  g.add(decor1, decor2);

  g.userData.decor = [decor1, decor2];
  g.userData.receptionist = me;
  g.userData.lamps = lamps;
  parent.add(g);
  return g;
}

// =============== Poço do elevador (um trecho por andar) ===============
function buildCore(parent, f) {
  const g = new THREE.Group();
  floorPlane(g, 0, -ROOM_D, CORE_W, ROOM_D + FRONT_Z, std(0xb9bec6, 0.6), 0.012);
  box(g, 0, 0, -ROOM_D - WT, CORE_W, WALL_H, WT, std(0x8a90a0, 0.5), false);
  box(g, CORE_W - WT / 2, 0, -ROOM_D, WT / 2, WALL_H, ROOM_D, WALL_MAT(), false);
  // trilhos e cabos
  const steel = std(0xc8ced6, 0.3, { metalness: 0.6 });
  for (const x of [0.35, CORE_W - 0.45]) box(g, x, 0, -3.3, 0.1, FLOOR_H, 0.1, steel, false);
  for (const x of [1.2, 1.8]) cyl(g, x, 0, -3.0, 0.015, 0.015, FLOOR_H, std(0x3a3340, 0.5));
  // moldura de vidro na frente do poço
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfeefc, transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });
  const fr = box(g, 0.25, 0.05, -0.55, CORE_W - 0.5, WALL_H - 0.15, 0.04, glass, false);
  fr.renderOrder = 2;
  box(g, 0.15, 0, -0.6, 0.12, WALL_H, 0.14, steel, false);
  box(g, CORE_W - 0.27, 0, -0.6, 0.12, WALL_H, 0.14, steel, false);
  box(g, 0.15, WALL_H - 0.2, -0.6, CORE_W - 0.3, 0.2, 0.14, steel, false);
  const lbl = textSprite(f === 0 ? 'T' : `${f}º`, { bg: '#3a3340', fg: '#ffd34d', size: 0.42, w: 120, h: 96, font: 'bold 56px Fredoka, Nunito, sans-serif' });
  lbl.position.set(ELEV_X, WALL_H - 0.45, 0.0);
  g.add(lbl);
  parent.add(g);
  return g;
}

// =============== Exterior ===============
function tree(p, x, z, s = 1) {
  const t = new THREE.Group();
  cyl(t, 0, 0, 0, 0.14, 0.2, 1.3, std(0x8a5a30, 0.9), 10);
  const leaf = [std(0x4fa34a, 0.8), std(0x5fb85a, 0.8), std(0x3f8f3e, 0.8)];
  [[0, 1.8, 0, 0.9], [0.5, 1.5, 0.2, 0.6], [-0.45, 1.55, -0.1, 0.65], [0.1, 2.35, 0.1, 0.6]].forEach(([x1, y, z1, r], k) => sphere(t, x1, y, z1, r, leaf[k % 3]));
  t.position.set(x, 0, z); t.scale.setScalar(s);
  p.add(t);
}
function palm(p, x, z, s = 1) {
  const t = new THREE.Group();
  for (let k = 0; k < 6; k++) {
    const seg = cyl(t, Math.sin(k * 0.3) * 0.12 * k * 0.3, k * 0.4, 0, 0.1, 0.13, 0.42, std(0xa87a4a, 0.9), 8);
    seg.rotation.z = 0.05 * k;
  }
  const leaf = std(0x4fa34a, 0.8);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const l = new THREE.Mesh(geoKey('palmleaf', () => new THREE.BoxGeometry(1.4, 0.04, 0.35)), leaf);
    l.position.set(Math.cos(a) * 0.6 + 0.2, 2.45, Math.sin(a) * 0.6);
    l.rotation.y = -a; l.rotation.z = -0.45;
    l.castShadow = true;
    t.add(l);
  }
  t.position.set(x, 0, z); t.scale.setScalar(s);
  p.add(t);
}
function bush(p, x, z, s = 1, flower = null) {
  sphere(p, x, 0.3 * s, z, 0.45 * s, std(0x4fa34a, 0.8), 1.2, 0.8, 1);
  if (flower) for (let k = 0; k < 5; k++) sphere(p, x + (Math.random() - 0.5) * 0.7 * s, 0.55 * s, z + (Math.random() - 0.5) * 0.5 * s, 0.07, std(flower, 0.6));
}
function bench(p, x, z, rotY = 0) {
  const b = new THREE.Group();
  rbox(b, -0.8, 0.4, -0.25, 1.6, 0.08, 0.5, 0xa86d43, 0.03);
  rbox(b, -0.8, 0.5, -0.3, 1.6, 0.4, 0.08, 0xa86d43, 0.03);
  for (const lx of [-0.7, 0.62]) box(b, lx, 0, -0.25, 0.08, 0.4, 0.45, 0x3a3340);
  b.position.set(x, 0, z); b.rotation.y = rotY;
  p.add(b);
}
function lampPost(p, x, z, list) {
  cyl(p, x, 0, z, 0.06, 0.09, 2.6, std(0x3a3340, 0.5), 10);
  const m = new THREE.MeshStandardMaterial({ color: 0xfff1c4, emissive: 0x000000, roughness: 0.4 });
  sphere(p, x, 2.75, z, 0.2, m);
  list.push(m);
}
function car(p, x, z, color) {
  const g = new THREE.Group();
  rbox(g, -1.1, 0.2, -0.55, 2.2, 0.55, 1.1, std(color, 0.35), 0.2);
  rbox(g, -0.6, 0.65, -0.5, 1.25, 0.45, 1.0, std(0xbfe6f7, 0.1), 0.15);
  rbox(g, -0.55, 0.95, -0.45, 1.15, 0.12, 0.9, std(color, 0.35), 0.05);
  for (const [wx, wz] of [[-0.65, -0.55], [0.65, -0.55], [-0.65, 0.55], [0.65, 0.55]]) {
    const w = cyl(g, wx, 0, wz, 0.22, 0.22, 0.18, std(0x222222, 0.8), 14);
    w.rotation.x = Math.PI / 2; w.position.y = 0.22;
  }
  g.position.set(x, 0, z);
  p.add(g);
  return g;
}


export function buildEnvironment(scene) {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), new THREE.MeshStandardMaterial({ map: rep(Tex.grass(), 60, 46), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(W / 2, -0.32, 0); ground.receiveShadow = true;
  g.add(ground);
  // calçada, meio-fio, rua e calçada oposta
  const sw = new THREE.MeshStandardMaterial({ map: rep(Tex.cobble(), 80, 1.5), roughness: 0.95 });
  box(g, -100, -0.32, FRONT_Z, 240, 0.3, 3.4, sw, false);
  box(g, -100, -0.32, FRONT_Z + 3.35, 240, 0.32, 0.14, std(0xe6e2da), false);
  box(g, -100, -0.4, FRONT_Z + 3.5, 240, 0.3, 5.6, new THREE.MeshStandardMaterial({ map: rep(Tex.asphalt(), 60, 2), roughness: 1 }), false);
  for (let x = -98; x < 140; x += 3) box(g, x, -0.09, FRONT_Z + 6.2, 1.6, 0.02, 0.16, std(0xffffff, 0.8), false);
  box(g, -100, -0.32, FRONT_Z + 9.1, 240, 0.3, 2.4, sw, false);
  // canteiros baixos ao lado da entrada
  for (const x of [DOOR_X - 2.2, DOOR_X + 2.2]) {
    rbox(g, x - 0.7, -0.3, FRONT_Z + 0.25, 1.4, 0.55, 0.6, std(0xd9cfc0, 0.9), 0.06);
    bush(g, x - 0.3, FRONT_Z + 0.55, 0.55, 0xef4b5c);
    bush(g, x + 0.3, FRONT_Z + 0.55, 0.55, 0xffffff);
  }
  bench(g, W - 3, FRONT_Z + 2.6, Math.PI);
  // árvores e palmeiras nas laterais e atrás
  for (const [x, z, s] of [[-3.5, -3, 1.4], [-6, 0.5, 1.1], [-9, -5, 1.5], [W + 3.5, -3, 1.3], [W + 6, 0.5, 1.2], [W + 9, -5, 1.6], [6, -9, 1.6], [16, -10, 1.8], [27, -9, 1.6]]) tree(g, x, z, s);
  palm(g, -2.0, FRONT_Z + 0.9, 1.2);
  palm(g, W + 2.0, FRONT_Z + 0.9, 1.3);
  const lamps = [];
  for (let x = -14; x < W + 16; x += 8) lampPost(g, x, FRONT_Z + 10.1, lamps);
  const cars = [car(g, -30, FRONT_Z + 5.0, 0xef4b5c), car(g, 40, FRONT_Z + 7.5, 0x4f9bd9)];
  cars[1].rotation.y = Math.PI;
  scene.add(g);
  return { group: g, lamps, cars };
}

// =============== Classe principal ===============
export class HotelView {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.floorGroups = [];
    this.roof = null;
    this.slotGroups = new Map();
    this.slotKeys = new Map();
    this.hitboxes = [];
    this.floors = 0;
    this.viewFloor = 0;
    this.lobby = null;
    this.decorLevel = 0;
    // destaque do espaço sob o mouse: piso colorido + contorno
    this.hoverMat = new THREE.MeshBasicMaterial({ color: 0x8ee07a, transparent: true, opacity: 0.35, depthWrite: false });
    this.hoverBox = new THREE.Group();
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(SLOT_W - 0.2, ROOM_D - 0.2), this.hoverMat);
    pl.rotation.x = -Math.PI / 2; pl.position.y = 0.05; pl.renderOrder = 3;
    this.hoverEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(SLOT_W - 0.1, WALL_H - 0.05, ROOM_D + FRONT_Z - 0.1)), new THREE.LineBasicMaterial({ color: 0x8ee07a }));
    this.hoverEdges.position.set(0, (WALL_H - 0.05) / 2, (FRONT_Z) / 2);
    this.hoverBox.add(pl, this.hoverEdges);
    this.hoverBox.visible = false;
    scene.add(this.hoverBox);
  }

  // ---------- andares ----------
  setFloors(n) {
    while (this.floorGroups.length > n) this.root.remove(this.floorGroups.pop().group);
    while (this.floorGroups.length < n) this.floorGroups.push(this._buildFloor(this.floorGroups.length));
    this.floors = n;
    this._buildShellAndRoof(n);
  }

  _buildFloor(f) {
    const group = new THREE.Group();
    group.position.y = f * FLOOR_H;
    // laje (piso deste andar), com a borda da frente aparente
    rbox(group, -0.25, -0.3, BACK_Z - 0.3, W + 0.5, 0.3, FRONT_Z - BACK_Z + 0.4, std(0xf1ebe0, 0.9), 0.05);
    box(group, -0.25, -0.3, FRONT_Z + 0.06, W + 0.5, 0.3, 0.06, std(0xe2d6c4, 0.9), false);
    // corredor
    const cx0 = f === 0 ? CORE_W + 2 * SLOT_W : CORE_W;
    floorPlane(group, cx0, 0, W - cx0, FRONT_Z, texMat(Tex.wood(0xc8935c), (W - cx0) / 2.5, 0.8), 0.012);
    rbox(group, cx0 + 0.3, 0.013, 0.45, W - cx0 - 0.6, 0.012, 0.8, f === 0 ? 0x8b1e3f : 0x34507a, 0.005);
    if (f > 0) { // guarda-corpo de vidro
      const glass = new THREE.MeshStandardMaterial({ color: 0xcfeefc, transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false });
      const r = box(group, 0, 0, FRONT_Z - 0.06, W, 0.85, 0.04, glass, false);
      r.renderOrder = 2;
      rbox(group, 0, 0.85, FRONT_Z - 0.09, W, 0.06, 0.1, std(0xd4a93a, 0.35, { metalness: 0.5 }), 0.03);
      for (let x = 0; x <= W; x += SLOT_W) box(group, Math.min(x, W - 0.06), 0, FRONT_Z - 0.08, 0.06, 0.85, 0.06, std(0xd4a93a, 0.35, { metalness: 0.5 }), false);
    }
    buildCore(group, f);
    if (f === 0) this.lobby = buildLobby(group);
    const slots = new THREE.Group();
    group.add(slots);
    this.root.add(group);
    group.updateMatrixWorld(true);
    return { group, slots };
  }

  // paredes externas laterais, telhado e letreiro (dependem do número de andares)
  _buildShellAndRoof(n) {
    if (this.roof) this.root.remove(this.roof);
    const s = new THREE.Group();
    const H = n * FLOOR_H;
    const side = texMat(Tex.facade(), (ROOM_D + FRONT_Z) / 3, n, 0xffffff, 0.9);
    box(s, -0.45, -0.3, BACK_Z - 0.35, 0.45, H + 0.3, FRONT_Z - BACK_Z + 0.35, side);
    box(s, W, -0.3, BACK_Z - 0.35, 0.45, H + 0.3, FRONT_Z - BACK_Z + 0.35, side);
    box(s, -0.45, -0.3, BACK_Z - 0.5, W + 0.9, H + 0.3, 0.2, std(0xf4efe6, 0.9), false);
    // colunas da frente
    for (const x of [-0.5, W - 0.05]) rbox(s, x, -0.3, FRONT_Z - 0.25, 0.55, H + 0.3, 0.55, std(0xf6f1e6, 0.8), 0.05);
    // telhado
    rbox(s, -0.7, H - 0.3, BACK_Z - 0.6, W + 1.4, 0.4, FRONT_Z - BACK_Z + 1.0, std(0xc96a4a, 0.8), 0.06);
    rbox(s, -0.7, H + 0.1, FRONT_Z + 0.1, W + 1.4, 0.35, 0.3, std(0xf6f1e6, 0.8), 0.05);
    rbox(s, W - 5, H + 0.1, -3.6, 1.8, 1.4, 1.8, std(0x9aa0a8, 0.6), 0.1);
    rbox(s, 3, H + 0.1, -3.2, 3.0, 0.5, 1.2, std(0xa0a6ac, 0.6), 0.05); // ar-condicionado
    // letreiro HOTEL
    const board = new THREE.Group();
    rbox(board, -3.2, 0, -0.15, 6.4, 1.4, 0.3, std(0xc96a4a, 0.7), 0.12);
    rbox(board, -3.0, 0.15, 0.1, 6.0, 1.1, 0.06, std(0xfff3c4, 0.7), 0.05);
    // placa plana (não sprite) para não atravessar o painel
    const sp = textSprite('HOTEL PARAÍSO', { bg: '#fff3c4', fg: '#c96a4a', size: 1.0, w: 560, h: 96, font: 'bold 58px Fredoka, Nunito, sans-serif' });
    const t = new THREE.Mesh(new THREE.PlaneGeometry(sp.scale.x, sp.scale.y), new THREE.MeshBasicMaterial({ map: sp.material.map, transparent: true }));
    t.position.set(0, 0.72, 0.17);
    board.add(t);
    for (const x of [-2.4, 2.4]) box(board, x, -0.6, -0.1, 0.12, 0.6, 0.12, std(0x3a3340), false);
    board.position.set(W / 2, H + 0.75, -0.6);
    s.add(board);
    // toldo da entrada
    rbox(s, DOOR_X - 1.3, WALL_H - 0.35, FRONT_Z - 0.1, 2.6, 0.12, 1.4, 0x8b1e3f, 0.04);
    for (const x of [DOOR_X - 1.2, DOOR_X + 1.1]) cyl(s, x, -0.3, FRONT_Z + 1.15, 0.04, 0.04, WALL_H + 0.0, std(0xd4a93a, 0.35, { metalness: 0.5 }), 10);
    this.roof = s;
    this.root.add(s);
  }

  setViewFloor() { /* todos os andares ficam visíveis */ }

  // ---------- espaços ----------
  slotKey(f, i) { return `${f}_${i}`; }

  syncSlot(f, i, slot) {
    const key = this.slotKey(f, i);
    const vkey = `${slot.type}_${slot.tier || 0}`;
    if (this.slotKeys.get(key) === vkey) return this.slotGroups.get(key);
    const fg = this.floorGroups[f];
    const old = this.slotGroups.get(key);
    if (old) {
      old.parent.remove(old);
      this.hitboxes = this.hitboxes.filter((h) => h.userData.key !== key);
    }
    const g = new THREE.Group();
    g.position.set(slotX0(i), 0, 0);
    if (slot.type === 'room') buildRoom(g, slot, (f + 1) * 100 + i + 1);
    else if (slot.type === 'snack') buildSnack(g);
    else if (slot.type === 'gym') buildGym(g);
    else if (slot.type === 'pool') buildPool(g);
    else if (slot.type === 'empty') buildEmpty(g);
    const hb = new THREE.Mesh(bgeo(SLOT_W, WALL_H, ROOM_D + FRONT_Z), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    hb.position.set(SLOT_W / 2, WALL_H / 2, (FRONT_Z - ROOM_D) / 2);
    hb.userData = { kind: 'slot', f, i, key };
    g.add(hb);
    this.hitboxes.push(hb);
    fg.slots.add(g);
    g.updateMatrixWorld(true);
    this.slotGroups.set(key, g);
    this.slotKeys.set(key, vkey);
    return g;
  }

  removeSlotsAbove(floors) {
    for (const [key, g] of [...this.slotGroups]) {
      const f = +key.split('_')[0];
      if (f >= floors) {
        g.parent?.remove(g);
        this.slotGroups.delete(key);
        this.slotKeys.delete(key);
        this.hitboxes = this.hitboxes.filter((h) => h.userData.key !== key);
      }
    }
  }

  pickables() { return this.hitboxes; }

  setProgress() { /* o progresso aparece no balão do quarto */ }

  setDirty(f, i, dirty) {
    const g = this.slotGroups.get(this.slotKey(f, i));
    if (!g || !g.userData.dirt) return;
    g.userData.dirt.visible = dirty;
    if (g.userData.quilt) g.userData.quilt.visible = !dirty;
  }

  setLight(f, i, on, night) {
    const g = this.slotGroups.get(this.slotKey(f, i));
    if (!g) return;
    const k = on ? Math.max(0.15, night) : 0;
    for (const m of g.userData.lamps || []) m.emissive.setRGB(k, k * 0.82, k * 0.45);
  }

  setLobbyLight(night) {
    const k = 0.2 + night * 0.8;
    for (const m of this.lobby?.userData.lamps || []) m.emissive.setRGB(k, k * 0.82, k * 0.45);
  }

  setDecor(level) {
    this.decorLevel = level;
    if (this.lobby) this.lobby.userData.decor.forEach((d, idx) => { d.visible = level > idx; });
  }

  hover(f, i, color = 0x8ee07a) {
    const g = f === null ? null : this.slotGroups.get(this.slotKey(f, i));
    if (!g) { this.hoverBox.visible = false; return; }
    this.hoverBox.visible = true;
    this.hoverMat.color.setHex(color);
    this.hoverEdges.material.color.setHex(color);
    this.hoverBox.position.copy(this.toWorld(f, i, new THREE.Vector3(SLOT_W / 2, 0, -ROOM_D / 2)));
  }

  slotGroup(f, i) { return this.slotGroups.get(this.slotKey(f, i)); }

  toWorld(f, i, local) {
    const g = this.slotGroup(f, i);
    if (!g) return new THREE.Vector3();
    g.updateMatrixWorld(true);
    return g.localToWorld(local.clone());
  }
  slotWorld(f, i, local) { return this.toWorld(f, i, local); }
  slotRotY() { return 0; }
}

export { SLOTS_PER_FLOOR, COLS, hex };
