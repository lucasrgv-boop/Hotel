import React, { useEffect, useMemo, useState } from "react";
import { ListChecks, Play, ArrowLeft } from "lucide-react";
import { useApp } from "../state.jsx";
import { Button, PageHead, Empty } from "../components/ui.jsx";
import { Runner } from "../components/Runner.jsx";
import { TYPE_LABEL } from "../lib/content.js";
import { shuffle } from "../lib/util.js";
import { DemoBanner } from "./Dashboard.jsx";

export default function Quiz() {
  const { content, progress, params, setLast, go } = useApp();
  const [topic, setTopic] = useState(params.topicId || "all");
  const [types, setTypes] = useState(Object.keys(TYPE_LABEL));
  const [count, setCount] = useState(10);
  const [order, setOrder] = useState("smart");
  const [session, setSession] = useState(null);

  useEffect(() => setLast({ route: "quiz", params: {}, label: "Quiz" }), []); // eslint-disable-line
  // Sessão pronta vinda da Revisão.
  useEffect(() => {
    if (params.ids?.length) {
      const qs = params.ids.map((id) => content.byQuestion[id]).filter(Boolean);
      if (qs.length) setSession({ qs, title: params.title || "Revisão direcionada", k: Date.now() });
    }
  }, [params.ids]); // eslint-disable-line

  const pool = useMemo(
    () => content.questions.filter((q) => (topic === "all" || q.topicId === topic) && types.includes(q.type)),
    [content.questions, topic, types]
  );
  const countByType = useMemo(() => {
    const c = {};
    content.questions.filter((q) => topic === "all" || q.topicId === topic).forEach((q) => (c[q.type] = (c[q.type] || 0) + 1));
    return c;
  }, [content.questions, topic]);

  if (!content.questions.length)
    return (
      <div className="page">
        <PageHead title="Quiz" />
        <Empty icon={ListChecks} title="Nenhuma questão ainda" action={<Button onClick={() => go("biblioteca")}>Ir para a Biblioteca</Button>}>
          As questões são elaboradas a partir dos seus materiais.
        </Empty>
      </div>
    );

  const start = () => {
    let qs = shuffle(pool);
    if (order === "smart") {
      // Primeiro as nunca vistas e as que você errou.
      const w = (q) => {
        const s = progress.q[q.id];
        if (!s) return 1;
        if (s.last === false) return 0;
        return 2 + (s.correct || 0);
      };
      qs = qs.sort((a, b) => w(a) - w(b));
    }
    setSession({ qs: qs.slice(0, count === 0 ? qs.length : count), title: topic === "all" ? "Quiz geral" : content.byTopic[topic]?.title, k: Date.now() });
  };

  if (session)
    return (
      <div className="page narrow">
        <div className="session-top">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setSession(null)}>
            Configurar
          </Button>
        </div>
        <Runner
          key={session.k}
          title={session.title}
          questions={session.qs}
          endActions={
            <>
              <Button onClick={() => setSession(null)}>Novo quiz</Button>
              <Button variant="ghost" onClick={() => go("revisao")}>
                Ver revisão
              </Button>
            </>
          }
        />
      </div>
    );

  return (
    <div className="page narrow">
      {content.showingDemo && <DemoBanner />}
      <PageHead eyebrow="Treino" title="Quiz">
        Correção na hora, com explicação e a fonte de cada resposta. Errou? Tente de novo.
      </PageHead>
      <div className="form-card">
        <div className="field">
          <label htmlFor="quiz-topic">Assunto</label>
          <select id="quiz-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="all">Todos os assuntos</option>
            {content.topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="field">
          <legend>Tipos de pergunta</legend>
          <div className="chips">
            {Object.entries(TYPE_LABEL).map(([k, label]) => {
              const on = types.includes(k);
              const n = countByType[k] || 0;
              return (
                <label key={k} className={`chip ${on ? "on" : ""} ${!n ? "disabled" : ""}`}>
                  <input
                    id={`quiz-type-${k}`}
                    type="checkbox"
                    checked={on}
                    disabled={!n}
                    onChange={() => setTypes((ts) => (on ? ts.filter((x) => x !== k) : [...ts, k]))}
                  />
                  {label} <em>{n}</em>
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="field-row">
          <div className="field">
            <label htmlFor="quiz-count">Quantidade</label>
            <select id="quiz-count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n} questões
                </option>
              ))}
              <option value={0}>Todas ({pool.length})</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="quiz-order">Ordem</label>
            <select id="quiz-order" value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value="smart">Erradas e inéditas primeiro</option>
              <option value="random">Aleatória</option>
            </select>
          </div>
        </div>
        <div className="form-foot">
          <span className="muted small">{pool.length} questões disponíveis com esses filtros</span>
          <Button icon={Play} onClick={start} disabled={!pool.length}>
            Começar
          </Button>
        </div>
      </div>
    </div>
  );
}
