import React from "react";
import { ArrowRight, Upload, ListChecks, Layers, Timer, RefreshCcw, Flame, Trophy, Play, Info, Image as ImageIcon, Heart, Star } from "lucide-react";
import { useApp } from "../state.jsx";
import { Button, Ring, Bar } from "../components/ui.jsx";
import { levelOf, topicMastery, masteryLabel, ACHIEVEMENTS, wrongQuestions, weakCards } from "../lib/progress.js";
import { plural } from "../lib/util.js";
import { topicColor } from "../lib/content.js";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia!" : h < 18 ? "Boa tarde!" : "Boa noite!";
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
  const nextTopic = topics.find((t) => !progress.prep[t.id]?.done);
  const unlocked = ACHIEVEMENTS.filter((a) => progress.achievements[a.id]);
  const atlasStars = content.plates.reduce((s, p) => s + (progress.atlas?.[p.id]?.stars || 0), 0);

  const message =
    dailyXp >= goal
      ? "Meta de hoje batida! Uma passada nos seus erros agora vale ouro."
      : prepDone === 0
      ? "Comece pela trilha: ela leva você assunto por assunto, com imagem, teste e reforço."
      : nextTopic
      ? `Próxima parada da trilha: ${nextTopic.title}.`
      : "Trilha completa! Agora é o simulado geral.";

  return (
    <div className="page dash">
      {content.showingDemo && <DemoBanner />}
      <section className="hero-fun">
        <div className="hero-fun-text">
          <span className="fun-kicker">{greeting()}</span>
          <h1>{content.exam?.name ? <>Rumo à {content.exam.name}</> : "Seu cantinho de estudos"}</h1>
          <p className="lead">{message}</p>
          <div className="row-wrap">
            <Button icon={nextTopic ? Play : Timer} onClick={() => (nextTopic ? go("preparacao", { topicId: nextTopic.id }) : go("simulado", { final: true }))}>
              {nextTopic ? (prepDone ? "Continuar a trilha" : "Começar a trilha") : "Simulado geral"}
            </Button>
            {progress.last && progress.last.route !== "inicio" && (
              <Button variant="soft" icon={ArrowRight} onClick={() => go(progress.last.route, progress.last.params || {})}>
                Voltar para: {progress.last.label}
              </Button>
            )}
          </div>
          <span className="hand-note">
            Você consegue! <Heart size={15} aria-hidden="true" />
          </span>
        </div>
        <div className="hero-goal">
          <Ring value={dailyXp / goal} size={120} stroke={11} tone={dailyXp >= goal ? "good" : "accent"} label={`Meta diária: ${dailyXp} de ${goal} pontos`}>
            <div className="ring-num tabnum">{dailyXp}</div>
            <div className="ring-sub">de {goal} pts</div>
          </Ring>
          <div className="hero-goal-text">
            <strong>Meta de hoje</strong>
            <span className="muted">{dailyXp >= goal ? "Cumprida!" : `Faltam ${goal - dailyXp} pontos`}</span>
            <span className="streak">
              <Flame size={16} aria-hidden="true" className={progress.streak.count ? "flame-on" : ""} />
              {plural(progress.streak.count, "dia seguido", "dias seguidos")}
            </span>
          </div>
        </div>
      </section>

      <section className="pills-row" aria-label="Seu progresso">
        <div className="pill-stat c-violet">
          <span className="pill-top">Nível {lvl.n}</span>
          <strong>{lvl.name}</strong>
          <Bar value={lvl.progress} thin label="Progresso até o próximo nível" />
          <small>{lvl.next ? `${lvl.toNext} pts para ${lvl.next.name}` : "Nível máximo"}</small>
        </div>
        <div className="pill-stat c-rose">
          <span className="pill-top">Trilha</span>
          <strong className="tabnum">
            {prepDone}/{topics.length}
          </strong>
          <Bar value={topics.length ? prepDone / topics.length : 0} thin label="Assuntos concluídos" />
          <small>assuntos concluídos</small>
        </div>
        <div className="pill-stat c-peach">
          <span className="pill-top">Atlas</span>
          <strong className="tabnum">
            {atlasStars}
            <Star size={16} className="inline-star" aria-hidden="true" />
          </strong>
          <Bar value={content.plates.length ? atlasStars / (content.plates.length * 3) : 0} thin label="Estrelas no atlas" />
          <small>de {content.plates.length * 3} estrelas</small>
        </div>
        <div className="pill-stat c-mint">
          <span className="pill-top">Acertos</span>
          <strong className="tabnum">{progress.totals.answered ? Math.round((progress.totals.correct / progress.totals.answered) * 100) : 0}%</strong>
          <Bar value={progress.totals.answered ? progress.totals.correct / progress.totals.answered : 0} thin tone="good" label="Taxa de acertos" />
          <small>{plural(progress.totals.answered, "resposta", "respostas")}</small>
        </div>
      </section>

      <section aria-label="Sistemas">
        <div className="section-title">
          <h2>Seus sistemas</h2>
          <button className="link-btn" onClick={() => go("resumos")}>
            Ver resumos
          </button>
        </div>
        <div className="system-grid">
          {topics.map((t, i) => {
            const m = topicMastery(progress, content, t.id);
            const ml = masteryLabel(m);
            const done = progress.prep[t.id]?.done;
            return (
              <button key={t.id} className={`system-card c-${topicColor(t, i)}`} onClick={() => go("preparacao", { topicId: t.id })}>
                <span className="system-thumb">{t.thumb ? <img src={t.thumb} alt="" loading="lazy" /> : null}</span>
                <span className="system-text">
                  <strong>{t.title}</strong>
                  <span className={`mastery-tag tone-${ml.tone}`}>{done && ml.tone === "idle" ? "Estudado" : ml.label}</span>
                  <Bar value={m.mastery} thin tone={ml.tone === "good" ? "good" : ml.tone === "bad" ? "bad" : "accent"} label={`Domínio de ${t.title}`} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="quick" aria-label="Atalhos">
        <QuickCard icon={ImageIcon} title="Atlas" text="Identifique nas imagens" tone="peach" onClick={() => go("atlas")} />
        <QuickCard icon={ListChecks} title="Quiz" text={`${content.questions.length} questões`} tone="violet" onClick={() => go("quiz")} />
        <QuickCard icon={Layers} title="Flashcards" text={weak ? `${weak} para reforçar` : `${content.flashcards.length} cartões`} tone="sky" onClick={() => go("flashcards")} />
        <QuickCard icon={Timer} title="Simulado" text="Prova com cronômetro" tone="rose" onClick={() => go("simulado")} />
        <QuickCard icon={RefreshCcw} title="Revisão" text={wrong ? `${wrong} erradas para refazer` : "Seus pontos fracos"} tone="amber" onClick={() => go("revisao")} />
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
  );
}

function QuickCard({ icon: Icon, title, text, onClick, tone }) {
  return (
    <button className={`quick-card c-${tone}`} onClick={onClick}>
      <span className="quick-icon">
        <Icon size={22} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="quick-text">
        <strong>{title}</strong>
        <span>{text}</span>
      </span>
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
          Conteúdo de demonstração (Guia do Study Lab).{" "}
          <button className="link-btn" onClick={() => go("biblioteca", { import: true })}>
            Importar meus materiais
          </button>
        </span>
      </div>
    );
  return (
    <div className="banner">
      <Info size={18} aria-hidden="true" />
      <div>
        <strong>Você está vendo o material de demonstração (Guia do Study Lab).</strong>
        <span>Ele explica como o app funciona. Envie seus materiais no chat do Claude ou importe os arquivos na Biblioteca; a demonstração some assim que eles chegarem.</span>
      </div>
      <Button size="sm" variant="soft" icon={Upload} onClick={() => go("biblioteca", { import: true })}>
        Importar arquivos
      </Button>
    </div>
  );
}
