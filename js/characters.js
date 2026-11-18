// Personagens cartoon (cabeça grande, corpo em cápsula) e balões de ícone.
import * as THREE from 'three';
import { drawIcon } from './textures.js';

const geo = {
  body: new THREE.CapsuleGeometry(0.27, 0.32, 6, 14),
  leg: new THREE.CapsuleGeometry(0.1, 0.18, 4, 8),
  arm: new THREE.CapsuleGeometry(0.075, 0.3, 4, 8),
  hand: new THREE.SphereGeometry(0.08, 10, 8),
  head: new THREE.SphereGeometry(0.3, 20, 16),
  hair: new THREE.SphereGeometry(0.315, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
  bun: new THREE.SphereGeometry(0.13, 12, 10),
  eye: new THREE.SphereGeometry(0.04, 8, 6),
  nose: new THREE.SphereGeometry(0.045, 8, 6),
  shoe: new THREE.SphereGeometry(0.11, 10, 8),
  brim: new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20),
  crown: new THREE.CylinderGeometry(0.26, 0.3, 0.22, 20),
  chefHat: new THREE.CylinderGeometry(0.24, 0.2, 0.34, 16),
  cap: new THREE.SphereGeometry(0.32, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
  visor: new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16, 1, false, 0, Math.PI),
  case: new THREE.BoxGeometry(0.42, 0.5, 0.2),
  caseHandle: new THREE.BoxGeometry(0.04, 0.3, 0.04),
  wheel: new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10),
  shadow: new THREE.CircleGeometry(0.36, 20),
};
const matCache = new Map();
function mat(color, rough = 0.75) {
  const k = color + '_' + rough;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }));
  return matCache.get(k);
}
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });

function mesh(g, m, shadow = true) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = shadow;
  return o;
}

const SKINS = [0xf6d2b0, 0xe8b48c, 0xc98d62, 0x8d5a3b, 0xffe0c4];
const HAIRS = [0x3a2416, 0x6b4226, 0xe0b65a, 0xb4482a, 0x1d1d22, 0xc9c9cf, 0x2f2a52];
const PANTS = [0x2f3d5c, 0x3b3b44, 0x7a5a36, 0x295c8a, 0x5a5a66, 0x6b3b5a];

