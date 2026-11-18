// Menu principal, configurações e créditos.
import { LEVELS } from './levels.js';
import { Meta } from './meta.js';
import { Settings, Sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
function savedLevel() {
  // hotel com temporada em andamento mais recente na campanha
  for (let k = LEVELS.length - 1; k >= 0; k--) {
    try { if (localStorage.getItem(`hotel-v5-${LEVELS[k].id}`)) return LEVELS[k]; } catch { /* ignore */ }
  }
  return null;
}

export class MainMenu {
  constructor(ui, nav) {
    this.ui = ui;
    this.nav = nav; // { toMap, continueLevel(id), daily, perks, applyQuality }
    $('mm-play').onclick = () => { Sfx.click(); this.nav.toMap(); };
    $('mm-daily').onclick = () => { Sfx.click(); this.nav.daily(); };
    $('mm-perks').onclick = () => { Sfx.click(); this.nav.perks(); };
    $('mm-help').onclick = () => { Sfx.click(); $('intro').classList.remove('hidden'); };
    $('mm-settings').onclick = () => { Sfx.click(); this.openSettings(); };
    $('mm-credits').onclick = () => { Sfx.click(); this.openCredits(); };
  }

  show() {
    this.visible = true;
    $('menu-screen').classList.remove('hidden');
    const lv = savedLevel();
    const cont = $('mm-continue');
    cont.classList.toggle('hidden', !lv);
    if (lv) {
      cont.querySelector('small').textContent = lv.name;
      cont.onclick = () => { Sfx.click(); this.nav.continueLevel(lv.id); };
    }
    $('mm-stars').textContent = `${Meta.totalStars()} / ${LEVELS.length * 3}`;
  }
  hide() {
    this.visible = false;
    $('menu-screen').classList.add('hidden');
  }

  openSettings() {
    const q = Settings.get('quality');
    this.ui.openModal('Configurações', `
      <div class="settings">
        <label class="set-row"><span>Música</span><input type="range" id="set-music" min="0" max="1" step="0.05" value="${Settings.get('music')}"><output id="o-music"></output></label>
        <label class="set-row"><span>Efeitos sonoros</span><input type="range" id="set-sfx" min="0" max="1" step="0.05" value="${Settings.get('sfx')}"><output id="o-sfx"></output></label>
        <div class="set-row"><span>Qualidade gráfica</span>
          <div class="seg" role="radiogroup" aria-label="Qualidade gráfica">
            ${[['low', 'Leve'], ['medium', 'Média'], ['high', 'Alta']].map(([v, l]) => `<button role="radio" aria-checked="${q === v}" class="${q === v ? 'on' : ''}" data-q="${v}">${l}</button>`).join('')}
          </div>
        </div>
        <p class="muted" style="margin:0;line-height:1.5">Se o jogo ficar lento no celular, use <b>Leve</b>: desliga sombras e brilho das luzes.</p>
      </div>`);
    const pct = (v) => `${Math.round(v * 100)}%`;
    const bind = (id, key) => {
      const el = $(id), out = $(`o-${key}`);
      out.textContent = pct(el.value);
      el.oninput = () => { Settings.set(key, +el.value); out.textContent = pct(el.value); };
      el.onchange = () => { if (key === 'sfx') Sfx.coin(); };
    };
    bind('set-music', 'music');
    bind('set-sfx', 'sfx');
    document.querySelectorAll('[data-q]').forEach((b) => {
      b.onclick = () => {
        Settings.set('quality', b.dataset.q);
        document.querySelectorAll('[data-q]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
        this.nav.applyQuality();
      };
    });
  }

  openCredits() {
    this.ui.openModal('Créditos', `
      <div class="credits">
        <p><b>Hotel Paraíso</b> — um jogo de administrar hotéis pelo mundo.</p>
        <p>Gráficos 3D feitos com <b>Three.js</b> (licença MIT). Mapa-múndi a partir do <b>world-atlas</b> / Natural Earth (domínio público).</p>
        <p>Músicas sintetizadas no navegador. Menu: <b>Minueto em Sol</b> (Christian Petzold, séc. XVIII). Mapa: <b>Ode à Alegria</b> (Ludwig van Beethoven). Ambas em domínio público, em arranjo próprio.</p>
        <p>Trilhas dos países: composições originais inspiradas na bossa nova, no jazz, na valsa musette, na música tradicional japonesa, no ländler alpino e na música árabe.</p>
      </div>`);
  }
}
