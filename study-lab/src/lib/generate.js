// Geração de material de estudo a partir de um material importado.
// 1) Com o Claude (capacidade `sample`): assuntos, resumos, questões e cartões.
// 2) Sem o Claude: geração automática por regras, usando só frases do próprio texto.
import { askJson } from "./ai.js";
import { tokens, stem, STOP } from "./search.js";
import { norm, shuffle, uid } from "./util.js";

// ---------- 1. Com o Claude ----------

const PROMPT = (title, label, text, part, parts) => `Você está montando material de estudo para um estudante que tem prova amanhã.
Use EXCLUSIVAMENTE o texto do material abaixo. Não invente conceitos, regras, números, exemplos nem respostas.
Se o material não traz exemplos ou comparações, deixe essas listas vazias. Escreva em português do Brasil, de forma simples e didática, sem perder a precisão técnica.
Cada trecho do material está marcado com [${label} N]. Em cada item, informe "p" com o número N de onde veio a informação e "q" com uma citação LITERAL curta (até 180 caracteres) copiada do texto.

Material: "${title}"${parts > 1 ? ` (parte ${part} de ${parts})` : ""}

Responda somente com JSON neste formato:
{"topics":[{"key":"t1","title":"...","importance":1|2|3,"why":"por que é importante, segundo o texto","minutes":10,
 "summary":{"full":"resumo completo em 2-4 parágrafos","simple":"explicação bem simples, como para iniciante"},
 "concepts":[{"term":"...","definition":"...","src":{"p":N,"q":"..."}}],
 "keywords":["..."],
 "attention":[{"text":"pegadinha ou ponto de atenção","src":{"p":N,"q":"..."}}],
 "examples":[{"text":"exemplo que está no texto","src":{"p":N,"q":"..."}}],
 "comparisons":[{"a":"...","b":"...","difference":"...","src":{"p":N,"q":"..."}}],
 "memorize":[{"text":"o que decorar","src":{"p":N}}]}],
 "questions":[
  {"topic":"t1","type":"mcq","prompt":"...","options":["...","...","...","..."],"answer":0,"explanation":"...","src":{"p":N,"q":"..."}},
  {"topic":"t1","type":"tf","prompt":"afirmação","answer":true,"explanation":"...","src":{"p":N,"q":"..."}},
  {"topic":"t1","type":"cloze","prompt":"frase com ____ no lugar da palavra","answer":["palavra","sinônimo aceito"],"explanation":"...","src":{"p":N,"q":"..."}},
  {"topic":"t1","type":"match","prompt":"Associe...","pairs":[{"left":"...","right":"..."}],"explanation":"...","src":{"p":N}},
  {"topic":"t1","type":"open","prompt":"...","answer":"resposta modelo","keyPoints":["..."],"explanation":"...","src":{"p":N,"q":"..."}}],
 "flashcards":[{"topic":"t1","front":"pergunta ou conceito","back":"resposta","explanation":"explicação curta","src":{"p":N}}]}

Limites: até 4 assuntos; por assunto, 3 a 5 questões variadas (use todos os tipos no conjunto) e 3 a 5 flashcards. Importance 3 = essencial para a prova.

TEXTO DO MATERIAL:
${text}`;

function splitForAi(chunks, label, max = 45000) {
  const parts = [];
  let buf = "";
  for (const c of chunks) {
    const piece = `[${label} ${c.page}]\n${c.text}\n\n`;
    if (buf.length + piece.length > max && buf) {
      parts.push(buf);
      buf = "";
    }
    buf += piece.slice(0, max);
  }
  if (buf) parts.push(buf);
  return parts;
}

function verifyQuote(material, src) {
  if (!src || !src.q) return src;
  const all = norm(material.chunks.map((c) => c.text).join(" "));
  const q = norm(src.q).slice(0, 120);
  return { ...src, ok: q.length > 8 && all.includes(q) };
}

