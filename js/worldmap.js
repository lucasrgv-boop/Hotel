// Tela do mapa-múndi: escolha do hotel, bônus da rede e desafio do dia.
import { LEVELS, PERKS, perkCost, WORLD, SEASON_MONTHS, DAILY_MONTHS, MONTHS } from './levels.js';
import { Meta, dailyLevel, Board } from './meta.js';
import { iconDataURL } from './textures.js';
import { Sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
const money = (v) => `$${Math.round(v).toLocaleString('pt-BR')}`;

// decodifica a máscara de terra (bits) do mapa
const LAND = (() => {
  const bin = atob(WORLD.data);
  const out = new Uint8Array(WORLD.W * WORLD.H);
  for (let i = 0; i < out.length; i++) out[i] = (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
  return out;
})();
const project = (lon, lat) => [(lon + 180) / 360, (WORLD.LAT0 - lat) / (WORLD.LAT0 - WORLD.LAT1)];

function hasSave(id) { try { return !!localStorage.getItem(`hotel-v5-${id}`); } catch { return false; } }

export class WorldMap {
  constructor(ui, nav) {
    this.ui = ui;
    this.nav = nav;   // { play(levelId, fresh), playDaily() }
    this.sel = null;
    this.icons = { lock: iconDataURL('lock', 64), plane: iconDataURL('plane', 64) };
    for (const p of PERKS) this.icons[p.icon] = iconDataURL(p.icon, 64);
    $('map-perks').onclick = () => { Sfx.click(); this.openPerks(); };
    $('map-daily').onclick = () => { Sfx.click(); this.openDaily(); };
    $('map-help').onclick = () => { Sfx.click(); $('intro').classList.remove('hidden'); };
    window.addEventListener('resize', () => { if (this.visible) this.draw(); });
  }

  show() {
    this.visible = true;
    $('map').classList.remove('hidden');
    document.body.classList.add('on-map');
    // seleciona o próximo hotel a jogar
    if (!this.sel) {
      let idx = 0;
      LEVELS.forEach((l, k) => { if (Meta.unlocked(k)) idx = k; });
      this.sel = LEVELS[idx].id;
    }
    this.render();
  }
  hide() {
    this.visible = false;
    $('map').classList.add('hidden');
    document.body.classList.remove('on-map');
  }

  render() {
    $('map-stars').textContent = `${Meta.totalStars()}/${LEVELS.length * 3}`;
    $('map-points').textContent = Meta.points();
    this.draw();
    this.renderPins();
    this.renderCard();
  }

  draw() {
    const c = $('map-canvas');
    const r = c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#9fd8f0'); grd.addColorStop(1, '#6fc0e6');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    const cw = W / WORLD.W, ch = H / WORLD.H;
    const rad = Math.min(cw, ch) * 0.42;
    for (let y = 0; y < WORLD.H; y++) for (let x = 0; x < WORLD.W; x++) {
      const land = LAND[y * WORLD.W + x];
      g.fillStyle = land ? '#f6ecd6' : 'rgba(255,255,255,0.16)';
      g.beginPath(); g.arc((x + 0.5) * cw, (y + 0.5) * ch, land ? rad : rad * 0.45, 0, Math.PI * 2); g.fill();
    }
    // rota da viagem entre os hotéis
    g.lineWidth = Math.max(2, 3 * dpr); g.lineCap = 'round';
    for (let k = 0; k < LEVELS.length - 1; k++) {
      const [x1, y1] = project(LEVELS[k].lon, LEVELS[k].lat);
      const [x2, y2] = project(LEVELS[k + 1].lon, LEVELS[k + 1].lat);
      const done = Meta.starCount(LEVELS[k].id) > 0;
      g.strokeStyle = done ? '#ef7a45' : 'rgba(58,51,64,0.35)';
      g.setLineDash(done ? [] : [6 * dpr, 7 * dpr]);
      const mx = (x1 + x2) / 2 * W, my = Math.min(y1, y2) * H - 0.12 * H;
      g.beginPath(); g.moveTo(x1 * W, y1 * H); g.quadraticCurveTo(mx, my, x2 * W, y2 * H); g.stroke();
    }
    g.setLineDash([]);
  }

  renderPins() {
    const box = $('map-pins');
    box.innerHTML = '';
    LEVELS.forEach((l, k) => {
      const [x0, y0] = project(l.lon, l.lat);
      const [dx, dy] = l.mapNudge || [0, 0];
      const x = x0 + dx, y = y0 + dy;
      const unlocked = Meta.unlocked(k);
      const st = Meta.stars(l.id);
      const b = document.createElement('button');
      b.className = `pin ${unlocked ? '' : 'locked'} ${this.sel === l.id ? 'sel' : ''}`;
      b.style.left = `${x * 100}%`; b.style.top = `${y * 100}%`;
      b.title = `${l.name} · ${l.country}`;
      b.innerHTML = `<span class="pin-dot" style="--a:${l.flag[0]};--b:${l.flag[1]};--c:${l.flag[2]}">${unlocked ? k + 1 : `<img src="${this.icons.lock}" alt="">`}</span>
        <span class="pin-label">${l.city}</span>
        <span class="pin-stars">${st.map((s) => (s ? '★' : '☆')).join('')}</span>`;
      b.onclick = () => { Sfx.click(); this.sel = l.id; this.renderPins(); this.renderCard(); };
      box.appendChild(b);
    });
  }

  renderCard() {
    const k = LEVELS.findIndex((l) => l.id === this.sel);
    const l = LEVELS[k];
    const unlocked = Meta.unlocked(k);
    const st = Meta.stars(l.id);
    const best = Meta.get().best[l.id] || 0;
    const saved = hasSave(l.id);
    const rules = [`${l.cols} espaços por andar`, `até ${l.maxFloors} andares`, `começa com ${money(l.startMoney)}`, ...l.rules];
    $('map-card').innerHTML = `
      <div class="flag" style="--a:${l.flag[0]};--b:${l.flag[1]};--c:${l.flag[2]}"></div>
      <h2>${l.name}</h2>
      <p class="where">${l.city} · ${l.country}</p>
      <p class="desc">${l.desc}</p>
      <div class="rules">${rules.map((r) => `<span>${r}</span>`).join('')}</div>
      <p class="fest">Festival: <b>${l.festival.name}</b> (${l.festival.months.map((m) => MONTHS[m - 1]).join(', ')})</p>
      <h4>Metas da temporada (${SEASON_MONTHS} meses)</h4>
      <div class="goal-list">${l.goals.map((g, i) => `<div class="g-row ${st[i] ? 'done' : ''}"><span class="g-star">${st[i] ? '★' : '☆'}</span><span class="g-label">${g.label}</span></div>`).join('')}</div>
      ${best ? `<p class="best">Recorde: <b>${best.toLocaleString('pt-BR')}</b> pts</p>` : ''}
      <div class="card-actions">
        ${!unlocked ? `<p class="locked-note">Ganhe 1 estrela em ${LEVELS[k - 1].name} para desbloquear.</p>`
          : saved ? '<button class="btn primary big" id="c-cont">Continuar temporada</button><button class="btn" id="c-new">Recomeçar</button>'
            : '<button class="btn primary big" id="c-play">Jogar</button>'}
      </div>`;
    if ($('c-play')) $('c-play').onclick = () => { Sfx.click(); this.nav.play(l.id, true); };
    if ($('c-cont')) $('c-cont').onclick = () => { Sfx.click(); this.nav.play(l.id, false); };
    if ($('c-new')) $('c-new').onclick = () => { Sfx.click(); this.nav.play(l.id, true); };
  }

  openPerks() {
    const render = () => {
      const cards = PERKS.map((p) => {
        const lvl = Meta.perk(p.id);
        const maxed = lvl >= p.max;
        const cost = perkCost(lvl);
        return `<div class="card"><img src="${this.icons[p.icon]}" alt="">
          <div class="body"><span class="name">${p.name}</span><span class="desc">${p.desc}</span>
          <span class="lvl">Nível ${lvl}/${p.max}</span>
          ${maxed ? '<span class="muted">Máximo</span>' : `<button class="btn good" data-perk="${p.id}" ${Meta.points() < cost ? 'disabled' : ''}>Comprar · ${cost} ★</button>`}</div></div>`;
      }).join('');
      this.ui.openModal('Bônus da rede', `<p class="muted" style="margin:0 0 12px;line-height:1.6">Cada estrela conquistada vira 1 ponto. Os bônus valem para todos os hotéis (menos no desafio do dia). Você tem <b>${Meta.points()} ★</b> para gastar.</p><div class="cards">${cards}</div>`);
      document.querySelectorAll('[data-perk]').forEach((b) => {
        b.onclick = () => { if (Meta.buyPerk(b.dataset.perk)) { Sfx.build(); render(); this.render(); } };
      });
    };
    render();
  }

  async openDaily() {
    const { level, key } = dailyLevel();
    const mine = Meta.get().daily[key]?.score || 0;
    this.ui.openModal('Desafio do dia', `
      <div class="daily">
        <div class="flag" style="--a:${level.flag[0]};--b:${level.flag[1]};--c:${level.flag[2]}"></div>
        <p style="line-height:1.6;margin:0">Hoje: <b>${level.name}</b> (${level.city}). Uma temporada curta de <b>${DAILY_MONTHS} meses</b>, com os mesmos hóspedes e eventos para todo mundo e <b>sem bônus da rede</b>. Faça a maior pontuação!</p>
        <div class="daily-board" id="daily-board"><p class="muted">Carregando placar...</p></div>
      </div>
      <div class="modal-actions"><button class="btn primary big" id="d-play">Jogar desafio</button></div>`);
    $('d-play').onclick = () => { this.ui.closeModal(); this.nav.playDaily(); };
    await Board.init();
    const rows = await Board.top(key);
    this.ui.renderBoard(rows, mine, !!Board.db);
  }
}
