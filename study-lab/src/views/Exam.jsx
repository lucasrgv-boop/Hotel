import React, { useEffect, useMemo, useState } from "react";
import { Timer, Play, Flag, ChevronLeft, ChevronRight, Check, AlertTriangle, RotateCcw, Trophy, X, Sparkles } from "lucide-react";
import { useApp } from "../state.jsx";
import { Button, PageHead, Empty, Bar, Segmented, Badge } from "../components/ui.jsx";
import { Question, makeOrder, grade, isAnswered } from "../components/Question.jsx";
import { shuffle, formatTime, pct, uid } from "../lib/util.js";
import { aiAvailable, askJson, errorCopy } from "../lib/ai.js";
import { DemoBanner } from "./Dashboard.jsx";

export default function Exam() {
  const { content, progress, params, setLast } = useApp();
  const st = progress.examState;
  const running = st && st.status === "running" && st.qids.every((id) => content.byQuestion[id]);
  useEffect(() => setLast({ route: "simulado", params: {}, label: "Simulado" }), []); // eslint-disable-line

  if (!content.questions.length)
    return (
      <div className="page">
        <PageHead title="Simulado" />
        <Empty icon={Timer} title="Nenhuma questão ainda">
          O simulado usa as questões criadas a partir dos seus materiais.
        </Empty>
      </div>
    );
  if (running) return <Running st={st} />;
  if (st && st.status === "grading") return <Results st={st} />;
  return <Config final={params.final} />;
}