export async function generateWithAi(material, { onStep, signal } = {}) {
  const label = material.pageLabel === "slide" ? "slide" : material.pageLabel === "seção" ? "seção" : "p.";
  const parts = splitForAi(material.chunks, label);
  const out = { topics: [], questions: [], flashcards: [] };
  for (let i = 0; i < parts.length; i++) {
    onStep?.(`Lendo ${parts.length > 1 ? `parte ${i + 1} de ${parts.length}` : "o material"} com o Claude…`);
    const data = await askJson(PROMPT(material.title, label, parts[i], i + 1, parts.length), { signal, modelTier: "default" });
    const keyMap = {};
    for (const t of data?.topics || []) {
      if (!t?.title) continue;
      const id = uid("t");
      keyMap[t.key || t.title] = id;
      const fix = (x) => (x?.src ? { ...x, src: verifyQuote(material, { m: material.id, p: x.src.p, q: x.src.q }) } : x);
      out.topics.push({
        id,
        title: t.title,
        importance: [1, 2, 3].includes(t.importance) ? t.importance : 2,
        why: t.why || "",
        minutes: t.minutes || 10,
        materialIds: [material.id],
        subjectId: material.subjectId,
        summary: { full: t.summary?.full || "", simple: t.summary?.simple || "" },
        concepts: (t.concepts || []).map(fix),
        keywords: t.keywords || [],
        attention: (t.attention || []).map(fix),
        examples: (t.examples || []).map(fix),
        comparisons: (t.comparisons || []).map(fix),
        memorize: (t.memorize || []).map(fix),
        order: 1000 + out.topics.length,
      });
    }
    const firstTopic = Object.values(keyMap)[0];
    for (const q of data?.questions || []) {
      const topicId = keyMap[q.topic] || firstTopic;
      if (!topicId) continue;
      out.questions.push({ ...q, id: uid("q"), topicId, src: verifyQuote(material, { m: material.id, p: q.src?.p, q: q.src?.q }) });
    }
    for (const c of data?.flashcards || []) {
      const topicId = keyMap[c.topic] || firstTopic;
      if (!topicId) continue;
      out.flashcards.push({ ...c, id: uid("f"), topicId, src: { m: material.id, p: c.src?.p } });
    }
  }
  return out;
}

// ---------- 2. Geração automática (sem IA) ----------

const DEF_RE =
  /^(?:o|a|os|as|um|uma)?\s*([A-ZÀ-Úa-zà-ú0-9][^.,;:()]{2,60}?)\s+(é|são|significa|significam|consiste em|consistem em|refere-se a|define-se como|corresponde a|denomina-se|chama-se)\s+(.{12,260})$/i;
const ATTN_RE = /\b(não|nunca|exceto|salvo|atenção|importante|cuidado|obrigatóri[oa]|vedad[oa]|proibid[oa]|apenas|somente|sempre|deve|devem)\b/i;
const EX_RE = /\b(por exemplo|exemplo:|exemplos:|ex\.:|e\.g\.|como exemplo)\b/i;
const NUM_RE = /\b\d{1,4}([.,]\d+)?\s?(%|anos|dias|horas|meses|°|º|mg|kg|km|m|cm|ml|l)?\b/;

function sentences(text) {
  return text
    .replace(/\n(?=[a-zà-ú])/g, " ")
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.replace(/^[•\-–*\d.)\s]+/, "").trim())
    .filter((s) => s.length >= 25 && s.length <= 320 && /[a-zà-ú]/.test(s));
}

function isHeading(line) {
  const l = line.trim();
  if (l.length < 3 || l.length > 70) return false;
  if (/[.;,:]$/.test(l)) return false;
  if (/^(\d+(\.\d+)*[.)]?\s+)[A-ZÀ-Ú]/.test(l)) return true;
  const letters = l.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length >= 4 && letters === letters.toUpperCase()) return true;
  return false;
}

