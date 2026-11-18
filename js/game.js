// Lógica do jogo: estado, hóspedes, camareiras, economia e progressão.
import * as THREE from 'three';
import {
  FLOOR_H, SLOT_W, CORRIDOR_Z, ELEV_X, SLOTS_PER_FLOOR, MAX_FLOORS, STREET_X, BUILDING_W,
  REAL_SEC_PER_HOUR, HOURS_PER_NIGHT, TIERS, BUILDABLES, UPGRADES, GUEST_TYPES,
  START_MONEY, QUEUE_MAX, BASE_PATIENCE, CLEAN_TIME, slotX0, slotCenterX,
} from './config.js';
import { createPerson, animatePerson, Bubble } from './characters.js';
import { Sfx } from './audio.js';

const SAVE_KEY = 'hotel-pixel-save-v1';
const ELEV_Z = -1.6;
const STREET_Z = 3.2;
const ENTRANCE_X = 1.6;
const QUEUE_POS = [
  [4.5, -1.7], [4.5, -0.9], [3.6, -0.35], [2.7, -0.35], [1.8, -0.35], [0.9, -0.35], [0.9, -1.2],
];
const MAID_IDLE = [[7.4, -1.2], [8.2, -1.2], [7.4, -2.0], [8.2, -2.0], [7.8, -0.5]];

function rand(a, b) { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(rand(a, b + 1)); }

function newState() {
  const slots = [];
  slots.push(Array.from({ length: SLOTS_PER_FLOOR }, (_, i) => (i < 2 ? { type: 'lobby' } : { type: 'empty' })));
  slots[0][2] = { type: 'room', tier: 0, status: 'clean' };
  slots[0][3] = { type: 'room', tier: 0, status: 'clean' };
  return {
    money: START_MONEY,
    time: 7, // horas desde o início (começa às 07:00 do dia 1)
    rating: 3,
    floors: 1,
    slots,
    upgrades: { floor: 0, maid: 0, reception: 0, decor: 0, marketing: 0, cleanfast: 0 },
    stats: { guests: 0, earned: 0, angry: 0, best: 0 },
    tutorial: true,
  };
}

export class Game {
  constructor(scene, view, hooks) {
    this.scene = scene;
    this.view = view;
    this.hooks = hooks; // { popup(worldPos, text, color), toast(msg, kind), changed() }
    this.guests = [];
    this.queue = [];
    this.maids = [];
    this.selected = null;
    this.speed = 1;
    this.spawnAcc = 0;
    this.manualCleaning = null; // {f,i}
    this.autoAcc = 0;
    this.idSeq = 1;
    this.dayIncome = 0;
    this.load();
  }

