import React, { useEffect, useRef, useState } from "react";
import { X, Send, Square, Sparkles, BookOpen, HelpCircle, GitCompare, Baby, Lightbulb, FileSearch, GraduationCap } from "lucide-react";
import { useApp } from "../state.jsx";
import { Rich, Source, Highlight, IconButton } from "../components/ui.jsx";
import { Question, correctText, responseText } from "../components/Question.jsx";
import { searchIndex, snippet } from "../lib/search.js";
import { ask, errorCopy } from "../lib/ai.js";
import { srcLabel } from "../lib/content.js";
import { norm, pick, uid } from "../lib/util.js";

const QUICK = [
  { id: "mean", label: "O que significa…?", icon: BookOpen, fill: "O que significa " },
  { id: "simple", label: "Explique mais simples", icon: Lightbulb, send: (t) => `Explique ${t ? `"${t}"` : "esse conteúdo"} de uma maneira mais simples.` },
  { id: "diff", label: "Qual a diferença…?", icon: GitCompare, fill: "Qual a diferença entre " },
  { id: "example", label: "Dê um exemplo prático", icon: Sparkles, send: (t) => `Dê um exemplo prático ${t ? `sobre "${t}"` : "desse conteúdo"}.` },
  { id: "beginner", label: "Como se eu fosse iniciante", icon: Baby, send: (t) => `Explique ${t ? `"${t}"` : "esse conteúdo"} como se eu fosse iniciante.` },
  { id: "quiz", label: "Me faça uma pergunta", icon: HelpCircle },
];

const RULES = `Você é o professor particular de um estudante que tem prova amanhã. Responda em português do Brasil.
REGRAS:
1. Use SOMENTE as informações dos TRECHOS DOS MATERIAIS fornecidos. Não use conhecimento externo para afirmar fatos sobre a matéria.
2. Cite a origem com o número do trecho entre colchetes, como [1] ou [2], logo após a informação.
3. Se a resposta não estiver nos trechos, diga claramente: "Isso não está nos seus materiais." e, se houver, indique o que os materiais dizem de mais próximo. Não invente.
4. Se o estudante pedir um exemplo e o material não tiver um, avise que o exemplo NÃO vem dos materiais antes de dar uma ilustração simples e genérica, sem fatos novos sobre a matéria.
5. Seja didático: frases curtas, linguagem simples, sem perder a precisão. Use listas quando ajudar. No máximo uns 200 palavras, salvo se pedirem mais.
6. Quando fizer sentido, termine com uma pergunta curta para o estudante checar se entendeu.`;

