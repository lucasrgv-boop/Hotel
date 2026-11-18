// Lógica do jogo: estado, hóspedes, camareiras, economia e progressão.
import * as THREE from 'three';
import {
  FLOOR_H, SLOT_W, ROOM_D, CORR_HALF, CORE_W, COLS, CORRIDOR_Z, ELEV_X, ELEV_Z, SLOTS_PER_FLOOR,
  MAX_FLOORS, BUILDING_W, FRONT_Z, DOOR_X, STREET_Z, LOBBY_SLOTS,
  REAL_SEC_PER_HOUR, HOURS_PER_NIGHT, TIERS, BUILDABLES, UPGRADES, GUEST_TYPES,
  START_MONEY, QUEUE_MAX, BASE_PATIENCE, CLEAN_TIME,
} from './config.js';
import { createPerson, animatePerson, Bubble } from './characters.js';
import { Sfx } from './audio.js';

const SAVE_KEY = 'hotel-save-v2';
const QUEUE_POS = [[10.85, 3.4], [9.95, 3.4], [9.05, 3.4], [8.15, 3.4], [7.25, 3.4], [6.35, 3.4], [5.45, 3.4]];
const MAID_IDLE = [[1.3, 2.4], [2.2, 2.4], [1.3, 3.3], [2.2, 3.3], [3.1, 3.0]];
const LOBBY_IN_Z = FRONT_Z - 1.1;
const SPAWN_L = -14, SPAWN_R = BUILDING_W + 14;

function rand(a, b) { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(rand(a, b + 1)); }
const tierCss = (t) => '#' + TIERS[t].color.toString(16).padStart(6, '0');

function emptyFloor() { return Array.from({ length: SLOTS_PER_FLOOR }, () => ({ type: 'empty' })); }
function newState() {
  const ground = emptyFloor();
  for (const i of LOBBY_SLOTS) ground[i] = { type: 'lobby' };
  ground[0] = { type: 'room', tier: 0, status: 'clean' };
  ground[1] = { type: 'room', tier: 0, status: 'clean' };
  return {
    money: START_MONEY,
    time: 7,
    rating: 3,
    floors: 1,
    slots: [ground],
    upgrades: { floor: 0, maid: 0, reception: 0, decor: 0, marketing: 0, cleanfast: 0 },
    stats: { guests: 0, earned: 0, angry: 0, best: 0 },
    tutorial: true,
  };
}

export class Game {
  constructor(scene, view, hooks) {
    this.scene = scene;
    this.view = view;
    this.hooks = hooks; // { popup, toast, changed, floorsChanged }
    this.guests = [];
    this.queue = [];
    this.maids = [];
    this.selected = null;
    this.speed = 1;
    this.spawnAcc = 0.6;
    this.manualCleaning = null;
    this.autoAcc = 0;
    this.idSeq = 1;
    this.dayIncome = 0;
    this.load();
  }