  // ---------------- Persistência ----------------
  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { s = null; }
    this.state = s && s.slots ? s : newState();
    // quartos ocupados viram sujos (os hóspedes não são salvos)
    for (const row of this.state.slots) for (const sl of row) {
      if (sl.type === 'room' && sl.status !== 'clean') sl.status = 'dirty';
      delete sl.guest; delete sl.claimed; delete sl.cleanP;
    }
    this.state.upgrades = { ...newState().upgrades, ...this.state.upgrades };
    this.rebuildAll();
  }

  save() {
    try {
      const copy = JSON.parse(JSON.stringify(this.state, (k, v) => (k === 'guest' || k === 'claimed' ? undefined : v)));
      localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
    } catch { /* ignore */ }
  }

  reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    for (const g of this.guests) this.scene.remove(g.mesh);
    for (const m of this.maids) this.scene.remove(m.mesh);
    this.guests = []; this.queue = []; this.maids = [];
    this.selected = null; this.manualCleaning = null;
    this.view.removeSlotsAbove(0);
    this.state = newState();
    this.rebuildAll();
  }

  rebuildAll() {
    const st = this.state;
    this.view.removeSlotsAbove(st.floors);
    this.view.setFloors(st.floors);
    for (let f = 0; f < st.floors; f++) for (let i = 0; i < SLOTS_PER_FLOOR; i++) this.syncSlot(f, i);
    this.view.setDecor(st.upgrades.decor);
    while (this.maids.length < st.upgrades.maid) this.addMaid();
    this.hooks.changed();
  }

  syncSlot(f, i) {
    const sl = this.state.slots[f][i];
    if (sl.type === 'lobby') return;
    const g = this.view.syncSlot(f, i, sl, true);
    this.view.setDirty(f, i, sl.type === 'room' && (sl.status === 'dirty' || sl.status === 'cleaning'));
    if (!g.userData.bubble) {
      const b = new Bubble();
      b.sprite.position.set(SLOT_W / 2, 1.9, 0.6);
      b.sprite.visible = false;
      g.add(b.sprite);
      g.userData.bubble = b;
    }
  }

  // ---------------- Consultas ----------------
  get hour() { return this.state.time % 24; }
  get day() { return Math.floor(this.state.time / 24) + 1; }
  slot(f, i) { return this.state.slots[f]?.[i]; }

  allSlots() {
    const out = [];
    this.state.slots.forEach((row, f) => row.forEach((sl, i) => out.push({ f, i, sl })));
    return out;
  }
  rooms() { return this.allSlots().filter((s) => s.sl.type === 'room'); }
  facilities() { return this.allSlots().filter((s) => ['snack', 'gym', 'pool'].includes(s.sl.type)); }
  facilityTypes() { return new Set(this.facilities().map((s) => s.sl.type)); }

  nightFactor() {
    const h = this.hour;
    if (h >= 20 || h < 5) return 1;
    if (h >= 17) return (h - 17) / 3;
    if (h < 7) return 1 - (h - 5) / 2;
    return 0;
  }

  // ---------------- Caminhos ----------------
  // entidade possui: mesh, f (andar atual). Retorna lista de pontos [x, f, z] (f = andar)
  route(ent, toF, toX, toZ) {
    const p = ent.mesh.position;
    const pts = [];
    const curF = ent.f;
    if (Math.abs(p.z - CORRIDOR_Z) > 0.05) pts.push([p.x, curF, CORRIDOR_Z]);
    if (curF !== toF) {
      pts.push([ELEV_X, curF, CORRIDOR_Z]);
      pts.push([ELEV_X, curF, ELEV_Z]);
      pts.push([ELEV_X, toF, ELEV_Z]);
      pts.push([ELEV_X, toF, CORRIDOR_Z]);
    }
    pts.push([toX, toF, CORRIDOR_Z]);
    pts.push([toX, toF, toZ]);
    return pts;
  }

  setPath(ent, pts, then) {
    ent.path = pts;
    ent.onArrive = then;
    ent.lying = false;
    ent.mesh.rotation.set(0, ent.mesh.rotation.y, 0);
  }

  // move ao longo do caminho; true se chegou
  stepPath(ent, dt) {
    if (!ent.path || ent.path.length === 0) return true;
    const [tx, tf, tz] = ent.path[0];
    const ty = tf * FLOOR_H + (ent.yOff || 0);
    const p = ent.mesh.position;
    const dx = tx - p.x, dy = ty - p.y, dz = tz - p.z;
    const dist = Math.hypot(dx, dy, dz);
    const vertical = Math.abs(dy) > 0.01 && Math.abs(dx) < 0.01 && Math.abs(dz) < 0.01;
    const sp = (vertical ? 4.2 : 3.3) * (ent.speedMul || 1) * dt;
    if (dist <= sp) {
      p.set(tx, ty, tz);
      ent.f = tf;
      ent.path.shift();
    } else {
      p.x += (dx / dist) * sp; p.y += (dy / dist) * sp; p.z += (dz / dist) * sp;
      if (!vertical) ent.mesh.rotation.y = Math.atan2(dx, dz);
      else ent.mesh.rotation.y = 0;
    }
    if (ent.platform) ent.platform.visible = vertical;
    animatePerson(ent.mesh, dt, !vertical, ent.speedMul || 1);
    if (ent.path.length === 0) {
      if (ent.platform) ent.platform.visible = false;
      const cb = ent.onArrive; ent.onArrive = null;
      if (cb) cb();
      return true;
    }
    return false;
  }

  makeEntityMesh(opts) {
    const mesh = createPerson(opts);
    const platform = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.4), new THREE.MeshLambertMaterial({ color: 0xc0c0cc }));
    platform.position.y = -0.05;
    platform.visible = false;
    mesh.add(platform);
    this.scene.add(mesh);
    return { mesh, platform };
  }

  // ---------------- Hóspedes ----------------
  pickGuestType() {
    const r = this.state.rating;
    const pool = GUEST_TYPES.filter((t) => r >= t.minRating);
    const total = pool.reduce((a, t) => a + t.weight, 0);
    let x = Math.random() * total;
    for (const t of pool) { x -= t.weight; if (x <= 0) return t; }
    return pool[0];
  }

  spawnGuest() {
    const t = this.pickGuestType();
    const fromLeft = Math.random() < 0.6;
    const { mesh, platform } = this.makeEntityMesh({
      shirt: t.shirt,
      suitcase: [0x8b1e3f, 0x3d5a80, 0x6b4423, 0x2a2a2a][randi(0, 3)],
      hat: t.id === 'vip' ? 0xd4af37 : (t.id === 'tourist' && Math.random() < 0.5 ? 0xf6e7a0 : undefined),
    });
    mesh.position.set(fromLeft ? STREET_X - 4 : BUILDING_W + 8, 0, STREET_Z);
    const bubble = new Bubble();
    bubble.sprite.position.y = 2.25;
    mesh.add(bubble.sprite);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 8), new THREE.MeshBasicMaterial({ color: 0xffe680, side: THREE.DoubleSide, depthTest: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; ring.visible = false; ring.renderOrder = 9;
    mesh.add(ring);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    hit.position.y = 0.95;
    mesh.add(hit);
    const patienceMul = 1 + this.state.upgrades.decor * 0.3;
    const g = {
      id: this.idSeq++, type: t, want: t.want, nights: randi(t.nights[0], t.nights[1]),
      mesh, platform, bubble, ring, hit, f: 0,
      patience: BASE_PATIENCE * patienceMul * rand(0.85, 1.2), maxPatience: 0,
      state: 'arriving', visits: 0, sat: 60, waitFrac: 1, stayLeft: 0, room: null,
      speedMul: rand(0.9, 1.15), moodTimer: 0, mood: null,
    };
    g.maxPatience = g.patience;
    hit.userData = { kind: 'guest', guest: g };
    this.guests.push(g);
    this.queue.push(g);
    this.setPath(g, [[ENTRANCE_X, 0, STREET_Z], [ENTRANCE_X, 0, CORRIDOR_Z]], () => this.updateQueueTargets());
    if (this.state.tutorial && this.state.stats.guests === 0 && this.guests.length === 1) {
      this.hooks.toast('Um hóspede chegou! Clique nele e depois num quarto livre.', 'info');
    }
  }

  updateQueueTargets() {
    this.queue.forEach((g, idx) => {
      const [x, z] = QUEUE_POS[Math.min(idx, QUEUE_POS.length - 1)];
      g.queueIdx = idx;
      // só reposiciona quem já entrou no lobby
      const p = g.mesh.position;
      const inside = p.z < CORRIDOR_Z + 0.1 && p.x > -0.5 && p.x < SLOT_W * 2;
      if (!inside) return;
      if (g.state === 'arriving' && g.path && g.path.length) return;
      g.state = 'queue';
      if (Math.hypot(p.x - x, p.z - z) > 0.05) {
        this.setPath(g, [[x, 0, z]], () => { g.mesh.rotation.y = Math.PI; });
      }
    });
  }

  arrivalRatePerHour() {
    const st = this.state;
    const rooms = this.rooms().length;
    const h = this.hour;
    const tod = h < 6 ? 0.35 : h < 10 ? 0.85 : h < 14 ? 1.0 : h < 22 ? 1.4 : 0.7;
    const ratingF = 0.35 + (st.rating / 5) * 0.95;
    const mk = 1 + 0.25 * st.upgrades.marketing;
    const fac = 1 + 0.08 * this.facilities().length + (this.facilityTypes().has('pool') ? 0.15 : 0);
    return (0.12 + 0.16 * rooms) * tod * ratingF * mk * fac;
  }

  // melhor quarto livre para um hóspede
  bestRoomFor(g) {
    const free = this.rooms().filter((r) => r.sl.status === 'clean');
    if (!free.length) return null;
    free.sort((a, b) => {
      const da = a.sl.tier === g.want ? 0 : a.sl.tier > g.want ? 1 + (a.sl.tier - g.want) : 10;
      const db = b.sl.tier === g.want ? 0 : b.sl.tier > g.want ? 1 + (b.sl.tier - g.want) : 10;
      return da - db || a.f - b.f;
    });
    return free[0];
  }

  assign(g, f, i) {
    const sl = this.slot(f, i);
    if (!sl || sl.type !== 'room') return false;
    if (sl.status !== 'clean') {
      Sfx.error();
      this.hooks.toast(sl.status === 'dirty' || sl.status === 'cleaning' ? 'Esse quarto está sujo! Limpe antes.' : 'Quarto ocupado.', 'warn');
      return false;
    }
    sl.status = 'occupied';
    sl.guest = g;
    g.room = { f, i };
    g.state = 'toRoom';
    g.waitFrac = Math.max(0, g.patience / g.maxPatience);
    this.queue = this.queue.filter((q) => q !== g);
    if (this.selected === g) this.select(null);
    g.bubble.sprite.visible = false;
    const grp = this.view.slotGroup(f, i);
    const bed = grp.userData.bedSpot;
    this.setPath(g, this.route(g, f, slotX0(i) + bed.x, bed.z + 0.6), () => this.enterBed(g));
    this.updateQueueTargets();
    Sfx.select();
    if (this.state.tutorial && this.state.stats.guests === 0) {
      this.hooks.toast('Ótimo! Quando ele sair, o quarto fica sujo: clique nele para limpar.', 'info');
    }
    this.hooks.changed();
    return true;
  }

  enterBed(g) {
    const { f, i } = g.room;
    const grp = this.view.slotGroup(f, i);
    const bed = grp.userData.bedSpot;
    g.mesh.position.set(slotX0(i) + bed.x, f * FLOOR_H + bed.y, bed.z);
    g.mesh.rotation.set(-Math.PI / 2, 0, 0);
    g.lying = true;
    g.state = 'inRoom';
    if (g.stayLeft <= 0) g.stayLeft = g.nights * HOURS_PER_NIGHT;
    g.nextVisitCheck = 1;
    if (g.mesh.userData.suitcase) g.mesh.userData.suitcase.visible = false;
  }

  leaveRoomTo(g, toF, toX, toZ, then) {
    g.mesh.rotation.set(0, 0, 0);
    g.lying = false;
    // sai da cama para o chão
    const p = g.mesh.position;
    p.y = g.f * FLOOR_H;
    p.z += 0.6;
    this.setPath(g, this.route(g, toF, toX, toZ), then);
  }

  tryVisitFacility(g) {
    const facs = this.facilities();
    if (!facs.length || g.visits >= 2) return;
    // escolhe uma instalação com vaga
    const options = [];
    for (const fc of facs) {
      const grp = this.view.slotGroup(fc.f, fc.i);
      const spots = grp.userData.spots;
      const used = this.guests.filter((o) => o.facility && o.facility.f === fc.f && o.facility.i === fc.i).map((o) => o.facility.spot);
      for (let s = 0; s < spots.length; s++) if (!used.includes(s)) options.push({ ...fc, spot: s });
    }
    if (!options.length) return;
    const pick = options[randi(0, options.length - 1)];
    g.facility = { f: pick.f, i: pick.i, spot: pick.spot, type: pick.sl.type };
    g.state = 'toFacility';
    const spot = this.view.slotGroup(pick.f, pick.i).userData.spots[pick.spot];
    this.leaveRoomTo(g, pick.f, slotX0(pick.i) + spot.x, spot.z, () => this.atFacility(g));
  }

  atFacility(g) {
    const fc = g.facility;
    const grp = this.view.slotGroup(fc.f, fc.i);
    if (!grp || this.slot(fc.f, fc.i).type !== fc.type) { this.returnToRoom(g); return; }
    const spot = grp.userData.spots[fc.spot];
    g.state = 'atFacility';
    g.facTime = 1.5;
    g.mesh.rotation.y = Math.PI;
    if (fc.type === 'pool' && fc.spot < (grp.userData.swimSpots || 0)) {
      g.mesh.position.y = fc.f * FLOOR_H - 0.45; g.swimming = true;
    } else if (spot.y > 0) {
      g.mesh.position.y = fc.f * FLOOR_H + spot.y;
    }
    if (fc.type === 'pool' && fc.spot === 2) { g.mesh.rotation.set(-Math.PI / 2 + 0.4, Math.PI / 2, 0); g.lying = true; }
    const [a, b] = BUILDABLES[fc.type].spend;
    const amount = randi(a, b);
    this.earn(amount, g.mesh.position.clone().add(new THREE.Vector3(0, 2.4, 0)));
    g.visits++;
    g.bubble.sprite.visible = true;
    g.bubble.set(BUILDABLES[fc.type].icon);
  }

  returnToRoom(g) {
    g.facility = null;
    g.swimming = false;
    g.state = 'toRoom';
    g.bubble.sprite.visible = false;
    g.mesh.rotation.set(0, 0, 0); g.lying = false;
    g.mesh.position.y = g.f * FLOOR_H;
    const { f, i } = g.room;
    const bed = this.view.slotGroup(f, i).userData.bedSpot;
    this.setPath(g, this.route(g, f, slotX0(i) + bed.x, bed.z + 0.6), () => this.enterBed(g));
  }

  checkout(g) {
    const { f, i } = g.room;
    const sl = this.slot(f, i);
    // satisfação
    let sat = 58 + g.waitFrac * 25;
    const diff = sl.tier - g.want;
    if (diff < 0) sat -= 25 * -diff; else if (diff > 0) sat += 8;
    sat += this.facilityTypes().size * 6 + g.visits * 6 + this.state.upgrades.decor * 4;
    sat = Math.max(0, Math.min(100, sat));
    g.sat = sat;
    const payTier = Math.min(sl.tier, g.want);
    const base = TIERS[payTier].price * g.nights;
    const tip = Math.round(base * Math.max(0, (sat - 50) / 100));
    const pos = g.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    this.earn(base + tip, pos, tip > 0 ? `+$${base} (+$${tip} gorjeta)` : null);
    this.state.stats.guests++;
    this.bumpRating(sat, 0.12);
    sl.status = 'dirty';
    sl.guest = null;
    this.view.setDirty(f, i, true);
    g.state = 'leaving';
    g.mood = sat >= 70 ? 'heart' : sat >= 45 ? 'star' : 'angry';
    g.moodTimer = 4;
    g.bubble.sprite.visible = true;
    g.bubble.set(g.mood, 1, null, sat >= 45 ? '#1a1420' : '#e8433a');
    if (g.mesh.userData.suitcase) g.mesh.userData.suitcase.visible = true;
    this.leaveRoomTo(g, 0, ENTRANCE_X, CORRIDOR_Z, () => this.walkAway(g));
    if (this.state.tutorial && this.state.stats.guests === 1) {
      this.hooks.toast('Hóspede pagou! Limpe o quarto clicando nele. Use o dinheiro em CONSTRUIR/MELHORIAS.', 'info');
    }
    this.hooks.changed();
  }

  walkAway(g) {
    const exitX = Math.random() < 0.5 ? STREET_X - 6 : BUILDING_W + 10;
    this.setPath(g, [[ENTRANCE_X, 0, STREET_Z], [exitX, 0, STREET_Z]], () => { g.state = 'gone'; });
  }

  guestGivesUp(g) {
    this.queue = this.queue.filter((q) => q !== g);
    if (this.selected === g) this.select(null);
    g.state = 'leaving';
    g.bubble.set('angry', 1, null, '#e8433a');
    g.mood = 'angry'; g.moodTimer = 4;
    this.state.stats.angry++;
    this.bumpRating(0, 0.05);
    Sfx.angry();
    this.hooks.toast(`${g.type.name} cansou de esperar e foi embora!`, 'bad');
    this.setPath(g, [[g.mesh.position.x, 0, CORRIDOR_Z], [ENTRANCE_X, 0, CORRIDOR_Z]], () => this.walkAway(g));
    this.updateQueueTargets();
    this.hooks.changed();
  }

  bumpRating(sat, w) {
    const target = sat / 20;
    this.state.rating = Math.max(0.5, Math.min(5, this.state.rating + (target - this.state.rating) * w));
  }

  earn(amount, pos, label) {
    this.state.money += amount;
    this.state.stats.earned += amount;
    this.dayIncome += amount;
    this.hooks.popup(pos, label || `+$${amount}`, '#ffe680');
    Sfx.coin();
    this.hooks.changed();
  }

  spend(amount) {
    if (this.state.money < amount) {
      Sfx.error();
      this.hooks.toast('Dinheiro insuficiente!', 'warn');
      return false;
    }
    this.state.money -= amount;
    this.hooks.changed();
    return true;
  }

  select(g) {
    if (this.selected) this.selected.ring.visible = false;
    this.selected = g;
    if (g) { g.ring.visible = true; Sfx.click(); }
    this.hooks.changed();
  }

  // ---------------- Limpeza ----------------
  cleanTime() { return CLEAN_TIME * (this.state.upgrades.cleanfast ? 0.6 : 1); }

  startManualClean(f, i) {
    const sl = this.slot(f, i);
    if (sl.status !== 'dirty') return;
    if (sl.claimed) { this.hooks.toast('Uma camareira já está indo limpar esse quarto.', 'info'); return; }
    if (this.manualCleaning) {
      Sfx.error();
      this.hooks.toast('Você já está limpando um quarto! Contrate camareiras em MELHORIAS.', 'warn');
      return;
    }
    sl.status = 'cleaning';
    sl.cleanP = 0;
    sl.cleaner = 'you';
    this.manualCleaning = { f, i };
    Sfx.click();
    this.hooks.changed();
  }

  finishClean(f, i) {
    const sl = this.slot(f, i);
    sl.status = 'clean';
    sl.cleanP = null;
    sl.cleaner = null;
    sl.claimed = null;
    this.view.setDirty(f, i, false);
    this.view.setProgress(f, i, null);
    if (this.manualCleaning && this.manualCleaning.f === f && this.manualCleaning.i === i) this.manualCleaning = null;
    Sfx.clean();
    this.hooks.popup(this.view.slotWorld(f, i, new THREE.Vector3(SLOT_W / 2, 2.2, 0.5)), 'Limpo!', '#9fe870');
    this.hooks.changed();
  }

  addMaid() {
    const { mesh, platform } = this.makeEntityMesh({ shirt: 0x2b2b3a, pants: 0x2b2b3a, hat: 0xffffff, skin: undefined });
    const idx = this.maids.length;
    const [x, z] = MAID_IDLE[idx % MAID_IDLE.length];
    mesh.position.set(x, 0, z);
    mesh.rotation.y = 0;
    // avental
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.05), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    apron.position.set(0, 0.7, 0.18);
    mesh.userData.rig.body.add(apron);
    const bubble = new Bubble();
    bubble.sprite.position.y = 2.25; bubble.sprite.visible = false;
    mesh.add(bubble.sprite);
    this.maids.push({ id: idx, mesh, platform, bubble, f: 0, state: 'idle', target: null, home: [x, z], speedMul: 1.15 });
  }

  updateMaids(dt) {
    for (const m of this.maids) {
      if (m.state === 'idle') {
        animatePerson(m.mesh, dt, false);
        const dirty = this.rooms().filter((r) => r.sl.status === 'dirty' && !r.sl.claimed);
        if (dirty.length) {
          // mais próximo (por andar)
          dirty.sort((a, b) => Math.abs(a.f - m.f) - Math.abs(b.f - m.f));
          const t = dirty[0];
          t.sl.claimed = m.id;
          m.target = { f: t.f, i: t.i };
          m.state = 'walking';
          this.setPath(m, this.route(m, t.f, slotCenterX(t.i), -1.4), () => {
            const sl = this.slot(t.f, t.i);
            if (sl.type !== 'room' || sl.status !== 'dirty') { this.maidGoHome(m); return; }
            sl.status = 'cleaning'; sl.cleanP = 0; sl.cleaner = 'maid';
            m.state = 'cleaning';
            m.bubble.sprite.visible = true; m.bubble.set('broom');
          });
        }
      } else if (m.state === 'walking' || m.state === 'home') {
        this.stepPath(m, dt);
      } else if (m.state === 'cleaning') {
        m.mesh.userData.rig.armR.rotation.x = Math.sin(performance.now() / 90) * 0.8 - 0.6;
        m.mesh.rotation.y = Math.sin(performance.now() / 400) * 1.2;
        const { f, i } = m.target;
        const sl = this.slot(f, i);
        if (!sl || sl.status !== 'cleaning') { this.maidGoHome(m); continue; }
        sl.cleanP += dt / this.cleanTime();
        this.view.setProgress(f, i, sl.cleanP);
        if (sl.cleanP >= 1) {
          this.finishClean(f, i);
          m.bubble.sprite.visible = false;
          // tem mais algum sujo? vai direto
          const more = this.rooms().some((r) => r.sl.status === 'dirty' && !r.sl.claimed);
          if (more) { m.state = 'idle'; } else this.maidGoHome(m);
        }
      }
    }
  }

  maidGoHome(m) {
    m.state = 'home';
    m.bubble.sprite.visible = false;
    m.mesh.rotation.set(0, 0, 0);
    this.setPath(m, this.route(m, 0, m.home[0], m.home[1]), () => { m.state = 'idle'; m.mesh.rotation.y = 0; });
  }

  // ---------------- Construção / melhorias ----------------
  roomCost() { return BUILDABLES.room.cost + this.rooms().length * 25; }
  buildCost(type) { return type === 'room' ? this.roomCost() : BUILDABLES[type].cost; }

  build(f, i, type) {
    const sl = this.slot(f, i);
    if (!sl || sl.type !== 'empty') return false;
    const cost = this.buildCost(type);
    if (!this.spend(cost)) return false;
    this.state.slots[f][i] = type === 'room' ? { type: 'room', tier: 0, status: 'clean' } : { type };
    this.syncSlot(f, i);
    Sfx.build();
    this.hooks.popup(this.view.slotWorld(f, i, new THREE.Vector3(SLOT_W / 2, 2.2, 0.5)), `-$${cost}`, '#ff8a80');
    this.hooks.toast(`${BUILDABLES[type].name} construído(a)!`, 'good');
    this.hooks.changed();
    this.save();
    return true;
  }

  upgradeRoom(f, i) {
    const sl = this.slot(f, i);
    if (sl.type !== 'room' || sl.tier >= 2) return;
    if (sl.status === 'occupied') { this.hooks.toast('Espere o hóspede sair para reformar.', 'warn'); Sfx.error(); return; }
    const next = TIERS[sl.tier + 1];
    if (!this.spend(next.upgrade)) return;
    sl.tier++;
    sl.status = 'clean'; sl.claimed = null; sl.cleanP = null;
    if (this.manualCleaning && this.manualCleaning.f === f && this.manualCleaning.i === i) this.manualCleaning = null;
    this.syncSlot(f, i);
    this.view.setProgress(f, i, null);
    Sfx.build();
    this.hooks.toast(`Quarto ${(f + 1) * 100 + i + 1} agora é ${next.name}!`, 'good');
    this.save();
  }

  demolish(f, i) {
    const sl = this.slot(f, i);
    if (sl.type === 'empty' || sl.type === 'lobby') return;
    if (sl.type === 'room' && sl.status === 'occupied') { this.hooks.toast('Há um hóspede nesse quarto!', 'warn'); Sfx.error(); return; }
    if (this.guests.some((g) => g.facility && g.facility.f === f && g.facility.i === i)) { this.hooks.toast('Há hóspedes usando esse espaço!', 'warn'); Sfx.error(); return; }
    if (sl.type === 'room' && this.rooms().length <= 1) { this.hooks.toast('Você precisa de pelo menos um quarto!', 'warn'); Sfx.error(); return; }
    if (this.manualCleaning && this.manualCleaning.f === f && this.manualCleaning.i === i) this.manualCleaning = null;
    for (const m of this.maids) if (m.target && m.target.f === f && m.target.i === i && m.state !== 'idle') this.maidGoHome(m);
    this.state.slots[f][i] = { type: 'empty' };
    this.syncSlot(f, i);
    this.view.setProgress(f, i, null);
    this.hooks.changed();
    this.save();
  }

  upgradeCost(key) { return UPGRADES[key].cost(this.state.upgrades[key]); }

  buyUpgrade(key) {
    const u = UPGRADES[key];
    const lvl = this.state.upgrades[key];
    if (lvl >= u.max) return false;
    const cost = u.cost(lvl);
    if (!this.spend(cost)) return false;
    this.state.upgrades[key]++;
    if (key === 'floor') {
      this.state.floors++;
      this.state.slots.push(Array.from({ length: SLOTS_PER_FLOOR }, () => ({ type: 'empty' })));
      this.view.setFloors(this.state.floors);
      for (let i = 0; i < SLOTS_PER_FLOOR; i++) this.syncSlot(this.state.floors - 1, i);
      this.hooks.toast(`Novo andar construído! Agora são ${this.state.floors} andares.`, 'good');
      this.hooks.floorsChanged?.();
    } else if (key === 'maid') {
      this.addMaid();
      this.hooks.toast('Camareira contratada!', 'good');
    } else if (key === 'decor') {
      this.view.setDecor(this.state.upgrades.decor);
      this.hooks.toast('Lobby decorado! Hóspedes mais pacientes.', 'good');
    } else {
      this.hooks.toast(`${u.name} adquirido!`, 'good');
    }
    Sfx.build();
    this.hooks.changed();
    this.save();
    return true;
  }

  salaries() {
    return this.state.upgrades.maid * 15 + this.state.upgrades.reception * 30;
  }

  // ---------------- Atualização principal ----------------
  update(realDt) {
    const dt = realDt * this.speed;
    if (dt <= 0) {
      for (const g of this.guests) if (!g.lying) animatePerson(g.mesh, realDt, false);
      return;
    }
    const st = this.state;
    const prevDay = this.day;
    const dh = dt / REAL_SEC_PER_HOUR;
    st.time += dh;
    if (this.day !== prevDay) this.newDay(prevDay);

    // chegada de hóspedes
    this.spawnAcc += this.arrivalRatePerHour() * dh;
    if (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.queue.length < QUEUE_MAX) {
        this.spawnGuest();
        Sfx.bell();
      }
    }

    // recepcionista automática
    if (st.upgrades.reception) {
      this.autoAcc += dt;
      if (this.autoAcc > 1.2) {
        this.autoAcc = 0;
        const front = this.queue.find((g) => g.state === 'queue');
        if (front) {
          const r = this.bestRoomFor(front);
          if (r) this.assign(front, r.f, r.i);
        }
      }
    }

    // hóspedes
    for (const g of this.guests) {
      if (g.moodTimer > 0) {
        g.moodTimer -= dt;
        if (g.moodTimer <= 0 && g.state !== 'atFacility') g.bubble.sprite.visible = false;
      }
      switch (g.state) {
        case 'arriving':
        case 'queue': {
          if (g.path && g.path.length) this.stepPath(g, dt);
          else animatePerson(g.mesh, dt, false);
          if (g.state === 'queue') g.patience -= dt;
          g.bubble.sprite.visible = true;
          g.bubble.set('bed', Math.max(0, g.patience / g.maxPatience), '#' + TIERS[g.want].color.toString(16).padStart(6, '0'), this.selected === g ? '#f6c90e' : '#1a1420', g.nights);
          if (g.patience <= 0) this.guestGivesUp(g);
          break;
        }
        case 'toRoom':
        case 'toFacility':
          this.stepPath(g, dt);
          break;
        case 'inRoom': {
          g.stayLeft -= dh;
          g.nextVisitCheck -= dh;
          if (this.nightFactor() > 0.5 || g.id % 3 === 0) {
            g.bubble.sprite.visible = true; g.bubble.set('zz');
          } else if (g.moodTimer <= 0) g.bubble.sprite.visible = false;
          if (g.stayLeft <= 0) { g.bubble.sprite.visible = false; this.checkout(g); }
          else if (g.nextVisitCheck <= 0) {
            g.nextVisitCheck = 1;
            if (Math.random() < 0.3 && g.stayLeft > 2.5) { g.bubble.sprite.visible = false; this.tryVisitFacility(g); }
          }
          break;
        }
        case 'atFacility': {
          g.facTime -= dh;
          if (g.swimming) g.mesh.position.y = g.facility.f * FLOOR_H - 0.45 + Math.sin(performance.now() / 300 + g.id) * 0.06;
          else if (!g.lying) animatePerson(g.mesh, dt, g.facility.type === 'gym' && g.facility.spot < 2, 1.4);
          if (g.facTime <= 0) this.returnToRoom(g);
          break;
        }
        case 'leaving':
          this.stepPath(g, dt);
          break;
        default: break;
      }
    }
    // remove quem foi embora
    const gone = this.guests.filter((g) => g.state === 'gone');
    if (gone.length) {
      for (const g of gone) this.scene.remove(g.mesh);
      this.guests = this.guests.filter((g) => g.state !== 'gone');
    }

    // limpeza manual
    if (this.manualCleaning) {
      const { f, i } = this.manualCleaning;
      const sl = this.slot(f, i);
      if (!sl || sl.status !== 'cleaning') this.manualCleaning = null;
      else {
        sl.cleanP += dt / this.cleanTime();
        this.view.setProgress(f, i, sl.cleanP);
        if (sl.cleanP >= 1) this.finishClean(f, i);
      }
    }

    this.updateMaids(dt);
    this.updateSlotVisuals(dt);
  }

  updateSlotVisuals(dt) {
    const night = this.nightFactor();
    this.view.setLobbyLight(night);
    for (const { f, i, sl } of this.allSlots()) {
      if (sl.type === 'lobby') continue;
      const grp = this.view.slotGroup(f, i);
      if (!grp) continue;
      const b = grp.userData.bubble;
      if (sl.type === 'room') {
        if (sl.status === 'dirty') { b.sprite.visible = true; b.set('dirty', 1, null, '#e8433a'); }
        else if (sl.status === 'cleaning') { b.sprite.visible = true; b.set('broom', 1, null, '#6abe30'); }
        else b.sprite.visible = false;
        this.view.setLight(f, i, sl.status !== 'clean' || night > 0.9, night);
      } else if (sl.type !== 'empty') {
        b.sprite.visible = false;
        this.view.setLight(f, i, true, night);
      } else {
        b.sprite.visible = false;
        if (grp.userData.plus) grp.userData.plus.position.y = 1.4 + Math.sin(performance.now() / 400) * 0.08;
      }
      if (grp.userData.water) grp.userData.water.offset.x += dt * 0.05;
      if (grp.userData.ring) grp.userData.ring.position.y = 0.4 + Math.sin(performance.now() / 600) * 0.03;
      for (const n of grp.userData.npcs || []) animatePerson(n, dt, false);
    }
    const rec = this.view.lobby.userData.receptionist;
    animatePerson(rec, dt, false);
    if (this.selected) rec.rotation.y = Math.sin(performance.now() / 300) * 0.2;
    else rec.rotation.y *= 0.9;
  }

  newDay(prevDay) {
    const sal = this.salaries();
    const income = this.dayIncome;
    this.dayIncome = 0;
    if (sal) {
      this.state.money -= sal;
      this.hooks.popup(new THREE.Vector3(4.5, 3, 0), `-$${sal} salários`, '#ff8a80');
    }
    this.state.stats.best = Math.max(this.state.stats.best, income);
    Sfx.day();
    this.hooks.toast(`Fim do dia ${prevDay}: ganhou $${income}${sal ? `, salários -$${sal}` : ''}.`, 'good');
    if (this.state.tutorial && prevDay >= 2) this.state.tutorial = false;
    this.save();
    this.hooks.changed();
  }
}

export { MAX_FLOORS };