export default function Tutor() {
  const { content, tutor, closeTutor, ai, progress, answer } = useApp();
  const [topicId, setTopicId] = useState(tutor.topicId || "");
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ctl = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const topic = content.byTopic[topicId];
  const aiOn = ai === "ready";

  // Contexto vindo de uma questão ou cartão.
  useEffect(() => {
    if (!tutor.open) return;
    if (tutor.topicId !== undefined) setTopicId(tutor.topicId || "");
    const s = tutor.seed;
    if (s?.question) {
      const q = s.question;
      const mine = s.response != null ? ` Minha resposta foi: "${responseText(q, s.response)}".` : "";
      setText(`Na questão "${q.prompt}", por que a resposta correta é "${correctText(q)}"?${mine}`);
    } else if (s?.card) {
      setText(`Me explique melhor: "${s.card.front}" → "${s.card.back}".`);
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [tutor.key]); // eslint-disable-line

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const retrieve = (query) => {
    const mats = topic ? new Set(topic.materialIds) : null;
    const q = `${query} ${topic ? topic.title + " " + topic.keywords.join(" ") : ""}`;
    let hits = searchIndex(content.index, q, { limit: 6, filter: mats ? (d) => mats.has(d.materialId) : undefined });
    if (hits.length < 3 && mats) hits = [...hits, ...searchIndex(content.index, query, { limit: 6 - hits.length, filter: (d) => !mats.has(d.materialId) })];
    return hits.map((h) => h.doc);
  };

  const send = async (raw) => {
    const question = (raw ?? text).trim();
    if (!question || busy) return;
    setText("");
    const docs = retrieve(question);
    const cites = docs.map((d) => {
      const l = srcLabel(content, { m: d.materialId, p: d.page });
      return { m: d.materialId, p: d.page, title: `${l?.title} · ${l?.where}` };
    });
    const userMsg = { id: uid("m"), role: "user", text: question };
    if (!aiOn) {
      setMsgs((m) => [...m, userMsg, { id: uid("m"), role: "passages", query: question, docs }]);
      return;
    }
    const botId = uid("m");
    setMsgs((m) => [...m, userMsg, { id: botId, role: "assistant", text: "", cites, thinking: true }]);
    setBusy(true);
    ctl.current = new AbortController();
    const ctx = docs
      .map((d, i) => {
        const l = srcLabel(content, { m: d.materialId, p: d.page });
        return `[${i + 1}] ${l?.title} (${l?.where})\n${d.text.slice(0, 1800)}`;
      })
      .join("\n\n");
    const topicCtx = topic
      ? `\nASSUNTO ATUAL: ${topic.title}\nResumo do assunto (feito a partir dos materiais): ${topic.summary.simple || topic.summary.full}\nConceitos: ${topic.concepts.map((c) => `${c.term}: ${c.definition}`).join(" | ")}`
      : "";
    const history = msgs
      .filter((m) => m.role === "user" || (m.role === "assistant" && m.text && !m.error))
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.text }));
    const input = [
      { role: "user", content: `${RULES}\n\nTRECHOS DOS MATERIAIS:\n${ctx || "(nenhum trecho encontrado para esta pergunta)"}${topicCtx}\n\nA conversa com o estudante vem a seguir; responda à última mensagem seguindo as regras.` },
      ...history,
      { role: "user", content: question },
    ];
    try {
      const res = await ask(input, {
        signal: ctl.current.signal,
        cache: false,
        onText: ({ text: t }) => setMsgs((ms) => ms.map((m) => (m.id === botId ? { ...m, text: t, thinking: false } : m))),
      });
      setMsgs((ms) => ms.map((m) => (m.id === botId ? { ...m, text: res.text, thinking: false, truncated: res.truncated } : m)));
    } catch (e) {
      if (e?.code === "cancelled") {
        setMsgs((ms) => ms.map((m) => (m.id === botId ? { ...m, text: e.text || "", thinking: false, stopped: true } : m)));
      } else {
        // Sem o Claude: mostra os trechos relevantes no lugar.
        setMsgs((ms) => [
          ...ms.map((m) => (m.id === botId ? { ...m, text: e.text || "", thinking: false, error: errorCopy(e) } : m)),
          { id: uid("m"), role: "passages", query: question, docs },
        ]);
      }
    } finally {
      setBusy(false);
    }
  };

  const quick = (qk) => {
    if (qk.id === "quiz") {
      const pool = content.questions.filter((q) => !topic || q.topicId === topic.id);
      const unseen = pool.filter((q) => !progress.q[q.id]?.last);
      const q = pick(unseen.length ? unseen : pool);
      if (q) setMsgs((m) => [...m, { id: uid("m"), role: "user", text: "Me faça uma pergunta." }, { id: uid("m"), role: "question", q }]);
      return;
    }
    if (qk.fill) {
      setText(qk.fill);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(qk.fill.length, qk.fill.length);
      }, 10);
      return;
    }
    send(qk.send(topic?.title));
  };

  return (
    <aside className={`tutor ${tutor.open ? "open" : ""}`} aria-label="Professor virtual" aria-hidden={!tutor.open} inert={tutor.open ? undefined : ""}>
      <div className="tutor-head">
        <div className="tutor-title">
          <span className="tutor-avatar" aria-hidden="true">
            <GraduationCap size={18} />
          </span>
          <div>
            <strong>Professor virtual</strong>
            <span className={`tutor-status ${aiOn ? "on" : ""}`}>{aiOn ? "Responde com base nos seus materiais" : "Modo trechos: mostra o que os materiais dizem"}</span>
          </div>
        </div>
        <IconButton icon={X} label="Fechar o professor" onClick={closeTutor} />
      </div>
      <div className="tutor-context">
        <label htmlFor="tutor-topic" className="sr-only">
          Assunto
        </label>
        <select id="tutor-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
          <option value="">Todos os materiais</option>
          {content.topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      <div className="tutor-list" ref={listRef}>
        {msgs.length === 0 && (
          <div className="tutor-welcome">
            <p>
              Pergunte o que quiser sobre {topic ? <strong>{topic.title}</strong> : "os seus materiais"}. Eu respondo com base nos arquivos e mostro de onde tirei cada explicação.
            </p>
            {!aiOn && (
              <p className="muted small">
                {ai === "checking"
                  ? "Conectando ao Claude…"
                  : "O Claude não está disponível nesta visualização (ou o uso não foi permitido). Enquanto isso, mostro os trechos mais relevantes dos materiais para cada pergunta."}
              </p>
            )}
          </div>
        )}
        {msgs.map((m) => (
          <Msg key={m.id} m={m} onAnswer={(q, ok, first) => answer(q.id, ok, first)} />
        ))}
      </div>

      <div className="tutor-quick">
        {QUICK.map((qk) => (
          <button key={qk.id} className="quick-chip" onClick={() => quick(qk)} disabled={busy && qk.id !== "quiz"}>
            <qk.icon size={14} aria-hidden="true" />
            {qk.label}
          </button>
        ))}
      </div>
      <form
        className="tutor-input"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          id="tutor-text"
          ref={inputRef}
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escreva sua dúvida…"
          aria-label="Sua pergunta"
        />
        {busy ? (
          <button type="button" className="send-btn" onClick={() => ctl.current?.abort()} aria-label="Parar">
            <Square size={16} />
          </button>
        ) : (
          <button type="submit" className="send-btn" disabled={!text.trim()} aria-label="Enviar">
            <Send size={16} />
          </button>
        )}
      </form>
    </aside>
  );
}

