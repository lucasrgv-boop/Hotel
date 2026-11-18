// Ponto de entrada: renderizador, câmera de cima (casa de bonecas), luzes, entrada e loop.
import * as THREE from 'three';
import { FLOOR_H, BUILDING_W, BACK_Z, FRONT_Z, TIERS } from './config.js';
import { HotelView, buildEnvironment } from './building.js';
import { setAnisotropy } from './textures.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { unlockAudio, Sfx } from './audio.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfe3f5, 70, 150);

// ---------- Câmera em perspectiva, vista de cima ----------
const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);
const cam = {
  target: new THREE.Vector3(BUILDING_W / 2, 0, 1.5),
  dist: 30, yaw: 0.16, pitch: 0.98,
  goal: null, goalDist: null,
};
function applyCamera() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  const d = cam.dist;
  camera.position.set(
    cam.target.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * d,
    cam.target.y + Math.sin(cam.pitch) * d,
    cam.target.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * d,
  );
  camera.lookAt(cam.target);
}
function fitDist() {
  const aspect = window.innerWidth / window.innerHeight;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const byW = (BUILDING_W + 3) / (2 * t * aspect);
  const byH = (FRONT_Z - BACK_Z + 6) / (2 * t) * 1.15;
  return THREE.MathUtils.clamp(Math.max(byW, byH), 14, 62);
}
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  applyCamera();
}

