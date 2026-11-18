// Lógica do jogo: temporada de um hotel, hóspedes, funcionários, eventos, metas e pontuação.
import * as THREE from 'three';
import {
  FLOOR_H, SLOT_W, ROOM_D, CORE_W, CORRIDOR_Z, ELEV_X, ELEV_Z, SLOTS_PER_FLOOR,
  BUILDING_W, FRONT_Z, DOOR_X, STREET_Z, LOBBY_SLOTS,
  REAL_SEC_PER_HOUR, HOURS_PER_NIGHT, TIERS, BUILDABLES, UPGRADES, GUEST_TYPES,
  QUEUE_MAX, BASE_PATIENCE, CLEAN_TIME,
} from './config.js';
import { SEASON_MONTHS, DAILY_MONTHS, MONTHS } from './levels.js';
import { mulberry32 } from './meta.js';
import { createPerson, animatePerson, Bubble } from './characters.js';
import { Sfx } from './audio.js';

// fila em frente ao balcão (x 7..10.4), virando para a esquerda
const QUEUE_POS = [[8.7, -1.65], [8.7, -0.85], [7.8, -0.25], [6.9, -0.25], [6.0, -0.25], [5.1, -0.25], [4.2, -0.25]];
const STAFF_IDLE = [[11.2, -1.4], [12.0, -1.4], [11.2, -0.6], [12.0, -0.6], [12.4, -2.2], [10.6, -2.2], [12.6, -0.4], [11.6, -3.0]];
const LOBBY_IN_Z = 0.6;
const SPAWN_L = -14;
const spawnR = () => BUILDING_W + 14;
const REPAIR_COST = 40;
const REQUESTS = [
  { type: 'towel', icon: 'towel', name: 'toalhas' },
  { type: 'food', icon: 'burger', name: 'serviço de quarto' },
  { type: 'noise', icon: 'noise', name: 'reclamação de barulho' },
];
const tierCss = (t) => '#' + TIERS[t].color.toString(16).padStart(6, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function emptyFloor() { return Array.from({ length: SLOTS_PER_FLOOR }, () => ({ type: 'empty' })); }

export class Game {
  // level: definição do hotel (levels.js); opts: { daily, seed, perks }
  constructor(scene, view, hooks, level, opts = {}) {
    this.scene = scene;
    this.view = view;
    this.hooks = hooks; // { popup, toast, changed, floorsChanged, event, seasonEnd }
    this.level = level;
    this.mods = level.mods || {};
    this.daily = !!opts.daily;
    this.perks = this.daily ? {} : (opts.perks || {});
    this.r = opts.seed ? mulberry32(opts.seed) : Math.random;
    this.seasonMonths = this.daily ? DAILY_MONTHS : SEASON_MONTHS;
    this.saveKey = this.daily ? null : `hotel-v5-${level.id}`;
    this.guests = [];
    this.queue = [];
    this.staff = [];
    this.fans = [];
    this.selected = null;
    this.speed = 1;
    this.spawnAcc = 0.6;
    this.manualJob = null; // { f, i, kind: 'clean' | 'repair' }
    this.autoAcc = 0;
    this.idSeq = 1;
    this.ended = false;
    this.load();
  }

  rand(a, b) { return a + this.r() * (b - a); }
  randi(a, b) { return Math.floor(this.rand(a, b + 1)); }
  perk(id) { return this.perks[id] || 0; }

  newState() {
    const ground = emptyFloor();
    for (const i of LOBBY_SLOTS) ground[i] = { type: 'lobby' };
    ground[2] = { type: 'room', tier: 0, status: 'clean' };
    ground[3] = { type: 'room', tier: 0, status: 'clean' };
    return {
      levelId: this.level.id,
      money: this.level.startMoney + this.perk('capital') * 150,
      time: 7,
      rating: 3,
      floors: 1,
      slots: [ground],
      upgrades: Object.fromEntries(Object.keys(UPGRADES).map((k) => [k, 0])),
      stats: { guests: 0, earned: 0, angry: 0, best: 0, requests: 0, combo: 0, bestCombo: 0, dayIncome: 0 },
      event: null,       // evento agendado/ativo: { type, at, until }
      tutorial: this.level.id === 'br' && !this.daily && !this.hooks.seenTutorial?.(),
    };
  }

  // ---------------- Persistência ----------------
  hasSave() {
    if (!this.saveKey) return false;
    try { return !!localStorage.getItem(this.saveKey); } catch { return false; }
  }

  load() {
    let s = null;
    if (this.saveKey) { try { s = JSON.parse(localStorage.getItem(this.saveKey)); } catch { s = null; } }
    const fresh = this.newState();
    this.state = s && s.slots && s.slots[0]?.length === SLOTS_PER_FLOOR && s.levelId === this.level.id ? s : fresh;
    for (const row of this.state.slots) for (const sl of row) {
      if (sl.type !== 'room') continue;
      if (sl.status === 'occupied' || sl.status === 'cleaning') sl.status = 'dirty';
      if (sl.status === 'repairing') sl.status = 'broken';
      delete sl.guest; delete sl.claimed; delete sl.workP; delete sl.worker;
    }
    this.state.upgrades = { ...fresh.upgrades, ...this.state.upgrades };
    this.state.stats = { ...fresh.stats, ...this.state.stats };
    this.rebuildAll();
  }

  save() {
    if (!this.saveKey || this.ended) return;
    try {
      const json = JSON.stringify(this.state, (k, v) => (k === 'guest' || k === 'claimed' ? undefined : v));
      localStorage.setItem(this.saveKey, json);
    } catch { /* ignore */ }
  }

  clearSave() {
    if (!this.saveKey) return;
    try { localStorage.removeItem(this.saveKey); } catch { /* ignore */ }
  }

  // remove pessoas da cena (ao trocar de hotel)
  dispose() {
    for (const g of this.guests) this.scene.remove(g.mesh);
    for (const m of this.staff) this.scene.remove(m.mesh);
    for (const f of this.fans) this.scene.remove(f);
    this.guests = []; this.queue = []; this.staff = []; this.fans = [];
  }

  rebuildAll() {
    const st = this.state;
    this.view.removeSlotsAbove(st.floors);
    this.view.setFloors(st.floors);
    for (let f = 0; f < st.floors; f++) for (let i = 0; i < SLOTS_PER_FLOOR; i++) this.syncSlot(f, i);
    this.view.setDecor(st.upgrades.decor);
    while (this.staffOf('maid').length < st.upgrades.maid) this.addStaff('maid');
    while (this.staffOf('tech').length < st.upgrades.tech) this.addStaff('tech');
    this.hooks.changed();
  }

  syncSlot(f, i) {
    const sl = this.state.slots[f][i];
    if (sl.type === 'lobby') return;
    const g = this.view.syncSlot(f, i, sl);
    this.view.setDirty(f, i, sl.type === 'room' && (sl.status === 'dirty' || sl.status === 'cleaning'));
    if (!g.userData.bubble) {
      const b = new Bubble(1.5);
      b.sprite.position.set(SLOT_W / 2, 1.55, -0.9);
      b.sprite.visible = false;
      g.add(b.sprite);
      g.userData.bubble = b;
    }
  }

  // ---------------- Consultas ----------------
  get hour() { return this.state.time % 24; }
  get day() { return Math.floor(this.state.time / 24) + 1; }
  get monthIndex() { return Math.min(this.day, this.seasonMonths) - 1; }   // 0..11
  get monthName() { return MONTHS[this.monthIndex % 12]; }
  slot(f, i) { return this.state.slots[f]?.[i]; }
  roomNumber(f, i) { return (f + 1) * 100 + i + 1; }
  facilityName(type) { return this.level.facilityNames?.[type] || BUILDABLES[type].name; }
  maxFloors() { return this.level.maxFloors; }

  allSlots() {
    const out = [];
    this.state.slots.forEach((row, f) => row.forEach((sl, i) => out.push({ f, i, sl })));
    return out;
  }
  rooms() { return this.allSlots().filter((s) => s.sl.type === 'room'); }
  facilities() { return this.allSlots().filter((s) => ['snack', 'gym', 'pool'].includes(s.sl.type)); }
  facilityTypes() { return new Set(this.facilities().map((s) => s.sl.type)); }
  staffOf(role) { return this.staff.filter((s) => s.role === role); }

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

  festivalActive() {
    const fest = this.level.festival;
    return fest && fest.months.includes(this.monthIndex + 1) ? fest : null;
  }
  get blackout() { const e = this.state.event; return e && e.type === 'blackout' && e.active && !this.state.upgrades.generator; }
  get heatwave() { const e = this.state.event; return e && e.type === 'heatwave' && e.active; }

  // ---------------- Metas e pontuação ----------------
  score() {
    const s = this.state.stats;
    return Math.max(0, Math.round(s.earned + s.guests * 20 + this.state.rating * 400 + s.bestCombo * 25 + s.requests * 15 - s.angry * 50));
  }

  goalStatus() {
    const st = this.state, s = st.stats;
    return this.level.goals.map((goal) => {
      let done = false, text = '';
      if (goal.kind === 'earned') { done = s.earned >= goal.value; text = `$${s.earned.toLocaleString('pt-BR')} / $${goal.value.toLocaleString('pt-BR')}`; }
      else if (goal.kind === 'rating') { done = st.rating >= goal.value; text = `★ ${st.rating.toFixed(1)} / ${goal.value.toFixed(1)}`; }
      else if (goal.kind === 'angry') { done = s.angry <= goal.value; text = `${s.angry} / máx. ${goal.value}`; }
      else if (goal.kind === 'guests') { done = s.guests >= goal.value; text = `${s.guests} / ${goal.value}`; }
      return { label: goal.label, done, text, kind: goal.kind };
    });
  }

  // ---------------- Caminhos ----------------
  route(ent, toF, tx, tz) {
    const p = ent.mesh.position;
    const f = ent.f;
    const pts = [];
    if (Math.abs(p.z - CORRIDOR_Z) > 0.05) pts.push([p.x, f, CORRIDOR_Z]);
    if (f !== toF) {
      pts.push([ELEV_X, f, CORRIDOR_Z], [ELEV_X, f, ELEV_Z], [ELEV_X, toF, ELEV_Z], [ELEV_X, toF, CORRIDOR_Z]);
    }
    pts.push([tx, toF, CORRIDOR_Z], [tx, toF, tz]);
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
    if (ent.platform) ent.platform.visible = vertical;
    if (dist <= sp) {
      p.set(tx, ty, tz);
      ent.f = tf;
      ent.path.shift();
    } else {
      p.x += (dx / dist) * sp; p.y += (dy / dist) * sp; p.z += (dz / dist) * sp;
      if (!vertical) {
        let d = Math.atan2(dx, dz) - ent.mesh.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        ent.mesh.rotation.y += d * Math.min(1, dt * 14);
      }
    }
    animatePerson(ent.mesh, dt, !vertical, ent.speedMul || 1);
    if (ent.path.length === 0) {
      ent.inElev = false;
      if (ent.platform) ent.platform.visible = false;
      const cb = ent.onArrive; ent.onArrive = null;
      if (cb) cb();
      return true;
    }
    return false;
  }

  makeEntityMesh(opts) {
    const mesh = createPerson(opts);
    mesh.rotation.order = 'YXZ';
    // cabine do elevador (aparece durante a subida/descida)
    const platform = new THREE.Group();
    const floorM = new THREE.MeshStandardMaterial({ color: 0x8a90a0, roughness: 0.4, metalness: 0.4 });
    const pf = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 2.0), floorM);
    pf.position.y = -0.06;
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 2.0), floorM);
    top.position.y = 2.45;
    platform.add(pf, top);
    for (const x of [-1.1, 1.1]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.5, 0.06), floorM);
      bar.position.set(x, 1.2, -0.95); platform.add(bar);
    }
    platform.visible = false;
    mesh.add(platform);
    this.scene.add(mesh);
    return { mesh, platform };
  }

  // ---------------- Hóspedes ----------------
  pickGuestType() {
    const r = this.state.rating;
    const vipBoost = this.mods.vipBoost;
    const pool = GUEST_TYPES.filter((t) => r >= t.minRating || (vipBoost && t.id === 'vip'));
    const w = (t) => (vipBoost && t.id === 'vip' ? 4 : t.weight);
    const total = pool.reduce((a, t) => a + w(t), 0);
    let x = this.r() * total;
    for (const t of pool) { x -= w(t); if (x <= 0) return t; }
    return pool[0];
  }

  patienceBase() {
    let p = BASE_PATIENCE * (1 + this.state.upgrades.decor * 0.3) * (this.mods.patience || 1) * (1 + 0.1 * this.perk('patience'));
    if (this.heatwave && !this.facilityTypes().has('pool')) p *= 0.85;
    return p;
  }

  // special: { inspector: true } | { celebrity: true }
  spawnGuest(special = null) {
    const t = special?.celebrity ? GUEST_TYPES.find((x) => x.id === 'vip') : this.pickGuestType();
    const pal = this.level.guests;
    const fromLeft = this.r() < 0.55;
    const hatKind = pal.hats[this.randi(0, pal.hats.length - 1)];
    const hatOpts = special?.inspector ? { hat: true, hatColor: 0x3a3340 }
      : t.id === 'vip' ? { hat: 'shades' }
        : hatKind === 'sun' ? { hat: true, hatColor: 0xf3e2a0 }
          : hatKind === 'none' ? {} : { hat: hatKind, hatColor: pal.palette[this.randi(0, pal.palette.length - 1)] };
    const shirt = special?.inspector ? 0x5a5f68 : this.r() < 0.5 ? t.shirt : pal.palette[this.randi(0, pal.palette.length - 1)];
    const { mesh, platform } = this.makeEntityMesh({
      shirt,
      suitcase: [0xd9473b, 0x4f9bd9, 0x8a5530, 0x3a3340, 0xa267d6][this.randi(0, 4)],
      ...hatOpts,
    });
    mesh.position.set(fromLeft ? SPAWN_L : spawnR(), 0, STREET_Z + this.rand(-0.3, 0.3));
    const bubble = new Bubble(1.3);
    bubble.sprite.position.y = 2.45;
    mesh.add(bubble.sprite);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 24), new THREE.MeshBasicMaterial({ color: 0xffd34d, side: THREE.DoubleSide, depthTest: false, transparent: true }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; ring.visible = false; ring.renderOrder = 9;
    mesh.add(ring);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 0.9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    hit.position.y = 1.3;
    mesh.add(hit);
    // exigências especiais (só fazem sentido com mais de um andar)
    let trait = null;
    if (!special && this.state.floors > 1) {
      const x = this.r();
      if (x < 0.13) trait = 'ground'; else if (x < 0.26) trait = 'high';
    }
    let want = t.want;
    if (!special?.celebrity && this.mods.wantUp && this.r() < this.mods.wantUp) want = Math.min(2, want + 1);
    if (special?.inspector) want = this.randi(0, 2);
    if (special?.celebrity) want = 2;
    const nights = this.randi(t.nights[0], t.nights[1]) + (this.mods.nightsPlus || 0);
    const patience = this.patienceBase() * this.rand(0.85, 1.2) * (special?.celebrity ? 0.7 : 1);
    const name = special?.inspector ? 'Inspetor (disfarçado)' : special?.celebrity ? 'Celebridade famosa' : trait === 'ground' ? `${t.name} idoso` : trait === 'high' ? `${t.name} (quer vista)` : t.name;
    const g = {
      id: this.idSeq++, type: t, name, want, nights, trait,
      inspector: !!special?.inspector, celebrity: !!special?.celebrity,
      mesh, platform, bubble, ring, hit, f: 0,
      patience, maxPatience: patience,
      state: 'arriving', visits: 0, sat: 60, waitFrac: 1, stayLeft: 0, room: null,
      speedMul: this.rand(0.9, 1.15), moodTimer: 0, mood: null,
      request: null, reqDone: 0, reqFailed: 0,
    };
    hit.userData = { kind: 'guest', guest: g };
    this.guests.push(g);
    this.queue.push(g);
    this.setPath(g, [[DOOR_X + this.rand(-0.4, 0.4), 0, STREET_Z], [DOOR_X, 0, LOBBY_IN_Z]], () => this.updateQueueTargets());
    if (this.state.tutorial && this.state.stats.guests === 0 && this.guests.length === 1) {
      this.hooks.toast('Um hóspede chegou! Clique nele e depois num quarto LIVRE (placa verde).', 'info');
    }
    return g;
  }

  updateQueueTargets() {
    this.queue.forEach((g, idx) => {
      const [x, z] = QUEUE_POS[Math.min(idx, QUEUE_POS.length - 1)];
      g.queueIdx = idx;
      const p = g.mesh.position;
      const inside = p.z < FRONT_Z && p.x > CORE_W && p.x < CORE_W + 2 * SLOT_W;
      if (!inside) return;
      if (g.state === 'arriving' && g.path && g.path.length) return;
      g.state = 'queue';
      if (Math.hypot(p.x - x, p.z - z) > 0.05) {
        this.setPath(g, [[x, 0, z]], () => { g.mesh.rotation.y = idx < 2 ? Math.PI : Math.PI * 0.75; });
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
    const fest = this.festivalActive()?.mult || 1;
    const seasonal = this.mods.seasonal?.[this.monthIndex + 1] || 1;
    const lvl = (this.mods.arrivals || 1) * (1 + 0.08 * this.perk('fame'));
    // cresce mais devagar que o número de quartos (raiz), para a fila não explodir em hotéis grandes
    const A = this.arrivalA ?? 0.08, B = this.arrivalB ?? 0.13;
    return (A + B * Math.sqrt(rooms)) * tod * ratingF * mk * fac * fest * seasonal * lvl * (this.arrivalScale ?? 1);
  }

  highFloor() { return Math.min(2, this.state.floors - 1); }

  roomScoreFor(g, r) {
    let s = r.sl.tier === g.want ? 0 : r.sl.tier > g.want ? 1 + (r.sl.tier - g.want) : 10;
    if (g.trait === 'ground' && r.f > 0) s += 6;
    if (g.trait === 'high' && r.f < this.highFloor()) s += 4;
    return s;
  }

  bestRoomFor(g) {
    const free = this.rooms().filter((r) => r.sl.status === 'clean');
    if (!free.length) return null;
    free.sort((a, b) => this.roomScoreFor(g, a) - this.roomScoreFor(g, b) || a.f - b.f);
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
      const msg = { dirty: 'Esse quarto está sujo! Limpe antes.', cleaning: 'Esse quarto ainda está sendo limpo.', broken: 'Esse quarto está quebrado! Conserte antes.', repairing: 'Esse quarto está em conserto.' }[sl.status] || 'Quarto ocupado.';
      this.hooks.toast(msg, 'warn');
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
    // combo: atender rápido em sequência
    const s = this.state.stats;
    if (g.waitFrac >= 0.6) {
      s.combo++;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      if (s.combo >= 2) {
        const bonus = Math.round(s.combo * 4 * (1 + 0.15 * this.perk('tips')));
        this.earn(bonus, new THREE.Vector3(8.7, 2.6, 0), `Combo x${s.combo}! +$${bonus}`, '#7ee0ff');
      }
    } else s.combo = 0;
    if (g.celebrity) this.dismissFans();
    if (this.state.tutorial && this.state.stats.guests === 0) {
      this.hooks.toast('Ótimo! Quando ele sair, o quarto fica SUJO (placa laranja): clique nele para limpar.', 'info');
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
    // na onda de calor todo mundo quer piscina
    let pick = options[this.randi(0, options.length - 1)];
    if (this.heatwave) pick = options.find((o) => o.sl.type === 'pool') || pick;
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
    g.mesh.position.y = g.swimming ? fc.f * FLOOR_H - 0.55 : fc.f * FLOOR_H + (spot.y || 0);
    const [a, b] = BUILDABLES[fc.type].spend;
    let amount = this.randi(a, b);
    if (fc.type === 'snack' && this.mods.snackSpend) amount = Math.round(amount * this.mods.snackSpend);
    if (fc.type === 'pool' && this.heatwave) amount = Math.round(amount * 1.5);
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

  // ---------------- Pedidos durante a estadia ----------------
  makeRequest(g) {
    const req = REQUESTS[this.randi(0, REQUESTS.length - 1)];
    g.request = { ...req, left: 3, max: 3 };
    if (this.state.tutorial || !this.seenRequest) {
      this.seenRequest = true;
      this.hooks.toast(`Quarto ${this.roomNumber(g.room.f, g.room.i)} pediu ${req.name}! Clique no quarto (placa roxa) para atender.`, 'info');
    }
    Sfx.bell();
  }

  fulfillRequest(f, i) {
    const sl = this.slot(f, i);
    const g = sl?.guest;
    if (!g || !g.request) return false;
    g.request = null;
    g.reqDone++;
    this.state.stats.requests++;
    const tip = Math.round(this.randi(8, 15) * (1 + 0.15 * this.perk('tips')));
    this.earn(tip, this.slotCenter(f, i, 2.2), `Pedido atendido! +$${tip}`, '#d6b4ff');
    return true;
  }

  checkout(g) {
    const { f, i } = g.room;
    const sl = this.slot(f, i);
    let sat = 58 + g.waitFrac * 25;
    const diff = sl.tier - g.want;
    if (diff < 0) sat -= 25 * -diff; else if (diff > 0) sat += 8;
    sat += this.facilityTypes().size * 6 + g.visits * 6 + this.state.upgrades.decor * 4;
    sat += g.reqDone * 8 - g.reqFailed * 15;
    if (g.trait === 'ground') sat += f === 0 ? 6 : -25;
    if (g.trait === 'high') sat += f >= this.highFloor() ? 12 : -15;
    sat = clamp(sat, 0, 100);
    g.sat = sat;
    const payTier = Math.min(sl.tier, g.want);
    const price = TIERS[payTier].price * (payTier === 2 ? (this.mods.suiteMult || 1) : 1);
    const base = Math.round(price * g.nights);
    const tip = Math.round(base * Math.max(0, (sat - 50) / 100) * (1 + 0.15 * this.perk('tips')));
    this.getUp(g);
    const pos = g.mesh.position.clone().add(new THREE.Vector3(0, 2.4, 0));
    this.earn(base + tip, pos, tip > 0 ? `+$${base} (+$${tip} gorjeta)` : null);
    this.state.stats.guests++;
    this.bumpRating(sat, 0.12);
    // hóspedes especiais
    if (g.inspector) {
      if (sat >= 70) {
        this.state.rating = clamp(this.state.rating + 0.4, 0.5, 5);
        this.earn(150, pos.clone().add(new THREE.Vector3(0, 0.6, 0)), 'Inspetor aprovou! +$150', '#7ee0ff');
        this.hooks.event?.({ icon: 'star', title: 'O inspetor adorou!', text: 'Avaliação +0,4 e bônus de $150.', kind: 'good' });
      } else {
        this.state.rating = clamp(this.state.rating - 0.4, 0.5, 5);
        this.hooks.event?.({ icon: 'angry', title: 'O inspetor não gostou...', text: 'Avaliação −0,4. Dê o quarto que ele quer e atenda rápido.', kind: 'bad' });
      }
    }
    if (g.celebrity) {
      if (sl.tier === 2 && sat >= 60) {
        this.state.rating = clamp(this.state.rating + 0.3, 0.5, 5);
        this.earn(250, pos.clone().add(new THREE.Vector3(0, 0.6, 0)), 'Celebridade feliz! +$250', '#7ee0ff');
      }
    }
    sl.status = 'dirty';
    sl.guest = null;
    this.view.setDirty(f, i, true);
    g.state = 'leaving';
    g.request = null;
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
    const exitX = this.r() < 0.5 ? SPAWN_L : spawnR();
    this.setPath(g, [[DOOR_X, 0, STREET_Z], [exitX, 0, STREET_Z]], () => { g.state = 'gone'; });
  }

  guestGivesUp(g) {
    this.queue = this.queue.filter((q) => q !== g);
    if (this.selected === g) this.select(null);
    g.state = 'leaving';
    g.bubble.set('angry', 1, null, '#ef4b5c');
    g.mood = 'angry'; g.moodTimer = 4;
    this.state.stats.angry++;
    this.state.stats.combo = 0;
    this.bumpRating(0, 0.05);
    if (g.inspector) { this.state.rating = clamp(this.state.rating - 0.4, 0.5, 5); this.hooks.event?.({ icon: 'angry', title: 'O inspetor foi embora!', text: 'Ele cansou de esperar. Avaliação −0,4.', kind: 'bad' }); }
    if (g.celebrity) { this.state.rating = clamp(this.state.rating - 0.5, 0.5, 5); this.dismissFans(); this.hooks.event?.({ icon: 'angry', title: 'A celebridade foi embora!', text: 'Saiu nos jornais... Avaliação −0,5.', kind: 'bad' }); }
    Sfx.angry();
    this.hooks.toast(`${g.name} cansou de esperar e foi embora!`, 'bad');
    this.setPath(g, [[g.mesh.position.x, 0, LOBBY_IN_Z], [DOOR_X, 0, LOBBY_IN_Z]], () => this.walkAway(g));
    this.updateQueueTargets();
    this.hooks.changed();
  }

  bumpRating(sat, w) {
    const target = sat / 20;
    const k = Math.min(0.5, w * (this.mods.ratingWeight || 1));
    this.state.rating = clamp(this.state.rating + (target - this.state.rating) * k, 0.5, 5);
  }

  earn(amount, pos, label, color = '#ffe680') {
    this.state.money += amount;
    this.state.stats.earned += amount;
    this.state.stats.dayIncome += amount;
    this.hooks.popup(pos, label || `+$${amount}`, color);
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

  // ---------------- Limpeza e conserto ----------------
  cleanTime() { return CLEAN_TIME * (this.state.upgrades.cleanfast ? 0.6 : 1) * (1 - 0.12 * this.perk('clean')); }
  repairTime() { return 5; }

  // clique num quarto sujo ou quebrado
  startManualJob(f, i) {
    const sl = this.slot(f, i);
    const kind = sl.status === 'dirty' ? 'clean' : sl.status === 'broken' ? 'repair' : null;
    if (!kind) return;
    if (sl.claimed !== undefined && sl.claimed !== null) {
      this.hooks.toast(kind === 'clean' ? 'Uma camareira já está indo limpar esse quarto.' : 'O técnico já está indo consertar.', 'info');
      return;
    }
    if (this.manualJob) {
      Sfx.error();
      this.hooks.toast('Você já está ocupado com outro quarto! Contrate funcionários em MELHORIAS.', 'warn');
      return;
    }
    if (kind === 'repair' && !this.spend(REPAIR_COST)) return;
    sl.status = kind === 'clean' ? 'cleaning' : 'repairing';
    sl.workP = 0;
    sl.worker = 'you';
    this.manualJob = { f, i, kind };
    if (kind === 'repair') this.hooks.popup(this.slotCenter(f, i, 2), `-$${REPAIR_COST} conserto`, '#ff8a80');
    Sfx.click();
    this.hooks.changed();
  }
  startManualClean(f, i) { this.startManualJob(f, i); }

  finishJob(f, i) {
    const sl = this.slot(f, i);
    const wasRepair = sl.status === 'repairing';
    sl.status = 'clean';
    sl.workP = null;
    sl.worker = null;
    sl.claimed = null;
    this.view.setDirty(f, i, false);
    if (this.manualJob && this.manualJob.f === f && this.manualJob.i === i) this.manualJob = null;
    Sfx.clean();
    this.hooks.popup(this.slotCenter(f, i, 1.8), wasRepair ? 'Consertado!' : 'Limpo!', '#9fe870');
    this.hooks.changed();
  }

  addStaff(role) {
    const look = role === 'maid'
      ? { shirt: 0x34507a, pants: 0x34507a, hairStyle: 1, apron: true }
      : { shirt: 0xf08a3c, pants: 0x34507a, hat: 'cap', hatColor: 0xf0b323 };
    const { mesh, platform } = this.makeEntityMesh(look);
    const idx = this.staff.length;
    const [x, z] = STAFF_IDLE[idx % STAFF_IDLE.length];
    mesh.position.set(x, 0, z);
    const bubble = new Bubble(1.2);
    bubble.sprite.position.y = 2.3; bubble.sprite.visible = false;
    mesh.add(bubble.sprite);
    this.staff.push({ id: this.idSeq++, role, mesh, platform, bubble, f: 0, state: 'idle', target: null, home: [x, z], speedMul: 1.15 });
  }

  updateStaff(dt) {
    for (const m of this.staff) {
      const wantStatus = m.role === 'maid' ? 'dirty' : 'broken';
      const workStatus = m.role === 'maid' ? 'cleaning' : 'repairing';
      const free = (r) => r.sl.status === wantStatus && (r.sl.claimed === undefined || r.sl.claimed === null);
      if (m.state === 'idle') {
        animatePerson(m.mesh, dt, false);
        const jobs = this.rooms().filter(free);
        if (jobs.length) {
          jobs.sort((a, b) => Math.abs(a.f - m.f) - Math.abs(b.f - m.f));
          const t = jobs[0];
          t.sl.claimed = m.id;
          m.target = { f: t.f, i: t.i };
          m.state = 'walking';
          const w = this.view.toWorld(t.f, t.i, new THREE.Vector3(2.4, 0, -1.6));
          this.setPath(m, this.route(m, t.f, w.x, w.z), () => {
            const sl = this.slot(t.f, t.i);
            if (sl.type !== 'room' || sl.status !== wantStatus) { this.staffGoHome(m); return; }
            sl.status = workStatus; sl.workP = 0; sl.worker = m.role;
            m.state = 'working';
            m.bubble.sprite.visible = true; m.bubble.set(m.role === 'maid' ? 'broom' : 'wrench');
          });
        }
      } else if (m.state === 'walking' || m.state === 'home') {
        this.stepPath(m, dt);
      } else if (m.state === 'working') {
        m.mesh.userData.rig.armR.rotation.x = Math.sin(performance.now() / 90) * 0.8 - 0.6;
        m.mesh.rotation.y = Math.sin(performance.now() / 400) * 1.2;
        const { f, i } = m.target;
        const sl = this.slot(f, i);
        if (!sl || sl.status !== workStatus) { this.staffGoHome(m); continue; }
        sl.workP += dt / (m.role === 'maid' ? this.cleanTime() : this.repairTime());
        if (sl.workP >= 1) {
          this.finishJob(f, i);
          m.bubble.sprite.visible = false;
          if (this.rooms().some(free)) m.state = 'idle'; else this.staffGoHome(m);
        }
      }
    }
  }

  staffGoHome(m) {
    m.state = 'home';
    m.bubble.sprite.visible = false;
    m.mesh.rotation.set(0, m.mesh.rotation.y, 0);
    this.setPath(m, this.route(m, 0, m.home[0], m.home[1]), () => { m.state = 'idle'; m.mesh.rotation.y = 0; });
  }

  // ---------------- Construção / melhorias ----------------
  costMul() { return 1 - 0.1 * this.perk('builder'); }
  roomCost() { return Math.round((BUILDABLES.room.cost + this.rooms().length * 25) * this.costMul()); }
  buildCost(type) { return type === 'room' ? this.roomCost() : Math.round(BUILDABLES[type].cost * this.costMul()); }
  roomUpgradeCost(tier) { return Math.round(TIERS[tier].upgrade * this.costMul()); }

  build(f, i, type) {
    const sl = this.slot(f, i);
    if (!sl || sl.type !== 'empty') return false;
    const cost = this.buildCost(type);
    if (!this.spend(cost)) return false;
    this.state.slots[f][i] = type === 'room' ? { type: 'room', tier: 0, status: 'clean' } : { type };
    this.syncSlot(f, i);
    Sfx.build();
    this.hooks.popup(this.slotCenter(f, i, 2), `-$${cost}`, '#ff8a80');
    this.hooks.toast(`${type === 'room' ? 'Quarto' : this.facilityName(type)} construído(a)!`, 'good');
    this.hooks.changed();
    this.save();
    return true;
  }

  upgradeRoom(f, i) {
    const sl = this.slot(f, i);
    if (sl.type !== 'room' || sl.tier >= 2) return;
    if (sl.status === 'occupied') { this.hooks.toast('Espere o hóspede sair para reformar.', 'warn'); Sfx.error(); return; }
    const next = TIERS[sl.tier + 1];
    if (!this.spend(this.roomUpgradeCost(sl.tier + 1))) return;
    sl.tier++;
    sl.status = 'clean'; sl.claimed = null; sl.workP = null;
    if (this.manualJob && this.manualJob.f === f && this.manualJob.i === i) this.manualJob = null;
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
    if (this.manualJob && this.manualJob.f === f && this.manualJob.i === i) this.manualJob = null;
    for (const m of this.staff) if (m.target && m.target.f === f && m.target.i === i && m.state !== 'idle') this.staffGoHome(m);
    this.state.slots[f][i] = { type: 'empty' };
    this.syncSlot(f, i);
    this.hooks.changed();
    this.save();
  }

  upgradeMax(key) { return key === 'floor' ? this.maxFloors() - 1 : UPGRADES[key].max; }
  upgradeCost(key) { return Math.round(UPGRADES[key].cost(this.state.upgrades[key]) * (key === 'floor' ? this.costMul() : 1)); }

  buyUpgrade(key) {
    const u = UPGRADES[key];
    const lvl = this.state.upgrades[key];
    if (lvl >= this.upgradeMax(key)) return false;
    const cost = this.upgradeCost(key);
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
      this.addStaff('maid');
      this.hooks.toast('Camareira contratada!', 'good');
    } else if (key === 'tech') {
      this.addStaff('tech');
      this.hooks.toast('Técnico contratado!', 'good');
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
    const u = this.state.upgrades;
    return u.maid * 15 + u.reception * 30 + u.tech * 20 + u.concierge * 25;
  }

  // ---------------- Eventos ----------------
  scheduleEvent() {
    // no Brasil (tutorial), eventos só a partir de março
    if (this.level.id === 'br' && this.monthIndex < 2) return;
    if (this.r() > 0.6) return;
    const options = ['inspector', 'celebrity', 'heatwave', 'blackout'];
    if (this.rooms().some((r) => r.sl.status === 'clean' || r.sl.status === 'dirty')) options.push('broken', 'broken');
    const type = options[this.randi(0, options.length - 1)];
    const start = (this.day - 1) * 24;
    this.state.event = { type, at: start + this.rand(8, 16), active: false };
  }

  triggerEvent() {
    const e = this.state.event;
    e.active = true;
    const ev = (o) => { this.hooks.event?.(o); Sfx.bell(); };
    if (e.type === 'inspector') {
      this.spawnGuest({ inspector: true });
      ev({ icon: 'magnifier', title: 'Inspetor disfarçado!', text: 'Um inspetor de hotéis chegou (balão dourado). Dê o quarto certo e atenda rápido: avaliação ±0,4.', kind: 'info' });
      e.until = this.state.time;
    } else if (e.type === 'celebrity') {
      this.spawnGuest({ celebrity: true });
      this.spawnFans();
      ev({ icon: 'star', title: 'Celebridade chegando!', text: 'Ela quer uma Suíte e tem pouca paciência. Se ficar feliz: +$250 e avaliação +0,3.', kind: 'info' });
      e.until = this.state.time;
    } else if (e.type === 'broken') {
      const cands = this.rooms().filter((r) => r.sl.status === 'clean' || r.sl.status === 'dirty');
      if (!cands.length) { this.state.event = null; return; }
      const t = cands[this.randi(0, cands.length - 1)];
      t.sl.status = 'broken'; t.sl.claimed = null;
      this.view.setDirty(t.f, t.i, false);
      ev({ icon: 'wrench', title: `Quarto ${this.roomNumber(t.f, t.i)} quebrou!`, text: `Clique nele para consertar ($${REPAIR_COST}) ou contrate um técnico.`, kind: 'bad' });
      e.until = this.state.time;
    } else if (e.type === 'blackout') {
      e.until = this.state.time + 3;
      if (this.state.upgrades.generator) ev({ icon: 'bolt', title: 'Queda de energia no bairro', text: 'Seu gerador manteve tudo funcionando!', kind: 'good' });
      else ev({ icon: 'bolt', title: 'Queda de energia!', text: 'Por 3 horas os hóspedes perdem a paciência 2x mais rápido. Um gerador evita isso.', kind: 'bad' });
    } else if (e.type === 'heatwave') {
      e.until = this.state.time + 12;
      ev({ icon: 'sun', title: 'Onda de calor!', text: this.facilityTypes().has('pool') ? 'Todo mundo quer piscina: gasto 50% maior nela.' : 'Sem piscina, os hóspedes ficam menos pacientes.', kind: 'info' });
    }
  }

  spawnFans() {
    for (let k = 0; k < 4; k++) {
      const f = createPerson({ shirt: [0xe58fb8, 0xffd34d, 0x4fb6e8, 0xef7a45][k] });
      f.position.set(DOOR_X - 2.6 + k * 1.3 + this.rand(-0.2, 0.2), 0, STREET_Z + 0.9);
      f.rotation.y = Math.PI;
      const b = new Bubble(0.9);
      b.set('heart');
      b.sprite.position.y = 2.2;
      f.add(b.sprite);
      this.scene.add(f);
      this.fans.push(f);
    }
  }
  dismissFans() {
    for (const f of this.fans) this.scene.remove(f);
    this.fans = [];
  }

  updateEvents() {
    const e = this.state.event;
    if (!e) return;
    if (!e.active && this.state.time >= e.at) this.triggerEvent();
    else if (e.active && e.until !== undefined && this.state.time >= e.until && !['inspector', 'celebrity', 'broken'].includes(e.type)) {
      if (e.type === 'blackout' && !this.state.upgrades.generator) this.hooks.toast('A energia voltou!', 'good');
      this.state.event = null;
    } else if (e.active && ['inspector', 'celebrity', 'broken'].includes(e.type)) this.state.event = null;
  }

  // ---------------- Atualização principal ----------------
  update(realDt) {
    if (this.ended) return;
    const dt = realDt * this.speed;
    if (dt <= 0) return;
    const st = this.state;
    const prevDay = this.day;
    const prevHour = Math.floor(st.time);
    const dh = dt / REAL_SEC_PER_HOUR;
    st.time += dh;
    if (this.day !== prevDay) { this.newDay(prevDay); if (this.ended) return; }
    if (Math.floor(st.time) !== prevHour) this.everyHour();
    this.updateEvents();

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

    const drain = this.blackout ? 2 : 1;
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
          if (g.state === 'queue') g.patience -= dt * drain;
          g.bubble.sprite.visible = true;
          const border = this.selected === g ? '#ffd34d' : g.inspector || g.celebrity ? '#d4a93a' : '#ffffff';
          const badge = g.inspector ? '?' : g.celebrity ? '★' : g.trait === 'ground' ? 'T' : g.trait === 'high' ? '↑' : null;
          g.bubble.set('bed', Math.max(0, g.patience / g.maxPatience), tierCss(g.want), border, g.nights, null, badge);
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
          if (g.request) {
            g.request.left -= dh;
            g.bubble.sprite.visible = true;
            g.bubble.set(g.request.icon, Math.max(0, g.request.left / g.request.max), null, '#8a4fd6');
            if (st.upgrades.concierge && g.request.left < g.request.max - 0.4) this.fulfillRequest(g.room.f, g.room.i);
            else if (g.request.left <= 0) {
              g.request = null; g.reqFailed++;
              this.hooks.toast(`Quarto ${this.roomNumber(g.room.f, g.room.i)} ficou sem atendimento. Hóspede chateado.`, 'bad');
            }
          } else if (this.nightFactor() > 0.5 || g.id % 3 === 0) {
            g.bubble.sprite.visible = true; g.bubble.set('zz');
          } else if (g.moodTimer <= 0) g.bubble.sprite.visible = false;
          if (g.stayLeft <= 0) { g.bubble.sprite.visible = false; this.checkout(g); }
          else if (g.nextVisitCheck <= 0) {
            g.nextVisitCheck = 1;
            const visitP = this.heatwave ? 0.55 : 0.3;
            if (!g.request && this.r() < 0.12 && g.stayLeft > 3) this.makeRequest(g);
            else if (!g.request && this.r() < visitP && g.stayLeft > 2.5) { g.bubble.sprite.visible = false; this.tryVisitFacility(g); }
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
    for (const f of this.fans) animatePerson(f, dt, false, 2);

    if (this.manualJob) {
      const { f, i, kind } = this.manualJob;
      const sl = this.slot(f, i);
      const want = kind === 'clean' ? 'cleaning' : 'repairing';
      if (!sl || sl.status !== want) this.manualJob = null;
      else {
        sl.workP += dt / (kind === 'clean' ? this.cleanTime() : this.repairTime());
        if (sl.workP >= 1) this.finishJob(f, i);
      }
    }

    this.updateStaff(dt);
    this.updateSlotVisuals(dt);
  }

  everyHour() {
    // Japão: quarto sujo parado derruba a avaliação
    if (this.mods.dirtyPenalty) {
      const dirty = this.rooms().filter((r) => r.sl.status === 'dirty').length;
      if (dirty) this.state.rating = clamp(this.state.rating - this.mods.dirtyPenalty * dirty, 0.5, 5);
    }
  }

  updateVisibility() {}

  // status mostrado na placa do quarto
  displayStatus(sl) {
    if (sl.status === 'occupied' && sl.guest?.request) return 'request';
    return sl.status;
  }

  updateSlotVisuals(dt) {
    const night = this.blackout ? 0 : this.nightFactor();
    const t = performance.now();
    const waiting = this.queue.some((q) => q.state === 'queue');
    for (const { f, i, sl } of this.allSlots()) {
      if (sl.type === 'lobby') continue;
      const grp = this.view.slotGroup(f, i);
      if (!grp) continue;
      const b = grp.userData.bubble;
      if (sl.type === 'room') {
        if (sl.status === 'dirty') { b.sprite.visible = true; b.set('dirty', 1, null, '#ef4b5c'); }
        else if (sl.status === 'cleaning') { b.sprite.visible = true; b.set('broom', Math.min(1, sl.workP || 0), null, '#52c45a', 0, '#52c45a'); }
        else if (sl.status === 'broken') { b.sprite.visible = true; b.set('wrench', 1, null, '#6b6272'); }
        else if (sl.status === 'repairing') { b.sprite.visible = true; b.set('wrench', Math.min(1, sl.workP || 0), null, '#2f8fe0', 0, '#2f8fe0'); }
        else b.sprite.visible = false;
        this.view.setLight(f, i, sl.status === 'occupied', night);
        const ds = this.displayStatus(sl);
        const pulse = (ds === 'clean' && waiting) || ds === 'request' ? 0.75 + 0.25 * Math.sin(t / 220) : 1;
        this.view.setStatus(f, i, ds, sl.workP || 0, pulse);
      } else {
        b.sprite.visible = false;
        if (grp.userData.plus) grp.userData.plus.position.y = 1.4 + Math.sin(t / 400 + i) * 0.08;
      }
      if (grp.userData.water) grp.userData.water.offset.x += dt * 0.04;
      if (grp.userData.ring) grp.userData.ring.position.y = grp.userData.ringY + Math.sin(t / 600) * 0.03;
      for (const n of grp.userData.npcs || []) animatePerson(n, dt, false);
    }
    const rec = this.view.lobby.userData.receptionist;
    animatePerson(rec, dt, false);
    rec.rotation.y = this.selected ? Math.sin(t / 300) * 0.3 : 0;
    this.view.setLobbyLight(night);
  }

  newDay(prevDay) {
    const sal = this.salaries();
    const s = this.state.stats;
    const income = s.dayIncome;
    s.dayIncome = 0;
    if (sal) {
      this.state.money -= sal;
      this.hooks.popup(new THREE.Vector3(8.7, 2.5, 0), `-$${sal} salários`, '#ff8a80');
    }
    s.best = Math.max(s.best, income);
    if (this.state.tutorial && prevDay >= 2) this.state.tutorial = false;
    if (prevDay >= this.seasonMonths) { this.endSeason(); return; }
    Sfx.day();
    this.hooks.toast(`Fim de ${MONTHS[(prevDay - 1) % 12]}: ganhou $${income}${sal ? `, salários −$${sal}` : ''}.`, 'good');
    // festival: aviso no mês anterior e no início
    const fest = this.level.festival;
    const m = this.monthIndex + 1;
    if (fest?.months.includes(m)) this.hooks.event?.({ icon: 'party', title: `${fest.name} começou!`, text: 'Muito mais hóspedes chegando este mês. Prepare os quartos!', kind: 'info' });
    else if (fest?.months.includes(m + 1)) this.hooks.toast(`Mês que vem: ${fest.name}! Mais hóspedes vão chegar.`, 'info');
    if (this.mods.seasonal?.[m] && this.mods.seasonal[m] < 1 && !this.mods.seasonal[m - 1]) this.hooks.toast('Baixa temporada: menos hóspedes nos próximos meses.', 'info');
    if (!this.state.event) this.scheduleEvent();
    this.save();
    this.hooks.changed();
  }

  endSeason() {
    this.ended = true;
    this.state.time = this.seasonMonths * 24; // trava no fim
    const goals = this.goalStatus();
    const res = {
      level: this.level,
      daily: this.daily,
      goals,
      stars: goals.map((g) => g.done),
      score: this.score(),
      stats: { ...this.state.stats },
      rating: this.state.rating,
    };
    this.clearSave();
    this.select(null);
    Sfx.day();
    this.hooks.seasonEnd?.(res);
  }
}
