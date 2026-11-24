import React, { useEffect, useState } from "react";
import {
  Home, Target, Library as LibIcon, BookOpenText, ListChecks, Layers, Timer, RefreshCcw, Settings as Gear,
  MessageCircleQuestion, Flame, MoreHorizontal, X, FlaskConical,
} from "lucide-react";
import { useApp } from "./state.jsx";
import { levelOf } from "./lib/progress.js";
import { Toasts } from "./components/ui.jsx";
import Dashboard from "./views/Dashboard.jsx";
import Prep from "./views/Prep.jsx";
import Library from "./views/Library.jsx";
import Summaries from "./views/Summaries.jsx";
import Quiz from "./views/Quiz.jsx";
import Flashcards from "./views/Flashcards.jsx";
import Exam from "./views/Exam.jsx";
import Review from "./views/Review.jsx";
import Settings from "./views/Settings.jsx";
import Tutor from "./views/Tutor.jsx";
import SourceViewer from "./views/SourceViewer.jsx";

export const NAV = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "preparacao", label: "Preparação", icon: Target, hint: "Prova de amanhã" },
  { id: "biblioteca", label: "Biblioteca", icon: LibIcon },
  { id: "resumos", label: "Resumos", icon: BookOpenText },
  { id: "quiz", label: "Quiz", icon: ListChecks },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "simulado", label: "Simulado", icon: Timer },
  { id: "revisao", label: "Revisão", icon: RefreshCcw },
];
const MOBILE_MAIN = ["inicio", "preparacao", "quiz", "flashcards"];

const VIEWS = { inicio: Dashboard, preparacao: Prep, biblioteca: Library, resumos: Summaries, quiz: Quiz, flashcards: Flashcards, simulado: Exam, revisao: Review, ajustes: Settings };

export default function App() {
  const { route, go, content, progress, openTutor, tutor, viewer } = useApp();
  const [more, setMore] = useState(false);
  const View = VIEWS[route] || Dashboard;
  const lvl = levelOf(progress.xp);

  useEffect(() => setMore(false), [route]);

  return (
    <div className={`shell ${tutor.open ? "tutor-open" : ""}`}>
      <aside className="sidebar" aria-label="Navegação principal">
        <a className="brand" href="#inicio" onClick={(e) => (e.preventDefault(), go("inicio"))}>
          <span className="brand-mark" aria-hidden="true">
            <FlaskConical size={18} strokeWidth={2.4} />
          </span>
          <span className="brand-name">Study Lab</span>
        </a>
        <nav className="nav">
          {NAV.map((n) => (
            <button key={n.id} className={`nav-item ${route === n.id ? "on" : ""}`} onClick={() => go(n.id)} aria-current={route === n.id ? "page" : undefined}>
              <n.icon size={18} strokeWidth={2.1} aria-hidden="true" />
              <span>{n.label}</span>
              {n.id === "preparacao" && <em className="nav-pill">Prova</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="side-level">
            <div className="side-level-top">
              <span>
                Nível {lvl.n} · {lvl.name}
              </span>
              <span className="tabnum">{progress.xp} pts</span>
            </div>
            <div className="bar bar-thin">
              <div className="bar-fill tone-accent" style={{ width: `${lvl.progress * 100}%` }} />
            </div>
          </div>
          <button className={`nav-item ${route === "ajustes" ? "on" : ""}`} onClick={() => go("ajustes")}>
            <Gear size={18} strokeWidth={2.1} aria-hidden="true" />
            <span>Ajustes</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <a className="brand brand-mobile" href="#inicio" onClick={(e) => (e.preventDefault(), go("inicio"))}>
            <span className="brand-mark" aria-hidden="true">
              <FlaskConical size={16} strokeWidth={2.4} />
            </span>
            <span className="brand-name">Study Lab</span>
          </a>
          <div className="topbar-stats">
            <span className="stat-chip" title="Sequência de dias estudando">
              <Flame size={15} strokeWidth={2.4} aria-hidden="true" className={progress.streak.count ? "flame-on" : ""} />
              <span className="tabnum">{progress.streak.count}</span>
              <span className="sr-only">dias seguidos</span>
            </span>
            <span className="stat-chip" title="Pontos">
              <span className="tabnum">{progress.xp}</span> pts
            </span>
            <span className="stat-chip hide-sm" title="Nível">
              Nível {lvl.n}
            </span>
          </div>
        </header>

        <main className="content" id="conteudo">
          {content ? <View /> : <Loading />}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navegação">
        {NAV.filter((n) => MOBILE_MAIN.includes(n.id)).map((n) => (
          <button key={n.id} className={route === n.id ? "on" : ""} onClick={() => go(n.id)} aria-current={route === n.id ? "page" : undefined}>
            <n.icon size={20} strokeWidth={2.1} aria-hidden="true" />
            <span>{n.label}</span>
          </button>
        ))}
        <button className={!MOBILE_MAIN.includes(route) ? "on" : ""} onClick={() => setMore(true)} aria-haspopup="dialog">
          <MoreHorizontal size={20} strokeWidth={2.1} aria-hidden="true" />
          <span>Mais</span>
        </button>
      </nav>

      {more && (
        <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setMore(false)}>
          <div className="sheet" role="dialog" aria-label="Mais seções">
            <div className="sheet-head">
              <strong>Seções</strong>
              <button className="icon-btn" aria-label="Fechar" onClick={() => setMore(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="sheet-grid">
              {[...NAV.filter((n) => !MOBILE_MAIN.includes(n.id)), { id: "ajustes", label: "Ajustes", icon: Gear }].map((n) => (
                <button key={n.id} className={`sheet-item ${route === n.id ? "on" : ""}`} onClick={() => go(n.id)}>
                  <n.icon size={20} strokeWidth={2} aria-hidden="true" />
                  <span>{n.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!tutor.open && content && (
        <button className="tutor-fab" onClick={() => openTutor({ topicId: null })} aria-label="Abrir o professor virtual">
          <MessageCircleQuestion size={20} strokeWidth={2.2} aria-hidden="true" />
          <span>Professor</span>
        </button>
      )}
      {content && <Tutor />}
      {content && viewer && <SourceViewer />}
      <Toasts />
    </div>
  );
}

function Loading() {
  return (
    <div className="loading" role="status">
      <div className="spinner" aria-hidden="true" />
      <span>Carregando seus materiais…</span>
    </div>
  );
}
