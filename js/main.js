// Ponto de entrada: renderizador pixelado, câmera, luzes, entrada e loop.
import * as THREE from 'three';
import { FLOOR_H, BUILDING_W, DEPTH, SLOT_W, TIERS } from './config.js';
import { HotelView, buildEnvironment } from './building.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { unlockAudio, Sfx } from './audio.js';

const PIXEL = 3; // tamanho do "pixel" na tela

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

// ---------- Câmera ortográfica isométrica ----------
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -200, 400);
const cam = {
  target: new THREE.Vector3(BUILDING_W / 2, FLOOR_H * 0.8, -1),
  zoom: 1, yaw: 0.32, pitch: 0.22, viewH: 16,
  goalTarget: null,
};
function applyCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const h = cam.viewH / cam.zoom;
  camera.left = (-h * aspect) / 2; camera.right = (h * aspect) / 2;
  camera.top = h / 2; camera.bottom = -h / 2;
  camera.updateProjectionMatrix();
  const d = 80;
  camera.position.set(
    cam.target.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * d,
    cam.target.y + Math.sin(cam.pitch) * d,
    cam.target.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * d,
  );
  camera.lookAt(cam.target);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(Math.ceil(w / PIXEL), Math.ceil(h / PIXEL), false);
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  // ajusta o enquadramento para caber o prédio na largura em telas estreitas
  cam.viewH = Math.max(16, Math.min(34, (BUILDING_W + 6) / (w / h) * 0.95));
  applyCamera();
}

// ---------- Luzes ----------
const hemi = new THREE.HemisphereLight(0xdfefff, 0x6a5a40, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4dd, 1.6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 140;
sun.shadow.bias = -0.002;
scene.add(sun, sun.target);
const ambient = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambient);

// ---------- Mundo ----------
const env = buildEnvironment(scene);
const view = new HotelView(scene);
const ui = new UI();
const game = new Game(scene, view, {
  popup: (p, t, c) => ui.popup(p, t, c),
  toast: (m, k) => ui.toast(m, k),
  changed: () => ui.changed(),
  floorsChanged: () => frameBuilding(true),
});
ui.attach(game, camera);

function frameBuilding(smooth) {
  const floors = game.state.floors;
  const t = new THREE.Vector3(BUILDING_W / 2, (floors * FLOOR_H) / 2 + 0.6, -1);
  const needH = floors * FLOOR_H + 8;
  if (smooth) { cam.goalTarget = t; cam.goalZoom = Math.min(cam.zoom, cam.viewH / needH, 1); }
  else { cam.target.copy(t); cam.zoom = Math.min(1, cam.viewH / needH); }
}

// ---------- Céu / dia e noite ----------
const SKY = [
  [0, 0x141a3a], [5, 0x1f2550], [6.5, 0xf2a37a], [8, 0x87c4e8], [16, 0x8ccbf0],
  [18, 0xf09a6a], [19.5, 0x5a3a7a], [21, 0x1b2048], [24, 0x141a3a],
];
const tmpA = new THREE.Color(), tmpB = new THREE.Color();
function skyColor(h) {
  for (let k = 0; k < SKY.length - 1; k++) {
    const [h0, c0] = SKY[k], [h1, c1] = SKY[k + 1];
    if (h >= h0 && h <= h1) return tmpA.set(c0).lerp(tmpB.set(c1), (h - h0) / (h1 - h0));
  }
  return tmpA.set(SKY[0][1]);
}
const stars = (() => {
  const g = new THREE.BufferGeometry();
  const pts = [];
  for (let i = 0; i < 300; i++) pts.push((Math.random() - 0.5) * 200, 20 + Math.random() * 60, -60 - Math.random() * 20);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0 });
  const p = new THREE.Points(g, m);
  scene.add(p);
  return p;
})();

