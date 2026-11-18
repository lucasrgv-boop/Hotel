// Construção visual do hotel: andares, lobby, quartos, instalações, elevador e arredores.
import * as THREE from 'three';
import {
  FLOOR_H, SLOT_W, DEPTH, SLAB_FRONT, ELEV_X0, ELEV_W, SLOTS_PER_FLOOR,
  BUILDING_W, slotX0, TIERS,
} from './config.js';
import { Tex, shade } from './textures.js';
import { createPerson } from './characters.js';

const geoCache = new Map();
function bgeo(w, h, d) {
  const k = `${w}_${h}_${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
}
const matCache = new Map();
function lam(color, extra = {}) {
  const k = color + JSON.stringify(extra);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color, ...extra }));
  return matCache.get(k);
}
function texMat(tex, rx, ry, color = 0xffffff) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.repeat.set(rx, ry);
  return new THREE.MeshLambertMaterial({ map: t, color });
}

// Cria uma caixa posicionada pelo canto mínimo (x0,y0,z0)
function box(parent, x0, y0, z0, w, h, d, material, shadow = true) {
  const m = new THREE.Mesh(bgeo(w, h, d), typeof material === 'number' ? lam(material) : material);
  m.position.set(x0 + w / 2, y0 + h / 2, z0 + d / 2);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function labelSprite(text, bg = '#2b2235', fg = '#ffe680', w = 32, h = 12, scale = 0.06) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#5a4a6a';
  g.fillRect(0, h - 1, w, 1);
  g.fillStyle = fg;
  g.font = `bold ${h - 3}px monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * scale, h * scale), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
  return m;
}

// ---------------- Conteúdo de cada espaço ----------------

function buildWalls(g, wallMat, floorMat) {
  box(g, 0, -0.02, -DEPTH, SLOT_W, 0.04, DEPTH, floorMat, false);
  box(g, 0, 0, -DEPTH - 0.15, SLOT_W, FLOOR_H - 0.3, 0.15, wallMat, false);
  box(g, 0, 0, -DEPTH, 0.1, FLOOR_H - 0.3, DEPTH, wallMat, false);
  box(g, SLOT_W - 0.1, 0, -DEPTH, 0.1, FLOOR_H - 0.3, DEPTH, wallMat, false);
  // batentes da "porta" (moldura frontal)
  box(g, 0, 0, -0.12, 0.25, FLOOR_H - 0.3, 0.12, 0xe8dcc8);
  box(g, SLOT_W - 0.25, 0, -0.12, 0.25, FLOOR_H - 0.3, 0.12, 0xe8dcc8);
  box(g, 0, FLOOR_H - 0.55, -0.12, SLOT_W, 0.25, 0.12, 0xe8dcc8);
}

