import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Star, Zap, Search, MousePointerClick, Compass, RotateCcw, Check, X, Timer, ArrowRight, Lightbulb } from "lucide-react";
import { useApp } from "../state.jsx";
import { Button, Source, Segmented, Bar } from "../components/ui.jsx";
import { Plate, plateNames } from "../components/Plate.jsx";
import { burst, bigBurst } from "../components/fx.js";
import { shuffle } from "../lib/util.js";
import { topicColor } from "../lib/content.js";

export default function Atlas() {
  const { content, params, go, setLast } = useApp();
  const plate = content.byPlate[params.plateId];
  useEffect(() => {
    setLast(plate ? { route: "atlas", params: { plateId: plate.id }, label: `Atlas: ${plate.title}` } : { route: "atlas", params: {}, label: "Atlas interativo" });
  }, [plate?.id]); // eslint-disable-line
  if (plate) return <Player key={plate.id} plate={plate} initialMode={params.mode} />;
  return <AtlasHome go={go} />;
}

export function plateStats(progress, content, plate) {
  const names = plateNames(plate);
  let right = 0;
  names.forEach((n) => {
    const qid = content.spotFor[`${plate.id}|${n}`];
    if (qid && progress.q[qid]?.last) right++;
  });
  return { right, total: names.length, stars: progress.atlas?.[plate.id]?.stars || 0, flash: progress.atlas?.[plate.id]?.flash || 0 };
}

function Stars({ n, size = 16 }) {
  return (
    <span className="stars" aria-label={`${n} de 3 estrelas`}>
      {[1, 2, 3].map((k) => (
        <Star key={k} size={size} className={k <= n ? "on" : ""} aria-hidden="true" />
      ))}
    </span>
  );
}