function updateDayNight() {
  const h = game.hour;
  const night = game.nightFactor();
  const sky = skyColor(h);
  renderer.setClearColor(sky);
  document.body.style.background = `#${sky.getHexString()}`;
  // sol percorre um arco
  const a = ((h - 6) / 12) * Math.PI;
  const day = Math.max(0, Math.sin(a));
  sun.position.set(cam.target.x - Math.cos(a) * 40, 10 + day * 40, 30);
  sun.target.position.set(BUILDING_W / 2, 0, -2);
  sun.intensity = 0.25 + day * 1.5;
  sun.color.setHSL(0.1, 0.6, 0.6 + day * 0.35);
  hemi.intensity = 0.45 + day * 0.75;
  hemi.color.setHSL(0.6, 0.5, 0.55 + day * 0.35);
  ambient.intensity = 0.2 + (1 - night) * 0.1;
  ambient.color.setHex(night > 0.5 ? 0x8090ff : 0xffffff);
  stars.material.opacity = night;
  for (const m of env.lamps) m.emissive.setRGB(night, night * 0.85, night * 0.4);
}

// ---------- Entrada (clique, arrastar, zoom) ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointers = new Map();
let drag = null;
let pinch = null;

function pick(clientX, clientY) {
  ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const guestHits = game.guests.filter((g) => g.state === 'queue' || g.state === 'arriving').map((g) => g.hit);
  const gh = raycaster.intersectObjects(guestHits, false);
  if (gh.length) return gh[0].object.userData;
  const sh = raycaster.intersectObjects(view.hitboxes, false);
  if (sh.length) return sh[0].object.userData;
  return null;
}

function onClick(x, y) {
  unlockAudio();
  const hit = pick(x, y);
  if (!hit) { game.select(null); ui.hidePanel(); return; }
  if (hit.kind === 'guest') {
    game.select(game.selected === hit.guest ? null : hit.guest);
    return;
  }
  const { f, i } = hit;
  const sl = game.slot(f, i);
  if (!sl) return;
  if (sl.type === 'empty') { game.select(null); ui.openBuild(f, i); Sfx.click(); return; }
  if (sl.type === 'room') {
    if (sl.status === 'clean') {
      const g = game.selected || game.queue.find((q) => q.state === 'queue');
      if (g) { game.assign(g, f, i); ui.showSlot(f, i); return; }
    } else if (sl.status === 'dirty') {
      game.select(null);
      game.startManualClean(f, i);
    }
  }
  if (game.selected) game.select(null);
  ui.showSlot(f, i);
  Sfx.click();
}

function onHover(x, y) {
  const hit = pick(x, y);
  canvas.classList.toggle('pointer', !!hit);
  if (!hit) { view.hover(null); ui.hint(game.selected ? 'Escolha um quarto livre para o hóspede' : ''); return; }
  if (hit.kind === 'guest') {
    view.hover(null);
    const g = hit.guest;
    ui.hint(`${g.type.name} · quer ${TIERS[g.want].name} · ${g.nights} diária(s) — clique para selecionar`);
    return;
  }
  const sl = game.slot(hit.f, hit.i);
  view.hover(hit.f, hit.i);
  const color = view.hoverBox.material.color;
  if (sl.type === 'room') {
    const num = (hit.f + 1) * 100 + hit.i + 1;
    const st = { clean: 'Livre', occupied: 'Ocupado', dirty: 'Sujo', cleaning: 'Limpando' }[sl.status];
    let act = '';
    if (sl.status === 'clean') act = game.selected || game.queue.length ? ' — clique para alocar' : '';
    if (sl.status === 'dirty') act = ' — clique para limpar';
    ui.hint(`Quarto ${num} · ${TIERS[sl.tier].name} · ${st}${act}`);
    color.setHex(sl.status === 'clean' ? 0x9fe870 : sl.status === 'dirty' ? 0xff8a80 : 0xffe680);
  } else if (sl.type === 'empty') {
    ui.hint('Espaço vazio — clique para construir');
    color.setHex(0xffe680);
  } else {
    ui.hint({ snack: 'Lanchonete', gym: 'Academia', pool: 'Piscina' }[sl.type]);
    color.setHex(0x9fd8f0);
  }
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, target: cam.target.clone() };
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: cam.zoom };
    drag = null;
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    cam.zoom = THREE.MathUtils.clamp(pinch.zoom * (d / pinch.d), 0.4, 3);
    applyCamera();
    return;
  }
  if (drag) {
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; canvas.classList.add('grab'); cam.goalTarget = null; }
    if (drag.moved) {
      const worldPerPx = (cam.viewH / cam.zoom) / window.innerHeight;
      const right = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
      cam.target.copy(drag.target).addScaledVector(right, -dx * worldPerPx);
      cam.target.y = drag.target.y + dy * worldPerPx;
      clampTarget();
      applyCamera();
    }
    return;
  }
  if (e.pointerType === 'mouse') onHover(e.clientX, e.clientY);
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (drag && !drag.moved && e.type === 'pointerup') onClick(e.clientX, e.clientY);
  if (pointers.size === 0) { drag = null; canvas.classList.remove('grab'); }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  cam.zoom = THREE.MathUtils.clamp(cam.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.4, 3);
  cam.goalZoom = null;
  applyCamera();
}, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function clampTarget() {
  const floors = game.state.floors;
  cam.target.x = THREE.MathUtils.clamp(cam.target.x, -12, BUILDING_W + 12);
  cam.target.y = THREE.MathUtils.clamp(cam.target.y, 0, floors * FLOOR_H + 4);
}

