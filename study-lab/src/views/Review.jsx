import React, { useEffect, useMemo } from "react";
import { RefreshCcw, Play, AlertTriangle, Check, Layers, ListChecks, TrendingDown, Award } from "lucide-react";
import { useApp } from "../state.jsx";
import { Button, PageHead, Empty, Bar, Badge, Source } from "../components/ui.jsx";
import { topicMastery, wrongQuestions, weakCards } from "../lib/progress.js";
import { TYPE_LABEL } from "../lib/content.js";
import { shuffle, plural } from "../lib/util.js";

export default function Review() {
  const { content, progress, go, setLast } = useApp();
  useEffect(() => setLast({ route: "revisao", params: {}, label: "Revisão" }), []); // eslint-disable-line

  const data = useMemo(() => {
    const rows = content.topics.map((t) => ({ t, m: topicMastery(progress, content, t.id) }));
    const started = rows.filter((r) => r.m.started);
    const weakTopics = started
      .filter((r) => r.m.mastery < 0.8)
      .sort((a, b) => a.m.mastery - b.m.mastery || (b.m.wrong || 0) - (a.m.wrong || 0));
    const mastered = started.filter((r) => r.m.mastery >= 0.8);
    const notStarted = rows.filter((r) => !r.m.started);
    return { weakTopics, mastered, notStarted, wrong: wrongQuestions(progress, content), cards: weakCards(progress, content) };
  }, [content, progress]);

  const startTargeted = () => {
    // Revisão direcionada: erradas + questões dos assuntos fracos ainda não acertadas.
    const ids = new Set(data.wrong.map((q) => q.id));
    for (const { t } of data.weakTopics) {
      shuffle(content.questions.filter((q) => q.topicId === t.id && !progress.q[q.id]?.last)).slice(0, 3).forEach((q) => ids.add(q.id));
    }
    const list = shuffle([...ids]).slice(0, 15);
    go("quiz", { ids: list, title: "Revisão direcionada" });
  };

  const nothing = !data.wrong.length && !data.weakTopics.length && !data.cards.length;

  return (
    <div className="page">
      <PageHead
        eyebrow="Seus pontos fracos"
        title="Revisão inteligente"
        actions={
          !nothing && (
            <Button icon={Play} onClick={startTargeted}>
              Revisão direcionada
            </Button>
          )
        }
      >
        Tudo o que você errou ou ainda não domina, reunido a partir das suas respostas no quiz, nos flashcards e nos simulados.
      </PageHead>

      {progress.totals.answered + progress.totals.cards === 0 ? (
        <Empty icon={RefreshCcw} title="Ainda não há o que revisar" action={<Button onClick={() => go("preparacao")}>Começar a preparação</Button>}>
          Responda algumas questões ou revise flashcards. Seus erros e dificuldades aparecem aqui automaticamente.
        </Empty>
      ) : (
        <>
          <section className="review-kpis">
            <Kpi icon={TrendingDown} tone="bad" value={data.weakTopics.length} label="assuntos para reforçar" />
            <Kpi icon={ListChecks} tone="bad" value={data.wrong.length} label="questões erradas" />
            <Kpi icon={Layers} tone="mid" value={data.cards.length} label="conceitos não dominados" />
            <Kpi icon={Award} tone="good" value={data.mastered.length} label="assuntos dominados" />
          </section>

          <div className="two-col">
            <section className="panel">
              <div className="panel-head">
                <h2>Assuntos para reforçar</h2>
              </div>
              {data.weakTopics.length ? (
                <ul className="topic-perf">
                  {data.weakTopics.map(({ t, m }) => (
                    <li key={t.id}>
                      <div className="topic-perf-top">
                        <span>{t.title}</span>
                        <span className="tabnum">
                          {Math.round(m.mastery * 100)}% <small className="muted">· {plural(m.wrong, "erro", "erros")}</small>
                        </span>
                      </div>
                      <Bar value={m.mastery} thin tone={m.mastery >= 0.5 ? "mid" : "bad"} label={`Domínio de ${t.title}`} />
                      <div className="row-wrap tight">
                        <Button size="sm" variant="soft" onClick={() => go("preparacao", { topicId: t.id })}>
                          Reestudar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => go("quiz", { topicId: t.id })}>
                          Quiz do assunto
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => go("flashcards", { topicId: t.id, mode: "smart" })}>
                          Cartões
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  <Check size={15} aria-hidden="true" /> Nenhum assunto praticado está abaixo de 80%.
                </p>
              )}
              {data.notStarted.length > 0 && (
                <p className="muted small top-gap">
                  Ainda não praticados: {data.notStarted.map((r) => r.t.title).join(", ")}.
                </p>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Assuntos que você já domina</h2>
              </div>
              {data.mastered.length ? (
                <ul className="mastered">
                  {data.mastered.map(({ t, m }) => (
                    <li key={t.id}>
                      <Check size={15} aria-hidden="true" />
                      <span>{t.title}</span>
                      <span className="tabnum muted">{Math.round(m.mastery * 100)}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Nenhum ainda. Um assunto é considerado dominado com 80% ou mais.</p>
              )}
            </section>
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2>Perguntas que você errou</h2>
              {data.wrong.length > 0 && (
                <Button size="sm" icon={RefreshCcw} onClick={() => go("quiz", { ids: data.wrong.map((q) => q.id), title: "Refazer as erradas" })}>
                  Refazer todas
                </Button>
              )}
            </div>
            {data.wrong.length ? (
              <ul className="wrong-list">
                {data.wrong.map((q) => {
                  const s = progress.q[q.id];
                  return (
                    <li key={q.id}>
                      <div className="wrong-main">
                        <span className="wrong-prompt">{q.prompt}</span>
                        <span className="wrong-meta">
                          <Badge tone="neutral">{TYPE_LABEL[q.type]}</Badge>
                          <span className="muted small">{content.byTopic[q.topicId]?.title}</span>
                          <span className="muted small tabnum">
                            {s.wrong}× errada{s.correct ? ` · ${s.correct}× certa` : ""}
                          </span>
                          <Source src={q.src} compact />
                        </span>
                      </div>
                      <Button size="sm" variant="soft" onClick={() => go("quiz", { ids: [q.id], title: "Refazer questão" })}>
                        Refazer
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted">Nenhuma questão errada pendente. As que você errar aparecem aqui até acertar duas vezes seguidas.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Conceitos que você ainda não domina</h2>
              {data.cards.length > 0 && (
                <Button size="sm" icon={Layers} onClick={() => go("flashcards", { mode: "weak" })}>
                  Revisar cartões
                </Button>
              )}
            </div>
            {data.cards.length ? (
              <ul className="weak-cards">
                {data.cards.map((c) => (
                  <li key={c.id}>
                    <AlertTriangle size={14} aria-hidden="true" className={progress.cards[c.id]?.rating === "dont" ? "tone-bad-text" : "tone-mid-text"} />
                    <span>{c.front}</span>
                    <span className="muted small">{progress.cards[c.id]?.rating === "dont" ? "Não sei" : "Tenho dúvida"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nenhum cartão marcado como Não sei ou Tenho dúvida.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, value, label, tone }) {
  return (
    <div className={`kpi tone-${tone}`}>
      <Icon size={18} aria-hidden="true" />
      <span className="kpi-value tabnum">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}
