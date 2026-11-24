import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Layers, RotateCcw, Check, HelpCircle, X, Shuffle } from "lucide-react";
import { useApp } from "../state.jsx";
import { Button, PageHead, Empty, Source, Rich, Bar, Segmented } from "../components/ui.jsx";
import { shuffle } from "../lib/util.js";
import { DemoBanner } from "./Dashboard.jsx";

const RATINGS = [
  { id: "dont", label: "Não sei", icon: X, tone: "bad", key: "1" },
  { id: "doubt", label: "Tenho dúvida", icon: HelpCircle, tone: "mid", key: "2" },
  { id: "know", label: "Já aprendi", icon: Check, tone: "good", key: "3" },
];

function buildDeck(cards, progress, mode, size = 20) {
  const now = Date.now();
  const st = (c) => progress.cards[c.id];
  let list = cards;
  if (mode === "weak") list = cards.filter((c) => st(c) && (st(c).box <= 1));
  const weight = (c) => {
    const s = st(c);
    if (!s) return 1; // novo
    if (s.box === 0) return 0;
    if (s.due <= now) return 0.5 + s.box * 0.3;
    return 3 + s.box;
  };
  if (mode === "all") return shuffle(list).slice(0, size * 3);
  return shuffle(list)
    .sort((a, b) => weight(a) - weight(b))
    .slice(0, size);
}

