// Ponto de entrada: renderizador, câmera lateral (casa de bonecas aberta), luzes, entrada e loop.
import * as THREE from 'three';
import { FLOOR_H, BUILDING_W, TIERS, setCols } from './config.js';
import { levelById } from './levels.js';
import { Meta, dailyLevel, Board } from './meta.js';
import { WorldMap } from './worldmap.js';
import { HotelView, buildEnvironment } from './building.js';
import { setAnisotropy } from './textures.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { unlockAudio, Sfx } from './audio.js';
import { RoomEnvironment } from '../vendor/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';

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
scene.fog = new THREE.Fog(0xbfe3f5, 90, 220);

// reflexos suaves de ambiente (deixa os materiais mais "vivos")
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.22;

// ---------- Céu em degradê com nuvens ----------
const skyUniforms = { top: { value: new THREE.Color(0x6fb8ec) }, bottom: { value: new THREE.Color(0xd8eefa) } };
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(320, 32, 16),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP - cameraPosition).y * 2.2 + 0.15, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }',
  }),
);
skyDome.renderOrder = -10;
scene.add(skyDome);
const clouds = [];
{
  const cm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, fog: false, transparent: true, opacity: 0.95 });
  for (let k = 0; k < 9; k++) {
    const c = new THREE.Group();
    const n = 4 + (k % 3);
    for (let j = 0; j < n; j++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(2.2 + Math.random() * 1.8, 14, 10), cm);
      b.position.set(j * 2.6 - n * 1.3, Math.random() * 1.2, Math.random() * 1.5);
      b.scale.y = 0.65;
      c.add(b);
    }
    c.position.set(-70 + k * 22 + Math.random() * 8, 24 + Math.random() * 14, -90 - Math.random() * 40);
    c.userData.speed = 0.4 + Math.random() * 0.5;
    clouds.push(c);
    scene.add(c);
  }
}

// ---------- Câmera em perspectiva, vista de cima ----------
const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 500);
const cam = {
  target: new THREE.Vector3(BUILDING_W / 2, 3, 0),
  dist: 60, yaw: 0.14, pitch: 0.16,
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
// enquadra o prédio inteiro (todos os andares + telhado + calçada)
function frameAll() {
  if (!game) return { target: cam.target.clone(), dist: cam.dist };
  const aspect = window.innerWidth / window.innerHeight;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const floors = game.state.floors;
  const h = floors * FLOOR_H + 4.5;
  const portrait = aspect < 0.9;
  // no computador, a coluna da esquerda (metas + fila) ocupa ~290px: enquadra o prédio no resto da tela
  const side = !portrait && window.innerWidth > 720 ? 290 : 0;
  const availAspect = (window.innerWidth - side) / window.innerHeight;
  const byW = (BUILDING_W + 4) / (2 * t * availAspect);
  const byH = h / (2 * t) * 1.08;
  const dist = THREE.MathUtils.clamp(portrait ? 17 / (2 * t * aspect) : Math.max(byW, byH), 16, 140);
  const wpp = (2 * dist * t) / window.innerHeight;
  return {
    // em tela em pé, mostra o lobby e os primeiros quartos (arraste para ver o resto)
    target: new THREE.Vector3(portrait ? 10 : BUILDING_W / 2 - (side / 2) * wpp, floors * FLOOR_H / 2 + 0.6, 0),
    dist,
  };
}
// pós-processamento: brilho (bloom) nas luzes e placas, com antisserrilhado (MSAA)
const pr = Math.min(window.devicePixelRatio || 1, 2);
const rt = new THREE.WebGLRenderTarget(window.innerWidth * pr, window.innerHeight * pr, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.3, 0.4, 1.05);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  composer.setPixelRatio(pr);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.resolution.set(window.innerWidth / 2, window.innerHeight / 2);
  applyCamera();
}