function buildRoom(g, slot, num) {
  const tier = slot.tier || 0;
  const wallCols = [[0xd9cbb0, 0xcbb894], [0xcfc0e3, 0xbba7d8], [0xf2e2b6, 0xe3c97e]][tier];
  const carpetCols = [0x5d7fa8, 0x7a4f8f, 0x8f2f3f][tier];
  const wallMat = texMat(Tex.wallpaper(wallCols[0], wallCols[1]), 3, 1.2);
  const floorMat = texMat(Tex.carpet(carpetCols), 3, 3);
  buildWalls(g, wallMat, floorMat);

  const blanket = TIERS[tier].color;
  const bedW = tier === 2 ? 2.0 : tier === 1 ? 1.7 : 1.3;
  const bx = 0.6, bz = -DEPTH;
  // cama
  box(g, bx, 0, bz + 0.1, bedW, 0.35, 2.3, tier === 2 ? 0x6b3d1f : 0x8a5a33);
  box(g, bx - 0.05, 0, bz, bedW + 0.1, 1.0, 0.15, tier === 2 ? 0xd4af37 : 0x6b4423); // cabeceira
  box(g, bx + 0.05, 0.35, bz + 0.15, bedW - 0.1, 0.2, 2.15, 0xf4f4f4);
  const bl = box(g, bx + 0.02, 0.4, bz + 0.85, bedW - 0.04, 0.2, 1.5, new THREE.MeshLambertMaterial({ map: Tex.sheet(blanket) }));
  box(g, bx + 0.15, 0.55, bz + 0.25, bedW - 0.3, 0.15, 0.4, 0xffffff);
  // criado-mudo + abajur
  const nx = bx + bedW + 0.15;
  box(g, nx, 0, bz + 0.1, 0.55, 0.55, 0.5, 0x7a4f2a);
  box(g, nx + 0.22, 0.55, bz + 0.27, 0.1, 0.25, 0.1, 0x444444);
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xfff1b8, emissive: 0x000000 });
  box(g, nx + 0.1, 0.8, bz + 0.15, 0.35, 0.28, 0.35, lampMat);
  // quadro na parede
  box(g, bx + bedW / 2 - 0.45, 1.5, -DEPTH, 0.9, 0.6, 0.06, 0x3a2a1a);
  box(g, bx + bedW / 2 - 0.38, 1.57, -DEPTH + 0.03, 0.76, 0.46, 0.05, [0x6fa8dc, 0x93c47d, 0xe06666][tier]);

  if (tier >= 1) { // TV + tapete + planta
    box(g, SLOT_W - 0.6, 0, -2.2, 0.45, 0.5, 1.2, 0x5a3a22);
    box(g, SLOT_W - 0.4, 0.5, -2.05, 0.1, 0.6, 0.9, 0x1a1a1f);
    box(g, SLOT_W - 0.45, 0.58, -1.98, 0.02, 0.45, 0.76, new THREE.MeshLambertMaterial({ color: 0x223344, emissive: 0x112233 }));
    box(g, bx + 0.1, 0.01, -1.55, bedW + 0.6, 0.02, 1.0, 0xc9a66b, false);
    box(g, SLOT_W - 0.8, 0, -DEPTH + 0.2, 0.4, 0.4, 0.4, 0xb86b3c);
    box(g, SLOT_W - 0.9, 0.4, -DEPTH + 0.1, 0.6, 0.7, 0.6, 0x4f9a3a);
  } else {
    box(g, SLOT_W - 1.0, 0, -DEPTH + 0.1, 0.7, 1.3, 0.5, 0x8a6a45); // armário
    box(g, SLOT_W - 0.66, 0.3, -DEPTH + 0.6, 0.04, 0.6, 0.02, 0x3a2a1a);
  }
  if (tier === 2) { // sofá + banheira de hidro
    box(g, SLOT_W - 1.9, 0, -1.4, 1.4, 0.4, 0.7, 0xa33a4a);
    box(g, SLOT_W - 1.9, 0.4, -0.8, 1.4, 0.4, 0.15, 0xa33a4a);
    box(g, SLOT_W - 1.7, 0, -DEPTH + 0.15, 0.9, 0.5, 1.2, 0xf4f4f4);
    box(g, SLOT_W - 1.62, 0.45, -DEPTH + 0.23, 0.74, 0.06, 1.04, new THREE.MeshLambertMaterial({ color: 0x5fc6e8, emissive: 0x0a3040 }));
  }

  // sujeira (visível só quando sujo)
  const dirt = new THREE.Group();
  const dm = new THREE.Mesh(new THREE.PlaneGeometry(SLOT_W - 0.3, DEPTH - 0.3), new THREE.MeshBasicMaterial({ map: (() => { const t = Tex.dirt().clone(); t.needsUpdate = true; t.repeat.set(2.5, 2.5); return t; })(), transparent: true }));
  dm.rotation.x = -Math.PI / 2;
  dm.position.set(SLOT_W / 2, 0.04, -DEPTH / 2);
  dirt.add(dm);
  const messy = box(dirt, bx + 0.1, 0.42, bz + 0.6, bedW - 0.3, 0.26, 0.9, new THREE.MeshLambertMaterial({ map: Tex.sheet(blanket) }));
  messy.rotation.z = 0.25;
  box(dirt, 2.6, 0, -1.2, 0.3, 0.3, 0.3, 0xe9e9e9);  // toalha
  box(dirt, 3.1, 0, -0.9, 0.18, 0.4, 0.18, 0x3c8d4f); // garrafa
  box(dirt, 1.9, 0, -0.6, 0.5, 0.08, 0.35, 0xb04040); // roupa
  dirt.visible = false;
  g.add(dirt);

  // número do quarto
  const lbl = labelSprite(String(num));
  lbl.position.set(SLOT_W / 2, FLOOR_H - 0.43, 0.02);
  g.add(lbl);

  g.userData.blanket = bl;
  g.userData.dirt = dirt;
  g.userData.lamps = [lampMat];
  g.userData.glowMats = [wallMat];
  g.userData.bedSpot = new THREE.Vector3(bx + bedW / 2, 0.62, bz + 1.4);
  g.userData.spots = [new THREE.Vector3(bx + bedW + 0.9, 0, -1.2)];
}