// ---------- Luzes ----------
const hemi = new THREE.HemisphereLight(0xeaf4ff, 0xb9a98a, 1.5);
const sun = new THREE.DirectionalLight(0xfff3e0, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 120 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 3;
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(hemi, sun, sun.target, ambient);

// ---------- Mundo ----------
const env = buildEnvironment(scene);
const view = new HotelView(scene);
const ui = new UI();
const game = new Game(scene, view, {
  popup: (p, t, c) => ui.popup(p, t, c),
  toast: (m, k) => ui.toast(m, k),
  changed: () => ui.changed(),
  floorsChanged: (f) => setViewFloor(f ?? 0),
});
ui.attach(game, camera, { setViewFloor: (f) => setViewFloor(f) });

function setViewFloor(f) {
  f = THREE.MathUtils.clamp(f, 0, game.state.floors - 1);
  view.setViewFloor(f);
  game.updateVisibility();
  cam.goal = new THREE.Vector3(cam.target.x, f * FLOOR_H, cam.target.z);
  ui.floorsDirty = true;
  ui.hint('');
}

// ---------- Céu / dia e noite ----------
const SKY = [
  [0, 0x1b2350], [5, 0x2a3266], [6.5, 0xf7b48a], [8, 0xbfe3f5], [16, 0xc4e6f7],
  [18, 0xf5a77a], [19.5, 0x6a4a8a], [21, 0x232a5c], [24, 0x1b2350],
];
const tmpA = new THREE.Color(), tmpB = new THREE.Color();
function skyColor(h) {
  for (let k = 0; k < SKY.length - 1; k++) {
    const [h0, c0] = SKY[k], [h1, c1] = SKY[k + 1];
    if (h >= h0 && h <= h1) return tmpA.set(c0).lerp(tmpB.set(c1), (h - h0) / (h1 - h0));
  }
  return tmpA.set(SKY[0][1]);
}
function updateDayNight() {
  const h = game.hour;
  const night = game.nightFactor();
  const sky = skyColor(h);
  renderer.setClearColor(sky);
  scene.fog.color.copy(sky);
  document.body.style.background = `#${sky.getHexString()}`;
  const a = ((h - 6) / 12) * Math.PI;
  const day = Math.max(0, Math.sin(a));
  const c = view.viewFloor * FLOOR_H;
  sun.position.set(BUILDING_W / 2 - Math.cos(a) * 30, c + 18 + day * 22, 22);
  sun.target.position.set(BUILDING_W / 2, c, 0);
  sun.intensity = 0.5 + day * 2.0;
  sun.color.setHSL(0.09, 0.5 + (1 - day) * 0.3, 0.75 + day * 0.2);
  hemi.intensity = 0.9 + day * 0.7;
  hemi.color.setHSL(0.6, 0.5, 0.6 + day * 0.32);
  ambient.intensity = 0.3 + night * 0.25;
  ambient.color.setHex(night > 0.5 ? 0xa8b4ff : 0xffffff);
  renderer.toneMappingExposure = 1.05 - night * 0.12;
  for (const m of env.lamps) m.emissive.setRGB(night, night * 0.85, night * 0.45);
}

// ---------- Entrada ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointers = new Map();
let drag = null;
let pinch = null;

function pick(x, y) {
  ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const vf = view.viewFloor;
  const guestHits = vf === 0 ? game.guests.filter((g) => (g.state === 'queue' || g.state === 'arriving') && g.mesh.visible).map((g) => g.hit) : [];
  const gh = raycaster.intersectObjects(guestHits, false);
  if (gh.length) return gh[0].object.userData;
  const sh = raycaster.intersectObjects(view.pickables(), false);
  if (sh.length) return sh[0].object.userData;
  return null;
}

function onClick(x, y) {
  unlockAudio();
  const hit = pick(x, y);
  if (!hit) { game.select(null); ui.hidePanel(); return; }
  if (hit.kind === 'guest') { game.select(game.selected === hit.guest ? null : hit.guest); return; }
  const { f, i } = hit;
  const sl = game.slot(f, i);
  if (!sl) return;
  if (sl.type === 'empty') { ui.openBuild(f, i); Sfx.click(); return; }
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
  if (sl.type === 'room') {
    const st = { clean: 'Livre', occupied: 'Ocupado', dirty: 'Sujo', cleaning: 'Limpando' }[sl.status];
    let act = '';
    if (sl.status === 'clean') act = game.selected || game.queue.length ? ' — clique para alocar' : '';
    if (sl.status === 'dirty') act = ' — clique para limpar';
    ui.hint(`Quarto ${game.roomNumber(hit.f, hit.i)} · ${TIERS[sl.tier].name} · ${st}${act}`);
    view.hover(hit.f, hit.i, sl.status === 'clean' ? 0x6fdc5a : sl.status === 'dirty' ? 0xff6b6b : 0xffd34d);
  } else if (sl.type === 'empty') {
    ui.hint('Espaço vazio — clique para construir');
    view.hover(hit.f, hit.i, 0xffd34d);
  } else {
    ui.hint({ snack: 'Lanchonete', gym: 'Academia', pool: 'Piscina' }[sl.type]);
    view.hover(hit.f, hit.i, 0x6fcff2);
  }
}

function groundVectors() {
  const right = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
  const fwd = new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
  return { right, fwd };
}
function worldPerPx() {
  return (2 * cam.dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / window.innerHeight;
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    drag = { sx: e.clientX, sy: e.clientY, moved: false, target: cam.target.clone() };
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: cam.dist };
    drag = null;
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    cam.dist = THREE.MathUtils.clamp(pinch.dist * (pinch.d / d), 8, 75);
    cam.goalDist = null;
    applyCamera();
    return;
  }
  if (drag) {
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; canvas.classList.add('grab'); }
    if (drag.moved) {
      const k = worldPerPx();
      const { right, fwd } = groundVectors();
      cam.target.copy(drag.target).addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k / Math.sin(cam.pitch));
      clampTarget();
      if (cam.goal) cam.goal.x = cam.target.x, cam.goal.z = cam.target.z;
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
  cam.dist = THREE.MathUtils.clamp(cam.dist * (e.deltaY > 0 ? 1.1 : 0.9), 8, 75);
  cam.goalDist = null;
  applyCamera();
}, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function clampTarget() {
  cam.target.x = THREE.MathUtils.clamp(cam.target.x, -6, BUILDING_W + 6);
  cam.target.z = THREE.MathUtils.clamp(cam.target.z, BACK_Z - 2, FRONT_Z + 8);
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
  if (e.key === 'PageUp' || e.key.toLowerCase() === 'r') setViewFloor(view.viewFloor + 1);
  if (e.key === 'PageDown' || e.key.toLowerCase() === 'f') setViewFloor(view.viewFloor - 1);
  if (e.key === 'Escape') { if (ui.modalOpen) ui.closeModal(); else { game.select(null); ui.hidePanel(); } }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function updateKeys(dt) {
  let moved = false;
  const sp = cam.dist * 0.9 * dt;
  const { right, fwd } = groundVectors();
  if (keys.has('a') || keys.has('arrowleft')) { cam.target.addScaledVector(right, -sp); moved = true; }
  if (keys.has('d') || keys.has('arrowright')) { cam.target.addScaledVector(right, sp); moved = true; }
  if (keys.has('w') || keys.has('arrowup')) { cam.target.addScaledVector(fwd, sp); moved = true; }
  if (keys.has('s') || keys.has('arrowdown')) { cam.target.addScaledVector(fwd, -sp); moved = true; }
  if (keys.has('q')) { cam.yaw = Math.max(-0.8, cam.yaw - dt * 1.2); moved = true; }
  if (keys.has('e')) { cam.yaw = Math.min(0.8, cam.yaw + dt * 1.2); moved = true; }
  if (moved) {
    clampTarget();
    if (cam.goal) cam.goal.x = cam.target.x, cam.goal.z = cam.target.z;
    applyCamera();
  }
}

// ---------- Loop ----------
const intro = document.getElementById('intro');
let last = performance.now();
let saveAcc = 0;
let hudAcc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (intro.classList.contains('hidden')) game.update(dt);
  updateKeys(dt);
  if (cam.goal) {
    const k = 1 - Math.pow(0.004, dt);
    cam.target.lerp(cam.goal, k);
    if (cam.target.distanceTo(cam.goal) < 0.01) { cam.target.copy(cam.goal); cam.goal = null; }
    applyCamera();
  }
  env.cars[0].position.x += dt * 6 * Math.max(0.5, game.speed);
  if (env.cars[0].position.x > BUILDING_W + 60) env.cars[0].position.x = -60;
  env.cars[1].position.x -= dt * 5 * Math.max(0.5, game.speed);
  if (env.cars[1].position.x < -60) env.cars[1].position.x = BUILDING_W + 60;

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

window.addEventListener('resize', () => { resize(); });
window.addEventListener('beforeunload', () => game.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });

if (game.state.tutorial && game.state.stats.guests === 0) intro.classList.remove('hidden');
document.getElementById('intro-start').onclick = () => {
  unlockAudio();
  Sfx.day();
  intro.classList.add('hidden');
};

cam.dist = fitDist();
resize();
setViewFloor(0);
cam.target.copy(cam.goal); cam.goal = null;
applyCamera();
requestAnimationFrame(frame);

// para depuração no console
window.__hotel = { game, view, cam, applyCamera, ui, setViewFloor };