function Msg({ m, onAnswer }) {
  const { openSource } = useApp();
  if (m.role === "user") return <div className="msg msg-user">{m.text}</div>;
  if (m.role === "question")
    return (
      <div className="msg msg-q">
        <Question q={m.q} compact onResult={(ok, first) => onAnswer(m.q, ok, first)} />
      </div>
    );
  if (m.role === "passages") return <Passages query={m.query} docs={m.docs} />;
  return (
    <div className="msg msg-bot">
      {m.thinking ? (
        <span className="thinking">
          <span />
          <span />
          <span />
          <em>Pensando…</em>
        </span>
      ) : (
        m.text && <Rich text={m.text} cites={m.cites} onCite={(n) => openSource(m.cites[n - 1])} />
      )}
      {m.stopped && <p className="muted small">Resposta interrompida.</p>}
      {m.truncated && <p className="muted small">A resposta foi cortada. Peça para continuar ou faça uma pergunta mais específica.</p>}
      {m.error && <p className="msg-error">{m.error}</p>}
      {!m.thinking && m.cites?.length > 0 && m.text && (
        <div className="msg-sources">
          {m.cites.map((c, i) =>
            new RegExp(`\\[(?:\\d+\\s*[,;]\\s*)*${i + 1}(?:\\s*[,;]\\s*\\d+)*\\]`).test(m.text) ? (
              <span key={i} className="msg-src">
                <em>{i + 1}</em>
                <Source src={c} compact />
              </span>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

function Passages({ query, docs }) {
  const { content, openSource } = useApp();
  const nq = norm(query);
  const concepts = content.topics
    .flatMap((t) => t.concepts)
    .filter((c) => nq.split(" ").some((w) => w.length > 3 && norm(c.term).includes(w)))
    .slice(0, 3);
  if (!docs.length && !concepts.length)
    return (
      <div className="msg msg-bot">
        <p>
          <strong>Isso não está nos seus materiais.</strong> Não encontrei nenhum trecho sobre “{query}”. Tente outras palavras ou confira se o arquivo certo foi enviado.
        </p>
      </div>
    );
  return (
    <div className="msg msg-bot">
      <p className="passages-head">
        <FileSearch size={15} aria-hidden="true" /> O que os seus materiais dizem sobre isso:
      </p>
      {concepts.map((c, i) => (
        <div key={"c" + i} className="passage concept-passage">
          <strong>{c.term}:</strong> {c.definition} <Source src={c.src} compact />
        </div>
      ))}
      {docs.slice(0, 4).map((d) => (
        <button key={d.id} className="passage" onClick={() => openSource({ m: d.materialId, p: d.page, q: query, search: true })}>
          <span className="passage-src">{srcLabel(content, { m: d.materialId, p: d.page })?.title + " · " + srcLabel(content, { m: d.materialId, p: d.page })?.where}</span>
          <span>
            <Highlight text={snippet(d.text, query, 320)} query={query} />
          </span>
        </button>
      ))}
    </div>
  );
}