function AtlasHome({ go }) {
  const { content, progress } = useApp();
  if (!content.plates.length)
    return (
      <div className="page">
        <h1>Atlas</h1>
        <p className="muted">Nenhuma ilustração nos materiais ainda.</p>
      </div>
    );
  return (
    <div className="page">
      <header className="fun-head">
        <span className="fun-kicker">Prova prática</span>
        <h1>Atlas interativo</h1>
        <p className="lead">As ilustrações das suas apostilas com os nomes escondidos. A dica da própria apostila: aponte as estruturas e diga o nome e a função sem olhar.</p>
      </header>
      <div className="atlas-grid">
        {content.plates.map((p, i) => {
          const st = plateStats(progress, content, p);
          const t = content.byTopic[p.topicId];
          return (
            <button key={p.id} className={`atlas-card c-${topicColor(t, i)}`} onClick={() => go("atlas", { plateId: p.id })}>
              <span className="atlas-thumb">
                <img src={p.img} alt="" loading="lazy" />
              </span>
              <span className="atlas-info">
                <strong>{p.title}</strong>
                <span className="atlas-meta">
                  <Stars n={st.stars} size={14} />
                  <span className="tabnum">
                    {st.right}/{st.total} estruturas
                  </span>
                </span>
                <Bar value={st.total ? st.right / st.total : 0} thin tone="good" label={`Estruturas acertadas em ${p.title}`} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const MODES = [
  { value: "explore", label: "Explorar", icon: Compass },
  { value: "name", label: "Qual é?", icon: Search },
  { value: "tap", label: "Onde está?", icon: MousePointerClick },
  { value: "flash", label: "Relâmpago", icon: Zap },
];

function Player({ plate, initialMode }) {
  const { content, go, progress } = useApp();
  const [mode, setMode] = useState(initialMode || "explore");
  const st = plateStats(progress, content, plate);
  const topic = content.byTopic[plate.topicId];
  const mat = content.byMaterial[plate.materialId];
  return (
    <div className="page atlas-page">
      <header className="player-head">
        <button className="back-round" onClick={() => go("atlas")} aria-label="Voltar para o atlas">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="player-title">
          <h1>{plate.title}</h1>
          <div className="row-wrap tight">
            <Stars n={st.stars} size={14} />
            <span className="muted small tabnum">
              {st.right}/{st.total} acertadas
            </span>
            {st.flash > 0 && <span className="muted small tabnum">· recorde relâmpago {st.flash}</span>}
            <span className="muted small hide-sm">· {mat?.title}</span>
          </div>
        </div>
      </header>
      <div className="tabs-scroll">
        <Segmented label="Modo" value={mode} onChange={setMode} options={MODES} />
      </div>
      {mode === "explore" && <Explore plate={plate} onQuiz={() => setMode("name")} />}
      {(mode === "name" || mode === "tap") && <Drill key={mode} plate={plate} mode={mode} onDone={() => {}} />}
      {mode === "flash" && <Flash plate={plate} />}
      {topic && (
        <div className="row-wrap atlas-foot">
          <Button variant="ghost" size="sm" onClick={() => go("resumos", { topicId: topic.id })}>
            Resumo de {topic.title}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => go("preparacao", { topicId: topic.id })}>
            Estudar o assunto
          </Button>
        </div>
      )}
    </div>
  );
}

export function Explore({ plate, onQuiz }) {
  const [open, setOpen] = useState(() => new Set());
  const [sel, setSel] = useState(null);
  const cover = useMemo(() => new Set(plate.labels.filter((l) => !open.has(l.id)).map((l) => l.id)), [plate, open]);
  const all = open.size === plate.labels.length;
  return (
    <div className="explore">
      <p className="hint">
        <Lightbulb size={15} aria-hidden="true" /> Tente dizer o nome antes de tocar. Cada toque revela uma etiqueta.
      </p>
      <Plate
        plate={plate}
        cover={cover}
        marks={sel ? { [sel.id]: "reveal" } : {}}
        highlight={sel?.id}
        onTap={(l) => {
          setOpen((o) => new Set(o).add(l.id));
          setSel(l);
        }}
      />
      <div className={`label-card ${sel ? "on" : ""}`} aria-live="polite">
        {sel ? (
          <>
            <strong>{sel.name}</strong>
            <span>{sel.fn ? sel.fn.charAt(0).toUpperCase() + sel.fn.slice(1) + "." : "A apostila não descreve a função desta estrutura."}</span>
            {sel.src && <Source src={sel.src} compact />}
          </>
        ) : (
          <span className="muted">Toque numa etiqueta escondida para ver o nome e a função.</span>
        )}
      </div>
      <div className="row-wrap">
        <Button variant="soft" icon={all ? EyeOff : Eye} onClick={() => (all ? (setOpen(new Set()), setSel(null)) : setOpen(new Set(plate.labels.map((l) => l.id))))}>
          {all ? "Esconder todas" : "Mostrar todas"}
        </Button>
        <Button icon={Search} onClick={onQuiz}>
          Me testar
        </Button>
      </div>
    </div>
  );
}

function Drill({ plate, mode }) {
  const { content, answer, atlasResult } = useApp();
  const names = useMemo(() => shuffle(plateNames(plate)), [plate]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null); // {id?, name}
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);
  const target = names[i];
  const targetLabel = plate.labels.find((l) => l.name === target);
  const options = useMemo(() => shuffle([target, ...shuffle(names.filter((n) => n !== target)).slice(0, 3)]), [target, round]); // eslint-disable-line
  const ok = picked ? picked.name === target : null;

  const choose = (p) => {
    if (picked) return;
    setPicked(p);
    const right = p.name === target;
    if (right) {
      setScore((s) => s + 1);
      burst();
    }
    const qid = content.spotFor[`${plate.id}|${target}`];
    if (qid) answer(qid, right, true);
  };
  const next = () => {
    if (i + 1 >= names.length) {
      setDone(true);
      const final = score;
      atlasResult({ plateId: plate.id, mode, score: final, total: names.length, allPlateIds: content.plates.map((p) => p.id) });
      if (final / names.length >= 0.9) bigBurst();
      return;
    }
    setI(i + 1);
    setPicked(null);
  };
  const restart = () => {
    setI(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    setRound((r) => r + 1);
  };

  if (done) {
    const ratio = score / names.length;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.4 ? 1 : 0;
    return (
      <div className="drill-end">
        <Stars n={stars} size={34} />
        <strong className="score-line tabnum">
          {score} de {names.length}
        </strong>
        <p className="muted">{stars === 3 ? "Olho clínico! Você conhece essa ilustração." : stars === 2 ? "Muito bem. Repita para fechar as 3 estrelas." : "Treine no modo Explorar e tente de novo."}</p>
        <Button icon={RotateCcw} onClick={restart}>
          Jogar de novo
        </Button>
      </div>
    );
  }

  const marks = {};
  if (picked) {
    plate.labels.filter((l) => l.name === target).forEach((l) => (marks[l.id] = "right"));
    if (picked.id && !ok) marks[picked.id] = "wrong";
  }
  return (
    <div className="drill">
      <div className="drill-top">
        <span className="drill-q">{mode === "tap" ? <>Onde está: <strong>{target}</strong>?</> : "Qual é a estrutura destacada?"}</span>
        <span className="muted small tabnum">
          {i + 1}/{names.length} · {score} ✓
        </span>
      </div>
      <Bar value={i / names.length} thin label="Progresso" />
      <Plate plate={plate} fit="42vh" zoomable={false} cover="all" highlight={mode === "name" && !picked ? targetLabel.id : null} marks={marks} onTap={mode === "tap" && !picked ? (l) => choose({ id: l.id, name: l.name }) : null} />
      {mode === "name" && (
        <div className="options options-grid">
          {options.map((n) => {
            const cls = picked ? (n === target ? "right" : picked.name === n ? "wrong" : "dim") : "";
            return (
              <button key={n} className={`option ${cls}`} onClick={() => choose({ name: n })} disabled={!!picked}>
                <span className="option-text">{n}</span>
                {picked && n === target && <Check size={18} className="option-mark" aria-hidden="true" />}
                {picked && picked.name === n && n !== target && <X size={18} className="option-mark" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
      {picked && (
        <div className={`feedback ${ok ? "ok" : "bad"}`} role="status">
          <div className="feedback-head">
            {ok ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
            <strong>{ok ? "Isso!" : `É ${target}`}</strong>
          </div>
          {targetLabel.fn && (
            <p className="feedback-expl-plain">
              <strong>{target}:</strong> {targetLabel.fn}.
            </p>
          )}
          <div className="row-wrap">
            <Button icon={ArrowRight} onClick={next}>
              {i + 1 >= names.length ? "Ver resultado" : "Próxima"}
            </Button>
            {targetLabel.src && <Source src={targetLabel.src} compact />}
          </div>
        </div>
      )}
    </div>
  );
}

function Flash({ plate }) {
  const { content, answer, atlasResult, progress } = useApp();
  const names = useMemo(() => plateNames(plate), [plate]);
  const [state, setState] = useState("idle"); // idle | run | end
  const [left, setLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [miss, setMiss] = useState(0);
  const [cur, setCur] = useState(null); // {name, mode}
  const [flashMark, setFlashMark] = useState(null);
  const scoreRef = useRef(0);
  const best = progress.atlas?.[plate.id]?.flash || 0;

  const nextPrompt = () => {
    const name = names[(Math.random() * names.length) | 0];
    setCur({ name, mode: Math.random() < 0.5 ? "tap" : "name", opts: shuffle([name, ...shuffle(names.filter((n) => n !== name)).slice(0, 3)]) });
    setFlashMark(null);
  };
  const start = () => {
    setScore(0);
    scoreRef.current = 0;
    setMiss(0);
    setLeft(60);
    setState("run");
    nextPrompt();
  };
  useEffect(() => {
    if (state !== "run") return;
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [state]);
  useEffect(() => {
    if (state === "run" && left <= 0) {
      setState("end");
      atlasResult({ plateId: plate.id, mode: "flash", score: scoreRef.current, total: 0, allPlateIds: content.plates.map((p) => p.id) });
      if (scoreRef.current > best && scoreRef.current > 0) bigBurst();
    }
  }, [left, state]); // eslint-disable-line

  const pick = (name, id) => {
    if (!cur || flashMark) return;
    const ok = name === cur.name;
    const qid = content.spotFor[`${plate.id}|${cur.name}`];
    if (qid) answer(qid, ok, true);
    if (ok) {
      scoreRef.current++;
      setScore(scoreRef.current);
    } else setMiss((m) => m + 1);
    setFlashMark({ ok, id });
    setTimeout(nextPrompt, ok ? 350 : 900);
  };

  if (state === "idle" || state === "end")
    return (
      <div className="drill-end">
        <span className="flash-icon">
          <Zap size={30} aria-hidden="true" />
        </span>
        {state === "end" ? (
          <>
            <strong className="score-line tabnum">{score} acertos</strong>
            <p className="muted">
              {score > best ? "Novo recorde!" : `Recorde: ${best}`} · {miss} erros
            </p>
          </>
        ) : (
          <>
            <strong className="score-line">60 segundos</strong>
            <p className="muted">Acerte o máximo de estruturas. As perguntas misturam “qual é?” e “onde está?”.</p>
          </>
        )}
        <Button icon={state === "end" ? RotateCcw : Zap} onClick={start}>
          {state === "end" ? "Jogar de novo" : "Começar"}
        </Button>
      </div>
    );

  const tl = plate.labels.find((l) => l.name === cur.name);
  const marks = {};
  if (flashMark) {
    plate.labels.filter((l) => l.name === cur.name).forEach((l) => (marks[l.id] = "right"));
    if (!flashMark.ok && flashMark.id) marks[flashMark.id] = "wrong";
  }
  return (
    <div className="drill">
      <div className="flash-bar">
        <span className={`timer ${left <= 10 ? "warn" : ""}`}>
          <Timer size={16} aria-hidden="true" /> <span className="tabnum">{left}s</span>
        </span>
        <span className="flash-score tabnum">
          <Check size={16} aria-hidden="true" /> {score}
        </span>
      </div>
      <span className="drill-q">{cur.mode === "tap" ? <>Toque em: <strong>{cur.name}</strong></> : "Qual é a destacada?"}</span>
      <Plate
        plate={plate}
        cover="all"
        fit="42vh"
        zoomable={false}
        highlight={cur.mode === "name" && !flashMark ? tl.id : null}
        marks={marks}
        onTap={cur.mode === "tap" && !flashMark ? (l) => pick(l.name, l.id) : null}
      />
      {cur.mode === "name" && (
        <div className="options options-grid">
          {cur.opts.map((n) => (
            <button key={n} className={`option ${flashMark ? (n === cur.name ? "right" : "dim") : ""}`} onClick={() => pick(n)} disabled={!!flashMark}>
              <span className="option-text">{n}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