export function createPerson(opts = {}) {
  const r = Math.random;
  const skin = opts.skin ?? SKINS[Math.floor(r() * SKINS.length)];
  const hair = opts.hair ?? HAIRS[Math.floor(r() * HAIRS.length)];
  const shirt = opts.shirt ?? 0x888888;
  const pants = opts.pants ?? PANTS[Math.floor(r() * PANTS.length)];

  const root = new THREE.Group();
  const sh = new THREE.Mesh(geo.shadow, shadowMat);
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02;
  root.add(sh);
  const body = new THREE.Group();
  root.add(body);

  const legL = new THREE.Group(); legL.position.set(-0.12, 0.38, 0);
  const legR = new THREE.Group(); legR.position.set(0.12, 0.38, 0);
  for (const leg of [legL, legR]) {
    const l = mesh(geo.leg, mat(pants)); l.position.y = -0.17; leg.add(l);
    const s = mesh(geo.shoe, mat(0x2a2224)); s.scale.set(1, 0.6, 1.3); s.position.set(0, -0.34, 0.04); leg.add(s);
    body.add(leg);
  }
  const torso = mesh(geo.body, mat(shirt)); torso.position.y = 0.72; torso.scale.set(1, 1, 0.82); body.add(torso);

  const armL = new THREE.Group(); armL.position.set(-0.31, 0.92, 0);
  const armR = new THREE.Group(); armR.position.set(0.31, 0.92, 0);
  for (const [arm, side] of [[armL, -1], [armR, 1]]) {
    const a = mesh(geo.arm, mat(shirt)); a.position.y = -0.18; arm.add(a);
    const h = mesh(geo.hand, mat(skin)); h.position.y = -0.4; arm.add(h);
    arm.rotation.z = side * 0.12;
    body.add(arm);
  }

  const head = new THREE.Group(); head.position.y = 1.32;
  head.add(mesh(geo.head, mat(skin)));
  const hairStyle = opts.hairStyle ?? Math.floor(r() * 3);
  const hm = mesh(geo.hair, mat(hair, 0.9)); hm.rotation.x = -0.35; hm.position.z = -0.02; head.add(hm);
  if (hairStyle === 1) { const b = mesh(geo.bun, mat(hair, 0.9)); b.position.set(0, 0.22, -0.2); head.add(b); }
  if (hairStyle === 2) { const b = mesh(geo.hair, mat(hair, 0.9)); b.scale.set(1.02, 1.25, 1.05); b.rotation.x = 0.9; b.position.set(0, -0.05, -0.04); head.add(b); }
  const eyes = [];
  for (const x of [-0.11, 0.11]) {
    const e = mesh(geo.eye, mat(0x1d1a22, 0.3), false); e.position.set(x, 0.02, 0.27); e.scale.set(1, 1.3, 0.6); head.add(e);
    eyes.push(e);
  }
  const n = mesh(geo.nose, mat(skin), false); n.position.set(0, -0.06, 0.29); head.add(n);
  if (opts.hat === 'chef') {
    const c = mesh(geo.chefHat, mat(0xffffff)); c.position.y = 0.34; head.add(c);
  } else if (opts.hat === 'cap') {
    const c = mesh(geo.cap, mat(opts.hatColor ?? 0xd9473b)); c.position.y = 0.04; head.add(c);
    const v = mesh(geo.visor, mat(opts.hatColor ?? 0xd9473b)); v.position.set(0, 0.12, 0.22); v.rotation.y = -Math.PI / 2; head.add(v);
  } else if (opts.hat === 'beanie') { // gorro de lã com pompom
    const c = mesh(geo.cap, mat(opts.hatColor ?? 0xd9473b, 0.95)); c.scale.set(1.02, 1.25, 1.02); c.position.y = 0.02; head.add(c);
    const pom = mesh(geo.bun, mat(0xffffff, 0.95)); pom.scale.setScalar(0.75); pom.position.y = 0.4; head.add(pom);
  } else if (opts.hat === 'beret') { // boina
    const c = mesh(geo.brim, mat(opts.hatColor ?? 0x2a2a30, 0.9)); c.scale.set(0.8, 2.2, 0.8); c.position.set(0.04, 0.28, -0.02); c.rotation.z = -0.2; head.add(c);
  } else if (opts.hat === 'shades') { // óculos escuros
    const g = mesh(new THREE.BoxGeometry(0.42, 0.1, 0.04), mat(0x1d1a22, 0.2), false); g.position.set(0, 0.03, 0.29); head.add(g);
  } else if (opts.hat && opts.hat !== 'none') {
    const b = mesh(geo.brim, mat(opts.hatColor ?? 0xf3e2a0)); b.position.y = 0.2; head.add(b);
    const c = mesh(geo.crown, mat(opts.hatColor ?? 0xf3e2a0)); c.position.y = 0.32; head.add(c);
    const band = mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.05, 20), mat(0xd9473b)); band.position.y = 0.25; head.add(band);
  }
  body.add(head);

  if (opts.suitcase) {
    const sc = new THREE.Group();
    const box = mesh(geo.case, mat(opts.suitcase, 0.5)); box.position.y = 0.3; sc.add(box);
    const hd = mesh(geo.caseHandle, mat(0x333333)); hd.position.set(0, 0.68, 0); sc.add(hd);
    for (const x of [-0.14, 0.14]) { const w = mesh(geo.wheel, mat(0x222222)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.05, 0); sc.add(w); }
    sc.position.set(0.48, 0, -0.1);
    root.add(sc);
    root.userData.suitcase = sc;
  }
  if (opts.apron) {
    const ap = mesh(new THREE.BoxGeometry(0.4, 0.42, 0.04), mat(0xffffff)); ap.position.set(0, 0.62, 0.23); body.add(ap);
  }

  root.userData.rig = { body, legL, legR, armL, armR, head, shadow: sh, eyes };
  root.userData.blink = 2 + Math.random() * 4;
  root.userData.look = { skin, hair, shirt, hairStyle, hat: opts.hat, hatColor: opts.hatColor };
  root.userData.walkT = Math.random() * 10;
  return root;
}

