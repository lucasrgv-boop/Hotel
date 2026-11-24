// Modelo de conteúdo e funções de leitura.
// O conteúdo vem de "pacotes" (JSON) separados da lógica do app:
//  - content.json: pacote gerado a partir dos materiais enviados no chat;
//  - pacotes de materiais importados no próprio app;
//  - pacote de demonstração (guia de uso), só quando não há outro conteúdo.
import { buildIndex } from "./search.js";

const asArr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

function normSrc(s, fallbackM) {
  if (!s) return fallbackM ? { m: fallbackM } : null;
  if (typeof s === "string") return { m: fallbackM, q: s };
  return { m: s.m || s.material || fallbackM, p: s.p ?? s.page ?? null, q: s.q || s.quote || null, ok: s.ok };
}

function normItem(v, fallbackM) {
  if (typeof v === "string") return { text: v, src: fallbackM ? { m: fallbackM } : null };
  return { ...v, text: v.text || v.t || "", src: normSrc(v.src, fallbackM) };
}

export function normalizePack(raw, origin = "pack") {
  const pack = raw || {};
  const subjects = asArr(pack.subjects).map((s) => ({ id: s.id, name: s.name || s.id, color: s.color || null }));
  const materials = asArr(pack.materials).map((m) => ({
    id: m.id,
    subjectId: m.subjectId || subjects[0]?.id || "geral",
    title: m.title || m.fileName || "Material",
    fileName: m.fileName || "",
    kind: m.kind || "texto",
    origin: m.origin || origin,
    generator: m.generator || (origin === "pack" ? "claude" : "auto"),
    demo: !!(m.demo || pack.demo),
    addedAt: m.addedAt || null,
    pageLabel: m.pageLabel || "p.",
    chunks: asArr(m.chunks).map((c, i) => ({
      id: c.id || `${m.id}-c${i}`,
      materialId: m.id,
      page: c.page ?? i + 1,
      label: c.label || null,
      text: c.text || "",
    })),
  }));
  const firstM = materials[0]?.id;
  const topics = asArr(pack.topics).map((t, i) => {
    const mid = asArr(t.materialIds)[0] || firstM;
    return {
      id: t.id,
      subjectId: t.subjectId || materials.find((m) => m.id === mid)?.subjectId || subjects[0]?.id || "geral",
      materialIds: asArr(t.materialIds).length ? asArr(t.materialIds) : mid ? [mid] : [],
      title: t.title,
      importance: t.importance || 2,
      order: t.order ?? i,
      minutes: t.minutes || 10,
      why: t.why || "",
      summary: { full: t.summary?.full || "", simple: t.summary?.simple || "" },
      concepts: asArr(t.concepts).map((c) => ({ term: c.term, definition: c.definition, src: normSrc(c.src, mid) })),
      keywords: asArr(t.keywords),
      attention: asArr(t.attention).map((x) => normItem(x, mid)),
      examples: asArr(t.examples).map((x) => normItem(x, mid)),
      comparisons: asArr(t.comparisons).map((c) => ({ a: c.a, b: c.b, difference: c.difference, src: normSrc(c.src, mid) })),
      memorize: asArr(t.memorize).map((x) => normItem(x, mid)),
      sources: asArr(t.sources).map((s) => normSrc(s, mid)),
      demo: !!(t.demo || pack.demo),
    };
  });
  const topicMat = Object.fromEntries(topics.map((t) => [t.id, t.materialIds[0]]));
  const questions = asArr(pack.questions)
    .map((q) => ({ ...q, src: normSrc(q.src, topicMat[q.topicId]), demo: !!(q.demo || pack.demo) }))
    .filter(validQuestion);
  const flashcards = asArr(pack.flashcards)
    .filter((c) => c.front && c.back)
    .map((c) => ({ ...c, src: normSrc(c.src, topicMat[c.topicId]), demo: !!(c.demo || pack.demo) }));
  return { title: pack.title || "", exam: pack.exam || null, subjects, materials, topics, questions, flashcards, notes: asArr(pack.notes) };
}

function validQuestion(q) {
  if (!q || !q.id || !q.topicId || !q.prompt) return false;
  switch (q.type) {
    case "mcq":
      return Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer < q.options.length;
    case "tf":
      return typeof q.answer === "boolean";
    case "cloze":
      return !!q.answer && /_{3,}/.test(q.prompt);
    case "match":
      return Array.isArray(q.pairs) && q.pairs.length >= 2;
    case "open":
      return !!q.answer;
    default:
      return false;
  }
}

// Junta vários pacotes num só conteúdo navegável.
export function mergePacks(packs) {
  const out = { subjects: [], materials: [], topics: [], questions: [], flashcards: [], exam: null, notes: [] };
  const seenS = new Set();
  for (const p of packs) {
    if (!p) continue;
    if (p.exam && !out.exam) out.exam = p.exam;
    for (const s of p.subjects) if (!seenS.has(s.id)) (seenS.add(s.id), out.subjects.push(s));
    out.materials.push(...p.materials);
    out.topics.push(...p.topics);
    out.questions.push(...p.questions);
    out.flashcards.push(...p.flashcards);
    out.notes.push(...(p.notes || []));
  }
  out.topics.sort((a, b) => a.order - b.order);
  return finalize(out);
}

export function finalize(c) {
  c.byTopic = Object.fromEntries(c.topics.map((t) => [t.id, t]));
  c.byMaterial = Object.fromEntries(c.materials.map((m) => [m.id, m]));
  c.bySubject = Object.fromEntries(c.subjects.map((s) => [s.id, s]));
  c.byQuestion = Object.fromEntries(c.questions.map((q) => [q.id, q]));
  c.byCard = Object.fromEntries(c.flashcards.map((f) => [f.id, f]));
  c.chunks = c.materials.flatMap((m) => m.chunks);
  c.index = buildIndex(c.chunks);
  c.hasContent = c.materials.some((m) => !m.demo);
  return c;
}

export function questionsOf(c, topicId) {
  return c.questions.filter((q) => q.topicId === topicId);
}
export function cardsOf(c, topicId) {
  return c.flashcards.filter((f) => f.topicId === topicId);
}

export function srcLabel(c, src) {
  if (!src) return null;
  const m = c.byMaterial[src.m];
  if (!m) return null;
  const chunk = src.p != null ? m.chunks.find((ch) => String(ch.page) === String(src.p)) : null;
  const where = chunk?.label || (src.p != null ? `${m.pageLabel} ${src.p}` : null);
  return { title: m.title, where, material: m };
}

export const TYPE_LABEL = {
  mcq: "Múltipla escolha",
  tf: "Verdadeiro ou falso",
  open: "Pergunta aberta",
  match: "Associação",
  cloze: "Completar lacuna",
};