function buildSnack(g) {
  const wallMat = texMat(Tex.wallpaper(0xf6d7a7, 0xeec48a), 3, 1.2);
  const floorMat = texMat(Tex.tiles(0xf4f0e6, 0xd14b4b), 3, 3);
  buildWalls(g, wallMat, floorMat);
  // balcão
  box(g, 0.4, 0, -2.6, 3.7, 1.0, 0.7, 0xd14b4b);
  box(g, 0.35, 1.0, -2.65, 3.8, 0.1, 0.8, 0xf4f4f4);
  // chapa / máquina
  box(g, 0.5, 0, -DEPTH + 0.1, 1.2, 1.0, 0.7, 0x9a9aa2);
  box(g, 1.8, 0, -DEPTH + 0.1, 0.9, 1.9, 0.7, 0xdfe7ef); // geladeira
  box(g, 1.85, 0.2, -DEPTH + 0.81, 0.8, 1.5, 0.02, new THREE.MeshLambertMaterial({ color: 0x9fd8f0, emissive: 0x1a3a4a }));
  // cardápio
  box(g, 2.9, 1.6, -DEPTH, 1.3, 0.8, 0.06, 0x2b2235);
  const menu = labelSprite('LANCHES', '#2b2235', '#ffe680', 40, 12, 0.03);
  menu.position.set(3.55, 2.05, -DEPTH + 0.07); g.add(menu);
  // banquinhos
  for (let i = 0; i < 3; i++) {
    box(g, 0.8 + i * 1.2, 0, -1.6, 0.12, 0.6, 0.12, 0x555555);
    box(g, 0.6 + i * 1.2, 0.6, -1.8, 0.5, 0.1, 0.5, 0xd14b4b);
  }
  // hambúrguer no balcão
  box(g, 1.2, 1.1, -2.45, 0.3, 0.08, 0.3, 0xd9902f);
  box(g, 1.2, 1.18, -2.45, 0.3, 0.05, 0.3, 0x6abe30);
  box(g, 1.2, 1.23, -2.45, 0.3, 0.1, 0.3, 0xd9902f);
  const cook = createPerson({ shirt: 0xf4f4f4, pants: 0x333333, hat: 0xffffff });
  cook.position.set(2.4, 0, -3.2);
  g.add(cook);
  g.userData.npcs = [cook];
  g.userData.glowMats = [wallMat];
  g.userData.spots = [0, 1, 2].map((i) => new THREE.Vector3(0.85 + i * 1.2, 0, -1.25));
}

function buildGym(g) {
  const wallMat = texMat(Tex.wallpaper(0xb7c7d6, 0xa4b6c7), 3, 1.2);
  const floorMat = texMat(Tex.tiles(0x3b3b44, 0x2f2f36), 3, 3);
  buildWalls(g, wallMat, floorMat);
  // espelho
  box(g, 0.3, 0.4, -DEPTH, 3.9, 1.6, 0.05, new THREE.MeshLambertMaterial({ color: 0xcfe6f2, emissive: 0x203038 }));
  // esteiras
  for (let i = 0; i < 2; i++) {
    const x = 0.4 + i * 1.5;
    box(g, x, 0, -3.0, 0.9, 0.2, 1.6, 0x2a2a2a);
    box(g, x + 0.05, 0.2, -2.95, 0.8, 0.03, 1.5, 0x555555);
    box(g, x, 0.2, -3.0, 0.08, 1.1, 0.08, 0x888888);
    box(g, x + 0.82, 0.2, -3.0, 0.08, 1.1, 0.08, 0x888888);
    box(g, x, 1.2, -3.05, 0.9, 0.15, 0.25, 0x666666);
  }
  // suporte de halteres
  box(g, 3.4, 0, -3.6, 0.9, 0.8, 0.4, 0x666666);
  for (let i = 0; i < 3; i++) {
    box(g, 3.48 + i * 0.27, 0.8, -3.5, 0.16, 0.16, 0.2, 0x222222);
  }
  // banco
  box(g, 3.0, 0, -1.5, 1.1, 0.45, 0.4, 0x2a2a2a);
  box(g, 3.0, 0.45, -1.5, 1.1, 0.1, 0.4, 0xc0392b);
  // bola
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), lam(0x3d85c6, { flatShading: true }));
  ball.position.set(1.4, 0.3, -0.9); ball.castShadow = true; g.add(ball);
  g.userData.glowMats = [wallMat];
  g.userData.spots = [new THREE.Vector3(0.85, 0.22, -2.2), new THREE.Vector3(2.35, 0.22, -2.2), new THREE.Vector3(3.5, 0, -1.0)];
}

function buildPool(g) {
  const wallMat = texMat(Tex.wallpaper(0xdff4fb, 0xc4e9f5), 3, 1.2);
  const floorMat = texMat(Tex.tiles(0xf0ece0, 0xe2dccb), 3, 3);
  buildWalls(g, wallMat, floorMat);
  // borda da piscina
  const ptex = texMat(Tex.poolTiles(), 2, 1);
  box(g, 0.3, 0, -3.7, 3.9, 0.45, 0.2, ptex);
  box(g, 0.3, 0, -1.4, 3.9, 0.45, 0.2, ptex);
  box(g, 0.3, 0, -3.5, 0.2, 0.45, 2.1, ptex);
  box(g, 4.0, 0, -3.5, 0.2, 0.45, 2.1, ptex);
  const wtex = Tex.water().clone(); wtex.needsUpdate = true; wtex.repeat.set(2, 1.2);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.1), new THREE.MeshLambertMaterial({ map: wtex, emissive: 0x0b3a52, transparent: true, opacity: 0.92 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(2.25, 0.36, -2.45);
  g.add(water);
  // espreguiçadeiras
  for (let i = 0; i < 2; i++) {
    box(g, 0.6 + i * 2, 0, -1.0, 1.2, 0.25, 0.5, 0xffffff);
    const back = box(g, 0.6 + i * 2, 0.25, -1.0, 0.35, 0.45, 0.5, 0x4aa3df);
    back.rotation.z = 0.5;
  }
  // guarda-sol
  box(g, 1.75, 0, -0.85, 0.08, 1.8, 0.08, 0xdddddd);
  const umb = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.4, 6), lam(0xe8433a, { flatShading: true }));
  umb.position.set(1.79, 1.95, -0.81); umb.castShadow = true; g.add(umb);
  // boia
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.08, 4, 8), lam(0xf6c90e, { flatShading: true }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(3.2, 0.4, -2.2); g.add(ring);
  g.userData.water = wtex;
  g.userData.ring = ring;
  g.userData.glowMats = [wallMat];
  g.userData.spots = [new THREE.Vector3(1.4, 0.05, -2.6), new THREE.Vector3(2.8, 0.05, -3.0), new THREE.Vector3(0.9, 0.3, -0.75)];
  g.userData.swimSpots = 2;
}