// ---------- Luzes ----------
const hemi = new THREE.HemisphereLight(0xeaf4ff, 0xb9a98a, 1.5);
const sun = new THREE.DirectionalLight(0xfff3e0, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 24, bottom: -24, near: 1, far: 150 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 3;
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(hemi, sun, sun.target, ambient);

// ---------- Mundo (recriado a cada hotel) ----------
let env = null;
let view = null;
let game = null;
let current = null; // { levelId, daily, seed }
const ui = new UI();

const nav = {
  toMap: () => showMap(),
  restart: () => { if (current?.daily) startDaily(); else startLevel(current.levelId, true); },
};

function clearWorld() {
  if (game) { game.save(); game.dispose(); }
  if (env) scene.remove(env.group);
  if (view) { scene.remove(view.root); scene.remove(view.hoverBox); }
  game = null; view = null; env = null;
}

function buildWorld(level, opts) {
  clearWorld();
  setCols(level.cols);
  env = buildEnvironment(scene, level);
  view = new HotelView(scene, level);
  game = new Game(scene, view, {
    popup: (p, t, c) => ui.popup(p, t, c),
    toast: (m, k) => ui.toast(m, k),
    changed: () => ui.changed(),
    floorsChanged: () => reframe(),
    event: (e) => ui.event(e),
    seasonEnd: (res) => onSeasonEnd(res),
    seenTutorial: () => Meta.get().seenTutorial,
  }, level, opts);
  ui.attach(game, camera, nav);
  ui.hidePanel();
  const fr = frameAll();
  cam.target.copy(fr.target); cam.dist = fr.dist; cam.goal = null;
  applyCamera();
  sun.shadow.camera.right = BUILDING_W + 6 - BUILDING_W / 2;
  sun.shadow.camera.left = -sun.shadow.camera.right;
  sun.shadow.camera.top = Math.max(24, level.maxFloors * FLOOR_H);
  sun.shadow.camera.updateProjectionMatrix();
}

function startLevel(id, fresh) {
  const level = levelById(id);
  if (fresh) { try { localStorage.removeItem(`hotel-v5-${id}`); } catch { /* ignore */ } }
  current = { levelId: id, daily: false };
  map.hide();
  buildWorld(level, { perks: Meta.get().perks });
  document.getElementById('game-ui').classList.remove('hidden');
  if (level.id === 'br' && !Meta.get().seenTutorial) {
    document.getElementById('intro').classList.remove('hidden');
    Meta.get().seenTutorial = true; Meta.save();
  } else {
    ui.event({ icon: 'plane', title: `Bem-vindo a ${level.city}!`, text: level.desc, kind: 'info' });
  }
}

function startDaily() {
  const { level, seed } = dailyLevel();
  current = { levelId: level.id, daily: true };
  map.hide();
  buildWorld(level, { daily: true, seed });
  document.getElementById('game-ui').classList.remove('hidden');
  ui.event({ icon: 'party', title: 'Desafio do dia', text: `${level.name}: 4 meses, sem bônus. Faça a maior pontuação!`, kind: 'info' });
}

function showMap() {
  if (game) game.save();
  ui.closeModal();
  document.getElementById('game-ui').classList.add('hidden');
  document.getElementById('intro').classList.add('hidden');
  map.show();
}

async function onSeasonEnd(res) {
  ui.setSpeed(0);
  if (res.daily) {
    const { key } = dailyLevel();
    ui.openResults(res, {});
    await Board.init();
    await Board.submit(key, res.score, res.level.id);
    const rows = await Board.top(key);
    ui.renderBoard(rows, Meta.get().daily[key]?.score, !!Board.db);
  } else {
    const info = Meta.record(res.level.id, res.stars, res.score);
    ui.openResults(res, info);
  }
}

const map = new WorldMap(ui, { play: (id, fresh) => startLevel(id, fresh), playDaily: () => startDaily() });

function reframe() {
  const fr = frameAll();
  cam.goal = fr.target;
  cam.goalDist = fr.dist;
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
  const h = game ? game.hour : 10;
  const night = game ? game.nightFactor() : 0;
  const dark = game?.blackout ? 1 : 0;
  const sky = skyColor(h);
  renderer.setClearColor(sky);
  skyUniforms.bottom.value.copy(sky).lerp(tmpB.set(0xffffff), 0.25 * (1 - night));
  skyUniforms.top.value.copy(sky).multiplyScalar(0.62 + 0.1 * night);
  scene.fog.color.copy(skyUniforms.bottom.value);
  for (const c of clouds) {
    c.children[0].material.opacity = 0.95 - night * 0.7;
  }
  bloom.strength = 0.35 + night * 0.45;
  document.body.style.background = `#${sky.getHexString()}`;
  const a = ((h - 6) / 12) * Math.PI;
  const day = Math.max(0, Math.sin(a));
  // sol baixo, vindo da frente, para iluminar o interior dos andares
  const c = (game ? game.state.floors : 1) * FLOOR_H / 2;
  sun.position.set(BUILDING_W / 2 - Math.cos(a) * 26, c + 8 + day * 14, 34);
  sun.target.position.set(BUILDING_W / 2, c, -2);
  sun.intensity = 0.5 + day * 1.6;
  sun.color.setHSL(0.09, 0.5 + (1 - day) * 0.3, 0.75 + day * 0.2);
  hemi.intensity = 0.7 + day * 0.45;
  hemi.color.setHSL(0.6, 0.5, 0.6 + day * 0.32);
  // à noite, luz quente simulando os interiores acesos
  ambient.intensity = (0.2 + night * 0.5) * (1 - dark * 0.7);
  ambient.color.setHex(night > 0.5 ? 0xffd2a0 : 0xffffff);
  hemi.intensity *= 1 - dark * 0.45;
  renderer.toneMappingExposure = 0.95 - night * 0.1 - dark * 0.25;
  if (!env) return;
  const lampK = dark ? 0 : night;
  for (const m of env.lamps) m.emissive.setRGB(lampK, lampK * 0.85, lampK * 0.45);
  for (const m of env.glows) m.emissiveIntensity = night * 0.9;
  if (env.water) env.water.offset.x += 0.0004;
}

// ---------- Entrada ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointers = new Map();
let drag = null;
let pinch = null;

function pick(x, y) {
  if (!game || game.ended) return null;
  ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const guestHits = game.guests.filter((g) => g.state === 'queue' || g.state === 'arriving').map((g) => g.hit);
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
    } else if (sl.status === 'dirty' || sl.status === 'broken') {
      game.select(null);
      game.startManualJob(f, i);
    } else if (sl.status === 'occupied' && sl.guest?.request) {
      game.fulfillRequest(f, i);
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
    ui.hint(`${g.name} · quer ${TIERS[g.want].name} · ${g.nights} diária(s) — clique para selecionar`);
    return;
  }
  const sl = game.slot(hit.f, hit.i);
  if (sl.type === 'room') {
    const st = { clean: 'Livre', occupied: 'Ocupado', dirty: 'Sujo', cleaning: 'Limpando', broken: 'Quebrado', repairing: 'Em conserto' }[sl.status];
    let act = '';
    if (sl.status === 'clean') act = game.selected || game.queue.length ? ' — clique para alocar' : '';
    if (sl.status === 'dirty') act = ' — clique para limpar';
    if (sl.status === 'broken') act = ' — clique para consertar ($40)';
    if (sl.status === 'occupied' && sl.guest?.request) act = ` — pediu ${sl.guest.request.name}: clique para atender`;
    ui.hint(`Quarto ${game.roomNumber(hit.f, hit.i)} · ${TIERS[sl.tier].name} · ${st}${act}`);
    view.hover(hit.f, hit.i, sl.status === 'clean' ? 0x6fdc5a : sl.status === 'dirty' ? 0xff6b6b : 0xffd34d);
  } else if (sl.type === 'empty') {
    ui.hint('Espaço vazio — clique para construir');
    view.hover(hit.f, hit.i, 0xffd34d);
  } else {
    ui.hint(game.facilityName(sl.type));
    view.hover(hit.f, hit.i, 0x6fcff2);
  }
}

