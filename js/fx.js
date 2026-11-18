// Efeitos visuais: partículas (moedas, brilhos, confete, fogos), pedestres e pássaros.
import * as THREE from 'three';
import { createPerson, animatePerson } from './characters.js';

function spriteTex(draw, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const TEX = {
  coin: spriteTex((g, s) => {
    g.fillStyle = '#e8a91a'; g.beginPath(); g.arc(s / 2, s / 2, s * 0.42, 0, 7); g.fill();
    g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(s / 2, s / 2, s * 0.32, 0, 7); g.fill();
    g.fillStyle = '#c9861a'; g.font = `bold ${s * 0.42}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', s / 2, s / 2 + 2);
  }),
  spark: spriteTex((g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,220,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(s / 2, 2); g.lineTo(s / 2 + 4, s / 2); g.lineTo(s / 2, s - 2); g.lineTo(s / 2 - 4, s / 2); g.fill();
    g.beginPath(); g.moveTo(2, s / 2); g.lineTo(s / 2, s / 2 + 4); g.lineTo(s - 2, s / 2); g.lineTo(s / 2, s / 2 - 4); g.fill();
  }),
  confetti: spriteTex((g, s) => { g.fillStyle = '#ffffff'; g.fillRect(s * 0.3, s * 0.15, s * 0.4, s * 0.7); }, 16),
  dot: spriteTex((g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }, 32),
};
const CONFETTI_COLORS = [0xef4b5c, 0xffd34d, 0x4fb6e8, 0x52c45a, 0xa267d6, 0xf08a3c];
const FIREWORK_COLORS = [0xff5a6e, 0xffd34d, 0x6fd0ff, 0x8ef07a, 0xd08aff, 0xffa64d];

export const Fx = {
  scene: null,
  parts: [],
  ambient: [],
  init(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
  },

  add(tex, pos, vel, { life = 1, size = 0.4, color = 0xffffff, gravity = 0, spin = 0, additive = false, fade = true } = {}) {
    const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    if (additive) m.toneMapped = false;
    const s = new THREE.Sprite(m);
    s.position.copy(pos);
    s.scale.setScalar(size);
    s.renderOrder = 8;
    this.group.add(s);
    this.parts.push({ s, vel: vel.clone(), life, max: life, gravity, spin, size, fade });
    if (this.parts.length > 600) this.kill(this.parts.shift());
  },
  kill(p) { this.group.remove(p.s); p.s.material.dispose(); },

  // moedas pulando ao receber dinheiro
  coins(pos, n = 6) {
    for (let k = 0; k < n; k++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 2.2, 3 + Math.random() * 2, (Math.random() - 0.5) * 1 + 0.6);
      this.add(TEX.coin, pos, v, { life: 1.1, size: 0.38, gravity: -9 });
    }
  },
  // brilhos ao terminar uma limpeza/conserto
  sparkles(pos, n = 14, color = 0xffffff) {
    for (let k = 0; k < n; k++) {
      const p = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3.6, Math.random() * 1.8, (Math.random() - 0.5) * 2));
      this.add(TEX.spark, p, new THREE.Vector3(0, 0.6 + Math.random(), 0), { life: 0.9 + Math.random() * 0.5, size: 0.25 + Math.random() * 0.3, color });
    }
  },
  confetti(pos, n = 40) {
    for (let k = 0; k < n; k++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 4, (Math.random() - 0.5) * 3 + 1);
      this.add(TEX.confetti, pos, v, { life: 2.2, size: 0.28, color: CONFETTI_COLORS[k % CONFETTI_COLORS.length], gravity: -6, spin: 6 });
    }
  },
  // fogos de artifício: um rojão que sobe e explode
  firework(pos) {
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    const top = pos.clone();
    for (let k = 0; k < 70; k++) {
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, (Math.random() - 0.5) * 0.4).normalize().multiplyScalar(4 + Math.random() * 3);
      this.add(TEX.dot, top, dir, { life: 1.3 + Math.random() * 0.5, size: 0.5, color, gravity: -2.5, additive: true });
    }
    this.add(TEX.dot, top, new THREE.Vector3(), { life: 0.35, size: 6, color, additive: true });
  },

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.kill(p); this.parts.splice(i, 1); continue; }
      p.vel.y += p.gravity * dt;
      if (p.gravity) p.vel.multiplyScalar(1 - 0.6 * dt);
      p.s.position.addScaledVector(p.vel, dt);
      if (p.spin) p.s.material.rotation += p.spin * dt;
      const k = p.life / p.max;
      if (p.fade) p.s.material.opacity = Math.min(1, k * 2.2);
    }
    for (const a of this.ambient) a.update(dt);
  },

  clear() {
    for (const p of this.parts) this.kill(p);
    this.parts = [];
    for (const a of this.ambient) a.dispose();
    this.ambient = [];
  },

  // ---------- vida ambiente ----------
  // pedestres andando na calçada do outro lado da rua e pássaros cruzando o céu
  startAmbient(scene, { streetZ, width, palette, hats, birds = true, height = 10 }) {
    const peds = [];
    for (let k = 0; k < 7; k++) {
      const hat = hats[k % hats.length];
      const p = createPerson({ shirt: palette[k % palette.length], ...(hat === 'none' ? {} : hat === 'sun' ? { hat: true } : { hat, hatColor: palette[(k + 2) % palette.length] }) });
      const dir = k % 2 ? 1 : -1;
      p.position.set(-30 + Math.random() * (width + 60), 0, streetZ + (dir > 0 ? -0.3 : 0.3));
      p.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      p.userData.dir = dir;
      p.userData.speed = 1.3 + Math.random() * 0.8;
      scene.add(p);
      peds.push(p);
    }
    const flock = [];
    if (birds) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x3a3340, side: THREE.DoubleSide, fog: false });
      for (let k = 0; k < 5; k++) {
        const b = new THREE.Group();
        for (const s of [-1, 1]) {
          const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), mat);
          w.position.x = s * 0.45; b.add(w); w.userData.side = s;
        }
        b.position.set(-40 - k * 3, height + 6 + Math.random() * 6, -12 - Math.random() * 10);
        b.userData.t = Math.random() * 10;
        scene.add(b);
        flock.push(b);
      }
    }
    const amb = {
      update(dt) {
        for (const p of peds) {
          p.position.x += p.userData.dir * p.userData.speed * dt;
          if (p.position.x > width + 34) p.position.x = -34;
          if (p.position.x < -34) p.position.x = width + 34;
          animatePerson(p, dt, true, p.userData.speed / 1.6);
        }
        for (const b of flock) {
          b.userData.t += dt;
          b.position.x += dt * 4;
          b.position.y += Math.sin(b.userData.t * 0.8) * dt * 0.4;
          if (b.position.x > width + 60) b.position.x = -60;
          const flap = Math.sin(b.userData.t * 9) * 0.6;
          for (const w of b.children) w.rotation.z = w.userData.side * flap;
        }
      },
      dispose() { for (const p of peds) scene.remove(p); for (const b of flock) scene.remove(b); },
    };
    this.ambient.push(amb);
    return amb;
  },
};