function buildEmpty(g, buildable) {
  const wallMat = lam(0x9e9a92);
  const floorMat = lam(0x8a867e);
  box(g, 0, -0.02, -DEPTH, SLOT_W, 0.04, DEPTH, floorMat, false);
  box(g, 0, 0, -DEPTH - 0.15, SLOT_W, FLOOR_H - 0.3, 0.15, wallMat, false);
  box(g, 0, 0, -DEPTH, 0.1, FLOOR_H - 0.3, DEPTH, wallMat, false);
  box(g, SLOT_W - 0.1, 0, -DEPTH, 0.1, FLOOR_H - 0.3, DEPTH, wallMat, false);
  // andaime + cones
  for (const x of [0.5, 3.6]) {
    box(g, x, 0, -3.6, 0.08, 2.4, 0.08, 0xd9902f);
    box(g, x + 0.4, 0, -3.6, 0.08, 2.4, 0.08, 0xd9902f);
    box(g, x, 1.2, -3.65, 0.48, 0.08, 0.5, 0x8a6a45);
  }
  for (const [x, z] of [[1.4, -1.0], [3.0, -1.2]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 4), lam(0xf28c28, { flatShading: true }));
    cone.position.set(x, 0.25, z); cone.castShadow = true; g.add(cone);
  }
  if (buildable) {
    const plus = labelSprite('+ CONSTRUIR', '#f6c90e', '#2b2235', 56, 12, 0.045);
    plus.position.set(SLOT_W / 2, 1.4, -1.5);
    g.add(plus);
    g.userData.plus = plus;
  }
  g.userData.glowMats = [];
}

// ---------------- Lobby ----------------
function buildLobby(parent) {
  const g = new THREE.Group();
  const W = SLOT_W * 2;
  const wallMat = texMat(Tex.wallpaper(0xe7d3a8, 0xd8bf88), 6, 1.2);
  const floorMat = texMat(Tex.tiles(0xf2ead8, 0xb8a27a), 6, 4);
  box(g, 0, -0.02, -DEPTH, W, 0.04, DEPTH + SLAB_FRONT, floorMat, false);
  box(g, 0, 0, -DEPTH - 0.15, W, FLOOR_H - 0.3, 0.15, wallMat, false);
  box(g, -0.1, 0, -DEPTH, 0.1, FLOOR_H - 0.3, DEPTH, wallMat, false);
  // balcão da recepção
  box(g, 3.0, 0, -2.9, 3.0, 1.05, 0.7, 0x7a4a26);
  box(g, 2.95, 1.05, -2.95, 3.1, 0.1, 0.8, 0xe8dcc8);
  box(g, 3.2, 0.2, -2.18, 2.6, 0.6, 0.02, 0xa8743f);
  // computador e campainha
  box(g, 5.0, 1.15, -2.9, 0.55, 0.4, 0.08, 0x2a2a2f);
  box(g, 5.05, 1.2, -2.83, 0.45, 0.3, 0.02, new THREE.MeshLambertMaterial({ color: 0x6fd3ff, emissive: 0x1a4a5a }));
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), lam(0xf1c232, { flatShading: true }));
  bell.position.set(3.6, 1.15, -2.5); g.add(bell);
  // quadro de chaves
  box(g, 3.6, 1.5, -DEPTH, 1.8, 0.9, 0.06, 0x5a3a22);
  for (let i = 0; i < 8; i++) box(g, 3.75 + (i % 4) * 0.42, 1.6 + Math.floor(i / 4) * 0.4, -DEPTH + 0.05, 0.08, 0.2, 0.04, 0xf1c232);
  // placa HOTEL
  const sign = labelSprite('RECEPÇÃO', '#7a4a26', '#ffe680', 48, 12, 0.04);
  sign.position.set(4.5, 2.5, -DEPTH + 0.02); g.add(sign);
  // recepcionista (você!)
  const me = createPerson({ shirt: 0x8b1e3f, pants: 0x222222, hair: 0x2c1b10 });
  me.position.set(4.5, 0, -3.5);
  g.add(me);
  // tapete de entrada
  box(g, 0.5, 0.01, -0.2, 2.2, 0.02, 1.6, 0x8b1e3f, false);

  // decoração (upgrade)
  const decor1 = new THREE.Group();
  for (const x of [0.4, 7.9]) {
    box(decor1, x, 0, -3.7, 0.5, 0.45, 0.5, 0xb86b3c);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), lam(0x4f9a3a, { flatShading: true }));
    leaf.position.set(x + 0.25, 0.95, -3.45); leaf.castShadow = true; decor1.add(leaf);
  }
  box(decor1, 6.8, 0.01, -1.8, 1.8, 0.02, 1.4, 0xa33a4a, false);
  const decor2 = new THREE.Group();
  box(decor2, 6.9, 0, -3.6, 1.7, 0.4, 0.7, 0x3d5a80);
  box(decor2, 6.9, 0.4, -3.75, 1.7, 0.5, 0.2, 0x3d5a80);
  box(decor2, 0.3, 0, -2.6, 0.7, 0.4, 1.5, 0x3d5a80);
  box(decor2, 0.15, 0.4, -2.6, 0.2, 0.5, 1.5, 0x3d5a80);
  const lustre = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), new THREE.MeshLambertMaterial({ color: 0xfff1b8, emissive: 0x665522, flatShading: true }));
  lustre.position.set(4.5, FLOOR_H - 0.8, -1.6); decor2.add(lustre);
  box(decor2, 4.47, FLOOR_H - 0.6, -1.63, 0.06, 0.4, 0.06, 0x888888);
  decor1.visible = false; decor2.visible = false;
  g.add(decor1, decor2);

  g.userData.decor = [decor1, decor2];
  g.userData.glowMats = [wallMat];
  g.userData.receptionist = me;
  parent.add(g);
  return g;
}