function screenVectors() {
  const right = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
  const up = new THREE.Vector3(0, 1, 0);
  return { right, up };
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
    cam.dist = THREE.MathUtils.clamp(pinch.dist * (pinch.d / d), 10, 140);
    cam.goalDist = null;
    applyCamera();
    return;
  }
  if (drag) {
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; canvas.classList.add('grab'); }
    if (drag.moved) {
      const k = worldPerPx();
      const { right, up } = screenVectors();
      cam.target.copy(drag.target).addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
      clampTarget();
      cam.goal = null;
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
  if (!game) return;
  cam.dist = THREE.MathUtils.clamp(cam.dist * (e.deltaY > 0 ? 1.1 : 0.9), 10, 140);
  cam.goalDist = null;
  applyCamera();
}, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function clampTarget() {
  cam.target.x = THREE.MathUtils.clamp(cam.target.x, -6, BUILDING_W + 6);
  cam.target.y = THREE.MathUtils.clamp(cam.target.y, 0, (game ? game.state.floors : 1) * FLOOR_H + 3);
}

const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || !game || map.visible) return;
  keys.add(e.key.toLowerCase());
  if (e.code === 'Space') { e.preventDefault(); ui.setSpeed(game.speed === 0 ? (ui.prevSpeed || 1) : (ui.prevSpeed = game.speed, 0)); }
  if (e.key === '1') ui.setSpeed(1);
  if (e.key === '2') ui.setSpeed(2);
  if (e.key === '3') ui.setSpeed(4);
  if (e.key.toLowerCase() === 'u') ui.openUpgrades();
  if (e.key.toLowerCase() === 'f') { reframe(); }
  if (e.key === 'Escape') { if (ui.modalOpen) ui.closeModal(); else { game.select(null); ui.hidePanel(); } }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function updateKeys(dt) {
  let moved = false;
  const sp = cam.dist * 0.9 * dt;
  const { right, up } = screenVectors();
  if (keys.has('a') || keys.has('arrowleft')) { cam.target.addScaledVector(right, -sp); moved = true; }
  if (keys.has('d') || keys.has('arrowright')) { cam.target.addScaledVector(right, sp); moved = true; }
  if (keys.has('w') || keys.has('arrowup')) { cam.target.addScaledVector(up, sp); moved = true; }
  if (keys.has('s') || keys.has('arrowdown')) { cam.target.addScaledVector(up, -sp); moved = true; }
  if (keys.has('q')) { cam.yaw = Math.max(-0.8, cam.yaw - dt * 1.2); moved = true; }
  if (keys.has('e')) { cam.yaw = Math.min(0.8, cam.yaw + dt * 1.2); moved = true; }
  if (moved) {
    cam.goal = null; cam.goalDist = null;
    clampTarget();
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
  if (game && intro.classList.contains('hidden') && !map.visible) game.update(dt);
  if (game) updateKeys(dt);
  if (cam.goal) {
    const k = 1 - Math.pow(0.01, dt);
    cam.target.lerp(cam.goal, k);
    if (cam.goalDist) cam.dist += (cam.goalDist - cam.dist) * k;
    if (cam.target.distanceTo(cam.goal) < 0.01) { cam.target.copy(cam.goal); cam.goal = null; cam.goalDist = null; }
    applyCamera();
  }
  const spd = game ? Math.max(0.5, game.speed) : 1;
  if (env) {
    env.cars[0].position.x += dt * 6 * spd;
    if (env.cars[0].position.x > BUILDING_W + 60) env.cars[0].position.x = -60;
    env.cars[1].position.x -= dt * 5 * spd;
    if (env.cars[1].position.x < -60) env.cars[1].position.x = BUILDING_W + 60;
  }

  updateDayNight();
  hudAcc += dt;
  if (hudAcc > 0.1 && game && !map.visible) {
    hudAcc = 0;
    ui.updateHUD();
    ui.refreshModal();
    const pst = ui.panelTarget && game.slot(ui.panelTarget.f, ui.panelTarget.i)?.status;
    if (game.selected || pst === 'cleaning' || pst === 'repairing' || pst === 'occupied') ui.changed();
  }
  saveAcc += dt;
  if (saveAcc > 10 && game) { saveAcc = 0; game.save(); }
  for (const c of clouds) {
    c.position.x += dt * c.userData.speed * spd;
    if (c.position.x > BUILDING_W + 110) c.position.x = -110;
  }
  skyDome.position.copy(camera.position);
  if (!map.visible) composer.render();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => { resize(); const fr = frameAll(); cam.target.copy(fr.target); cam.dist = fr.dist; applyCamera(); });
window.addEventListener('beforeunload', () => game?.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) game?.save(); });

document.getElementById('intro-start').onclick = () => {
  unlockAudio();
  Sfx.day();
  intro.classList.add('hidden');
};

resize();
applyCamera();
showMap();
requestAnimationFrame(frame);

// para depuração no console
window.__hotel = { get game() { return game; }, get view() { return view; }, cam, applyCamera, ui, reframe, startLevel, startDaily, showMap, map, Meta };
