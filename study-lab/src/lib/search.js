// Busca por relevância (BM25) nos trechos dos materiais. Funciona sem internet.
import { norm } from "./util.js";

export const STOP = new Set(
  (
    "a o e é as os um uma uns umas de do da dos das no na nos nas em por para pelo pela pelos pelas com sem sob sobre " +
    "que se ao aos à às ou mas como mais menos muito muita muitos muitas já não nao sim também tambem isso isto esse essa " +
    "este esta esses essas estes estas aquele aquela aquilo ele ela eles elas seu sua seus suas meu minha nosso nossa " +
    "lhe lhes quando onde qual quais quem cujo cuja entre até ate após apos ser são sao foi foram era eram será sera " +
    "ter tem têm tinha há ha pode podem deve devem cada todo toda todos todas outro outra outros outras mesmo mesma " +
    "assim então entao porque pois porém porem contudo ainda apenas só so sua the of and to in is for on are be " +
    "pag página pagina p fig figura tabela exemplo ex etc vez vezes forma modo caso casos tipo tipos parte partes"
  ).split(/\s+/)
);

export function tokens(text) {
  return norm(text)
    .split(/[^a-z0-9%]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

// Raiz simples para português (plural e algumas terminações comuns).
export function stem(t) {
  if (t.length <= 4) return t;
  return t
    .replace(/(coes|cao|coes)$/, "c")
    .replace(/(mente)$/, "")
    .replace(/(oes|aes|ais|eis|ois)$/, "")
    .replace(/(es|s)$/, "")
    .replace(/(a|o|e)$/, "");
}

export function buildIndex(docs) {
  // docs: [{id, text, ...}]
  const df = new Map();
  const items = docs.map((d) => {
    const toks = tokens(d.text).map(stem);
    const tf = new Map();
    toks.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
    tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1));
    return { doc: d, tf, len: toks.length };
  });
  const avg = items.reduce((s, i) => s + i.len, 0) / (items.length || 1);
  return { items, df, avg, N: items.length };
}

export function searchIndex(index, query, { limit = 10, filter } = {}) {
  if (!index || !index.N) return [];
  const q = [...new Set(tokens(query).map(stem))];
  if (!q.length) return [];
  const k1 = 1.4;
  const b = 0.72;
  const res = [];
  for (const it of index.items) {
    if (filter && !filter(it.doc)) continue;
    let score = 0;
    let hits = 0;
    for (const t of q) {
      const f = it.tf.get(t);
      if (!f) continue;
      hits++;
      const n = index.df.get(t) || 0;
      const idf = Math.log(1 + (index.N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * it.len) / (index.avg || 1))));
    }
    if (score > 0) res.push({ doc: it.doc, score: score * (0.6 + 0.4 * (hits / q.length)) });
  }
  res.sort((a, b2) => b2.score - a.score);
  return res.slice(0, limit);
}

// Trecho curto ao redor da primeira ocorrência dos termos.
export function snippet(text, query, size = 240) {
  const qs = tokens(query);
  const n = norm(text);
  let pos = -1;
  for (const q of qs) {
    const p = n.indexOf(q);
    if (p >= 0 && (pos < 0 || p < pos)) pos = p;
  }
  if (pos < 0) return text.slice(0, size) + (text.length > size ? "…" : "");
  // norm() pode mudar o tamanho do texto; a aproximação é suficiente para o recorte.
  const start = Math.max(0, pos - Math.floor(size / 3));
  const end = Math.min(text.length, start + size);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}

// Divide um texto em partes para destacar os termos buscados.
export function highlightParts(text, query) {
  const qs = [...new Set(tokens(query))].filter((q) => q.length > 2);
  if (!qs.length) return [{ t: text, m: false }];
  const parts = [];
  const re = /[A-Za-zÀ-ÿ0-9%]+|[^A-Za-zÀ-ÿ0-9%]+/g;
  let m;
  while ((m = re.exec(text))) {
    const w = m[0];
    const nw = norm(w);
    const hit = nw.length > 2 && qs.some((q) => nw.startsWith(q) || (q.length > 4 && nw.startsWith(stem(q))));
    const last = parts[parts.length - 1];
    if (last && last.m === hit) last.t += w;
    else parts.push({ t: w, m: hit });
  }
  return parts;
}