export default function Flashcards() {
  const { content, progress, params, setLast, go } = useApp();
  const [topic, setTopic] = useState(params.topicId || "all");
  const [mode, setMode] = useState(params.mode || "smart");
  const [seed, setSeed] = useState(0);

  useEffect(() => setLast({ route: "flashcards", params: {}, label: "Flashcards" }), []); // eslint-disable-line

  const pool = useMemo(() => content.flashcards.filter((c) => topic === "all" || c.topicId === topic), [content.flashcards, topic]);
  const weakCount = pool.filter((c) => progress.cards[c.id] && progress.cards[c.id].box <= 1).length;
  const deck = useMemo(() => buildDeck(pool, progress, mode), [pool, mode, seed]); // eslint-disable-line

  if (!content.flashcards.length)
    return (
      <div className="page">
        <PageHead title="Flashcards" />
        <Empty icon={Layers} title="Nenhum cartão ainda" action={<Button onClick={() => go("biblioteca")}>Ir para a Biblioteca</Button>}>
          Os cartões são criados a partir dos seus materiais.
        </Empty>
      </div>
    );

  return (
    <div className="page">
      {content.showingDemo && <DemoBanner />}
      <PageHead eyebrow="Memorização" title="Flashcards">
        Vire o cartão e diga com sinceridade se sabia. O que você não sabe volta logo; o que já aprendeu demora mais para voltar.
      </PageHead>
      <div className="filters">
        <select id="fc-topic" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Assunto">
          <option value="all">Todos os assuntos</option>
          {content.topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <Segmented
          label="Modo"
          value={mode}
          onChange={setMode}
          options={[
            { value: "smart", label: "Prioridade" },
            { value: "weak", label: "Para reforçar", count: weakCount, disabled: !weakCount },
            { value: "all", label: "Todos" },
          ]}
        />
      </div>
      {deck.length ? (
        <CardSession key={`${topic}-${mode}-${seed}`} cards={deck} onRestart={() => setSeed((s) => s + 1)} />
      ) : (
        <Empty icon={Check} title="Nada para reforçar aqui">
          Nenhum cartão marcado como Não sei ou Tenho dúvida neste filtro.
        </Empty>
      )}
    </div>
  );
}

export function MiniCards({ cards }) {
  const deck = useMemo(() => shuffle(cards).slice(0, 8), []); // eslint-disable-line
  return <CardSession cards={deck} compact />;
}

export function CardSession({ cards, onRestart, compact }) {
  const { rateCard, content, openTutor } = useApp();
  const [queue, setQueue] = useState(cards);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ dont: 0, doubt: 0, know: 0 });
  const [learned, setLearned] = useState(new Set());
  const card = queue[pos];
  const done = pos >= queue.length;

  const rate = useCallback(
    (r) => {
      if (!card || !flipped) return;
      rateCard(card.id, r);
      setTally((t) => ({ ...t, [r]: t[r] + 1 }));
      setQueue((q) => {
        const next = q.slice();
        // Cartões errados reaparecem mais cedo na mesma sessão.
        if (r === "dont") next.splice(Math.min(next.length, pos + 3), 0, card);
        if (r === "doubt") next.splice(Math.min(next.length, pos + 6), 0, card);
        return next;
      });
      if (r === "know") setLearned((s) => new Set(s).add(card.id));
      setFlipped(false);
      setPos((p) => p + 1);
    },
    [card, flipped, pos, rateCard]
  );

  useEffect(() => {
    if (compact) return;
    const onKey = (e) => {
      if (e.target.closest("input,textarea,select")) return;
      if (e.key === " " || e.key === "Enter") {
        if (!done) {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }
      const r = RATINGS.find((x) => x.key === e.key);
      if (r) rate(r.id);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [rate, done, compact]);

  const unique = new Set(cards.map((c) => c.id)).size;

  if (done)
    return (
      <div className={`card-end ${compact ? "compact" : ""}`}>
        <h3>Sessão concluída</h3>
        <div className="tally">
          {RATINGS.map((r) => (
            <div key={r.id} className={`tally-item tone-${r.tone}`}>
              <span className="tabnum">{tally[r.id]}</span>
              <small>{r.label}</small>
            </div>
          ))}
        </div>
        <p className="muted">
          {learned.size} de {unique} cartões marcados como aprendidos nesta sessão.
        </p>
        {onRestart && (
          <Button icon={RotateCcw} onClick={onRestart}>
            Nova sessão
          </Button>
        )}
      </div>
    );

  const topic = content.byTopic[card.topicId];
  return (
    <div className={`cards ${compact ? "compact" : ""}`}>
      <div className="cards-top">
        <span className="muted small">{topic?.title}</span>
        <span className="muted small tabnum">
          {Math.min(pos + 1, queue.length)} / {queue.length}
        </span>
      </div>
      <Bar value={pos / queue.length} thin label="Progresso da sessão" />
      <div className={`flip ${flipped ? "flipped" : ""}`}>
        <button className="flip-inner" onClick={() => setFlipped((f) => !f)} aria-label={flipped ? "Mostrar a frente" : "Virar o cartão"}>
          <div className="flip-face flip-front" aria-hidden={flipped}>
            <span className="face-label">Pergunta</span>
            <div className="face-text">{card.front}</div>
            <span className="face-hint">
              <Shuffle size={13} aria-hidden="true" /> Toque para virar
            </span>
          </div>
          <div className="flip-face flip-back" aria-hidden={!flipped}>
            <span className="face-label">Resposta</span>
            <div className="face-text">
              <Rich text={card.back} />
            </div>
            {card.explanation && <div className="face-expl">{card.explanation}</div>}
          </div>
        </button>
      </div>
      <div className="card-under">
        {flipped ? <Source src={card.src} /> : <span className="muted small">Pense na resposta antes de virar.</span>}
        <button className="link-btn" onClick={() => openTutor({ topicId: card.topicId, seed: { card } })}>
          Pedir explicação
        </button>
      </div>
      <div className={`ratings ${flipped ? "" : "is-hidden"}`} aria-hidden={!flipped}>
        {RATINGS.map((r) => (
          <button key={r.id} className={`rating tone-${r.tone}`} onClick={() => rate(r.id)} disabled={!flipped} tabIndex={flipped ? 0 : -1}>
            <r.icon size={18} strokeWidth={2.4} aria-hidden="true" />
            <span>{r.label}</span>
            {!compact && <kbd>{r.key}</kbd>}
          </button>
        ))}
      </div>
    </div>
  );
}