export function animatePerson(p, dt, moving, speed = 1) {
  const rig = p.userData.rig;
  // pisca de vez em quando
  p.userData.blink -= dt;
  const closed = p.userData.blink < 0.12;
  if (p.userData.blink < 0) p.userData.blink = 2.5 + Math.random() * 4;
  for (const e of rig.eyes || []) e.scale.y = closed ? 0.2 : 1.3;
  if (moving) {
    p.userData.walkT += dt * 11 * speed;
    const a = Math.sin(p.userData.walkT) * 0.6;
    rig.legL.rotation.x = a; rig.legR.rotation.x = -a;
    rig.armL.rotation.x = -a * 0.9; rig.armR.rotation.x = a * 0.9;
    rig.body.position.y = Math.abs(Math.cos(p.userData.walkT)) * 0.07;
    rig.body.rotation.z = Math.sin(p.userData.walkT) * 0.05;
  } else {
    p.userData.walkT += dt * 2.2;
    rig.legL.rotation.x *= 0.8; rig.legR.rotation.x *= 0.8;
    rig.armL.rotation.x *= 0.8; rig.armR.rotation.x *= 0.8;
    rig.body.rotation.z *= 0.8;
    rig.body.position.y = 0;
    rig.head.rotation.y = Math.sin(p.userData.walkT * 0.5) * 0.15;
    const s = 1 + Math.sin(p.userData.walkT) * 0.012;
    rig.body.scale.set(1, s, 1);
  }
}

// --------- Balão com ícone sobre a cabeça ---------
const BS = 128;
export class Bubble {
  constructor(scale = 1) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = BS; this.canvas.height = BS;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, depthTest: false, transparent: true }));
    this.sprite.scale.set(0.95 * scale, 0.95 * scale, 1);
    this.sprite.renderOrder = 10;
    this.key = '';
  }
  // icon: nome; fill: paciência 0..1; tint: cor do ícone; border: cor da borda; dots: diárias
  set(icon, fill = 1, tint = null, border = '#ffffff', dots = 0, ringColor = null, badge = null) {
    const fq = Math.round(fill * 30);
    const key = `${icon}|${fq}|${tint}|${border}|${dots}|${ringColor}|${badge}`;
    if (key === this.key) return;
    this.key = key;
    const g = this.canvas.getContext('2d');
    g.clearRect(0, 0, BS, BS);
    const cx = 64, cy = 56, R = 46;
    // sombra
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.beginPath(); g.arc(cx + 2, cy + 4, R, 0, Math.PI * 2); g.fill();
    // borda + ponta
    g.fillStyle = border;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx - 12, cy + R - 6); g.lineTo(cx, cy + R + 16); g.lineTo(cx + 12, cy + R - 6); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(cx, cy, R - 6, 0, Math.PI * 2); g.fill();
    // anel de paciência
    if (fill < 1) {
      const col = ringColor || (fill > 0.55 ? '#52c45a' : fill > 0.28 ? '#f5b82e' : '#ef4b5c');
      g.lineWidth = 8; g.lineCap = 'round';
      g.strokeStyle = '#e6e2dc';
      g.beginPath(); g.arc(cx, cy, R - 4, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = col;
      g.beginPath(); g.arc(cx, cy, R - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, fill)); g.stroke();
    }
    drawIcon(g, icon, cx, cy - (dots ? 5 : 0), 29, tint);
    if (dots) {
      g.fillStyle = '#3a3340';
      const w = (dots - 1) * 13;
      for (let k = 0; k < dots; k++) { g.beginPath(); g.arc(cx - w / 2 + k * 13, cy + 26, 4.5, 0, Math.PI * 2); g.fill(); }
    }
    if (badge) { // selo de exigência (T = térreo, ↑ = andar alto, ? = inspetor, ★ = celebridade)
      g.fillStyle = badge === '?' || badge === '★' ? '#d4a93a' : '#8a4fd6';
      g.beginPath(); g.arc(cx + 34, cy - 30, 17, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.stroke();
      g.fillStyle = '#ffffff';
      g.font = 'bold 22px Fredoka, Nunito, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(badge, cx + 34, cy - 28);
    }
    this.tex.needsUpdate = true;
  }
}
