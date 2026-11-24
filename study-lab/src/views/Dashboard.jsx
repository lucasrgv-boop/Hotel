import React from "react";
import { Target, ArrowRight, Upload, ListChecks, Layers, Timer, RefreshCcw, BookOpenText, Flame, Trophy, Play, Info, Sparkles } from "lucide-react";
import { useApp } from "../state.jsx";
import { Button, Ring, Bar, Badge } from "../components/ui.jsx";
import { levelOf, topicMastery, masteryLabel, ACHIEVEMENTS, wrongQuestions, weakCards } from "../lib/progress.js";
import { plural, pct } from "../lib/util.js";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default function Dashboard() {
  const { content, progress, settings, go } = useApp();
  const lvl = levelOf(progress.xp);
  const topics = content.topics;
  const goal = settings.goal;
  const dailyXp = progress.daily.date === todayStr() ? progress.daily.xp : 0;
  const prepDone = topics.filter((t) => progress.prep[t.id]?.done).length;
  const wrong = wrongQuestions(progress, content).length;
  const weak = weakCards(progress, content).length;
  const masteries = topics.map((t) => ({ t, m: topicMastery(progress, content, t.id) }));
  const overall = masteries.length ? masteries.reduce((s, x) => s + x.m.mastery, 0) / masteries.length : 0;
  const unlocked = ACHIEVEMENTS.filter((a) => progress.achievements[a.id]);
  const nextTopic = topics.find((t) => !progress.prep[t.id]?.done);

  const message =
    dailyXp >= goal
      ? "Meta de hoje cumprida. Uma revisão rápida dos erros agora rende muito."
      : prepDone === 0
      ? "Comece pela Preparação para a prova: ela organiza tudo na ordem certa."
      : nextTopic
      ? `Próximo assunto: ${nextTopic.title}.`
      : "Todos os assuntos estudados. Hora do simulado geral.";

  return (
    <div className="page dash">
      {content.showingDemo && <DemoBanner />}
      <section className="hero">
        <div className="hero-text">
          <div className="eyebrow">{greeting()}</div>
          <h1>{content.exam?.name ? `Rumo à prova de ${content.exam.name}` : "Seu laboratório de estudos"}</h1>
          <p className="lead">{message}</p>
          <div className="row-wrap">
            <Button icon={Target} onClick={() => go("preparacao")}>
              {prepDone ? "Continuar a preparação" : "Começar a preparação"}
            </Button>
            {progress.last && progress.last.route !== "inicio" && (
              <Button variant="soft" icon={Play} onClick={() => go(progress.last.route, progress.last.params || {})}>
                Continuar: {progress.last.label}
              </Button>
            )}
          </div>
        </div>
        <div className="hero-goal">
          <Ring value={dailyXp / goal} size={112} stroke={10} tone={dailyXp >= goal ? "good" : "accent"} label={`Meta diária: ${dailyXp} de ${goal} pontos`}>
            <div className="ring-num tabnum">{dailyXp}</div>
            <div className="ring-sub">de {goal}</div>
          </Ring>
          <div className="hero-goal-text">
            <strong>Meta de hoje</strong>
            <span className="muted">{dailyXp >= goal ? "Cumprida" : `Faltam ${goal - dailyXp} pontos`}</span>
            <span className="streak">
              <Flame size={15} aria-hidden="true" className={progress.streak.count ? "flame-on" : ""} />
              {plural(progress.streak.count, "dia seguido", "dias seguidos")}
            </span>
          </div>
        </div>
      </section>

      <section className="stats-row" aria-label="Resumo do progresso">
        <div className="stat">
          <span className="stat-label">Nível</span>
          <span className="stat-value">
            {lvl.n} <small>{lvl.name}</small>
          </span>
          <Bar value={lvl.progress} thin label="Progresso até o próximo nível" />
          <span className="stat-foot">{lvl.next ? `${lvl.toNext} pts para ${lvl.next.name}` : "Nível máximo"}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Domínio geral</span>
          <span className="stat-value tabnum">{Math.round(overall * 100)}%</span>
          <Bar value={overall} thin tone="good" label="Domínio geral" />
          <span className="stat-foot">{plural(topics.length, "assunto", "assuntos")}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Acertos</span>
          <span className="stat-value tabnum">{pct(progress.totals.correct, progress.totals.answered)}%</span>
          <Bar value={progress.totals.answered ? progress.totals.correct / progress.totals.answered : 0} thin tone="mid" label="Taxa de acertos" />
          <span className="stat-foot">{plural(progress.totals.answered, "resposta", "respostas")}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Preparação</span>
          <span className="stat-value tabnum">
            {prepDone}/{topics.length}
          </span>
          <Bar value={topics.length ? prepDone / topics.length : 0} thin label="Assuntos concluídos" />
          <span className="stat-foot">assuntos concluídos</span>
        </div>
      </section>

      <section className="quick" aria-label="Atalhos">
        <QuickCard icon={ListChecks} title="Quiz" text={`${content.questions.length} questões com correção na hora`} onClick={() => go("quiz")} />
        <QuickCard icon={Layers} title="Flashcards" text={weak ? `${weak} cartões para reforçar` : `${content.flashcards.length} cartões`} onClick={() => go("flashcards")} />
        <QuickCard icon={Timer} title="Simulado" text="Prova cronometrada com nota" onClick={() => go("simulado")} />
        <QuickCard icon={RefreshCcw} title="Revisão" text={wrong ? `${wrong} questões erradas para refazer` : "Seus pontos fracos, reunidos"} onClick={() => go("revisao")} tone={wrong ? "bad" : null} />
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h2>Assuntos</h2>
            <Button variant="ghost" size="sm" icon={BookOpenText} onClick={() => go("resumos")}>
              Resumos
            </Button>
          </div>
          {topics.length === 0 ? (
            <p className="muted">Os assuntos aparecem aqui assim que os materiais forem organizados.</p>
          ) : (
            <ul className="topic-list">
              {masteries.map(({ t, m }) => {
                const ml = masteryLabel(m);
                return (
                  <li key={t.id}>
                    <button className="topic-row" onClick={() => go("resumos", { topicId: t.id })}>
                      <span className="topic-row-main">
                        <span className="topic-row-title">
                          {t.title}
                          {t.importance === 3 && (
                            <Badge tone="accent" icon={Sparkles}>
                              Essencial
                            </Badge>
                          )}
                        </span>
                        <Bar value={m.mastery} thin tone={ml.tone === "good" ? "good" : ml.tone === "bad" ? "bad" : "accent"} label={`Domínio de ${t.title}`} />
                      </span>
                      <span className={`mastery-tag tone-${ml.tone}`}>{ml.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Conquistas</h2>
            <span className="muted small tabnum">
              {unlocked.length}/{ACHIEVEMENTS.length}
            </span>
          </div>
          <ul className="achievements">
            {ACHIEVEMENTS.map((a) => {
              const on = !!progress.achievements[a.id];
              return (
                <li key={a.id} className={on ? "on" : ""} title={a.desc}>
                  <Trophy size={16} aria-hidden="true" />
                  <span>
                    <strong>{a.title}</strong>
                    <small>{a.desc}</small>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function QuickCard({ icon: Icon, title, text, onClick, tone }) {
  return (
    <button className={`quick-card ${tone ? "tone-" + tone : ""}`} onClick={onClick}>
      <span className="quick-icon">
        <Icon size={20} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="quick-text">
        <strong>{title}</strong>
        <span>{text}</span>
      </span>
      <ArrowRight size={16} className="quick-arrow" aria-hidden="true" />
    </button>
  );
}

export function DemoBanner({ full }) {
  const { go, route } = useApp();
  if (!full && route !== "inicio" && route !== "biblioteca")
    return (
      <div className="banner banner-slim">
        <Info size={15} aria-hidden="true" />
        <span>
          Conteúdo de demonstração (Guia do Study Lab). <button className="link-btn" onClick={() => go("biblioteca", { import: true })}>Importar meus materiais</button>
        </span>
      </div>
    );
  return (
    <div className="banner">
      <Info size={18} aria-hidden="true" />
      <div>
        <strong>Você está vendo o material de demonstração (Guia do Study Lab).</strong>
        <span>
          Ele explica como o app funciona, para você testar tudo. Envie seus materiais no chat do Claude ou importe os arquivos na Biblioteca; a demonstração some assim que eles chegarem.
        </span>
      </div>
      <Button size="sm" variant="soft" icon={Upload} onClick={() => go("biblioteca", { import: true })}>
        Importar arquivos
      </Button>
    </div>
  );
}
