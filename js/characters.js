// Personagens em voxel (caixinhas) com contorno e balão de ícone.
import * as THREE from 'three';
import { drawIcon, iconSize } from './textures.js';

const boxGeoCache = new Map();
function boxGeo(w, h, d) {
  const k = `${w}_${h}_${d}`;
  if (!boxGeoCache.has(k)) boxGeoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return boxGeoCache.get(k);
}
const matCache = new Map();
function mat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(color);
}
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a1420, side: THREE.BackSide });

function part(w, h, d, color, outline = true) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(boxGeo(w, h, d), mat(color));
  m.castShadow = true;
  g.add(m);
  if (outline) {
    const o = new THREE.Mesh(boxGeo(w + 0.06, h + 0.06, d + 0.06), outlineMat);
    g.add(o);
  }
  return g;
}

const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
const HAIRS = [0x2c1b10, 0x5a3825, 0xd6b25e, 0x9a3b1b, 0x1a1a1a, 0xb0b0b0];
const PANTS = [0x2e3a59, 0x3b3b3b, 0x6b4f2a, 0x24486b, 0x55555f];

export function createPerson(opts = {}) {
  const r = opts.rand || Math.random;
  const skin = opts.skin ?? SKINS[Math.floor(r() * SKINS.length)];
  const hair = opts.hair ?? HAIRS[Math.floor(r() * HAIRS.length)];
  const shirt = opts.shirt ?? 0x888888;
  const pants = opts.pants ?? PANTS[Math.floor(r() * PANTS.length)];
  const s = opts.scale ?? 1;

  const root = new THREE.Group();
  const body = new THREE.Group(); // tudo que balança
  root.add(body);

  const legL = new THREE.Group(); legL.position.set(-0.13, 0.5, 0);
  const legR = new THREE.Group(); legR.position.set(0.13, 0.5, 0);
  const lL = part(0.22, 0.5, 0.24, pants); lL.position.y = -0.25; legL.add(lL);
  const lR = part(0.22, 0.5, 0.24, pants); lR.position.y = -0.25; legR.add(lR);
  body.add(legL, legR);

  const torso = part(0.52, 0.55, 0.32, shirt); torso.position.y = 0.78; body.add(torso);

  const armL = new THREE.Group(); armL.position.set(-0.35, 1.0, 0);
  const armR = new THREE.Group(); armR.position.set(0.35, 1.0, 0);
  const aL = part(0.16, 0.48, 0.18, shirt); aL.position.y = -0.22; armL.add(aL);
  const aR = part(0.16, 0.48, 0.18, shirt); aR.position.y = -0.22; armR.add(aR);
  const hL = part(0.14, 0.12, 0.14, skin, false); hL.position.y = -0.5; armL.add(hL);
  const hR = part(0.14, 0.12, 0.14, skin, false); hR.position.y = -0.5; armR.add(hR);
  body.add(armL, armR);

  const head = new THREE.Group(); head.position.y = 1.28;
  const hd = part(0.44, 0.42, 0.4, skin); head.add(hd);
  const hairTop = part(0.48, 0.14, 0.44, hair, false); hairTop.position.y = 0.22; head.add(hairTop);
  const hairBack = part(0.48, 0.3, 0.1, hair, false); hairBack.position.set(0, 0.06, -0.2); head.add(hairBack);
  const eyeGeo = boxGeo(0.07, 0.09, 0.02);
  const eyeL = new THREE.Mesh(eyeGeo, mat(0x1a1420)); eyeL.position.set(-0.1, 0.02, 0.205);
  const eyeR = new THREE.Mesh(eyeGeo, mat(0x1a1420)); eyeR.position.set(0.1, 0.02, 0.205);
  head.add(eyeL, eyeR);
  if (opts.hat) {
    const hat = part(0.5, 0.12, 0.46, opts.hat, false); hat.position.y = 0.3; head.add(hat);
  }
  if (opts.suitcase) {
    const sc = part(0.32, 0.26, 0.12, opts.suitcase); sc.position.set(0.02, -0.62, 0); armR.add(sc);
    root.userData.suitcase = sc;
  }
  body.add(head);

  root.scale.setScalar(s);
  root.userData.rig = { body, legL, legR, armL, armR, head };
  root.userData.walkT = Math.random() * 10;
  return root;
}

// Animação de caminhada/parado
export function animatePerson(p, dt, moving, speed = 1) {
  const rig = p.userData.rig;
  if (moving) {
    p.userData.walkT += dt * 10 * speed;
    const a = Math.sin(p.userData.walkT) * 0.7;
    rig.legL.rotation.x = a; rig.legR.rotation.x = -a;
    rig.armL.rotation.x = -a * 0.8; rig.armR.rotation.x = a * 0.8;
    rig.body.position.y = Math.abs(Math.cos(p.userData.walkT)) * 0.06;
  } else {
    p.userData.walkT += dt * 2;
    rig.legL.rotation.x *= 0.8; rig.legR.rotation.x *= 0.8;
    rig.armL.rotation.x *= 0.8; rig.armR.rotation.x *= 0.8;
    rig.body.position.y = Math.sin(p.userData.walkT) * 0.015;
  }
}

// --------- Balão com ícone sobre a cabeça ---------
export class Bubble {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 24; this.canvas.height = 24;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.magFilter = THREE.NearestFilter;
    this.tex.minFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false;
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, depthTest: false, transparent: true }));
    this.sprite.scale.set(0.85, 0.85, 1);
    this.sprite.renderOrder = 10;
    this.key = '';
  }
  // icon: nome do ícone; fill: 0..1 (paciência); color: borda
  set(icon, fill = 1, tint = null, border = '#1a1420', extra = null) {
    const fq = Math.round(fill * 16);
    const key = `${icon}|${fq}|${tint}|${border}|${extra}`;
    if (key === this.key) return;
    this.key = key;
    const g = this.canvas.getContext('2d');
    g.clearRect(0, 0, 24, 24);
    // corpo do balão
    g.fillStyle = border;
    g.fillRect(2, 1, 20, 18); g.fillRect(1, 2, 22, 16);
    g.fillRect(10, 19, 4, 2); g.fillRect(11, 21, 2, 1);
    g.fillStyle = '#ffffff';
    g.fillRect(3, 2, 18, 16); g.fillRect(2, 3, 20, 14);
    g.fillRect(11, 18, 2, 2);
    // barra de paciência
    if (fill < 1) {
      const col = fill > 0.55 ? '#6abe30' : fill > 0.28 ? '#f6c90e' : '#e8433a';
      g.fillStyle = '#d0d0d0'; g.fillRect(4, 15, 16, 2);
      g.fillStyle = col; g.fillRect(4, 15, fq, 2);
    }
    const [w, h] = iconSize(icon);
    drawIcon(g, icon, Math.floor(12 - w / 2), Math.floor((fill < 1 ? 8 : 10) - h / 2), 1, tint);
    if (extra) { // bolinhas = número de diárias
      g.fillStyle = '#1a1420';
      for (let i = 0; i < extra; i++) g.fillRect(5 + i * 3, 3, 2, 2);
    }
    this.tex.needsUpdate = true;
  }
}
