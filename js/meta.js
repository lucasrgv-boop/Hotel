// Progresso da campanha (estrelas, recordes, bônus da rede) e desafio do dia com placar.
import { LEVELS, PERKS, perkCost } from './levels.js';

const META_KEY = 'hotel-meta-v1';

function load() {
  try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch { return {}; }
}

export const Meta = {
  data: null,
  get() {
    if (!this.data) {
      const d = load();
      this.data = { stars: {}, best: {}, perks: {}, seenTutorial: false, daily: {}, ...d };
    }
    return this.data;
  },
  save() { try { localStorage.setItem(META_KEY, JSON.stringify(this.data)); } catch { /* ignore */ } },

  stars(id) { return this.get().stars[id] || [false, false, false]; },
  starCount(id) { return this.stars(id).filter(Boolean).length; },
  totalStars() { return LEVELS.reduce((a, l) => a + this.starCount(l.id), 0); },
  spentPoints() {
    const p = this.get().perks;
    let spent = 0;
    for (const k of Object.keys(p)) for (let l = 0; l < p[k]; l++) spent += perkCost(l);
    return spent;
  },
  points() { return this.totalStars() - this.spentPoints(); },
  perk(id) { return this.get().perks[id] || 0; },
  buyPerk(id) {
    const def = PERKS.find((p) => p.id === id);
    const lvl = this.perk(id);
    if (!def || lvl >= def.max || this.points() < perkCost(lvl)) return false;
    this.get().perks[id] = lvl + 1;
    this.save();
    return true;
  },
  unlocked(idx) { return idx === 0 || this.starCount(LEVELS[idx - 1].id) > 0; },

  // registra o resultado de uma temporada; devolve o que mudou
  record(id, starsArr, score) {
    const d = this.get();
    const old = this.stars(id);
    const merged = old.map((v, k) => v || starsArr[k]);
    const newStars = merged.filter(Boolean).length - old.filter(Boolean).length;
    d.stars[id] = merged;
    const record = score > (d.best[id] || 0);
    if (record) d.best[id] = score;
    this.save();
    return { newStars, record };
  },
};

// ---------------- Desafio do dia ----------------
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dailyLevel() {
  const k = todayKey();
  let h = 0;
  for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { level: LEVELS[h % LEVELS.length], seed: h || 1, key: k };
}
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Placar compartilhado: cada jogador grava só o próprio documento em scores/<id>
// com { days: { 'AAAA-MM-DD': { score, hotel } } }. Funciona apenas na página publicada;
// fora dela (ou sem permissão) o placar fica só neste navegador.
export const Board = {
  db: null, user: null, uid: null, ready: false, canWrite: false,
  async init() {
    if (this.ready) return this;
    this.ready = true;
    try {
      if (!window.claude?.use) return this;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      this.db = db; this.user = user;
      if (user) {
        this.uid = await user.id();
        const can = await user.can?.('data.write');
        this.canWrite = !!(db && this.uid && can !== false);
      }
    } catch { this.db = null; }
    return this;
  },
  async submit(key, score, hotel) {
    const local = Meta.get().daily;
    if (!local[key] || score > local[key].score) { local[key] = { score, hotel }; Meta.save(); }
    if (!this.db || !this.uid || !this.canWrite) return false;
    try {
      const ref = this.db.doc(`scores/${this.uid}`);
      const snap = await ref.get();
      const days = { ...(snap.exists ? snap.data().days || {} : {}) };
      if (days[key] && days[key].score >= score) return true;
      days[key] = { score, hotel };
      // guarda só os últimos 14 dias
      const keys = Object.keys(days).sort().slice(-14);
      const trimmed = {};
      for (const k of keys) trimmed[k] = days[k];
      await ref.set({ days: trimmed });
      return true;
    } catch (e) {
      if (e?.code === 'invalid_argument') this.canWrite = false;
      return false;
    }
  },
  // devolve [{ name, score, me }] do dia, ou null se o placar compartilhado não estiver disponível
  async top(key) {
    if (!this.db) return null;
    try {
      const snap = await Promise.race([
        this.db.collection('scores').get(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
      ]);
      const rows = [];
      for (const d of snap.docs) {
        const e = d.data()?.days?.[key];
        if (e && typeof e.score === 'number') rows.push({ id: d.id, score: e.score });
      }
      rows.sort((a, b) => b.score - a.score);
      const top = rows.slice(0, 10);
      let profiles = {};
      try { profiles = (await this.user?.profiles?.(top.map((r) => r.id))) || {}; } catch { profiles = {}; }
      return top.map((r) => ({ name: profiles[r.id]?.name || 'Gerente', score: r.score, me: r.id === this.uid }));
    } catch { return null; }
  },
};