const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  keys.add(e.key.toLowerCase());
  if (e.code === 'Space') { e.preventDefault(); ui.setSpeed(game.speed === 0 ? (ui.prevSpeed || 1) : (ui.prevSpeed = game.speed, 0)); }
  if (e.key === '1') ui.setSpeed(1);
  if (e.key === '2') ui.setSpeed(2);
  if (e.key === '3') ui.setSpeed(4);
  if (e.key.toLowerCase() === 'u') ui.openUpgrades();
  if (e.key === 'Escape') { if (ui.modalOpen) ui.closeModal(); else { game.select(null); ui.hidePanel(); } }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function updateKeys(dt) {
  let moved = false;
  const sp = 14 * dt / cam.zoom;
  const right = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
  if (keys.has('a') || keys.has('arrowleft')) { cam.target.addScaledVector(right, -sp); moved = true; }
  if (keys.has('d') || keys.has('arrowright')) { cam.target.addScaledVector(right, sp); moved = true; }
  if (keys.has('w') || keys.has('arrowup')) { cam.target.y += sp; moved = true; }
  if (keys.has('s') || keys.has('arrowdown')) { cam.target.y -= sp; moved = true; }
  if (keys.has('q')) { cam.yaw = Math.max(-0.75, cam.yaw - dt * 1.2); moved = true; }
  if (keys.has('e')) { cam.yaw = Math.min(0.75, cam.yaw + dt * 1.2); moved = true; }
  if (moved) { cam.goalTarget = null; clampTarget(); applyCamera(); }
}

// ---------- Loop ----------
let last = performance.now();
let saveAcc = 0;
let hudAcc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (intro.classList.contains('hidden')) game.update(dt);
  updateKeys(dt);
  if (cam.goalTarget) {
    cam.target.lerp(cam.goalTarget, 1 - Math.pow(0.02, dt));
    if (cam.goalZoom) cam.zoom += (cam.goalZoom - cam.zoom) * (1 - Math.pow(0.02, dt));
    if (cam.target.distanceTo(cam.goalTarget) < 0.02) cam.goalTarget = null;
    applyCamera();
  }
  // carros passando
  env.cars[0].position.x += dt * 6 * Math.max(0.5, game.speed);
  if (env.cars[0].position.x > BUILDING_W + 50) env.cars[0].position.x = -50;
  env.cars[1].position.x -= dt * 5 * Math.max(0.5, game.speed);
  if (env.cars[1].position.x < -50) env.cars[1].position.x = BUILDING_W + 50;

  updateDayNight();
  hudAcc += dt;
  if (hudAcc > 0.1) {
    hudAcc = 0;
    ui.updateHUD();
    ui.refreshModal();
    if (game.selected || (ui.panelTarget && game.slot(ui.panelTarget.f, ui.panelTarget.i)?.status === 'cleaning')) ui.changed();
  }
  saveAcc += dt;
  if (saveAcc > 10) { saveAcc = 0; game.save(); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => game.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });

// ---------- Introdução ----------
const intro = document.getElementById('intro');
if (game.state.tutorial && game.state.stats.guests === 0) intro.classList.remove('hidden');
document.getElementById('intro-start').onclick = () => {
  unlockAudio();
  Sfx.day();
  intro.classList.add('hidden');
};

resize();
frameBuilding(false);
applyCamera();
requestAnimationFrame(frame);

// para depuração no console
window.__hotel = { game, view, cam, applyCamera, ui };
export { DEPTH, SLOT_W };
