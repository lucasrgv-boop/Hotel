// Progresso do estudante: pontuação, níveis, sequência, metas, conquistas,
// estatísticas por pergunta e repetição espaçada dos flashcards.
import { todayKey, daysBetween, pick } from "./util.js";

export function emptyProgress() {
  return {
    v: 1,
    updatedAt: 0,
    xp: 0,
    streak: { count: 0, last: null, best: 0 },
    daily: { date: todayKey(), xp: 0, answered: 0, cards: 0 },
    days: {}, // data -> xp
    q: {}, // questionId -> {seen, correct, wrong, last, lastAt, streak}
    cards: {}, // cardId -> {box, due, rating, reviews}
    prep: {}, // topicId -> {stage, done, score, total}
    exams: [],
    achievements: {},
    combo: 0,
    bestCombo: 0,
    totals: { answered: 0, correct: 0, cards: 0, exams: 0 },
    last: null, // {route, label, at}
  };
}

export const LEVELS = [
  { n: 1, name: "Iniciante", xp: 0 },
  { n: 2, name: "Aprendiz", xp: 100 },
  { n: 3, name: "Estudante", xp: 250 },
  { n: 4, name: "Dedicado", xp: 450 },
  { n: 5, name: "Avançado", xp: 700 },
  { n: 6, name: "Especialista", xp: 1000 },
  { n: 7, name: "Mestre", xp: 1400 },
  { n: 8, name: "Lenda", xp: 2000 },
];

export function levelOf(xp) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) cur = l;
  const next = LEVELS.find((l) => l.xp > xp) || null;
  const span = next ? next.xp - cur.xp : 1;
  const into = next ? xp - cur.xp : 1;
  return { ...cur, next, progress: next ? into / span : 1, toNext: next ? next.xp - xp : 0 };
}

export const ACHIEVEMENTS = [
  { id: "first", title: "Primeiro passo", desc: "Responder a primeira pergunta." },
  { id: "combo5", title: "Embalado", desc: "Acertar 5 seguidas." },
  { id: "combo10", title: "Imparável", desc: "Acertar 10 seguidas." },
  { id: "cards25", title: "Memória em dia", desc: "Revisar 25 flashcards." },
  { id: "cards100", title: "Cem cartões", desc: "Revisar 100 flashcards." },
  { id: "goal", title: "Meta cumprida", desc: "Atingir a meta diária." },
  { id: "streak3", title: "Três dias seguidos", desc: "Estudar 3 dias consecutivos." },
  { id: "topic", title: "Assunto concluído", desc: "Concluir um assunto da preparação." },
  { id: "prep", title: "Preparação completa", desc: "Concluir todos os assuntos da preparação." },
  { id: "exam", title: "Primeiro simulado", desc: "Terminar um simulado." },
  { id: "exam70", title: "Aprovado", desc: "Tirar 7 ou mais num simulado." },
  { id: "exam100", title: "Gabaritou", desc: "Acertar tudo num simulado." },
  { id: "import", title: "Biblioteca aberta", desc: "Importar um material." },
];

// Mensagens de incentivo, sóbrias.
export const CHEER_OK = [
  "Isso mesmo.",
  "Correto. Continue assim.",
  "Boa! Esse você já domina.",
  "Certo. Mais um ponto para a prova.",
  "Exato.",
];
export const CHEER_BAD = [
  "Quase. Leia a explicação e tente de novo.",
  "Errar agora é ótimo: é aqui que a gente aprende.",
  "Esse vai para a sua revisão.",
  "Sem problema. Veja o porquê abaixo.",
];
export const cheer = (ok) => pick(ok ? CHEER_OK : CHEER_BAD);

function touchDay(p) {
  const t = todayKey();
  if (p.daily.date !== t) p.daily = { date: t, xp: 0, answered: 0, cards: 0 };
  const last = p.streak.last;
  if (last !== t) {
    const gap = last ? daysBetween(last, t) : null;
    p.streak.count = gap === 1 ? p.streak.count + 1 : 1;
    p.streak.last = t;
    p.streak.best = Math.max(p.streak.best || 0, p.streak.count);
  }
}

function unlock(p, id, events) {
  if (p.achievements[id]) return;
  p.achievements[id] = Date.now();
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (a) events.push({ kind: "achievement", ...a });
}

function addXp(p, n, goal, events) {
  const beforeLevel = levelOf(p.xp).n;
  const beforeDaily = p.daily.xp;
  p.xp += n;
  p.daily.xp += n;
  p.days[p.daily.date] = (p.days[p.daily.date] || 0) + n;
  if (beforeDaily < goal && p.daily.xp >= goal) {
    events.push({ kind: "goal" });
    unlock(p, "goal", events);
  }
  const after = levelOf(p.xp);
  if (after.n > beforeLevel) events.push({ kind: "level", level: after });
}

function common(p, events) {
  touchDay(p);
  if (p.streak.count >= 3) unlock(p, "streak3", events);
}