function Config({ final }) {
  const { content, setExamState, progress } = useApp();
  const all = content.questions;
  const [topics, setTopics] = useState(content.topics.map((t) => t.id));
  const [count, setCount] = useState(final ? Math.min(30, all.length) : Math.min(10, all.length));
  const [withOpen, setWithOpen] = useState(true);
  const [timeMode, setTimeMode] = useState("auto");
  const [minutes, setMinutes] = useState(20);
  const pool = all.filter((q) => topics.includes(q.topicId) && (withOpen || q.type !== "open"));
  const n = Math.min(count, pool.length);
  const autoSec = useMemo(() => {
    const avg = pool.length ? pool.reduce((s, q) => s + (q.type === "open" ? 180 : q.type === "match" ? 120 : 75), 0) / pool.length : 75;
    return Math.ceil((avg * n) / 60) * 60;
  }, [pool, n]);
  const duration = timeMode === "auto" ? autoSec : minutes * 60;
  const last = progress.exams[0];

  const start = () => {
    // Sorteio equilibrado entre os assuntos escolhidos.
    const byTopic = {};
    shuffle(pool).forEach((q) => (byTopic[q.topicId] = byTopic[q.topicId] || []).push(q));
    const picked = [];
    const keys = shuffle(Object.keys(byTopic));
    while (picked.length < n) {
      let added = false;
      for (const k of keys) {
        const q = byTopic[k].shift();
        if (q && picked.length < n) {
          picked.push(q);
          added = true;
        }
      }
      if (!added) break;
    }
    const qs = shuffle(picked);
    setExamState({
      id: uid("exam"),
      status: "running",
      final: !!final,
      qids: qs.map((q) => q.id),
      orders: Object.fromEntries(qs.map((q) => [q.id, makeOrder(q)])),
      responses: {},
      flags: {},
      cur: 0,
      startedAt: Date.now(),
      duration,
    });
  };

  return (
    <div className="page narrow">
      {content.showingDemo && <DemoBanner />}
      <PageHead eyebrow={final ? "Etapa final da preparação" : "Condição de prova"} title={final ? "Simulado geral" : "Simulado"}>
        Cronômetro, questões e alternativas embaralhadas e nenhuma resposta durante a prova. A correção comentada aparece quando você finalizar.
      </PageHead>
      <div className="form-card">
        <fieldset className="field">
          <legend>Assuntos</legend>
          <div className="chips">
            <label className={`chip ${topics.length === content.topics.length ? "on" : ""}`}>
              <input id="exam-all" type="checkbox" checked={topics.length === content.topics.length} onChange={(e) => setTopics(e.target.checked ? content.topics.map((t) => t.id) : [])} />
              Todos
            </label>
            {content.topics.map((t) => {
              const on = topics.includes(t.id);
              return (
                <label key={t.id} className={`chip ${on ? "on" : ""}`}>
                  <input id={`exam-t-${t.id}`} type="checkbox" checked={on} onChange={() => setTopics((ts) => (on ? ts.filter((x) => x !== t.id) : [...ts, t.id]))} />
                  {t.title}
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="field-row">
          <div className="field">
            <label htmlFor="exam-count">Questões</label>
            <select id="exam-count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[5, 10, 15, 20, 30, 40, 60].filter((x) => x < pool.length).map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
              <option value={pool.length}>Todas ({pool.length})</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="exam-time">Tempo</label>
            <div className="inline-fields">
              <select id="exam-time" value={timeMode} onChange={(e) => setTimeMode(e.target.value)}>
                <option value="auto">Automático ({Math.round(autoSec / 60)} min)</option>
                <option value="custom">Definir minutos</option>
              </select>
              {timeMode === "custom" && (
                <input id="exam-minutes" type="number" min={1} max={300} value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} aria-label="Minutos" />
              )}
            </div>
          </div>
        </div>
        <label className="switch">
          <input id="exam-open" type="checkbox" checked={withOpen} onChange={(e) => setWithOpen(e.target.checked)} />
          <span className="switch-ui" aria-hidden="true" />
          <span>Incluir perguntas abertas (você corrige no final, comparando com a resposta esperada)</span>
        </label>
        <div className="form-foot">
          <span className="muted small">
            {n} questões · {formatTime(duration)}
          </span>
          <Button icon={Play} onClick={start} disabled={!n}>
            Iniciar simulado
          </Button>
        </div>
      </div>
      {last && (
        <div className="last-exam">
          <span className="muted small">Último simulado</span>
          <strong className="tabnum">Nota {last.grade.toFixed(1)}</strong>
          <span className="muted small tabnum">
            {last.correct}/{last.total} · {new Date(last.at).toLocaleDateString("pt-BR")}
          </span>
        </div>
      )}
    </div>
  );
}

function useClock(st) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, st.duration - (now - st.startedAt) / 1000);
}

function Running({ st }) {
  const { content, setExamState } = useApp();
  const left = useClock(st);
  const [confirm, setConfirm] = useState(false);
  const qs = st.qids.map((id) => content.byQuestion[id]);
  const cur = Math.min(st.cur || 0, qs.length - 1);
  const q = qs[cur];
  const answered = qs.filter((x) => isAnswered(x, st.responses[x.id])).length;

  const patch = (p) => setExamState({ ...st, ...p });
  const finish = () => setExamState({ ...st, status: "grading", endedAt: Date.now() });

  useEffect(() => {
    if (left <= 0) finish();
  }, [left <= 0]); // eslint-disable-line

  return (
    <div className="page exam">
      <div className="exam-bar">
        <div className={`timer ${left < 120 ? "warn" : ""}`} role="timer" aria-label="Tempo restante">
          <Timer size={16} aria-hidden="true" />
          <span className="tabnum">{formatTime(left)}</span>
        </div>
        <div className="exam-progress">
          <span className="muted small tabnum">
            {answered}/{qs.length} respondidas
          </span>
          <Bar value={answered / qs.length} thin label="Questões respondidas" />
        </div>
        <Button variant="soft" size="sm" icon={Check} onClick={() => setConfirm(true)}>
          Finalizar
        </Button>
      </div>

      {confirm && (
        <div className="confirm" role="alertdialog" aria-label="Finalizar simulado">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Finalizar o simulado?</strong>
            <span>{answered < qs.length ? `${qs.length - answered} questões sem resposta contam como erro.` : "Todas as questões foram respondidas."}</span>
          </div>
          <div className="row-wrap">
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
              Continuar a prova
            </Button>
            <Button size="sm" onClick={finish}>
              Finalizar e ver a nota
            </Button>
          </div>
        </div>
      )}

      <Question
        key={q.id}
        q={q}
        mode="exam"
        order={st.orders[q.id]}
        response={st.responses[q.id]}
        index={cur}
        total={qs.length}
        onChange={(r) => patch({ responses: { ...st.responses, [q.id]: r } })}
      />

      <div className="exam-nav">
        <Button variant="ghost" icon={ChevronLeft} onClick={() => patch({ cur: cur - 1 })} disabled={cur === 0}>
          Anterior
        </Button>
        <button className={`flag-btn ${st.flags[q.id] ? "on" : ""}`} onClick={() => patch({ flags: { ...st.flags, [q.id]: !st.flags[q.id] } })} aria-pressed={!!st.flags[q.id]}>
          <Flag size={15} aria-hidden="true" /> {st.flags[q.id] ? "Marcada para revisar" : "Marcar para revisar"}
        </button>
        {cur < qs.length - 1 ? (
          <Button icon={ChevronRight} onClick={() => patch({ cur: cur + 1 })}>
            Próxima
          </Button>
        ) : (
          <Button icon={Check} onClick={() => setConfirm(true)}>
            Finalizar
          </Button>
        )}
      </div>

      <div className="navigator" aria-label="Ir para a questão">
        {qs.map((x, i) => (
          <button
            key={x.id}
            className={`${i === cur ? "cur" : ""} ${isAnswered(x, st.responses[x.id]) ? "ans" : ""} ${st.flags[x.id] ? "flag" : ""}`}
            onClick={() => patch({ cur: i })}
            aria-label={`Questão ${i + 1}${isAnswered(x, st.responses[x.id]) ? ", respondida" : ""}${st.flags[x.id] ? ", marcada" : ""}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function scoreOf(q, r) {
  if (q.type === "open") {
    const v = r?.verdict;
    return v === "correct" ? 1 : v === "partial" ? 0.5 : 0;
  }
  return grade(q, r) ? 1 : 0;
}

function Results({ st }) {
  const { content, setExamState, finishExam, answer, go, progress } = useApp();
  const qs = st.qids.map((id) => content.byQuestion[id]).filter(Boolean);
  const [responses, setResponses] = useState(st.responses);
  const pendingOpen = qs.filter((q) => q.type === "open" && isAnswered(q, responses[q.id]) && !responses[q.id]?.verdict);
  const recorded = progress.exams.find((e) => e.id === st.id);
  const [filter, setFilter] = useState("all");

  const totals = useMemo(() => {
    let pts = 0;
    let right = 0;
    const byTopic = {};
    qs.forEach((q) => {
      const s = scoreOf(q, responses[q.id]);
      pts += s;
      if (s === 1) right++;
      const t = (byTopic[q.topicId] = byTopic[q.topicId] || { pts: 0, total: 0 });
      t.pts += s;
      t.total++;
    });
    return { pts, right, byTopic, grade: qs.length ? Math.round((pts / qs.length) * 100) / 10 : 0 };
  }, [qs, responses]);

  const record = () => {
    if (recorded) return;
    qs.forEach((q) => answer(q.id, scoreOf(q, responses[q.id]) === 1, true));
    finishExam({
      id: st.id,
      at: Date.now(),
      final: st.final,
      total: qs.length,
      correct: totals.right,
      points: totals.pts,
      grade: totals.grade,
      seconds: Math.round(((st.endedAt || Date.now()) - st.startedAt) / 1000),
      byTopic: totals.byTopic,
    });
    setExamState({ ...st, responses });
  };

  useEffect(() => {
    if (!pendingOpen.length && !recorded) record();
  }, [pendingOpen.length]); // eslint-disable-line

  if (pendingOpen.length)
    return (
      <div className="page narrow">
        <PageHead eyebrow="Antes da nota" title="Corrija suas respostas abertas">
          Compare o que você escreveu com a resposta esperada, que vem do material, e avalie com sinceridade.
        </PageHead>
        {pendingOpen.map((q) => (
          <OpenGrade key={q.id} q={q} r={responses[q.id]} onGrade={(v) => setResponses((rs) => ({ ...rs, [q.id]: { ...rs[q.id], verdict: v } }))} />
        ))}
      </div>
    );

  const percent = pct(totals.pts, qs.length);
  const topicRows = Object.entries(totals.byTopic)
    .map(([id, t]) => ({ id, title: content.byTopic[id]?.title || "Assunto", ratio: t.pts / t.total, ...t }))
    .sort((a, b) => a.ratio - b.ratio);
  const hard = topicRows.filter((t) => t.ratio < 0.7);
  const shown = qs.filter((q) => filter === "all" || scoreOf(q, responses[q.id]) < 1);
  const tone = totals.grade >= 7 ? "good" : totals.grade >= 5 ? "mid" : "bad";
  const used = Math.round(((st.endedAt || Date.now()) - st.startedAt) / 1000);

  return (
    <div className="page">
      <section className={`result-hero tone-${tone}`}>
        <div className="result-grade">
          <span className="label">Nota</span>
          <strong className="tabnum">{totals.grade.toFixed(1)}</strong>
          <span className="muted small">de 10</span>
        </div>
        <div className="result-stats">
          <div>
            <span className="tabnum">{percent}%</span>
            <small>de acertos</small>
          </div>
          <div>
            <span className="tabnum">
              {totals.right}/{qs.length}
            </span>
            <small>questões certas</small>
          </div>
          <div>
            <span className="tabnum">{formatTime(used)}</span>
            <small>tempo usado</small>
          </div>
        </div>
        <p className="result-msg">
          {totals.grade >= 9
            ? "Excelente. Você está pronto para a prova."
            : totals.grade >= 7
            ? "Bom resultado. Reforce os assuntos abaixo e você chega ainda mais forte."
            : totals.grade >= 5
            ? "Está no caminho. Foque nos assuntos com mais dificuldade e refaça o simulado."
            : "Ainda há lacunas importantes. Volte à preparação dos assuntos abaixo; cada revisão conta."}
        </p>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h2>Desempenho por assunto</h2>
          </div>
          <ul className="topic-perf">
            {topicRows.map((t) => (
              <li key={t.id}>
                <div className="topic-perf-top">
                  <span>{t.title}</span>
                  <span className="tabnum">
                    {Math.round(t.ratio * 100)}% <small className="muted">({t.pts}/{t.total})</small>
                  </span>
                </div>
                <Bar value={t.ratio} thin tone={t.ratio >= 0.7 ? "good" : t.ratio >= 0.5 ? "mid" : "bad"} label={`Desempenho em ${t.title}`} />
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Onde você teve mais dificuldade</h2>
          </div>
          {hard.length ? (
            <ul className="hard-list">
              {hard.map((t) => (
                <li key={t.id}>
                  <span>{t.title}</span>
                  <div className="row-wrap">
                    <Button size="sm" variant="soft" onClick={() => go("preparacao", { topicId: t.id })}>
                      Estudar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => go("quiz", { topicId: t.id })}>
                      Quiz
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              <Trophy size={15} aria-hidden="true" /> Nenhum assunto abaixo de 70%.
            </p>
          )}
          <div className="row-wrap end-actions">
            <Button icon={RotateCcw} onClick={() => setExamState(null)}>
              Novo simulado
            </Button>
            <Button variant="ghost" onClick={() => go("revisao")}>
              Ir para a revisão
            </Button>
          </div>
        </section>
      </div>

      <section className="corrections">
        <div className="panel-head">
          <h2>Correção comentada</h2>
          <Segmented
            label="Filtro"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Todas", count: qs.length },
              { value: "wrong", label: "Erradas", count: qs.filter((q) => scoreOf(q, responses[q.id]) < 1).length },
            ]}
          />
        </div>
        {shown.map((q) => {
          const i = qs.indexOf(q);
          const s = scoreOf(q, responses[q.id]);
          return (
            <div key={q.id} className="correction">
              <div className="correction-head">
                <span className="tabnum">Questão {i + 1}</span>
                {s === 1 ? <Badge tone="good">Certa</Badge> : s === 0.5 ? <Badge tone="mid">Parcial</Badge> : !isAnswered(q, responses[q.id]) ? <Badge tone="bad">Sem resposta</Badge> : <Badge tone="bad">Errada</Badge>}
              </div>
              <Question q={q} mode="review" order={st.orders[q.id]} response={responses[q.id] ?? null} compact />
            </div>
          );
        })}
      </section>
    </div>
  );
}

function OpenGrade({ q, r, onGrade }) {
  const { content } = useApp();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const ai = async () => {
    setBusy(true);
    try {
      const chunk = content.byMaterial[q.src?.m]?.chunks.find((c) => String(c.page) === String(q.src?.p));
      const d = await askJson(
        `Corrija a resposta do estudante usando SOMENTE a resposta modelo e o trecho do material. Em português do Brasil.
Pergunta: ${q.prompt}
Resposta modelo: ${q.answer}
${chunk ? "Trecho: " + chunk.text.slice(0, 2500) : ""}
Resposta do estudante: ${r?.text || ""}
Responda só com JSON: {"verdict":"correct"|"partial"|"incorrect","feedback":"2 a 3 frases"}`,
        { modelTier: "quick", cache: false }
      );
      setNote(String(d?.feedback || ""));
      onGrade(["correct", "partial", "incorrect"].includes(d?.verdict) ? d.verdict : "partial");
    } catch (e) {
      setNote(errorCopy(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="open-grade">
      <p className="q-prompt">{q.prompt}</p>
      <div className="og-cols">
        <div>
          <div className="label">Sua resposta</div>
          <p>{r?.text}</p>
        </div>
        <div>
          <div className="label">Resposta esperada</div>
          <p>{q.answer}</p>
        </div>
      </div>
      {note && <p className="ai-note">{note}</p>}
      <div className="row-wrap">
        <Button variant="good" size="sm" icon={Check} onClick={() => onGrade("correct")}>
          Acertei
        </Button>
        <Button variant="soft" size="sm" onClick={() => onGrade("partial")}>
          Em parte
        </Button>
        <Button variant="bad" size="sm" icon={X} onClick={() => onGrade("incorrect")}>
          Errei
        </Button>
        {aiAvailable() && (
          <Button variant="ghost" size="sm" icon={Sparkles} onClick={ai} disabled={busy}>
            {busy ? "Corrigindo…" : "Corrigir com o professor"}
          </Button>
        )}
      </div>
    </div>
  );
}
