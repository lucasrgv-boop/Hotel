// Utilitários gerais, sem dependências.

export const uid = (prefix = "id") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(a, b) {
  const da = new Date(a + "T12:00:00");
  const db = new Date(b + "T12:00:00");
  return Math.round((db - da) / 86400000);
}

// Remove acentos e pontuação para comparar respostas e buscar termos.
export function norm(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%º°,.\s-]/g, " ")
    .replace(/[,.]+(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Aceita pequenas diferenças de digitação em respostas de lacuna.
export function answerMatches(given, accepted) {
  const g = norm(given);
  if (!g) return false;
  const list = Array.isArray(accepted) ? accepted : [accepted];
  return list.some((a) => {
    const n = norm(a);
    if (n === g) return true;
    const tol = n.length >= 10 ? 2 : n.length >= 5 ? 1 : 0;
    return levenshtein(n, g) <= tol;
  });
}

export function formatTime(totalSec) {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

export function pct(a, b) {
  return b ? Math.round((a / b) * 100) : 0;
}

export function debounce(fn, ms) {
  let t;
  const d = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  d.flush = (...args) => {
    clearTimeout(t);
    fn(...args);
  };
  return d;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function loadScript(urls) {
  const list = Array.isArray(urls) ? urls : [urls];
  return list.reduce(
    (p, url) =>
      p.catch(
        () =>
          new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = url;
            s.async = true;
            s.onload = () => resolve(url);
            s.onerror = () => {
              s.remove();
              reject(new Error("Falha ao carregar " + url));
            };
            document.head.appendChild(s);
          })
      ),
    Promise.reject(new Error("start"))
  );
}