// ---------------- Elevador ----------------
function buildElevator(parent, floors) {
  const g = new THREE.Group();
  const H = floors * FLOOR_H;
  box(g, ELEV_X0, 0, -DEPTH - 0.15, ELEV_W, H - 0.3, 0.15, 0x4a4a58, false);
  box(g, ELEV_X0 - 0.05, 0, -DEPTH, 0.15, H - 0.3, DEPTH, 0x6b6b7a, false);
  box(g, ELEV_X0 + ELEV_W - 0.1, 0, -DEPTH, 0.15, H - 0.3, DEPTH, 0x6b6b7a, false);
  // trilhos
  box(g, ELEV_X0 + 0.25, 0, -2.6, 0.08, H - 0.3, 0.08, 0xa0a0b0);
  box(g, ELEV_X0 + ELEV_W - 0.33, 0, -2.6, 0.08, H - 0.3, 0.08, 0xa0a0b0);
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fd8f0, transparent: true, opacity: 0.18, depthWrite: false });
  for (let f = 0; f < floors; f++) {
    const y = f * FLOOR_H;
    box(g, ELEV_X0, y, -0.15, 0.2, FLOOR_H - 0.3, 0.15, 0xc0c0cc);
    box(g, ELEV_X0 + ELEV_W - 0.2, y, -0.15, 0.2, FLOOR_H - 0.3, 0.15, 0xc0c0cc);
    box(g, ELEV_X0, y + FLOOR_H - 0.6, -0.15, ELEV_W, 0.3, 0.15, 0xc0c0cc);
    const ind = new THREE.Mesh(bgeo(0.3, 0.15, 0.02), new THREE.MeshBasicMaterial({ color: 0xff6040 }));
    ind.position.set(ELEV_X0 + ELEV_W / 2, y + FLOOR_H - 0.45, 0.01);
    g.add(ind);
    const gl = new THREE.Mesh(bgeo(ELEV_W - 0.4, FLOOR_H - 0.9, 0.04), glass);
    gl.position.set(ELEV_X0 + ELEV_W / 2, y + (FLOOR_H - 0.9) / 2 + 0.3, -0.05);
    gl.renderOrder = 2;
    g.add(gl);
  }
  parent.add(g);
  return g;
}

// ---------------- Arredores ----------------
function tree(parent, x, z, s = 1) {
  const t = new THREE.Group();
  box(t, -0.15, 0, -0.15, 0.3, 1.2, 0.3, 0x6b4423);
  const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), lam(0x4f9a3a, { flatShading: true }));
  c1.position.y = 1.7; c1.castShadow = true;
  const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), lam(0x6abe30, { flatShading: true }));
  c2.position.set(0.2, 2.4, 0.1); c2.castShadow = true;
  t.add(c1, c2);
  t.position.set(x, 0, z);
  t.scale.setScalar(s);
  parent.add(t);
}

function lampPost(parent, x, z, list) {
  const g = new THREE.Group();
  box(g, -0.06, 0, -0.06, 0.12, 2.6, 0.12, 0x2b2b33);
  box(g, -0.06, 2.5, -0.06, 0.5, 0.08, 0.12, 0x2b2b33);
  const m = new THREE.MeshLambertMaterial({ color: 0xfff1b8, emissive: 0x000000 });
  box(g, 0.25, 2.3, -0.12, 0.25, 0.2, 0.24, m);
  g.position.set(x, 0, z);
  parent.add(g);
  list.push(m);
}

