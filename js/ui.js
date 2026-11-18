// Interface HTML: HUD, painel de informações, modais, toasts e popups.
import { TIERS, BUILDABLES, UPGRADES } from './config.js';
import { iconDataURL } from './textures.js';
import { Sfx, isMuted, setMuted } from './audio.js';

const $ = (id) => document.getElementById(id);
const tierHex = (t) => '#' + TIERS[t].color.toString(16).padStart(6, '0');

const STATUS_PT = { clean: 'Livre', occupied: 'Ocupado', dirty: 'Sujo', cleaning: 'Limpando' };

export class UI {
  constructor() {
    this.game = null;
    this.camera = null;
    this.panelTarget = null; // {kind:'slot', f, i}
    this.dirty = true;
    this.lastHud = '';
    this.icons = {};
    for (const n of ['bed', 'burger', 'dumbbell', 'wave', 'broom', 'star', 'heart', 'coin', 'building', 'bell', 'plant', 'megaphone', 'sparkle', 'dirty']) this.icons[n] = iconDataURL(n, 96);
    this.floorsDirty = true;
    document.querySelectorAll('img[data-icon]').forEach((img) => { img.src = this.icons[img.dataset.icon]; });
    this.lastFloorsKey = '';

    $('modal-close').onclick = () => this.closeModal();
    $('modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') this.closeModal(); });
    $('btn-upgrades').onclick = () => { Sfx.click(); this.openUpgrades(); };
    $('btn-menu').onclick = () => { Sfx.click(); this.openMenu(); };
    $('btn-sound').onclick = () => { setMuted(!isMuted()); this.syncSound(); Sfx.click(); };
    this.syncSound();
    document.querySelectorAll('#speed button').forEach((b) => {
      b.onclick = () => { this.setSpeed(+b.dataset.speed); Sfx.click(); };
    });
  }

  attach(game, camera, nav) {
    this.game = game;
    this.camera = camera;
    this.nav = nav;
    this.setSpeed(game.speed);
  }

  syncSound() { $('btn-sound').classList.toggle('off', isMuted()); }

  setSpeed(s) {
    if (!this.game) return;
    this.game.speed = s;
    document.querySelectorAll('#speed button').forEach((b) => b.classList.toggle('on', +b.dataset.speed === s));
  }

  // ---------- Toasts & popups ----------
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
      $('money').style.color = st.money < 0 ? '#ff8a80' : '';
      $('clock').textContent = `Dia ${g.day} ${hh}:${mm}`;
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
    if (this.dirty) { this.dirty = false; this.renderPanel(); }
    this.renderFloors();
  }

  changed() { this.dirty = true; }

  // ---------- Abas de andares ----------
  renderFloors() {
    if (!$('floors')) return;
    const g = this.game;
    const vf = g.view.viewFloor;
    const parts = [];
    for (let f = g.state.floors - 1; f >= 0; f--) {
      const s = g.floorStatus(f);
      parts.push(`${f}:${s.free}:${s.dirty}:${s.busy}`);
    }
    const key = `${vf}|${parts.join(',')}`;
    if (key === this.lastFloorsKey) return;
    this.lastFloorsKey = key;
    const el = $('floors');
    el.innerHTML = '';
    for (let f = g.state.floors - 1; f >= 0; f--) {
      const s = g.floorStatus(f);
      const b = document.createElement('button');
      b.className = 'floor-btn' + (f === vf ? ' on' : '');
      b.title = f === 0 ? 'Térreo' : `${f}º andar`;
      b.innerHTML = `<span class="fl">${f === 0 ? 'T' : f + 'º'}</span>
        <span class="badges">${s.free ? `<i class="b-free" title="Quartos livres">${s.free}</i>` : ''}${s.dirty ? `<i class="b-dirty" title="Quartos sujos">${s.dirty}</i>` : ''}</span>`;
      b.onclick = () => { Sfx.click(); this.nav.setViewFloor(f); };
      el.appendChild(b);
    }
  }

  // ---------- Painel ----------
  showSlot(f, i) { this.panelTarget = { kind: 'slot', f, i }; this.renderPanel(); }
  hidePanel() { this.panelTarget = null; this.renderPanel(); }

  renderPanel() {
    const p = $('panel');
    const g = this.game;
    if (g.selected) {
      const gu = g.selected;
      p.classList.remove('hidden');
      p.innerHTML = `
        <h3>${gu.type.name} <span class="tag" style="background:${tierHex(gu.want)}">${TIERS[gu.want].name}</span></h3>
        <div class="row"><span class="muted">Quer quarto</span><span style="color:${tierHex(gu.want)}">${TIERS[gu.want].name}</span></div>
        <div class="row"><span class="muted">Diárias</span><span>${gu.nights}</span></div>
        <div class="row"><span class="muted">Paga até</span><span>$${TIERS[gu.want].price * gu.nights}</span></div>
        <div class="row"><span class="muted">Paciência</span><span>${Math.round((gu.patience / gu.maxPatience) * 100)}%</span></div>
        <p class="muted" style="margin:8px 0 0">Clique num quarto <b style="color:#9fe870">livre</b> para alocar. Quarto pior que o desejado = hóspede insatisfeito.</p>
        <div class="actions"><button class="btn" id="p-auto">ALOCAR NO MELHOR QUARTO</button></div>`;
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
      const num = (t.f + 1) * 100 + t.i + 1;
      const next = TIERS[sl.tier + 1];
      const guest = sl.guest;
      let gInfo = '';
      if (guest) {
        const left = Math.max(0, guest.stayLeft);
        gInfo = `<div class="row"><span class="muted">Hóspede</span><span>${guest.type.name}</span></div>
          <div class="row"><span class="muted">Sai em</span><span>${guest.state === 'toRoom' && !guest.stayLeft ? '—' : `${left.toFixed(1)}h`}</span></div>`;
      }
      p.innerHTML = `
        <h3>Quarto ${num} <span class="tag" style="background:${tierHex(sl.tier)}">${TIERS[sl.tier].name}</span></h3>
        <div class="row"><span class="muted">Estado</span><span>${STATUS_PT[sl.status]}</span></div>
        <div class="row"><span class="muted">Diária</span><span>$${TIERS[sl.tier].price}</span></div>
        ${gInfo}
        ${sl.status === 'cleaning' ? `<div class="row"><span class="muted">Limpeza</span><span>${Math.round((sl.cleanP || 0) * 100)}%</span></div>` : ''}
        <div class="actions">
          ${sl.status === 'dirty' ? '<button class="btn good" id="p-clean">LIMPAR</button>' : ''}
          ${next ? `<button class="btn" id="p-up">REFORMAR P/ ${next.name.toUpperCase()} ($${next.upgrade})</button>` : '<span class="muted">Nível máximo!</span>'}
          <button class="btn danger" id="p-demo">DEMOLIR</button>
        </div>`;
      if ($('p-clean')) $('p-clean').onclick = () => g.startManualClean(t.f, t.i);
      if ($('p-up')) {
        $('p-up').disabled = g.state.money < next.upgrade;
        $('p-up').onclick = () => { g.upgradeRoom(t.f, t.i); this.changed(); };
      }
      $('p-demo').onclick = () => this.confirmDemolish(t.f, t.i);
    } else {
      const b = BUILDABLES[sl.type];
      const using = g.guests.filter((x) => x.facility && x.facility.f === t.f && x.facility.i === t.i && x.state === 'atFacility').length;
      p.innerHTML = `
        <h3>${b.name}</h3>
        <p class="muted" style="margin:0 0 6px">${b.desc}</p>
        <div class="row"><span class="muted">Gasto por visita</span><span>$${b.spend[0]}–${b.spend[1]}</span></div>
        <div class="row"><span class="muted">Usando agora</span><span>${using}</span></div>
        <div class="actions"><button class="btn danger" id="p-demo">DEMOLIR</button></div>`;
      $('p-demo').onclick = () => this.confirmDemolish(t.f, t.i);
    }
  }

  confirmDemolish(f, i) {
    this.openModal('Demolir?', `
      <p style="line-height:1.8">Tem certeza? O espaço volta a ficar vazio e o dinheiro <b>não</b> é devolvido.</p>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="d-no">CANCELAR</button><button class="btn danger" id="d-yes">DEMOLIR</button></div>`);
    $('d-no').onclick = () => this.closeModal();
    $('d-yes').onclick = () => { this.game.demolish(f, i); this.closeModal(); this.hidePanel(); };
  }

  // ---------- Modais ----------
  openModal(title, html) {
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = html;
    $('modal').classList.remove('hidden');
    this.modalOpen = true;
  }
  closeModal() {
    $('modal').classList.add('hidden');
    this.modalOpen = false;
    this.modalRefresh = null;
  }

  openBuild(f, i) {
    const g = this.game;
    const render = () => {
      const cards = Object.entries(BUILDABLES).map(([k, b]) => {
        const cost = g.buildCost(k);
        return `<div class="card"><img src="${this.icons[b.icon]}" alt="">
          <div class="body"><span class="name">${b.name}</span><span class="desc">${b.desc}${k === 'room' ? ` Diária $${TIERS[0].price}.` : ''}</span>
          <button class="btn good" data-build="${k}" ${g.state.money < cost ? 'disabled' : ''}>CONSTRUIR $${cost}</button></div></div>`;
      }).join('');
      this.openModal(`Construir no ${f === 0 ? 'térreo' : `${f}º andar`}`, `<div class="cards">${cards}</div>`);
      document.querySelectorAll('[data-build]').forEach((b) => {
        b.onclick = () => { if (g.build(f, i, b.dataset.build)) { this.closeModal(); this.showSlot(f, i); } };
      });
    };
    render();
    this.modalRefresh = render;
  }

  openUpgrades() {
    const g = this.game;
    const render = () => {
      const cards = Object.entries(UPGRADES).map(([k, u]) => {
        const lvl = g.state.upgrades[k];
        const maxed = lvl >= u.max;
        const cost = u.cost(lvl);
        return `<div class="card"><img src="${this.icons[u.icon]}" alt="">
          <div class="body"><span class="name">${u.name}</span><span class="desc">${u.desc}</span>
          <span class="lvl">${u.max > 1 ? `Nível ${lvl}/${u.max}` : (lvl ? 'Adquirido' : '')}</span>
          ${maxed ? '<span class="muted">MÁXIMO</span>' : `<button class="btn good" data-up="${k}" ${g.state.money < cost ? 'disabled' : ''}>COMPRAR $${cost}</button>`}</div></div>`;
      }).join('');
      const st = g.state;
      const info = `<p class="muted" style="line-height:1.8;margin:0 0 10px">Quartos: ${g.rooms().length} · Andares: ${st.floors} · Salários: $${g.salaries()}/dia · Chegadas: ~${(g.arrivalRatePerHour() * 24).toFixed(0)}/dia</p>`;
      this.openModal('Melhorias do Hotel', info + `<div class="cards">${cards}</div>`);
      document.querySelectorAll('[data-up]').forEach((b) => {
        b.onclick = () => { if (g.buyUpgrade(b.dataset.up)) render(); };
      });
    };
    render();
    this.modalRefresh = render;
  }

  openMenu() {
    const g = this.game;
    const st = g.state;
    this.openModal('Menu', `
      <div style="line-height:2">
        <div class="row" style="display:flex;justify-content:space-between"><span class="muted">Hóspedes atendidos</span><span>${st.stats.guests}</span></div>
        <div class="row" style="display:flex;justify-content:space-between"><span class="muted">Foram embora irritados</span><span>${st.stats.angry}</span></div>
        <div class="row" style="display:flex;justify-content:space-between"><span class="muted">Total ganho</span><span>$${st.stats.earned}</span></div>
        <div class="row" style="display:flex;justify-content:space-between"><span class="muted">Melhor dia</span><span>$${st.stats.best}</span></div>
        <div class="row" style="display:flex;justify-content:space-between"><span class="muted">Avaliação</span><span>${st.rating.toFixed(2)} ★</span></div>
      </div>
      <p class="muted" style="line-height:1.8">Atalhos: Espaço = pausar · 1/2/3 = velocidade · U = melhorias · Q/E = girar · Esc = cancelar. O jogo salva automaticamente.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        <button class="btn" id="m-help">COMO JOGAR</button>
        <button class="btn danger" id="m-new">NOVO JOGO</button>
      </div>`);
    $('m-help').onclick = () => { this.closeModal(); $('intro').classList.remove('hidden'); };
    $('m-new').onclick = () => {
      this.openModal('Novo jogo?', `<p style="line-height:1.8">Todo o progresso será perdido.</p>
        <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="n-no">CANCELAR</button><button class="btn danger" id="n-yes">RECOMEÇAR</button></div>`);
      $('n-no').onclick = () => this.closeModal();
      $('n-yes').onclick = () => { g.reset(); this.closeModal(); this.hidePanel(); this.toast('Novo hotel aberto. Boa sorte!', 'good'); };
    };
  }

  // atualiza modal aberto quando o dinheiro muda (habilita botões)
  refreshModal() {
    if (this.modalOpen && this.modalRefresh) {
      document.querySelectorAll('[data-build],[data-up]').forEach((b) => {
        const m = b.textContent.match(/\$(\d+)/);
        if (m) b.disabled = this.game.state.money < +m[1];
      });
    }
  }
}