// Registra uma resposta. `firstTry` indica se é a primeira tentativa na sessão.
export function recordAnswer(prev, { qid, correct, firstTry = true, goal = 150 }) {
  const p = structuredClone(prev);
  const events = [];
  common(p, events);
  const s = p.q[qid] || { seen: 0, correct: 0, wrong: 0, streak: 0 };
  s.seen++;
  if (correct) {
    s.correct++;
    s.streak = (s.streak || 0) + 1;
  } else {
    s.wrong++;
    s.streak = 0;
    s.lastWrongAt = Date.now();
  }
  s.last = correct;
  s.lastAt = Date.now();
  p.q[qid] = s;
  p.totals.answered++;
  p.daily.answered++;
  if (correct) {
    p.totals.correct++;
    p.combo++;
    p.bestCombo = Math.max(p.bestCombo, p.combo);
    if (p.combo >= 5) unlock(p, "combo5", events);
    if (p.combo >= 10) unlock(p, "combo10", events);
    addXp(p, firstTry ? 10 : 4, goal, events);
  } else {
    p.combo = 0;
    addXp(p, 1, goal, events);
  }
  unlock(p, "first", events);
  p.updatedAt = Date.now();
  return { p, events, gained: correct ? (firstTry ? 10 : 4) : 1 };
}

// Repetição espaçada (caixas de Leitner) com intervalos curtos: a prova é amanhã.
const BOX_MIN = [0, 10, 60, 6 * 60, 24 * 60];

export function recordCard(prev, { cid, rating, goal = 150 }) {
  const p = structuredClone(prev);
  const events = [];
  common(p, events);
  const s = p.cards[cid] || { box: 0, reviews: 0 };
  if (rating === "know") s.box = Math.min(4, Math.max(2, (s.box || 0) + 1));
  else if (rating === "doubt") s.box = 1;
  else s.box = 0;
  s.rating = rating;
  s.reviews++;
  s.due = Date.now() + BOX_MIN[s.box] * 60000;
  s.lastAt = Date.now();
  p.cards[cid] = s;
  p.totals.cards++;
  p.daily.cards++;
  if (p.totals.cards >= 25) unlock(p, "cards25", events);
  if (p.totals.cards >= 100) unlock(p, "cards100", events);
  const gained = rating === "know" ? 3 : 2;
  addXp(p, gained, goal, events);
  p.updatedAt = Date.now();
  return { p, events, gained };
}

export function recordExam(prev, exam, goal = 150) {
  const p = structuredClone(prev);
  const events = [];
  common(p, events);
  p.exams = [exam, ...p.exams].slice(0, 30);
  p.totals.exams++;
  unlock(p, "exam", events);
  if (exam.grade >= 7) unlock(p, "exam70", events);
  if (exam.correct === exam.total && exam.total > 0) unlock(p, "exam100", events);
  addXp(p, exam.correct * 3 + 20, goal, events);
  p.updatedAt = Date.now();
  return { p, events };
}

export function recordPrep(prev, topicId, patch, allTopicIds) {
  const p = structuredClone(prev);
  const events = [];
  const before = p.prep[topicId] || {};
  p.prep[topicId] = { ...before, ...patch };
  if (patch.done && !before.done) {
    unlock(p, "topic", events);
    if (allTopicIds.every((id) => p.prep[id]?.done)) unlock(p, "prep", events);
  }
  p.updatedAt = Date.now();
  return { p, events };
}

export function markAchievement(prev, id) {
  const p = structuredClone(prev);
  const events = [];
  unlock(p, id, events);
  p.updatedAt = Date.now();
  return { p, events };
}

// ---------- Leituras derivadas ----------

// Domínio de um assunto (0–1) combinando perguntas e flashcards.
export function topicMastery(p, content, topicId) {
  const qs = content.questions.filter((q) => q.topicId === topicId);
  const cs = content.flashcards.filter((c) => c.topicId === topicId);
  let qScore = 0;
  let qSeen = 0;
  let correct = 0;
  let wrong = 0;
  for (const q of qs) {
    const s = p.q[q.id];
    if (!s) continue;
    qSeen++;
    correct += s.correct;
    wrong += s.wrong;
    qScore += s.last ? (s.wrong ? 0.75 : 1) : 0;
  }
  let cScore = 0;
  let cSeen = 0;
  for (const c of cs) {
    const s = p.cards[c.id];
    if (!s) continue;
    cSeen++;
    cScore += Math.min(1, (s.box || 0) / 3);
  }
  const qPart = qs.length ? qScore / qs.length : null;
  const cPart = cs.length ? cScore / cs.length : null;
  let mastery = 0;
  if (qPart != null && cPart != null) mastery = qPart * 0.7 + cPart * 0.3;
  else mastery = qPart ?? cPart ?? 0;
  const attempts = correct + wrong;
  return {
    mastery,
    qSeen,
    qTotal: qs.length,
    cSeen,
    cTotal: cs.length,
    correct,
    wrong,
    accuracy: attempts ? correct / attempts : null,
    started: qSeen + cSeen > 0,
  };
}

export function masteryLabel(m) {
  if (!m.started) return { label: "Não iniciado", tone: "idle" };
  if (m.mastery >= 0.8) return { label: "Dominado", tone: "good" };
  if (m.mastery >= 0.5) return { label: "Em progresso", tone: "mid" };
  return { label: "Precisa reforçar", tone: "bad" };
}

export function wrongQuestions(p, content) {
  return content.questions
    .filter((q) => p.q[q.id] && p.q[q.id].wrong > 0 && !(p.q[q.id].last && p.q[q.id].streak >= 2))
    .sort((a, b) => (p.q[b.id].lastWrongAt || 0) - (p.q[a.id].lastWrongAt || 0));
}

export function weakCards(p, content) {
  return content.flashcards.filter((c) => {
    const s = p.cards[c.id];
    return s && (s.rating === "dont" || s.rating === "doubt" || (s.box ?? 0) <= 1);
  });
}
