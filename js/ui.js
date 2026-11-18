// Interface HTML do hotel: HUD, metas, eventos, painel de informações, modais, toasts e popups.
import { TIERS, BUILDABLES, UPGRADES } from './config.js';
import { iconDataURL } from './textures.js';
import { Sfx, isMuted, setMuted } from './audio.js';

const $ = (id) => document.getElementById(id);
const tierHex = (t) => '#' + TIERS[t].color.toString(16).padStart(6, '0');
const money = (v) => `$${Math.round(v).toLocaleString('pt-BR')}`;

const STATUS_PT = { clean: 'Livre', occupied: 'Ocupado', dirty: 'Sujo', cleaning: 'Limpando', broken: 'Quebrado', repairing: 'Em conserto' };
const TRAIT_PT = { ground: 'Idoso: quer ficar no térreo', high: 'Quer vista: andar alto' };
const ICONS = ['bed', 'burger', 'dumbbell', 'wave', 'broom', 'star', 'heart', 'coin', 'building', 'bell', 'plant', 'megaphone',
  'sparkle', 'dirty', 'towel', 'noise', 'wrench', 'magnifier', 'sun', 'bolt', 'party', 'angry', 'lock', 'plane'];

export class UI {
  constructor() {
    this.game = null;
    this.camera = null;
    this.panelTarget = null;
    this.dirty = true;
    this.lastHud = '';
    this.icons = {};
    for (const n of ICONS) this.icons[n] = iconDataURL(n, 96);
    document.querySelectorAll('img[data-icon]').forEach((img) => { img.src = this.icons[img.dataset.icon]; });

    $('modal-close').onclick = () => this.closeModal();
    $('modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal' && !this.modalLocked) this.closeModal(); });
    $('btn-upgrades').onclick = () => { Sfx.click(); this.openUpgrades(); };
    $('btn-menu').onclick = () => { Sfx.click(); this.openMenu(); };
    $('btn-map').onclick = () => { Sfx.click(); this.nav?.toMap(); };
    $('btn-sound').onclick = () => { setMuted(!isMuted()); this.syncSound(); Sfx.click(); };
    $('banner').onclick = () => $('banner').classList.add('hidden');
    this.syncSound();
    document.querySelectorAll('#speed button').forEach((b) => {
      b.onclick = () => { this.setSpeed(+b.dataset.speed); Sfx.click(); };
    });
  }

  attach(game, camera, nav) {
    this.game = game;
    this.camera = camera;
    this.nav = nav;
    this.panelTarget = null;
    this.lastHud = ''; this.lastRooms = ''; this.lastGoals = '';
    this.setSpeed(1);
    this.changed();
  }

  syncSound() { $('btn-sound').classList.toggle('off', isMuted()); }

  setSpeed(s) {
    if (!this.game) return;
    this.game.speed = s;
    document.querySelectorAll('#speed button').forEach((b) => b.classList.toggle('on', +b.dataset.speed === s));
  }

  // ---------- Toasts, popups, avisos ----------
  toast(msg, kind = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = msg;
    const life = kind === 'info' ? 6 : 3.5;
    el.style.setProperty('--life', `${life}s`);
    $('toasts').prepend(el);
    const all = $('toasts').children;
    while (all.length > 3) all[all.length - 1].remove();
    setTimeout(() => el.remove(), (life + 0.5) * 1000);
  }

  // aviso grande no topo para eventos (inspetor, quebra, festival...)
  event({ icon, title, text, kind = 'info' }) {
    const b = $('banner');
    b.className = `banner ${kind}`;
    b.innerHTML = `<img src="${this.icons[icon] || this.icons.bell}" alt=""><div><b>${title}</b><span>${text}</span></div>`;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.add('hidden'), 7000);
  }

  popup(worldPos, text, color = '#ffe680') {
    if (!this.camera) return;
    const v = worldPos.clone().project(this.camera);
    if (v.z > 1) return;
    const el = document.createElement('div');
    el.className = 'popup';
    el.textContent = text;
    el.style.color = color;
    el.style.left = `${((v.x + 1) / 2) * window.innerWidth}px`;
    el.style.top = `${((1 - v.y) / 2) * window.innerHeight}px`;
    $('popups').appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }

  hint(text) {
    const h = $('hint');
    if (h.textContent !== text) h.textContent = text || '';
  }

  // ---------- HUD ----------
  updateHUD() {
    const g = this.game;
    if (!g) return;
    const st = g.state;
    const h = g.hour;
    const hh = String(Math.floor(h)).padStart(2, '0');
    const mm = String(Math.floor((h % 1) * 6) * 10).padStart(2, '0');
    const full = Math.round(st.rating * 2) / 2;
    let stars = '';
    for (let i = 1; i <= 5; i++) stars += i <= full ? '★' : (i - 0.5 === full ? '<span style="opacity:.6">★</span>' : '<span class="off">★</span>');
    const key = `${st.money}|${g.day}${hh}${mm}|${full}|${st.stats.guests}`;
    if (key !== this.lastHud) {
      this.lastHud = key;
      $('money').textContent = st.money.toLocaleString('pt-BR');
      $('money').style.color = st.money < 0 ? '#e0434f' : '';
      $('clock').textContent = `${g.monthName} · ${hh}:${mm}`;
      $('month').textContent = `Mês ${Math.min(g.day, g.seasonMonths)}/${g.seasonMonths}`;
      $('month-bar').style.width = `${Math.min(100, ((st.time - 7) / (g.seasonMonths * 24 - 7)) * 100)}%`;
      $('stars').innerHTML = stars;
      $('stars').parentElement.title = `Avaliação: ${st.rating.toFixed(2)} / 5`;
      $('guests').textContent = st.stats.guests;
    }
    let free = 0, occ = 0, dirty = 0;
    for (const r of g.rooms()) {
      if (r.sl.status === 'clean') free++;
      else if (r.sl.status === 'occupied') occ++;
      else dirty++;
    }
    const rk = `${free}|${occ}|${dirty}`;
    if (rk !== this.lastRooms) {
      this.lastRooms = rk;
      $('n-free').textContent = free; $('n-occ').textContent = occ; $('n-dirty').textContent = dirty;
      $('n-free').parentElement.classList.toggle('zero', !free);
      $('n-dirty').parentElement.classList.toggle('zero', !dirty);
    }
    this.renderGoals();
    if (this.dirty) { this.dirty = false; this.renderPanel(); }
  }

  renderGoals() {
    const g = this.game;
    const goals = g.goalStatus();
    const s = g.state.stats;
    const fest = g.festivalActive();
    const ev = g.state.event?.active ? g.state.event.type : '';
    const key = goals.map((x) => `${x.done}${x.text}`).join('|') + `|${g.score()}|${s.combo}|${fest?.name}|${ev}|${g.blackout}`;
    if (key === this.lastGoals) return;
    this.lastGoals = key;
    const chips = [];
    if (fest) chips.push(`<span class="gchip fest"><img src="${this.icons.party}" alt="">${fest.name}</span>`);
    if (g.blackout) chips.push(`<span class="gchip bad"><img src="${this.icons.bolt}" alt="">Sem energia</span>`);
    if (g.heatwave) chips.push(`<span class="gchip warn"><img src="${this.icons.sun}" alt="">Onda de calor</span>`);
    if (s.combo >= 2) chips.push(`<span class="gchip combo">Combo x${s.combo}</span>`);
    $('goals').innerHTML = `
      <div class="g-head"><b>${g.daily ? 'Desafio do dia' : g.level.name}</b><span class="g-score" title="Pontuação">${g.score().toLocaleString('pt-BR')} pts</span></div>
      ${goals.map((x) => `<div class="g-row ${x.done ? 'done' : ''}"><span class="g-star">${x.done ? '★' : '☆'}</span><span class="g-label">${x.label}</span><span class="g-val">${x.text}</span></div>`).join('')}
      ${chips.length ? `<div class="g-chips">${chips.join('')}</div>` : ''}`;
  }

  changed() { this.dirty = true; }

  // ---------- Painel ----------
  showSlot(f, i) { this.panelTarget = { kind: 'slot', f, i }; this.renderPanel(); }
  hidePanel() { this.panelTarget = null; this.renderPanel(); }

  renderPanel() {
    const p = $('panel');
    const g = this.game;
    if (!g) return;
    if (g.selected) {
      const gu = g.selected;
      p.classList.remove('hidden');
      const price = TIERS[gu.want].price * (gu.want === 2 ? (g.mods.suiteMult || 1) : 1);
      p.innerHTML = `
        <h3>${gu.name} <span class="tag" style="background:${tierHex(gu.want)}">${TIERS[gu.want].name}</span></h3>
        <div class="row"><span class="muted">Quer quarto</span><span style="color:${tierHex(gu.want)}">${TIERS[gu.want].name}</span></div>
        <div class="row"><span class="muted">Diárias</span><span>${gu.nights}</span></div>
        <div class="row"><span class="muted">Paga até</span><span>${money(price * gu.nights)}</span></div>
        <div class="row"><span class="muted">Paciência</span><span>${Math.round((gu.patience / gu.maxPatience) * 100)}%</span></div>
        ${gu.trait ? `<div class="row"><span class="muted">Exigência</span><span>${TRAIT_PT[gu.trait]}</span></div>` : ''}
        ${gu.inspector ? '<p class="note gold">Inspetor disfarçado! Se sair feliz, a avaliação sobe muito.</p>' : ''}
        ${gu.celebrity ? '<p class="note gold">Celebridade! Quer uma Suíte e tem pouca paciência.</p>' : ''}
        <p class="muted" style="margin:8px 0 0">Clique num quarto <b style="color:#2fb350">LIVRE</b> para alocar. Quarto pior que o desejado = hóspede insatisfeito.</p>
        <div class="actions"><button class="btn" id="p-auto">Alocar no melhor quarto</button></div>`;
      $('p-auto').onclick = () => {
        const r = g.bestRoomFor(gu);
        if (r) g.assign(gu, r.f, r.i); else { Sfx.error(); this.toast('Nenhum quarto livre e limpo!', 'warn'); }
      };
      return;
    }
    const t = this.panelTarget;
    if (!t) { p.classList.add('hidden'); return; }
    const sl = g.slot(t.f, t.i);
    if (!sl || sl.type === 'empty' || sl.type === 'lobby') { p.classList.add('hidden'); return; }
    p.classList.remove('hidden');
    if (sl.type === 'room') {
      const num = g.roomNumber(t.f, t.i);
      const next = TIERS[sl.tier + 1];
      const guest = sl.guest;
      let gInfo = '';
      if (guest) {
        const left = Math.max(0, guest.stayLeft);
        gInfo = `<div class="row"><span class="muted">Hóspede</span><span>${guest.name}</span></div>
          <div class="row"><span class="muted">Sai em</span><span>${guest.state === 'toRoom' && !guest.stayLeft ? '—' : `${left.toFixed(1)}h`}</span></div>
          ${guest.request ? `<div class="row"><span class="muted">Pedido</span><span style="color:#8a4fd6">${guest.request.name}</span></div>` : ''}`;
      }
      const price = TIERS[sl.tier].price * (sl.tier === 2 ? (g.mods.suiteMult || 1) : 1);
      const upCost = next ? g.roomUpgradeCost(sl.tier + 1) : 0;
      p.innerHTML = `
        <h3>Quarto ${num} <span class="tag" style="background:${tierHex(sl.tier)}">${TIERS[sl.tier].name}</span></h3>
        <div class="row"><span class="muted">Estado</span><span>${STATUS_PT[sl.status]}</span></div>
        <div class="row"><span class="muted">Diária</span><span>${money(price)}</span></div>
        ${gInfo}
        ${sl.status === 'cleaning' || sl.status === 'repairing' ? `<div class="row"><span class="muted">Progresso</span><span>${Math.round((sl.workP || 0) * 100)}%</span></div>` : ''}
        <div class="actions">
          ${guest?.request ? '<button class="btn primary" id="p-req">Atender pedido</button>' : ''}
          ${sl.status === 'dirty' ? '<button class="btn good" id="p-clean">Limpar</button>' : ''}
          ${sl.status === 'broken' ? '<button class="btn good" id="p-fix">Consertar ($40)</button>' : ''}
          ${next ? `<button class="btn" id="p-up">Reformar para ${next.name} (${money(upCost)})</button>` : '<span class="muted">Nível máximo!</span>'}
          <button class="btn danger" id="p-demo">Demolir</button>
        </div>`;
      if ($('p-req')) $('p-req').onclick = () => { g.fulfillRequest(t.f, t.i); this.changed(); };
      if ($('p-clean')) $('p-clean').onclick = () => g.startManualJob(t.f, t.i);
      if ($('p-fix')) $('p-fix').onclick = () => g.startManualJob(t.f, t.i);
      if ($('p-up')) {
        $('p-up').disabled = g.state.money < upCost;
        $('p-up').onclick = () => { g.upgradeRoom(t.f, t.i); this.changed(); };
      }
      $('p-demo').onclick = () => this.confirmDemolish(t.f, t.i);
    } else {
      const b = BUILDABLES[sl.type];
      const using = g.guests.filter((x) => x.facility && x.facility.f === t.f && x.facility.i === t.i && x.state === 'atFacility').length;
      p.innerHTML = `
        <h3>${g.facilityName(sl.type)}</h3>
        <p class="muted" style="margin:0 0 6px">${b.desc}</p>
        <div class="row"><span class="muted">Gasto por visita</span><span>$${b.spend[0]}–${b.spend[1]}</span></div>
        <div class="row"><span class="muted">Usando agora</span><span>${using}</span></div>
        <div class="actions"><button class="btn danger" id="p-demo">Demolir</button></div>`;
      $('p-demo').onclick = () => this.confirmDemolish(t.f, t.i);
    }
  }

  confirmDemolish(f, i) {
    this.openModal('Demolir?', `
      <p style="line-height:1.8">Tem certeza? O espaço volta a ficar vazio e o dinheiro <b>não</b> é devolvido.</p>
      <div class="modal-actions"><button class="btn" id="d-no">Cancelar</button><button class="btn danger" id="d-yes">Demolir</button></div>`);
    $('d-no').onclick = () => this.closeModal();
    $('d-yes').onclick = () => { this.game.demolish(f, i); this.closeModal(); this.hidePanel(); };
  }

  // ---------- Modais ----------
  openModal(title, html, locked = false) {
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = html;
    $('modal').classList.remove('hidden');
    $('modal-close').classList.toggle('hidden', locked);
    this.modalOpen = true;
    this.modalLocked = locked;
  }
  closeModal() {
    $('modal').classList.add('hidden');
    this.modalOpen = false;
    this.modalLocked = false;
    this.modalRefresh = null;
  }

  openBuild(f, i) {
    const g = this.game;
    const cards = Object.entries(BUILDABLES).map(([k, b]) => {
      const cost = g.buildCost(k);
      const name = k === 'room' ? b.name : g.facilityName(k);
      return `<div class="card"><img src="${this.icons[b.icon]}" alt="">
        <div class="body"><span class="name">${name}</span><span class="desc">${b.desc}${k === 'room' ? ` Diária $${TIERS[0].price}.` : ''}</span>
        <button class="btn good" data-build="${k}" data-cost="${cost}" ${g.state.money < cost ? 'disabled' : ''}>Construir ${money(cost)}</button></div></div>`;
    }).join('');
    this.openModal(`Construir no ${f === 0 ? 'térreo' : `${f}º andar`}`, `<div class="cards">${cards}</div>`);
    this.modalRefresh = true;
    document.querySelectorAll('[data-build]').forEach((b) => {
      b.onclick = () => { if (g.build(f, i, b.dataset.build)) { this.closeModal(); this.showSlot(f, i); } };
    });
  }

  openUpgrades() {
    const g = this.game;
    const render = () => {
      const cards = Object.entries(UPGRADES).map(([k, u]) => {
        const lvl = g.state.upgrades[k];
        const max = g.upgradeMax(k);
        const maxed = lvl >= max;
        const cost = g.upgradeCost(k);
        return `<div class="card"><img src="${this.icons[u.icon]}" alt="">
          <div class="body"><span class="name">${u.name}</span><span class="desc">${u.desc}</span>
          <span class="lvl">${max > 1 ? `Nível ${lvl}/${max}` : (lvl ? 'Adquirido' : '')}</span>
          ${maxed ? '<span class="muted">Máximo</span>' : `<button class="btn good" data-up="${k}" data-cost="${cost}" ${g.state.money < cost ? 'disabled' : ''}>Comprar ${money(cost)}</button>`}</div></div>`;
      }).join('');
      const st = g.state;
      const info = `<p class="muted" style="line-height:1.8;margin:0 0 10px">Quartos: ${g.rooms().length} · Andares: ${st.floors}/${g.maxFloors()} · Salários: $${g.salaries()}/mês · Chegadas: ~${(g.arrivalRatePerHour() * 24).toFixed(0)}/mês</p>`;
      this.openModal('Melhorias do Hotel', info + `<div class="cards">${cards}</div>`);
      this.modalRefresh = true;
      document.querySelectorAll('[data-up]').forEach((b) => {
        b.onclick = () => { if (g.buyUpgrade(b.dataset.up)) render(); };
      });
    };
    render();
  }

  openMenu() {
    const g = this.game;
    const st = g.state;
    const rows = [
      ['Hóspedes atendidos', st.stats.guests], ['Foram embora irritados', st.stats.angry], ['Total ganho', money(st.stats.earned)],
      ['Pedidos atendidos', st.stats.requests], ['Maior combo', `x${st.stats.bestCombo}`], ['Avaliação', `${st.rating.toFixed(2)} ★`],
    ];
    this.openModal(g.daily ? 'Desafio do dia' : g.level.name, `
      <div class="stats">${rows.map(([a, b]) => `<div class="row"><span class="muted">${a}</span><span>${b}</span></div>`).join('')}</div>
      <p class="muted" style="line-height:1.7">Atalhos: Espaço = pausar · 1/2/3 = velocidade · U = melhorias · F = ver o prédio inteiro · Q/E = girar · Esc = cancelar. O jogo salva sozinho.</p>
      <div class="modal-actions">
        <button class="btn" id="m-help">Como jogar</button>
        <button class="btn danger" id="m-new">Recomeçar temporada</button>
        <button class="btn primary" id="m-map">Voltar ao mapa</button>
      </div>`);
    $('m-help').onclick = () => { this.closeModal(); $('intro').classList.remove('hidden'); };
    $('m-map').onclick = () => { this.closeModal(); this.nav.toMap(); };
    $('m-new').onclick = () => {
      this.openModal('Recomeçar a temporada?', `<p style="line-height:1.8">O progresso desta temporada será perdido. As estrelas já conquistadas continuam.</p>
        <div class="modal-actions"><button class="btn" id="n-no">Cancelar</button><button class="btn danger" id="n-yes">Recomeçar</button></div>`);
      $('n-no').onclick = () => this.closeModal();
      $('n-yes').onclick = () => { this.closeModal(); this.nav.restart(); };
    };
  }

  // fim da temporada
  openResults(res, info) {
    const { level, goals, score, stats } = res;
    const starsHtml = res.stars.map((on, k) => `<span class="big-star ${on ? 'on' : ''}" style="animation-delay:${0.2 + k * 0.25}s">★</span>`).join('');
    const rows = [
      ['Dinheiro ganho', money(stats.earned)], ['Hóspedes atendidos', stats.guests], ['Avaliação final', `${res.rating.toFixed(2)} ★`],
      ['Maior combo', `x${stats.bestCombo}`], ['Pedidos atendidos', stats.requests], ['Irritados', stats.angry],
    ];
    const extra = res.daily
      ? `<div class="daily-board" id="daily-board"><p class="muted">Carregando placar...</p></div>`
      : `<p class="result-note">${info.newStars > 0 ? `+${info.newStars} estrela(s) para a rede! Use-as em bônus permanentes no mapa.` : 'Nenhuma estrela nova desta vez.'}${info.record ? ' <b>Novo recorde!</b>' : ''}</p>`;
    this.openModal(res.daily ? 'Fim do desafio do dia' : `Fim da temporada · ${level.name}`, `
      <div class="results">
        ${res.daily ? '' : `<div class="stars-row">${starsHtml}</div>`}
        <div class="final-score"><span>Pontuação</span><b>${score.toLocaleString('pt-BR')}</b></div>
        <div class="goal-list">${goals.map((x) => `<div class="g-row ${x.done ? 'done' : ''}"><span class="g-star">${x.done ? '★' : '☆'}</span><span class="g-label">${x.label}</span><span class="g-val">${x.text}</span></div>`).join('')}</div>
        <div class="stats">${rows.map(([a, b]) => `<div class="row"><span class="muted">${a}</span><span>${b}</span></div>`).join('')}</div>
        ${extra}
      </div>
      <div class="modal-actions">
        <button class="btn" id="r-again">Jogar de novo</button>
        <button class="btn primary" id="r-map">Voltar ao mapa</button>
      </div>`, true);
    $('r-again').onclick = () => { this.closeModal(); this.nav.restart(); };
    $('r-map').onclick = () => { this.closeModal(); this.nav.toMap(); };
  }

  renderBoard(rows, mine, shared) {
    const el = $('daily-board');
    if (!el) return;
    if (!rows || !rows.length) {
      el.innerHTML = `<p class="muted">${shared ? 'Ninguém pontuou hoje ainda. Seja o primeiro!' : `Seu melhor hoje: <b>${(mine || 0).toLocaleString('pt-BR')}</b> pts. O placar com outros jogadores só aparece na página publicada.`}</p>`;
      return;
    }
    el.innerHTML = `<h4>Placar de hoje</h4><ol>${rows.map((r) => `<li class="${r.me ? 'me' : ''}"><span>${r.name}${r.me ? ' (você)' : ''}</span><b>${r.score.toLocaleString('pt-BR')}</b></li>`).join('')}</ol>`;
  }

  // habilita/desabilita botões de compra conforme o dinheiro muda
  refreshModal() {
    if (!this.modalOpen || !this.modalRefresh || !this.game) return;
    document.querySelectorAll('[data-cost]').forEach((b) => { b.disabled = this.game.state.money < +b.dataset.cost; });
  }
}
