import React, { useEffect, useMemo, useState } from "react";
import { Target, Check, Lightbulb, BookOpen, ListChecks, RefreshCcw, Flag, Clock, ArrowRight, ArrowLeft, Sparkles, AlertTriangle, Timer, Layers, MessageCircleQuestion } from "lucide-react";
import { useApp } from "../state.jsx";
import { Button, Badge, Bar, PageHead, Empty, Source, Rich } from "../components/ui.jsx";
import { Runner } from "../components/Runner.jsx";
import { questionsOf, cardsOf } from "../lib/content.js";
import { topicMastery } from "../lib/progress.js";
import { shuffle, plural } from "../lib/util.js";
import { MiniCards } from "./Flashcards.jsx";
import { DemoBanner } from "./Dashboard.jsx";

const STAGES = [
  { id: "learn", label: "Entender", icon: Lightbulb },
  { id: "examples", label: "Exemplos", icon: BookOpen },
  { id: "check", label: "Mini-teste", icon: ListChecks },
  { id: "reinforce", label: "Reforço", icon: RefreshCcw },
];

export default function Prep() {
  const { content, progress, params, go, setLast } = useApp();
  const [priority, setPriority] = useState(false);
  const topicId = params.topicId;
  const plan = useMemo(() => {
    const list = [...content.topics];
    if (priority) list.sort((a, b) => b.importance - a.importance || a.order - b.order);
    return list;
  }, [content.topics, priority]);

  useEffect(() => {
    if (!topicId) setLast({ route: "preparacao", params: {}, label: "Preparação para a prova" });
  }, [topicId]); // eslint-disable-line

  if (!content.topics.length)
    return (
      <div className="page">
        <PageHead eyebrow="Prioridade" title="Preparação para a prova" />
        <Empty icon={Target} title="Ainda não há assuntos" action={<Button onClick={() => go("biblioteca", { import: true })}>Ir para a Biblioteca</Button>}>
          Assim que os seus materiais forem lidos, monto aqui a sequência de estudos: explicação simples, exemplos, mini-teste e reforço de cada assunto, com um simulado geral no final.
        </Empty>
      </div>
    );

  if (topicId && content.byTopic[topicId]) return <TopicSession key={topicId} topic={content.byTopic[topicId]} plan={plan} />;

  const done = plan.filter((t) => progress.prep[t.id]?.done).length;
  const totalMin = plan.reduce((s, t) => s + (progress.prep[t.id]?.done ? 0 : t.minutes || 10), 0);
  const next = plan.find((t) => !progress.prep[t.id]?.done);
  const allDone = done === plan.length;

  return (
    <div className="page">
      {content.showingDemo && <DemoBanner />}
      <PageHead
        eyebrow="Modo especial"
        title="Preparação para a prova"
        actions={
          next ? (
            <Button icon={ArrowRight} onClick={() => go("preparacao", { topicId: next.id })}>
              {done ? "Continuar" : "Começar"}
            </Button>
          ) : (
            <Button icon={Timer} onClick={() => go("simulado", { final: true })}>
              Fazer o simulado geral
            </Button>
          )
        }
      >
        Aprendizado ativo, assunto por assunto: entenda o essencial, veja exemplos, teste-se e reforce o que errar. No final, um simulado com todos os assuntos.
      </PageHead>

      <div className="plan-summary">
        <div className="plan-summary-main">
          <strong className="tabnum">
            {done} de {plan.length} assuntos
          </strong>
          <Bar value={plan.length ? done / plan.length : 0} label="Progresso da preparação" />
        </div>
        <span className="plan-time">
          <Clock size={15} aria-hidden="true" />
          {allDone ? "Plano concluído" : `cerca de ${Math.max(5, totalMin)} min restantes`}
        </span>
        <label className="switch">
          <input id="prep-priority" type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} />
          <span className="switch-ui" aria-hidden="true" />
          <span>Essenciais primeiro</span>
        </label>
      </div>

      <ol className="plan">
        {plan.map((t, i) => {
          const st = progress.prep[t.id] || {};
          const m = topicMastery(progress, content, t.id);
          const stageIdx = STAGES.findIndex((s) => s.id === st.stage);
          const isNext = next && next.id === t.id;
          return (
            <li key={t.id} className={`plan-item ${st.done ? "done" : ""} ${isNext ? "next" : ""}`}>
              <span className="plan-num" aria-hidden="true">
                {st.done ? <Check size={16} strokeWidth={3} /> : i + 1}
              </span>
              <div className="plan-body">
                <div className="plan-title">
                  <h3>{t.title}</h3>
                  {t.importance === 3 && (
                    <Badge tone="accent" icon={Sparkles}>
                      Essencial
                    </Badge>
                  )}
                </div>
                {t.why && <p className="muted small">{t.why}</p>}
                <div className="plan-meta">
                  <span>
                    <Clock size={13} aria-hidden="true" /> {t.minutes || 10} min
                  </span>
                  <span>{plural(questionsOf(content, t.id).length, "questão", "questões")}</span>
                  <span>{plural(cardsOf(content, t.id).length, "cartão", "cartões")}</span>
                  {st.done && st.total ? (
                    <span className={st.score / st.total >= 0.7 ? "tone-good-text" : "tone-bad-text"}>
                      Mini-teste: {st.score}/{st.total}
                    </span>
                  ) : null}
                </div>
                {!st.done && stageIdx >= 0 && (
                  <div className="plan-stages">
                    {STAGES.map((s, k) => (
                      <span key={s.id} className={k < stageIdx ? "past" : k === stageIdx ? "cur" : ""}>
                        {s.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Button variant={isNext ? "primary" : "soft"} size="sm" onClick={() => go("preparacao", { topicId: t.id })}>
                {st.done ? "Rever" : stageIdx >= 0 ? "Continuar" : "Estudar"}
              </Button>
            </li>
          );
        })}
        <li className={`plan-item final ${allDone ? "next" : ""}`}>
          <span className="plan-num" aria-hidden="true">
            <Flag size={16} />
          </span>
          <div className="plan-body">
            <div className="plan-title">
              <h3>Simulado geral</h3>
            </div>
            <p className="muted small">Questões de todos os assuntos, embaralhadas, com cronômetro e correção comentada no final.</p>
          </div>
          <Button variant={allDone ? "primary" : "soft"} size="sm" onClick={() => go("simulado", { final: true })}>
            Iniciar
          </Button>
        </li>
      </ol>
    </div>
  );
}

function TopicSession({ topic, plan }) {
  const { content, progress, go, prep, setLast, openTutor } = useApp();
  const st = progress.prep[topic.id] || {};
  const [stage, setStage] = useState(st.done ? "learn" : st.stage || "learn");
  const [checkResult, setCheckResult] = useState(null); // {wrong: [q], score, total}
  const allIds = plan.map((t) => t.id);
  const idx = plan.findIndex((t) => t.id === topic.id);
  const nextTopic = plan.slice(idx + 1).find((t) => !progress.prep[t.id]?.done) || plan.find((t) => t.id !== topic.id && !progress.prep[t.id]?.done);
  const qs = useMemo(() => pickCheck(questionsOf(content, topic.id)), [topic.id]); // eslint-disable-line
  const cards = cardsOf(content, topic.id);

  useEffect(() => {
    setLast({ route: "preparacao", params: { topicId: topic.id }, label: topic.title });
  }, [topic.id]); // eslint-disable-line

  const goStage = (s) => {
    setStage(s);
    if (!st.done) prep(topic.id, { stage: s }, allIds);
    window.scrollTo({ top: 0 });
  };

  const finishTopic = (score, total) => {
    prep(topic.id, { done: true, stage: "done", score: score ?? st.score, total: total ?? st.total, at: Date.now() }, allIds);
  };

  const stageIdx = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="page session">
      <div className="session-top">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => go("preparacao")}>
          Plano
        </Button>
        <span className="muted small">
          Assunto {idx + 1} de {plan.length}
        </span>
      </div>
      <PageHead eyebrow={content.bySubject[topic.subjectId]?.name || "Assunto"} title={topic.title}>
        {topic.why}
      </PageHead>

      <ol className="stepper" aria-label="Etapas do assunto">
        {STAGES.map((s, k) => (
          <li key={s.id} className={k < stageIdx || st.done ? "past" : k === stageIdx ? "cur" : ""}>
            <button onClick={() => goStage(s.id)} aria-current={k === stageIdx ? "step" : undefined}>
              <span className="step-dot">{k < stageIdx || st.done ? <Check size={13} strokeWidth={3} /> : k + 1}</span>
              <span className="step-label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>

      {stage === "learn" && (
        <section className="stage">
          <div className="explain">
            <div className="explain-label">
              <Lightbulb size={16} aria-hidden="true" /> Explicação simples
            </div>
            <Rich text={topic.summary.simple || topic.summary.full || "O material não traz um resumo para este assunto."} />
            <div className="row-wrap">
              {topic.sources.slice(0, 3).map((s, i) => (
                <Source key={i} src={s} />
              ))}
            </div>
          </div>
          {topic.concepts.length > 0 && (
            <div className="concepts">
              <h3>Conceitos fundamentais</h3>
              <dl>
                {topic.concepts.map((c, i) => (
                  <div key={i} className="concept">
                    <dt>{c.term}</dt>
                    <dd>
                      {c.definition} <Source src={c.src} compact />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {topic.memorize.length > 0 && (
            <div className="memorize">
              <h3>Para memorizar</h3>
              <ul>
                {topic.memorize.map((m, i) => (
                  <li key={i}>
                    <mark>{m.text}</mark>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <StageNav onNext={() => goStage("examples")} nextLabel="Ver exemplos" topic={topic} openTutor={openTutor} />
        </section>
      )}

      {stage === "examples" && (
        <section className="stage">
          {topic.examples.length > 0 ? (
            <div className="examples">
              <h3>Exemplos do material</h3>
              {topic.examples.map((e, i) => (
                <div key={i} className="example">
                  <Rich text={e.text} />
                  <Source src={e.src} compact />
                </div>
              ))}
            </div>
          ) : (
            <p className="note">
              <AlertTriangle size={16} aria-hidden="true" /> O material não traz exemplos para este assunto. Se quiser, peça ao professor um exemplo; ele vai indicar se o exemplo não está nos seus arquivos.
            </p>
          )}
          {topic.comparisons.length > 0 && (
            <div className="comparisons">
              <h3>Comparações</h3>
              {topic.comparisons.map((c, i) => (
                <div key={i} className="compare">
                  <div className="compare-pair">
                    <span>{c.a}</span>
                    <em>×</em>
                    <span>{c.b}</span>
                  </div>
                  <p>{c.difference}</p>
                  <Source src={c.src} compact />
                </div>
              ))}
            </div>
          )}
          {topic.attention.length > 0 && (
            <div className="attention">
              <h3>
                <AlertTriangle size={16} aria-hidden="true" /> Pontos de atenção
              </h3>
              <ul>
                {topic.attention.map((a, i) => (
                  <li key={i}>
                    {a.text} <Source src={a.src} compact />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <StageNav onPrev={() => goStage("learn")} onNext={() => goStage("check")} nextLabel={qs.length ? "Fazer o mini-teste" : "Avançar"} topic={topic} openTutor={openTutor} />
        </section>
      )}

      {stage === "check" && (
        <section className="stage">
          {qs.length ? (
            <Runner
              key={topic.id}
              title="Mini-teste"
              questions={qs}
              onDone={(results, list) => {
                const score = list.filter((q) => results[q.id]).length;
                const wrong = list.filter((q) => !results[q.id]);
                setCheckResult({ wrong, score, total: list.length });
                prep(topic.id, { score, total: list.length }, allIds);
              }}
              endActions={
                <Button icon={ArrowRight} onClick={() => goStage("reinforce")}>
                  Ir para o reforço
                </Button>
              }
            />
          ) : (
            <>
              <p className="note">Não há questões para este assunto.</p>
              <StageNav onPrev={() => goStage("examples")} onNext={() => goStage("reinforce")} nextLabel="Avançar" topic={topic} openTutor={openTutor} />
            </>
          )}
        </section>
      )}

      {stage === "reinforce" && (
        <section className="stage">
          <Reinforce topic={topic} result={checkResult} cards={cards} />
          <div className="stage-finish">
            {st.done ? (
              <p className="muted">Assunto já concluído.</p>
            ) : (
              <Button variant="good" icon={Check} onClick={() => finishTopic(checkResult?.score, checkResult?.total)}>
                Concluir assunto
              </Button>
            )}
            {nextTopic ? (
              <Button
                icon={ArrowRight}
                onClick={() => {
                  if (!st.done) finishTopic(checkResult?.score, checkResult?.total);
                  go("preparacao", { topicId: nextTopic.id });
                }}
              >
                Próximo: {nextTopic.title}
              </Button>
            ) : (
              <Button
                icon={Timer}
                onClick={() => {
                  if (!st.done) finishTopic(checkResult?.score, checkResult?.total);
                  go("simulado", { final: true });
                }}
              >
                Simulado geral
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Reinforce({ topic, result, cards }) {
  const { progress, content } = useApp();
  // Erros desta sessão; se a página foi recarregada, usa o histórico do assunto.
  const wrong =
    result?.wrong ??
    content.questions.filter((q) => q.topicId === topic.id && progress.q[q.id] && progress.q[q.id].last === false);
  const weak = cards.filter((c) => {
    const s = progress.cards[c.id];
    return !s || s.box <= 1;
  });
  return (
    <div className="reinforce">
      {wrong.length === 0 ? (
        <div className="explain good">
          <div className="explain-label">
            <Check size={16} aria-hidden="true" /> Sem erros neste assunto
          </div>
          <p>Você acertou tudo no mini-teste. Faça uma passada rápida nos cartões abaixo para fixar e siga em frente.</p>
        </div>
      ) : (
        <div className="explain">
          <div className="explain-label">
            <RefreshCcw size={16} aria-hidden="true" /> Revise o que você errou
          </div>
          <ul className="fix-list">
            {wrong.map((q) => (
              <li key={q.id}>
                <strong>{q.prompt}</strong>
                {q.explanation && <Rich text={q.explanation} />}
                <Source src={q.src} compact />
              </li>
            ))}
          </ul>
          <p className="muted small">Essas questões voltam na Revisão e no simulado até você acertar.</p>
        </div>
      )}
      {weak.length > 0 && (
        <div className="reinforce-cards">
          <h3>
            <Layers size={16} aria-hidden="true" /> Cartões para fixar
          </h3>
          <MiniCards cards={weak} />
        </div>
      )}
    </div>
  );
}

function StageNav({ onPrev, onNext, nextLabel, topic, openTutor }) {
  return (
    <div className="stage-nav">
      {onPrev && (
        <Button variant="ghost" icon={ArrowLeft} onClick={onPrev}>
          Voltar
        </Button>
      )}
      <Button variant="ghost" icon={MessageCircleQuestion} onClick={() => openTutor({ topicId: topic.id })}>
        Tirar dúvida
      </Button>
      <span className="spacer" />
      <Button icon={ArrowRight} onClick={onNext}>
        {nextLabel}
      </Button>
    </div>
  );
}

// Até 5 questões, variando os tipos.
function pickCheck(qs) {
  const byType = {};
  shuffle(qs).forEach((q) => (byType[q.type] = byType[q.type] || []).push(q));
  const out = [];
  const types = Object.keys(byType);
  while (out.length < Math.min(5, qs.length)) {
    for (const t of types) {
      const q = byType[t].shift();
      if (q && out.length < 5) out.push(q);
    }
  }
  return out;
}
