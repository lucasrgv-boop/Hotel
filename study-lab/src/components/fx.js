// Pequenas comemorações: confete nos acertos e "+pontos" flutuando.
const reduce = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

const COLORS = ["#ff5c8a", "#ffb3c7", "#9b7bff", "#ffc65c", "#4cd6a2", "#6ec3ff"];

export function burst({ x, y, count = 28 } = {}) {
  if (reduce()) return;
  const canvas = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.className = "fx-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const ox = x ?? W / 2;
  const oy = y ?? H * 0.42;
  const parts = Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2;
    const v = 4 + Math.random() * 6;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 4,
      r: 3 + Math.random() * 4,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      shape: Math.random() < 0.35 ? "heart" : Math.random() < 0.5 ? "dot" : "rect",
    };
  });
  const t0 = performance.now();
  const step = (t) => {
    const k = (t - t0) / 900;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.32;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      if (p.shape === "dot") {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === "heart") {
        const s = p.r / 3;
        ctx.beginPath();
        ctx.moveTo(0, 3 * s);
        ctx.bezierCurveTo(-6 * s, -1 * s, -3 * s, -6 * s, 0, -2.5 * s);
        ctx.bezierCurveTo(3 * s, -6 * s, 6 * s, -1 * s, 0, 3 * s);
        ctx.fill();
      } else ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      ctx.restore();
    }
    if (k < 1) requestAnimationFrame(step);
    else canvas.remove();
  };
  requestAnimationFrame(step);
}

export function bigBurst() {
  if (reduce()) return;
  burst({ x: window.innerWidth * 0.25, y: window.innerHeight * 0.4, count: 40 });
  setTimeout(() => burst({ x: window.innerWidth * 0.75, y: window.innerHeight * 0.35, count: 40 }), 160);
  setTimeout(() => burst({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.3, count: 50 }), 320);
}