function keywordsOf(text, globalDf, nDocs, k = 8) {
  const tf = new Map();
  for (const t of tokens(text)) {
    if (t.length < 4 || /^\d+$/.test(t)) continue;
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  const scored = [...tf.entries()].map(([t, f]) => {
    const df = globalDf.get(stem(t)) || 1;
    return [t, f * Math.log(1 + nDocs / df)];
  });
  scored.sort((a, b) => b[1] - a[1]);
  return scored.slice(0, k).map((x) => x[0]);
}

export function generateAuto(material) {
  // Segmenta em assuntos: títulos detectados ou grupos de páginas.
  const segs = [];
  let cur = null;
  for (const c of material.chunks) {
    const lines = c.text.split("\n");
    for (const line of lines) {
      if (isHeading(line) && line.trim().length > 3) {
        cur = { title: titleCase(line.trim().replace(/^\d+(\.\d+)*[.)]?\s+/, "")), pages: [c.page], text: "" };
        segs.push(cur);
      } else {
        if (!cur) {
          cur = { title: null, pages: [c.page], text: "" };
          segs.push(cur);
        }
        if (!cur.pages.includes(c.page)) cur.pages.push(c.page);
        cur.text += line + "\n";
      }
    }
  }
  let groups = segs.filter((s) => s.text.trim().length > 200);
  if (groups.length < 2 || groups.length > 14) {
    // Sem títulos confiáveis: agrupa por blocos de páginas.
    const size = Math.max(1, Math.ceil(material.chunks.length / Math.min(6, Math.max(1, Math.round(material.chunks.length / 3)))));
    groups = [];
    for (let i = 0; i < material.chunks.length; i += size) {
      const cs = material.chunks.slice(i, i + size);
      groups.push({ title: null, pages: cs.map((c) => c.page), text: cs.map((c) => c.text).join("\n") });
    }
  }
  const df = new Map();
  groups.forEach((g) => new Set(tokens(g.text).map(stem)).forEach((t) => df.set(t, (df.get(t) || 0) + 1)));
  const label = material.pageLabel;
  const pageOf = (s) => {
    const ns = norm(s).slice(0, 60);
    const ch = material.chunks.find((c) => norm(c.text).includes(ns));
    return ch ? ch.page : null;
  };

  const out = { topics: [], questions: [], flashcards: [] };
  const allTerms = [];
  groups.forEach((g, gi) => {
    const kws = keywordsOf(g.text, df, groups.length);
    const sents = sentences(g.text);
    const kwSet = new Set(kws.map(stem));
    const score = (s) => tokens(s).reduce((a, t) => a + (kwSet.has(stem(t)) ? 1 : 0), 0) / Math.sqrt(tokens(s).length + 1);
    const ranked = sents.map((s, i) => ({ s, i, sc: score(s) })).sort((a, b) => b.sc - a.sc);
    const top = ranked.slice(0, 6).sort((a, b) => a.i - b.i).map((x) => x.s);
    const simple = ranked
      .slice(0, 8)
      .sort((a, b) => a.s.length - b.s.length)
      .slice(0, 3)
      .sort((a, b) => a.i - b.i)
      .map((x) => x.s);
    const defs = [];
    for (const s of sents) {
      const m = s.match(DEF_RE);
      if (!m) continue;
      const term = m[1].trim();
      if (term.split(/\s+/).length > 6 || STOP.has(norm(term))) continue;
      defs.push({ term: term.charAt(0).toUpperCase() + term.slice(1), definition: s, src: { m: material.id, p: pageOf(s), q: s.slice(0, 180), ok: true } });
    }
    const pageRange = g.pages.length > 1 ? `${label} ${g.pages[0]}–${g.pages[g.pages.length - 1]}` : `${label} ${g.pages[0]}`;
    const title = g.title || `Parte ${gi + 1}: ${kws.slice(0, 3).join(", ")} (${pageRange})`;
    const tid = uid("t");
    const mk = (s) => ({ text: s, src: { m: material.id, p: pageOf(s), q: s.slice(0, 180), ok: true } });
    out.topics.push({
      id: tid,
      title,
      importance: 2,
      why: "",
      minutes: Math.max(5, Math.min(25, Math.round(g.text.length / 900))),
      materialIds: [material.id],
      subjectId: material.subjectId,
      summary: { full: top.join(" "), simple: simple.join(" ") },
      concepts: defs.slice(0, 8),
      keywords: kws,
      attention: sents.filter((s) => ATTN_RE.test(s)).slice(0, 6).map(mk),
      examples: sents.filter((s) => EX_RE.test(s)).slice(0, 5).map(mk),
      comparisons: [],
      memorize: [...defs.map((d) => d.definition), ...sents.filter((s) => NUM_RE.test(s))].slice(0, 6).map(mk),
      order: 1000 + gi,
      weight: g.text.length,
      auto: true,
    });
    defs.forEach((d) => allTerms.push({ ...d, tid }));

    // Cartões: definições e frases-chave.
    defs.slice(0, 8).forEach((d) =>
      out.flashcards.push({ id: uid("f"), topicId: tid, front: `O que é ${d.term.toLowerCase()}?`, back: d.definition, src: d.src })
    );
    // Lacunas a partir de frases com palavras-chave.
    let clozes = 0;
    for (const x of ranked.slice(0, 12)) {
      if (clozes >= 4) break;
      const kw = kws.find((k) => new RegExp(`\\b${k}\\b`, "i").test(norm(x.s)));
      if (!kw) continue;
      const re = new RegExp(`(^|[^A-Za-zÀ-ÿ])(${escapeRe(findOriginal(x.s, kw))})(?=[^A-Za-zÀ-ÿ]|$)`, "i");
      const orig = x.s.match(re)?.[2];
      if (!orig) continue;
      out.questions.push({
        id: uid("q"),
        topicId: tid,
        type: "cloze",
        prompt: x.s.replace(re, "$1____"),
        answer: [orig],
        explanation: `Frase original do material: "${x.s}"`,
        src: { m: material.id, p: pageOf(x.s), q: x.s.slice(0, 180), ok: true },
        auto: true,
      });
      // Sem definições explícitas: o cartão vira a frase com lacuna.
      if (defs.length < 2) out.flashcards.push({ id: uid("f"), topicId: tid, front: x.s.replace(re, "$1____"), back: orig, explanation: `Frase do material: "${x.s}"`, src: { m: material.id, p: pageOf(x.s) } });
      clozes++;
    }
  });
  const imp = [...out.topics].sort((a, b) => b.weight - a.weight);
  imp.slice(0, Math.ceil(imp.length / 3)).forEach((t) => (t.importance = 3));

  // Múltipla escolha e V/F a partir das definições.
  allTerms.forEach((d, i) => {
    const others = shuffle(allTerms.filter((o) => norm(o.term) !== norm(d.term))).slice(0, 3);
    if (others.length >= 2) {
      const opts = shuffle([d.term, ...others.map((o) => o.term)]);
      const defText = d.definition.replace(new RegExp(escapeRe(d.term), "i"), "______");
      out.questions.push({
        id: uid("q"),
        topicId: d.tid,
        type: "mcq",
        prompt: `Segundo o material, a qual termo se refere este trecho? "${defText}"`,
        options: opts,
        answer: opts.indexOf(d.term),
        explanation: `O trecho é a definição de ${d.term}: "${d.definition}"`,
        src: d.src,
        auto: true,
      });
    }
    if (others[0] && i % 2 === 0) {
      const o = others[0];
      const rest = d.definition.match(DEF_RE)?.slice(2).join(" ");
      if (rest) {
        out.questions.push({
          id: uid("q"),
          topicId: d.tid,
          type: "tf",
          prompt: `${o.term} ${rest}`,
          answer: false,
          explanation: `Falso. No material, essa descrição é de ${d.term}: "${d.definition}"`,
          src: d.src,
          auto: true,
        });
      }
    }
  });
  if (allTerms.length >= 3) {
    const byTopic = {};
    allTerms.forEach((d) => (byTopic[d.tid] = byTopic[d.tid] || []).push(d));
    Object.entries(byTopic).forEach(([tid, ds]) => {
      if (ds.length < 3) return;
      const pairs = ds.slice(0, 4).map((d) => ({ left: d.term, right: shorten(d.definition.match(DEF_RE)?.[3] || d.definition) }));
      out.questions.push({
        id: uid("q"),
        topicId: tid,
        type: "match",
        prompt: "Associe cada termo à sua definição, segundo o material.",
        pairs,
        explanation: ds.slice(0, 4).map((d) => `${d.term}: ${d.definition}`).join("\n"),
        src: ds[0].src,
        auto: true,
      });
    });
  }
  out.topics.forEach((t) => delete t.weight);
  return out;
}

// "RESPIRAÇÃO CELULAR" -> "Respiração celular"
function titleCase(t) {
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters && letters === letters.toUpperCase()) {
    const low = t.toLowerCase();
    return low.charAt(0).toUpperCase() + low.slice(1);
  }
  return t;
}
function shorten(s, n = 110) {
  return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s;
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// Encontra no texto original a palavra cuja forma normalizada é `kw`.
function findOriginal(sentence, kw) {
  const words = sentence.match(/[A-Za-zÀ-ÿ0-9%]+/g) || [];
  return words.find((w) => norm(w) === kw) || kw;
}