  // ---------------- Persistência ----------------
  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { s = null; }
    this.state = s && s.slots && s.slots[0]?.length === SLOTS_PER_FLOOR ? s : newState();
    for (const row of this.state.slots) for (const sl of row) {
      if (sl.type === 'room' && sl.status !== 'clean') sl.status = 'dirty';
      delete sl.guest; delete sl.claimed; delete sl.cleanP; delete sl.cleaner;
    }
    this.state.upgrades = { ...newState().upgrades, ...this.state.upgrades };
    this.rebuildAll();
  }

  save() {
    try {
      const json = JSON.stringify(this.state, (k, v) => (k === 'guest' || k === 'claimed' ? undefined : v));
      localStorage.setItem(SAVE_KEY, json);
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
    this.view.setViewFloor(0);
    this.hooks.floorsChanged?.();
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
    const g = this.view.syncSlot(f, i, sl);
    this.view.setDirty(f, i, sl.type === 'room' && (sl.status === 'dirty' || sl.status === 'cleaning'));
    if (!g.userData.bubble) {
      const b = new Bubble(1.5);
      b.sprite.position.set(SLOT_W / 2, 2.5, -ROOM_D / 2);
      b.sprite.visible = false;
      g.add(b.sprite);
      g.userData.bubble = b;
    }
  }

  // ---------------- Consultas ----------------
  get hour() { return this.state.time % 24; }
  get day() { return Math.floor(this.state.time / 24) + 1; }
  slot(f, i) { return this.state.slots[f]?.[i]; }
  roomNumber(f, i) { return (f + 1) * 100 + i + 1; }

  allSlots() {
    const out = [];
    this.state.slots.forEach((row, f) => row.forEach((sl, i) => out.push({ f, i, sl })));
    return out;
  }
  rooms() { return this.allSlots().filter((s) => s.sl.type === 'room'); }
  facilities() { return this.allSlots().filter((s) => ['snack', 'gym', 'pool'].includes(s.sl.type)); }
  facilityTypes() { return new Set(this.facilities().map((s) => s.sl.type)); }

  floorStatus(f) {
    const row = this.state.slots[f] || [];
    let free = 0, dirty = 0, busy = 0;
    for (const sl of row) {
      if (sl.type !== 'room') continue;
      if (sl.status === 'clean') free++;
      else if (sl.status === 'dirty') dirty++;
      else busy++;
    }
    return { free, dirty, busy };
  }

  nightFactor() {
    const h = this.hour;
    if (h >= 20 || h < 5) return 1;
    if (h >= 17) return (h - 17) / 3;
    if (h < 7) return 1 - (h - 5) / 2;
    return 0;
  }

  // ---------------- Caminhos ----------------
  // qual espaço com porta contém (x, z)? null = área aberta (corredor, lobby, núcleo)
  slotAt(f, x, z) {
    if (Math.abs(z) <= CORR_HALF + 0.01 || x < CORE_W || x > BUILDING_W) return null;
    const col = Math.floor((x - CORE_W) / SLOT_W);
    if (col < 0 || col >= COLS) return null;
    const i = (z < 0 ? 0 : COLS) + col;
    const sl = this.slot(f, i);
    if (!sl || sl.type === 'lobby') return null;
    return i;
  }

  route(ent, toF, tx, tz) {
    const p = ent.mesh.position;
    const f = ent.f;
    const pts = [];
    const from = this.slotAt(f, p.x, p.z);
    if (from !== null) {
      const d = this.view.door(f, from);
      pts.push([d.x, f, d.zIn], [d.x, f, CORRIDOR_Z]);
    } else if (Math.abs(p.z - CORRIDOR_Z) > 0.05) pts.push([p.x, f, CORRIDOR_Z]);
    if (f !== toF) {
      pts.push([ELEV_X, f, CORRIDOR_Z], [ELEV_X, f, ELEV_Z], [ELEV_X, toF, ELEV_Z], [ELEV_X, toF, CORRIDOR_Z]);
    }
    const to = this.slotAt(toF, tx, tz);
    if (to !== null) {
      const d = this.view.door(toF, to);
      pts.push([d.x, toF, CORRIDOR_Z], [d.x, toF, d.zIn]);
    } else pts.push([tx, toF, CORRIDOR_Z]);
    pts.push([tx, toF, tz]);
    return pts;
  }

  setPath(ent, pts, then) {
    ent.path = pts;
    ent.onArrive = then;
    ent.lying = false;
    ent.mesh.rotation.set(0, ent.mesh.rotation.y, 0);
  }

  stepPath(ent, dt) {
    if (!ent.path || ent.path.length === 0) return true;
    const [tx, tf, tz] = ent.path[0];
    const ty = tf * FLOOR_H;
    const p = ent.mesh.position;
    const dx = tx - p.x, dy = ty - p.y, dz = tz - p.z;
    const dist = Math.hypot(dx, dy, dz);
    const vertical = Math.abs(dy) > 0.01 && Math.abs(dx) < 0.01 && Math.abs(dz) < 0.01;
    const sp = (vertical ? 4.5 : 3.2) * (ent.speedMul || 1) * dt;
    ent.inElev = vertical;
    if (dist <= sp) {
      p.set(tx, ty, tz);
      ent.f = tf;
      ent.path.shift();
    } else {
      p.x += (dx / dist) * sp; p.y += (dy / dist) * sp; p.z += (dz / dist) * sp;
      if (!vertical) {
        const target = Math.atan2(dx, dz);
        let d = target - ent.mesh.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        ent.mesh.rotation.y += d * Math.min(1, dt * 14);
      }
    }
    animatePerson(ent.mesh, dt, !vertical, ent.speedMul || 1);
    if (ent.path.length === 0) {
      ent.inElev = false;
      const cb = ent.onArrive; ent.onArrive = null;
      if (cb) cb();
      return true;
    }
    return false;
  }

  makeEntityMesh(opts) {
    const mesh = createPerson(opts);
    mesh.rotation.order = 'YXZ';
    this.scene.add(mesh);
    return { mesh };
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
    const fromLeft = Math.random() < 0.55;
    const hatOpts = t.id === 'vip' ? { hat: true, hatColor: 0x2a2a30 }
      : t.id === 'tourist' && Math.random() < 0.6 ? { hat: true, hatColor: 0xf3e2a0 }
        : t.id === 'backpacker' && Math.random() < 0.5 ? { hat: 'cap', hatColor: [0xd9473b, 0x4f9bd9, 0x6cbf4a][randi(0, 2)] } : {};
    const { mesh } = this.makeEntityMesh({
      shirt: t.shirt,
      suitcase: [0xd9473b, 0x4f9bd9, 0x8a5530, 0x3a3340, 0xa267d6][randi(0, 4)],
      ...hatOpts,
    });
    mesh.position.set(fromLeft ? SPAWN_L : SPAWN_R, 0, STREET_Z + rand(-0.3, 0.3));
    const bubble = new Bubble(1.3);
    bubble.sprite.position.y = 2.45;
    mesh.add(bubble.sprite);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 24), new THREE.MeshBasicMaterial({ color: 0xffd34d, side: THREE.DoubleSide, depthTest: false, transparent: true }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; ring.visible = false; ring.renderOrder = 9;
    mesh.add(ring);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 0.9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    hit.position.y = 1.3;
    mesh.add(hit);
    const patienceMul = 1 + this.state.upgrades.decor * 0.3;
    const g = {
      id: this.idSeq++, type: t, want: t.want, nights: randi(t.nights[0], t.nights[1]),
      mesh, bubble, ring, hit, f: 0,
      patience: BASE_PATIENCE * patienceMul * rand(0.85, 1.2), maxPatience: 0,
      state: 'arriving', visits: 0, sat: 60, waitFrac: 1, stayLeft: 0, room: null,
      speedMul: rand(0.9, 1.15), moodTimer: 0, mood: null,
    };
    g.maxPatience = g.patience;
    hit.userData = { kind: 'guest', guest: g };
    this.guests.push(g);
    this.queue.push(g);
    this.setPath(g, [[DOOR_X + rand(-0.4, 0.4), 0, STREET_Z], [DOOR_X, 0, FRONT_Z + 0.6], [DOOR_X, 0, LOBBY_IN_Z]], () => this.updateQueueTargets());
    if (this.state.tutorial && this.state.stats.guests === 0 && this.guests.length === 1) {
      this.hooks.toast('Um hóspede chegou! Clique nele e depois num quarto livre.', 'info');
    }
  }

  updateQueueTargets() {
    this.queue.forEach((g, idx) => {
      const [x, z] = QUEUE_POS[Math.min(idx, QUEUE_POS.length - 1)];
      g.queueIdx = idx;
      const p = g.mesh.position;
      const inside = p.z < FRONT_Z && p.z > CORR_HALF && p.x > CORE_W && p.x < CORE_W + 2 * SLOT_W;
      if (!inside) return;
      if (g.state === 'arriving' && g.path && g.path.length) return;
      g.state = 'queue';
      if (Math.hypot(p.x - x, p.z - z) > 0.05) {
        this.setPath(g, [[x, 0, z]], () => { g.mesh.rotation.y = Math.PI / 2; });
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

  bestRoomFor(g) {
    const free = this.rooms().filter((r) => r.sl.status === 'clean');
    if (!free.length) return null;
    const score = (r) => (r.sl.tier === g.want ? 0 : r.sl.tier > g.want ? 1 + (r.sl.tier - g.want) : 10);
    free.sort((a, b) => score(a) - score(b) || a.f - b.f);
    return free[0];
  }

  bedStand(f, i) {
    const bed = this.view.slotGroup(f, i).userData.bedSpot;
    return this.view.toWorld(f, i, new THREE.Vector3(bed.x, 0, bed.z + 1.05));
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
    const stand = this.bedStand(f, i);
    this.setPath(g, this.route(g, f, stand.x, stand.z), () => this.enterBed(g));
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
    const bed = this.view.slotGroup(f, i).userData.bedSpot;
    g.mesh.position.copy(this.view.toWorld(f, i, bed));
    g.mesh.rotation.set(-Math.PI / 2, this.view.slotRotY(i), 0);
    g.lying = true;
    g.state = 'inRoom';
    if (g.stayLeft <= 0) g.stayLeft = g.nights * HOURS_PER_NIGHT;
    g.nextVisitCheck = 1;
    if (g.mesh.userData.suitcase) g.mesh.userData.suitcase.visible = false;
  }

  getUp(g) {
    const { f, i } = g.room;
    const stand = this.bedStand(f, i);
    g.mesh.rotation.set(0, this.view.slotRotY(i) + Math.PI, 0);
    g.mesh.position.copy(stand);
    g.lying = false;
  }

  tryVisitFacility(g) {
    const facs = this.facilities();
    if (!facs.length || g.visits >= 2) return;
    const options = [];
    for (const fc of facs) {
      const spots = this.view.slotGroup(fc.f, fc.i).userData.spots;
      const used = this.guests.filter((o) => o.facility && o.facility.f === fc.f && o.facility.i === fc.i).map((o) => o.facility.spot);
      for (let s = 0; s < spots.length; s++) if (!used.includes(s)) options.push({ ...fc, spot: s });
    }
    if (!options.length) return;
    const pick = options[randi(0, options.length - 1)];
    g.facility = { f: pick.f, i: pick.i, spot: pick.spot, type: pick.sl.type };
    g.state = 'toFacility';
    const spot = this.view.slotGroup(pick.f, pick.i).userData.spots[pick.spot];
    const w = this.view.toWorld(pick.f, pick.i, new THREE.Vector3(spot.x, 0, spot.z));
    this.getUp(g);
    this.setPath(g, this.route(g, pick.f, w.x, w.z), () => this.atFacility(g));
  }

  atFacility(g) {
    const fc = g.facility;
    const grp = this.view.slotGroup(fc.f, fc.i);
    if (!grp || this.slot(fc.f, fc.i).type !== fc.type) { this.returnToRoom(g); return; }
    const ud = grp.userData;
    const spot = ud.spots[fc.spot];
    g.state = 'atFacility';
    g.facTime = 1.5;
    const rotY = this.view.slotRotY(fc.i);
    g.mesh.rotation.set(0, rotY + (ud.faceSpots ? ud.faceSpots[fc.spot] : Math.PI), 0);
    g.swimming = fc.type === 'pool' && fc.spot < (ud.swimSpots || 0);
    if (g.swimming) g.mesh.position.y = fc.f * FLOOR_H - 0.55;
    else g.mesh.position.y = fc.f * FLOOR_H + (spot.y || 0);
    const [a, b] = BUILDABLES[fc.type].spend;
    const amount = randi(a, b);
    this.earn(amount, g.mesh.position.clone().add(new THREE.Vector3(0, 2.6, 0)));
    g.visits++;
    g.bubble.sprite.visible = true;
    g.bubble.set(BUILDABLES[fc.type].icon);
  }

  returnToRoom(g) {
    g.facility = null;
    g.swimming = false;
    g.state = 'toRoom';
    g.bubble.sprite.visible = false;
    g.mesh.rotation.set(0, g.mesh.rotation.y, 0); g.lying = false;
    g.mesh.position.y = g.f * FLOOR_H;
    const { f, i } = g.room;
    const stand = this.bedStand(f, i);
    this.setPath(g, this.route(g, f, stand.x, stand.z), () => this.enterBed(g));
  }

  checkout(g) {
    const { f, i } = g.room;
    const sl = this.slot(f, i);
    let sat = 58 + g.waitFrac * 25;
    const diff = sl.tier - g.want;
    if (diff < 0) sat -= 25 * -diff; else if (diff > 0) sat += 8;
    sat += this.facilityTypes().size * 6 + g.visits * 6 + this.state.upgrades.decor * 4;
    sat = Math.max(0, Math.min(100, sat));
    g.sat = sat;
    const payTier = Math.min(sl.tier, g.want);
    const base = TIERS[payTier].price * g.nights;
    const tip = Math.round(base * Math.max(0, (sat - 50) / 100));
    this.getUp(g);
    const pos = g.mesh.position.clone().add(new THREE.Vector3(0, 2.4, 0));
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
    g.bubble.set(g.mood, 1, null, sat >= 45 ? '#ffffff' : '#ef4b5c');
    if (g.mesh.userData.suitcase) g.mesh.userData.suitcase.visible = true;
    this.setPath(g, this.route(g, 0, DOOR_X, LOBBY_IN_Z), () => this.walkAway(g));
    if (this.state.tutorial && this.state.stats.guests === 1) {
      this.hooks.toast('Hóspede pagou! Limpe o quarto clicando nele. Use o dinheiro para construir e em MELHORIAS.', 'info');
    }
    this.hooks.changed();
  }

  walkAway(g) {
    const exitX = Math.random() < 0.5 ? SPAWN_L : SPAWN_R;
    this.setPath(g, [[DOOR_X, 0, FRONT_Z + 0.6], [DOOR_X, 0, STREET_Z], [exitX, 0, STREET_Z]], () => { g.state = 'gone'; });
  }

  guestGivesUp(g) {
    this.queue = this.queue.filter((q) => q !== g);
    if (this.selected === g) this.select(null);
    g.state = 'leaving';
    g.bubble.set('angry', 1, null, '#ef4b5c');
    g.mood = 'angry'; g.moodTimer = 4;
    this.state.stats.angry++;
    this.bumpRating(0, 0.05);
    Sfx.angry();
    this.hooks.toast(`${g.type.name} cansou de esperar e foi embora!`, 'bad');
    this.setPath(g, [[g.mesh.position.x, 0, LOBBY_IN_Z], [DOOR_X, 0, LOBBY_IN_Z]], () => this.walkAway(g));
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

  slotCenter(f, i, y = 1.6) { return this.view.toWorld(f, i, new THREE.Vector3(SLOT_W / 2, y, -ROOM_D / 2)); }

  // ---------------- Limpeza ----------------
  cleanTime() { return CLEAN_TIME * (this.state.upgrades.cleanfast ? 0.6 : 1); }

  startManualClean(f, i) {
    const sl = this.slot(f, i);
    if (sl.status !== 'dirty') return;
    if (sl.claimed !== undefined && sl.claimed !== null) { this.hooks.toast('Uma camareira já está indo limpar esse quarto.', 'info'); return; }
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
    if (this.manualCleaning && this.manualCleaning.f === f && this.manualCleaning.i === i) this.manualCleaning = null;
    Sfx.clean();
    if (f === this.view.viewFloor) this.hooks.popup(this.slotCenter(f, i, 1.8), 'Limpo!', '#9fe870');
    this.hooks.changed();
  }

  addMaid() {
    const { mesh } = this.makeEntityMesh({ shirt: 0x34507a, pants: 0x34507a, hairStyle: 1, apron: true });
    const idx = this.maids.length;
    const [x, z] = MAID_IDLE[idx % MAID_IDLE.length];
    mesh.position.set(x, 0, z);
    mesh.rotation.y = Math.PI / 2;
    const bubble = new Bubble(1.2);
    bubble.sprite.position.y = 2.3; bubble.sprite.visible = false;
    mesh.add(bubble.sprite);
    this.maids.push({ id: idx, mesh, bubble, f: 0, state: 'idle', target: null, home: [x, z], speedMul: 1.15 });
  }

  updateMaids(dt) {
    for (const m of this.maids) {
      if (m.state === 'idle') {
        animatePerson(m.mesh, dt, false);
        const dirty = this.rooms().filter((r) => r.sl.status === 'dirty' && (r.sl.claimed === undefined || r.sl.claimed === null));
        if (dirty.length) {
          dirty.sort((a, b) => Math.abs(a.f - m.f) - Math.abs(b.f - m.f));
          const t = dirty[0];
          t.sl.claimed = m.id;
          m.target = { f: t.f, i: t.i };
          m.state = 'walking';
          const w = this.view.toWorld(t.f, t.i, new THREE.Vector3(2.4, 0, -1.6));
          this.setPath(m, this.route(m, t.f, w.x, w.z), () => {
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
        if (sl.cleanP >= 1) {
          this.finishClean(f, i);
          m.bubble.sprite.visible = false;
          const more = this.rooms().some((r) => r.sl.status === 'dirty' && (r.sl.claimed === undefined || r.sl.claimed === null));
          if (more) m.state = 'idle'; else this.maidGoHome(m);
        }
      }
    }
  }

  maidGoHome(m) {
    m.state = 'home';
    m.bubble.sprite.visible = false;
    m.mesh.rotation.set(0, m.mesh.rotation.y, 0);
    this.setPath(m, this.route(m, 0, m.home[0], m.home[1]), () => { m.state = 'idle'; m.mesh.rotation.y = Math.PI / 2; });
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
    this.hooks.popup(this.slotCenter(f, i, 2), `-$${cost}`, '#ff8a80');
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
    Sfx.build();
    this.hooks.toast(`Quarto ${this.roomNumber(f, i)} agora é ${next.name}!`, 'good');
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
      this.state.slots.push(emptyFloor());
      this.view.setFloors(this.state.floors);
      for (let i = 0; i < SLOTS_PER_FLOOR; i++) this.syncSlot(this.state.floors - 1, i);
      this.hooks.toast(`Novo andar construído! Agora são ${this.state.floors} andares.`, 'good');
      this.hooks.floorsChanged?.(this.state.floors - 1);
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
    if (dt <= 0) { this.updateVisibility(); return; }
    const st = this.state;
    const prevDay = this.day;
    const dh = dt / REAL_SEC_PER_HOUR;
    st.time += dh;
    if (this.day !== prevDay) this.newDay(prevDay);

    this.spawnAcc += this.arrivalRatePerHour() * dh;
    if (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.queue.length < QUEUE_MAX) {
        this.spawnGuest();
        Sfx.bell();
      }
    }

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
          g.bubble.set('bed', Math.max(0, g.patience / g.maxPatience), tierCss(g.want), this.selected === g ? '#ffd34d' : '#ffffff', g.nights);
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
          if (g.swimming) g.mesh.position.y = g.facility.f * FLOOR_H - 0.55 + Math.sin(performance.now() / 300 + g.id) * 0.05;
          else {
            const grp = this.view.slotGroup(g.facility.f, g.facility.i);
            const running = g.facility.type === 'gym' && g.facility.spot < (grp?.userData.runSpots || 0);
            animatePerson(g.mesh, dt, running, 1.4);
          }
          if (g.facTime <= 0) this.returnToRoom(g);
          break;
        }
        case 'leaving':
          this.stepPath(g, dt);
          break;
        default: break;
      }
    }
    const gone = this.guests.filter((g) => g.state === 'gone');
    if (gone.length) {
      for (const g of gone) this.scene.remove(g.mesh);
      this.guests = this.guests.filter((g) => g.state !== 'gone');
    }

    if (this.manualCleaning) {
      const { f, i } = this.manualCleaning;
      const sl = this.slot(f, i);
      if (!sl || sl.status !== 'cleaning') this.manualCleaning = null;
      else {
        sl.cleanP += dt / this.cleanTime();
        if (sl.cleanP >= 1) this.finishClean(f, i);
      }
    }

    this.updateMaids(dt);
    this.updateSlotVisuals(dt);
    this.updateVisibility();
  }

  // só aparece quem está no andar visto (e fora do poço do elevador)
  updateVisibility() {
    const vf = this.view.viewFloor;
    for (const e of this.guests) e.mesh.visible = e.f === vf && !e.inElev;
    for (const e of this.maids) e.mesh.visible = e.f === vf && !e.inElev;
  }

  updateSlotVisuals(dt) {
    const night = this.nightFactor();
    const t = performance.now();
    for (const { f, i, sl } of this.allSlots()) {
      if (sl.type === 'lobby') continue;
      const grp = this.view.slotGroup(f, i);
      if (!grp) continue;
      const b = grp.userData.bubble;
      if (sl.type === 'room') {
        if (sl.status === 'dirty') { b.sprite.visible = true; b.set('dirty', 1, null, '#ef4b5c'); }
        else if (sl.status === 'cleaning') { b.sprite.visible = true; b.set('broom', Math.min(1, sl.cleanP || 0), null, '#52c45a', 0, '#52c45a'); }
        else b.sprite.visible = false;
        this.view.setLight(f, i, sl.status === 'occupied', night);
      } else {
        b.sprite.visible = false;
        if (grp.userData.plus) grp.userData.plus.position.y = 1.0 + Math.sin(t / 400 + i) * 0.08;
      }
      if (f !== this.view.viewFloor) continue;
      if (grp.userData.water) grp.userData.water.offset.x += dt * 0.04;
      if (grp.userData.ring) grp.userData.ring.position.y = grp.userData.ringY + Math.sin(t / 600) * 0.03;
      for (const n of grp.userData.npcs || []) animatePerson(n, dt, false);
    }
    const rec = this.view.lobby.userData.receptionist;
    animatePerson(rec, dt, false);
    rec.rotation.y = -Math.PI / 2 + (this.selected ? Math.sin(t / 300) * 0.25 : 0);
  }

  newDay(prevDay) {
    const sal = this.salaries();
    const income = this.dayIncome;
    this.dayIncome = 0;
    if (sal) {
      this.state.money -= sal;
      this.hooks.popup(new THREE.Vector3(DOOR_X, 2.5, 3), `-$${sal} salários`, '#ff8a80');
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
