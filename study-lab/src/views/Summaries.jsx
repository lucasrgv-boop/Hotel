import React, { useEffect, useState } from "react";
import { BookOpenText, Target, ListChecks, Layers, MessageCircleQuestion, AlertTriangle, Sparkles, Info } from "lucide-react";
import { useApp } from "../state.jsx";
import { Button, PageHead, Empty, Source, Rich, Segmented, Badge } from "../components/ui.jsx";
import { DemoBanner } from "./Dashboard.jsx";
import { Explore } from "./Atlas.jsx";

const TABS = [
  { value: "full", label: "Completo" },
  { value: "simple", label: "Simplificado" },
  { value: "concepts", label: "Conceitos" },
  { value: "keywords", label: "Palavras-chave" },
  { value: "attention", label: "Atenção" },
  { value: "examples", label: "Exemplos" },
  { value: "comparisons", label: "Comparações" },
  { value: "memorize", label: "Memorizar" },
  { value: "image", label: "Na imagem" },
];

export default function Summaries() {
  const { content, params, go, setLast, openTutor } = useApp();
  const [topicId, setTopicId] = useState(params.topicId || content.topics[0]?.id);
  const [tab, setTab] = useState(params.tab || "simple");
  const topic = content.byTopic[topicId] || content.topics[0];

  useEffect(() => {
    if (params.topicId) setTopicId(params.topicId);
  }, [params.topicId]);
  useEffect(() => {
    if (topic) setLast({ route: "resumos", params: { topicId: topic.id }, label: `Resumo: ${topic.title}` });
  }, [topic?.id]); // eslint-disable-line

  if (!topic)
    return (
      <div className="page">
        <PageHead title="Resumos" />
        <Empty icon={BookOpenText} title="Nenhum resumo ainda" action={<Button onClick={() => go("biblioteca")}>Ir para a Biblioteca</Button>}>
          Os resumos são montados a partir dos seus materiais.
        </Empty>
      </div>
    );

  const bySubject = content.subjects
    .map((s) => ({ s, topics: content.topics.filter((t) => t.subjectId === s.id) }))
    .filter((g) => g.topics.length);
  const mats = topic.materialIds.map((id) => content.byMaterial[id]).filter(Boolean);
  const auto = mats.some((m) => m.generator === "auto");
  const counts = {
    concepts: topic.concepts.length,
    keywords: topic.keywords.length,
    attention: topic.attention.length,
    examples: topic.examples.length,
    comparisons: topic.comparisons.length,
    memorize: topic.memorize.length,
  };

  return (
    <div className="page">
      {content.showingDemo && <DemoBanner />}
      <PageHead eyebrow="Resumos inteligentes" title="Resumos">
        Cada assunto em oito formatos. Toque na etiqueta de origem para ver o trecho no material.
      </PageHead>
      <div className="split">
        <aside className="split-side" aria-label="Assuntos">
          <select id="sum-topic" className="only-sm" value={topic.id} onChange={(e) => setTopicId(e.target.value)} aria-label="Assunto">
            {bySubject.map((g) => (
              <optgroup key={g.s.id} label={g.s.name}>
                {g.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="hide-sm">
            {bySubject.map((g) => (
              <div key={g.s.id} className="side-group">
                <div className="side-group-title">{g.s.name}</div>
                {g.topics.map((t) => (
                  <button key={t.id} className={`side-item ${t.id === topic.id ? "on" : ""}`} onClick={() => setTopicId(t.id)}>
                    <span>{t.title}</span>
                    {t.importance === 3 && <Sparkles size={13} className="tone-accent-text" aria-label="Essencial" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <article className="split-main">
          <div className="topic-head">
            {topic.thumb && <img className="topic-thumb" src={topic.thumb} alt="" />}
            <div>
              <h2>{topic.title}</h2>
              <div className="row-wrap tight">
                {topic.importance === 3 && (
                  <Badge tone="accent" icon={Sparkles}>
                    Essencial para a prova
                  </Badge>
                )}
                {mats.map((m) => (
                  <Badge key={m.id} tone="neutral">
                    {m.title}
                  </Badge>
                ))}
              </div>
              {topic.why && <p className="muted small top-gap">{topic.why}</p>}
            </div>
          </div>
          {auto && (
            <p className="note small">
              <Info size={15} aria-hidden="true" /> Resumo extrativo: montado automaticamente com frases do próprio material, sem reescrita.
            </p>
          )}
          <div className="tabs-scroll">
            <Segmented
              label="Formato do resumo"
              value={tab}
              onChange={setTab}
              options={TABS.filter((t) => t.value !== "image" || topic.plates?.length).map((t) => ({ ...t, count: counts[t.value] }))}
            />
          </div>

          <div className="summary-body">
            {tab === "full" && <Section text={topic.summary.full} empty="O material não traz um resumo para este assunto." sources={topic.sources} />}
            {tab === "simple" && <Section text={topic.summary.simple} empty="Não há uma versão simplificada para este assunto." sources={topic.sources} />}
            {tab === "concepts" &&
              (topic.concepts.length ? (
                <dl className="concept-list">
                  {topic.concepts.map((c, i) => (
                    <div key={i} className="concept">
                      <dt>{c.term}</dt>
                      <dd>
                        {c.definition} <Source src={c.src} compact />
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <Missing>O material não define conceitos de forma explícita neste assunto.</Missing>
              ))}
            {tab === "keywords" &&
              (topic.keywords.length ? (
                <div className="keywords">
                  {topic.keywords.map((k, i) => (
                    <span key={i} className="kw">
                      {k}
                    </span>
                  ))}
                </div>
              ) : (
                <Missing>Sem palavras-chave para este assunto.</Missing>
              ))}
            {tab === "attention" && <Items items={topic.attention} icon={AlertTriangle} empty="O material não destaca pontos de atenção neste assunto." />}
            {tab === "examples" && <Items items={topic.examples} empty="O material não traz exemplos práticos para este assunto. Você pode pedir um ao professor; ele avisa quando o exemplo não vem dos seus arquivos." />}
            {tab === "comparisons" &&
              (topic.comparisons.length ? (
                <div className="comparisons">
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
              ) : (
                <Missing>O material não compara conceitos neste assunto.</Missing>
              ))}
            {tab === "image" && (
              <div className="image-tab">
                {topic.plates.map((pid) => content.byPlate[pid]).filter(Boolean).map((pl) => (
                  <div key={pl.id} className="stage-plate">
                    <h3>{pl.title}</h3>
                    <Explore plate={pl} onQuiz={() => go("atlas", { plateId: pl.id, mode: "name" })} />
                  </div>
                ))}
                {topic.practice?.length > 0 && (
                  <div className="practice-list">
                    <h3>Identificar na prática (lista da apostila)</h3>
                    <div className="keywords">
                      {topic.practice.map((x) => (
                        <span key={x} className="kw">
                          {x}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {tab === "memorize" &&
              (topic.memorize.length ? (
                <ul className="memorize-list">
                  {topic.memorize.map((m, i) => (
                    <li key={i}>
                      <mark>{m.text}</mark> <Source src={m.src} compact />
                    </li>
                  ))}
                </ul>
              ) : (
                <Missing>Nada específico para memorizar neste assunto.</Missing>
              ))}
          </div>

          <div className="row-wrap actions-row">
            <Button icon={Target} onClick={() => go("preparacao", { topicId: topic.id })}>
              Estudar este assunto
            </Button>
            <Button variant="soft" icon={ListChecks} onClick={() => go("quiz", { topicId: topic.id })}>
              Quiz
            </Button>
            <Button variant="soft" icon={Layers} onClick={() => go("flashcards", { topicId: topic.id })}>
              Cartões
            </Button>
            <Button variant="ghost" icon={MessageCircleQuestion} onClick={() => openTutor({ topicId: topic.id })}>
              Perguntar ao professor
            </Button>
          </div>
        </article>
      </div>
    </div>
  );
}

function Section({ text, empty, sources }) {
  if (!text) return <Missing>{empty}</Missing>;
  return (
    <div className="prose">
      <Rich text={text} />
      {sources?.length > 0 && (
        <div className="row-wrap tight">
          {sources.map((s, i) => (
            <Source key={i} src={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function Items({ items, empty, icon: Icon }) {
  if (!items.length) return <Missing>{empty}</Missing>;
  return (
    <ul className="items">
      {items.map((it, i) => (
        <li key={i}>
          {Icon && <Icon size={15} aria-hidden="true" className="tone-mid-text" />}
          <div>
            <Rich text={it.text} />
            <Source src={it.src} compact />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Missing({ children }) {
  return (
    <p className="missing">
      <Info size={15} aria-hidden="true" /> {children}
    </p>
  );
}