function car(parent, x, z, color) {
  const g = new THREE.Group();
  box(g, -1.0, 0.2, -0.5, 2.0, 0.5, 1.0, color);
  box(g, -0.55, 0.7, -0.45, 1.1, 0.4, 0.9, color);
  box(g, -0.5, 0.75, -0.46, 1.0, 0.3, 0.92, new THREE.MeshLambertMaterial({ color: 0x9fd8f0, emissive: 0x112233 }));
  for (const [wx, wz] of [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.42], [0.6, 0.42]]) {
    box(g, wx - 0.2, 0, wz, 0.4, 0.4, 0.08, 0x1a1a1a);
  }
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

export function buildEnvironment(scene) {
  const g = new THREE.Group();
  const grassT = Tex.grass().clone(); grassT.needsUpdate = true; grassT.repeat.set(60, 40);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(240, 160), new THREE.MeshLambertMaterial({ map: grassT }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(BUILDING_W / 2, -0.32, 56); grass.receiveShadow = true;
  g.add(grass);
  const sw = Tex.sidewalk().clone(); sw.needsUpdate = true; sw.repeat.set(60, 2);
  box(g, -80, -0.32, SLAB_FRONT, 200, 0.3, 3.5, new THREE.MeshLambertMaterial({ map: sw }), false);
  const as = Tex.asphalt().clone(); as.needsUpdate = true; as.repeat.set(60, 3);
  box(g, -80, -0.4, SLAB_FRONT + 3.5, 200, 0.3, 6, new THREE.MeshLambertMaterial({ map: as }), false);
  box(g, -80, -0.32, SLAB_FRONT + 9.5, 200, 0.3, 2.2, new THREE.MeshLambertMaterial({ map: sw }), false);
  for (let x = -78; x < 120; x += 3) box(g, x, -0.09, SLAB_FRONT + 6.4, 1.5, 0.02, 0.2, 0xf4f4f4, false);
  // calçada até o fundo dos lados
  for (const [x, z, s] of [[-4, -6, 1.2], [-8, -2, 1], [-14, -5, 1.4], [-6, -11, 1.1], [BUILDING_W + 4, -5, 1.3], [BUILDING_W + 9, -2, 1], [BUILDING_W + 14, -7, 1.5], [BUILDING_W / 2, -10, 1.6], [8, -9, 1.2], [22, -11, 1.4]]) tree(g, x, z, s);
  const lamps = [];
  for (let x = -16; x < BUILDING_W + 18; x += 9) lampPost(g, x, SLAB_FRONT + 10, lamps);
  const cars = [car(g, -30, SLAB_FRONT + 5, 0xe8433a), car(g, 40, SLAB_FRONT + 7.6, 0x3d85c6)];
  cars[1].rotation.y = Math.PI;
  scene.add(g);
  return { group: g, lamps, cars };
}

// ---------------- Classe principal ----------------
export class HotelView {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.structure = null;
    this.slotGroups = new Map(); // "f_i" -> Group
    this.slotKeys = new Map();
    this.hitboxes = [];
    this.floors = 0;
    this.lobby = buildLobby(this.root);
    this.hoverBox = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(SLOT_W, FLOOR_H - 0.3, DEPTH + SLAB_FRONT)),
      new THREE.LineBasicMaterial({ color: 0xffe680 })
    );
    this.hoverBox.visible = false;
    this.hoverBox.renderOrder = 5;
    scene.add(this.hoverBox);
    this.neonMats = [];
  }

  setFloors(n) {
    if (n === this.floors) return;
    this.floors = n;
    if (this.structure) {
      this.root.remove(this.structure);
    }
    const s = new THREE.Group();
    const W = BUILDING_W;
    const brick = texMat(Tex.brick(), 20, n * 1.6);
    const brickSide = texMat(Tex.brick(), DEPTH * 0.6, n * 1.6);
    const slabMat = lam(0xe8dcc8);
    for (let f = 0; f < n; f++) {
      const y = f * FLOOR_H;
      // laje
      if (f > 0) { // laje com abertura no poço do elevador
        box(s, -0.3, y - 0.3, -DEPTH - 0.3, ELEV_X0 + 0.3, 0.3, DEPTH + 0.3, slabMat, false);
        box(s, ELEV_X0 + ELEV_W, y - 0.3, -DEPTH - 0.3, W + 0.3 - ELEV_X0 - ELEV_W, 0.3, DEPTH + 0.3, slabMat, false);
        box(s, -0.3, y - 0.3, 0, W + 0.6, 0.3, SLAB_FRONT, slabMat, false);
      }
      // piso do corredor (fora do lobby no térreo)
      const corrT = Tex.wood(0xa87b4f).clone(); corrT.needsUpdate = true; corrT.repeat.set(16, 1);
      const corrMat = new THREE.MeshLambertMaterial({ map: corrT });
      const cx0 = f === 0 ? SLOT_W * 2 : 0;
      box(s, cx0, -0.01 + y, 0, W - cx0, 0.03, SLAB_FRONT, corrMat, false);
      // grade de vidro nos andares superiores
      if (f > 0) {
        const rail = new THREE.MeshLambertMaterial({ color: 0x9fd8f0, transparent: true, opacity: 0.25, depthWrite: false });
        const r = box(s, 0, y, SLAB_FRONT - 0.08, W, 0.6, 0.05, rail, false);
        r.renderOrder = 3;
        box(s, 0, y + 0.6, SLAB_FRONT - 0.1, W, 0.06, 0.09, 0xc0c0cc, false);
      }
      // faixa da laje frontal
      box(s, -0.3, y + FLOOR_H - 0.3, SLAB_FRONT - 0.02, W + 0.6, 0.3, 0.06, 0xc8b89a, false);
    }
    // laje base (térreo)
    box(s, -0.5, -0.32, -DEPTH - 0.3, W + 1, 0.3, DEPTH + SLAB_FRONT + 0.3, 0xb8ab90, false);
    // paredes laterais externas
    box(s, -0.4, -0.3, -DEPTH - 0.3, 0.3, n * FLOOR_H + 0.3, DEPTH + 0.3, brickSide);
    box(s, W + 0.1, -0.3, -DEPTH - 0.3, 0.3, n * FLOOR_H + 0.3, DEPTH + 0.3, brickSide);
    // fundo (parede traseira externa)
    box(s, -0.4, -0.3, -DEPTH - 0.5, W + 0.8, n * FLOOR_H + 0.3, 0.2, brick);
    // pilares frontais
    for (const x of [-0.4, W + 0.1]) box(s, x, -0.3, -0.05, 0.3, n * FLOOR_H + 0.3, SLAB_FRONT + 0.05, brick);
    // telhado
    const top = n * FLOOR_H;
    const roofT = Tex.roof().clone(); roofT.needsUpdate = true; roofT.repeat.set(12, 3);
    box(s, -0.6, top - 0.3, -DEPTH - 0.6, W + 1.2, 0.4, DEPTH + SLAB_FRONT + 0.8, new THREE.MeshLambertMaterial({ map: roofT }));
    box(s, -0.6, top + 0.1, SLAB_FRONT, W + 1.2, 0.3, 0.2, 0xc8b89a);
    // caixa d'água e antena
    box(s, W - 4, top + 0.1, -3.5, 1.6, 1.4, 1.6, 0x8a8a92);
    box(s, W - 4.1, top + 1.5, -3.6, 1.8, 0.2, 1.8, 0x6a6a72);
    box(s, 2, top + 0.1, -3, 0.1, 2.2, 0.1, 0x444444);
    // letreiro neon HOTEL
    this.neonMats = [];
    const letters = 'HOTEL';
    const signX = W / 2 - letters.length * 0.9;
    box(s, signX - 0.4, top + 0.1, -1.6, letters.length * 1.8 + 0.4, 0.15, 0.4, 0x333333);
    for (let i = 0; i < letters.length; i++) {
      const m = new THREE.MeshLambertMaterial({ color: 0xff5a7a, emissive: 0x000000 });
      this.neonMats.push(m);
      const lbl = this._letter(letters[i], m);
      lbl.position.set(signX + i * 1.8 + 0.7, top + 1.1, -1.4);
      s.add(lbl);
      box(s, signX + i * 1.8 + 0.6, top + 0.1, -1.5, 0.1, 0.3, 0.1, 0x555555);
    }
    // toldo da entrada
    box(s, 0.2, FLOOR_H - 0.6, SLAB_FRONT, 2.6, 0.12, 1.4, 0x8b1e3f);
    box(s, 0.25, 0, SLAB_FRONT + 1.25, 0.08, FLOOR_H - 0.6, 0.08, 0xd4af37);
    box(s, 2.67, 0, SLAB_FRONT + 1.25, 0.08, FLOOR_H - 0.6, 0.08, 0xd4af37);

    this.structure = s;
    this.root.add(s);
    this.elevator = buildElevator(s, n);
  }

  // Letra pixelada 3x5 feita de cubinhos
  _letter(ch, m) {
    const F = {
      H: ['1.1', '1.1', '111', '1.1', '1.1'],
      O: ['111', '1.1', '1.1', '1.1', '111'],
      T: ['111', '.1.', '.1.', '.1.', '.1.'],
      E: ['111', '1..', '11.', '1..', '111'],
      L: ['1..', '1..', '1..', '1..', '111'],
    }[ch];
    const g = new THREE.Group();
    const s = 0.32;
    F.forEach((row, y) => [...row].forEach((c, x) => {
      if (c !== '1') return;
      const b = new THREE.Mesh(bgeo(s, s, s * 0.8), m);
      b.position.set((x - 1) * s, (4 - y) * s - 0.6, 0);
      g.add(b);
    }));
    return g;
  }

  slotKey(f, i) { return `${f}_${i}`; }

  // Recria o grupo visual do espaço se o tipo/nível mudou
  syncSlot(f, i, slot, buildable) {
    const key = this.slotKey(f, i);
    const vkey = `${slot.type}_${slot.tier || 0}_${buildable}`;
    if (this.slotKeys.get(key) === vkey) return this.slotGroups.get(key);
    const old = this.slotGroups.get(key);
    if (old) {
      this.root.remove(old);
      this.hitboxes = this.hitboxes.filter((h) => h.userData.key !== key);
    }
    const g = new THREE.Group();
    g.position.set(slotX0(i), f * FLOOR_H, 0);
    if (slot.type === 'room') buildRoom(g, slot, (f + 1) * 100 + i + 1);
    else if (slot.type === 'snack') buildSnack(g);
    else if (slot.type === 'gym') buildGym(g);
    else if (slot.type === 'pool') buildPool(g);
    else if (slot.type === 'empty') buildEmpty(g, buildable);
    // hitbox de clique
    const hb = new THREE.Mesh(bgeo(SLOT_W, FLOOR_H - 0.3, DEPTH + SLAB_FRONT), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    hb.position.set(SLOT_W / 2, (FLOOR_H - 0.3) / 2, (SLAB_FRONT - DEPTH) / 2);
    hb.userData = { kind: 'slot', f, i, key };
    g.add(hb);
    this.hitboxes.push(hb);
    // indicador de progresso de limpeza
    const prog = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.15), new THREE.MeshBasicMaterial({ color: 0x6abe30, depthTest: false }));
    const progBg = new THREE.Mesh(new THREE.PlaneGeometry(2.04, 0.25), new THREE.MeshBasicMaterial({ color: 0x1a1420, depthTest: false }));
    progBg.position.set(SLOT_W / 2, FLOOR_H - 0.9, 0.3);
    prog.position.set(SLOT_W / 2, FLOOR_H - 0.9, 0.31);
    progBg.renderOrder = 11; prog.renderOrder = 12;
    progBg.visible = prog.visible = false;
    g.add(progBg, prog);
    g.userData.prog = prog; g.userData.progBg = progBg;
    this.root.add(g);
    this.slotGroups.set(key, g);
    this.slotKeys.set(key, vkey);
    return g;
  }

  removeSlotsAbove(floors) {
    for (const [key, g] of this.slotGroups) {
      const f = +key.split('_')[0];
      if (f >= floors) {
        this.root.remove(g);
        this.slotGroups.delete(key);
        this.slotKeys.delete(key);
        this.hitboxes = this.hitboxes.filter((h) => h.userData.key !== key);
      }
    }
  }

  setProgress(f, i, p) {
    const g = this.slotGroups.get(this.slotKey(f, i));
    if (!g) return;
    const show = p !== null && p !== undefined;
    g.userData.prog.visible = g.userData.progBg.visible = show;
    if (show) {
      g.userData.prog.scale.x = Math.max(0.01, p * 2);
      g.userData.prog.position.x = SLOT_W / 2 - 1 + p;
    }
  }

  setDirty(f, i, dirty) {
    const g = this.slotGroups.get(this.slotKey(f, i));
    if (!g || !g.userData.dirt) return;
    g.userData.dirt.visible = dirty;
    if (g.userData.blanket) g.userData.blanket.visible = !dirty;
  }

  // brilho noturno: liga lâmpadas e ilumina paredes
  setLight(f, i, on, night) {
    const g = this.slotGroups.get(this.slotKey(f, i));
    if (!g) return;
    const k = on ? night : 0;
    for (const m of g.userData.glowMats || []) {
      m.emissive.setRGB(0.35 * k, 0.26 * k, 0.12 * k);
    }
    for (const m of g.userData.lamps || []) m.emissive.setRGB(k * 0.9, k * 0.75, k * 0.3);
  }

  setLobbyLight(night) {
    for (const m of this.lobby.userData.glowMats) m.emissive.setRGB(0.32 * night, 0.24 * night, 0.1 * night);
    for (const m of this.neonMats) m.emissive.setRGB(0.25 + 0.9 * night, 0.1 + 0.25 * night, 0.15 + 0.35 * night);
  }

  setDecor(level) {
    this.lobby.userData.decor.forEach((d, idx) => { d.visible = level > idx; });
  }

  hover(f, i) {
    if (f === null) { this.hoverBox.visible = false; return; }
    this.hoverBox.visible = true;
    this.hoverBox.position.set(slotX0(i) + SLOT_W / 2, f * FLOOR_H + (FLOOR_H - 0.3) / 2, (SLAB_FRONT - DEPTH) / 2);
  }

  slotGroup(f, i) { return this.slotGroups.get(this.slotKey(f, i)); }

  // ponto de um espaço em coordenadas do mundo
  slotWorld(f, i, local) {
    return new THREE.Vector3(slotX0(i) + local.x, f * FLOOR_H + local.y, local.z);
  }
}

export { SLOTS_PER_FLOOR };
