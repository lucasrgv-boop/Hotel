import React, { useEffect, useMemo, useState } from "react";
import { Check, X, RotateCcw, Lightbulb, MessageCircleQuestion, Sparkles, Eye } from "lucide-react";
import { Button, Badge, Source, Rich } from "./ui.jsx";
import { useApp } from "../state.jsx";
import { TYPE_LABEL } from "../lib/content.js";
import { answerMatches, shuffle } from "../lib/util.js";
import { cheer } from "../lib/progress.js";
import { aiAvailable, askJson, errorCopy } from "../lib/ai.js";
import { Plate } from "./Plate.jsx";
import { burst } from "./fx.js";

// Ordem embaralhada estável das alternativas/itens de uma questão.
export function makeOrder(q) {
  if (q.type === "mcq") return shuffle(q.options.map((_, i) => i));
  if (q.type === "match") return shuffle(q.pairs.map((_, i) => i));
  if (q.type === "order") {
    let o = shuffle(q.items.map((_, i) => i));
    if (o.every((v, i) => v === i) && o.length > 1) o = [...o.slice(1), o[0]];
    return o;
  }
  if (q.type === "spot" && q.ask !== "tap") return shuffle([q.targetName, ...shuffle(q.names.filter((n) => n !== q.targetName)).slice(0, 3)]);
  return null;
}

// Corrige uma resposta. Devolve true/false, ou null quando ainda não há correção (aberta).
export function grade(q, r) {
  if (r == null) return false;
  switch (q.type) {
    case "mcq":
      return r === q.answer;
    case "tf":
      return r === q.answer;
    case "cloze":
      return answerMatches(r, q.answer);
    case "match":
      return q.pairs.every((_, i) => r[i] === i);
    case "open":
      return r?.verdict ? r.verdict === "correct" : null;
    case "order":
      return r.length === q.items.length && r.every((v, i) => v === i);
    case "spot":
      return r?.name === q.targetName;
    default:
      return false;
  }
}

export function isAnswered(q, r) {
  if (r == null) return false;
  if (q.type === "cloze") return String(r).trim().length > 0;
  if (q.type === "match") return q.pairs.every((_, i) => r[i] != null);
  if (q.type === "open") return String(r?.text || "").trim().length > 0;
  if (q.type === "order") return r.length === q.items.length;
  return true;
}

export function correctText(q) {
  switch (q.type) {
    case "mcq":
      return q.options[q.answer];
    case "tf":
      return q.answer ? "Verdadeiro" : "Falso";
    case "cloze":
      return Array.isArray(q.answer) ? q.answer[0] : q.answer;
    case "match":
      return q.pairs.map((p) => `${p.left} → ${p.right}`).join(" · ");
    case "open":
      return q.answer;
    case "order":
      return q.items.join(" → ");
    case "spot":
      return q.targetName;
    default:
      return "";
  }
}

export function responseText(q, r) {
  if (r == null) return "Sem resposta";
  switch (q.type) {
    case "mcq":
      return q.options[r] ?? "Sem resposta";
    case "tf":
      return r ? "Verdadeiro" : "Falso";
    case "cloze":
      return String(r) || "Sem resposta";
    case "match":
      return q.pairs.map((p, i) => `${p.left} → ${r[i] != null ? q.pairs[r[i]].right : "—"}`).join(" · ");
    case "open":
      return r?.text || "Sem resposta";
    case "order":
      return r.map((i) => q.items[i]).join(" → ") || "Sem resposta";
    case "spot":
      return r?.name || "Sem resposta";
    default:
      return "";
  }
}

// Montar a sequência tocando nos itens.
function OrderBuilder({ q, order, value, onChange, locked, showFeedback }) {
  const seq = value || [];
  const pool = order.filter((i) => !seq.includes(i));
  return (
    <div className="order">
      <ol className="order-seq" aria-label="Sua sequência">
        {q.items.map((_, k) => {
          const v = seq[k];
          const st = showFeedback ? (v === k ? "right" : "wrong") : "";
          return (
            <li key={k} className={`order-slot ${v != null ? "filled" : ""} ${st}`}>
              <span className="order-n">{k + 1}</span>
              {v != null ? (
                <button className="order-chip" disabled={locked} onClick={() => onChange(seq.filter((x) => x !== v))}>
                  {q.items[v]}
                </button>
              ) : (
                <span className="order-empty">{k === seq.length && !locked ? "toque abaixo" : ""}</span>
              )}
              {showFeedback && v !== k && <span className="order-fix">{q.items[k]}</span>}
            </li>
          );
        })}
      </ol>
      {!locked && pool.length > 0 && (
        <div className="order-pool">
          {pool.map((i) => (
            <button key={i} className="order-chip pool" onClick={() => onChange([...seq, i])}>
              {q.items[i]}
            </button>
          ))}
        </div>
      )}
      {!locked && seq.length > 0 && (
        <button className="link-btn" onClick={() => onChange([])}>
          Limpar sequência
        </button>
      )}
    </div>
  );
}

function SpotQuestion({ q, order, value, onChange, locked, showFeedback }) {
  const { content } = useApp();
  const plate = content.byPlate[q.plate];
  const marks = {};
  if (showFeedback) {
    plate.labels.forEach((l) => {
      if (l.name === q.targetName) marks[l.id] = "right";
    });
    if (value?.id && value.name !== q.targetName) marks[value.id] = "wrong";
  } else if (value?.id) marks[value.id] = "sel";
  if (q.ask === "tap")
    return (
      <Plate
        plate={plate}
        fit="48vh"
        zoomable={false}
        cover="all"
        marks={marks}
        onTap={locked ? null : (l) => onChange({ id: l.id, name: l.name })}
        caption={showFeedback ? null : "Toque numa etiqueta escondida"}
      />
    );
  return (
    <>
      <Plate plate={plate} fit="42vh" zoomable={false} cover="all" highlight={showFeedback ? null : q.label} marks={showFeedback ? marks : {}} />
      <div className="options options-grid" role="radiogroup" aria-label="Alternativas">
        {order.map((name) => {
          const sel = value?.name === name;
          const isAns = name === q.targetName;
          const cls = showFeedback ? (isAns ? "right" : sel ? "wrong" : "dim") : sel ? "sel" : "";
          return (
            <button key={name} role="radio" aria-checked={sel} className={`option ${cls}`} onClick={() => onChange({ name })} disabled={locked}>
              <span className="option-text">{name}</span>
              {showFeedback && isAns && <Check size={18} className="option-mark" aria-label="Correta" />}
              {showFeedback && sel && !isAns && <X size={18} className="option-mark" aria-label="Sua resposta" />}
            </button>
          );
        })}
      </div>
    </>
  );
}

function ClozePrompt({ prompt, value, onChange, disabled, onEnter, state }) {
  const parts = prompt.split(/_{3,}/);
  return (
    <p className="q-prompt cloze">
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {p}
          {i < parts.length - 1 && i === 0 && (
            <input
              id="cloze-input"
              className={`cloze-input ${state || ""}`}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
              disabled={disabled}
              aria-label="Complete a lacuna"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck="false"
              size={Math.max(8, (value || "").length + 2)}
            />
          )}
          {i < parts.length - 1 && i > 0 && <span className="cloze-gap">____</span>}
        </React.Fragment>
      ))}
    </p>
  );
}

// Modo "practice": corrige na hora, explica e permite tentar de novo.
// Modo "exam": só registra a resposta (onChange), sem mostrar correção.
// Modo "review": mostra a resposta dada e a correção, sem interação.
export function Question({ q, mode = "practice", order: orderProp, response: respProp, onChange, onResult, onNext, nextLabel = "Próxima", index, total, compact }) {
  const { content, openTutor } = useApp();
  const order = useMemo(() => orderProp || makeOrder(q), [q.id, orderProp]); // eslint-disable-line
  const [resp, setResp] = useState(respProp ?? null);
  const [checked, setChecked] = useState(mode === "review");
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");
  const [openStage, setOpenStage] = useState("write"); // write | reveal | graded
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");

  useEffect(() => {
    setResp(respProp ?? null);
    setChecked(mode === "review");
    setAttempts(0);
    setResult(mode === "review" ? grade(q, respProp) : null);
    setMsg("");
    setOpenStage(mode === "review" ? "graded" : "write");
    setAiNote("");
  }, [q.id]); // eslint-disable-line

  const exam = mode === "exam";
  const review = mode === "review";
  const locked = checked || review;

  const update = (r) => {
    if (locked) return;
    setResp(r);
    if (exam) onChange?.(r);
  };

  const finish = (ok) => {
    setChecked(true);
    setResult(ok);
    setMsg(cheer(ok));
    if (ok) burst();
    onResult?.(ok, attempts === 0, resp);
    setAttempts((a) => a + 1);
  };

  const finishWith = (r) => {
    setChecked(true);
    const ok = grade(q, r);
    setResult(ok);
    setMsg(cheer(ok));
    if (ok) burst();
    onResult?.(ok, attempts === 0, r);
    setAttempts((a) => a + 1);
  };

  const check = () => {
    if (!isAnswered(q, resp)) return;
    if (q.type === "open") {
      setOpenStage("reveal");
      return;
    }
    finish(grade(q, resp));
  };

  const selfGrade = (verdict) => {
    const r = { ...(resp || {}), verdict };
    setResp(r);
    setOpenStage("graded");
    if (exam) onChange?.(r);
    else finish(verdict === "correct");
  };

  const aiGrade = async () => {
    setAiBusy(true);
    setAiNote("");
    try {
      const chunk = content.byMaterial[q.src?.m]?.chunks.find((c) => String(c.page) === String(q.src?.p));
      const data = await askJson(
        `Você corrige a resposta de um estudante usando SOMENTE a resposta modelo e o trecho do material. Seja justo e didático, em português do Brasil.
Pergunta: ${q.prompt}
Resposta modelo: ${q.answer}
${q.keyPoints?.length ? "Pontos-chave: " + q.keyPoints.join("; ") : ""}
${chunk ? "Trecho do material: " + chunk.text.slice(0, 2500) : ""}
Resposta do estudante: ${resp?.text || ""}
Responda só com JSON: {"verdict":"correct"|"partial"|"incorrect","feedback":"2 a 4 frases: o que acertou, o que faltou, como melhorar"}`,
        { modelTier: "quick", cache: false }
      );
      const verdict = ["correct", "partial", "incorrect"].includes(data?.verdict) ? data.verdict : "partial";
      setAiNote(String(data?.feedback || ""));
      selfGrade(verdict);
    } catch (e) {
      setAiNote(errorCopy(e));
    } finally {
      setAiBusy(false);
    }
  };

  const retry = () => {
    setChecked(false);
    setResult(null);
    setMsg("");
    setResp(null);
    setOpenStage("write");
    setAiNote("");
  };

  const showFeedback = !exam && (checked || review);
  const verdictOpen = resp?.verdict;

  return (
    <article className={`question ${compact ? "question-compact" : ""} ${showFeedback ? (result ? "is-right" : "is-wrong") : ""}`}>
      <div className="q-meta">
        <Badge tone="neutral">{TYPE_LABEL[q.type]}</Badge>
        {content.byTopic[q.topicId] && <span className="q-topic">{content.byTopic[q.topicId].title}</span>}
        {index != null && total != null && (
          <span className="q-count">
            {index + 1} de {total}
          </span>
        )}
      </div>

      {q.type === "cloze" ? (
        <ClozePrompt
          prompt={q.prompt}
          value={resp}
          onChange={update}
          disabled={locked}
          onEnter={check}
          state={showFeedback ? (result ? "right" : "wrong") : ""}
        />
      ) : (
        <p className="q-prompt">{q.prompt}</p>
      )}

      {q.type === "order" && (
        <OrderBuilder q={q} order={order} value={resp} onChange={update} locked={locked} showFeedback={showFeedback} />
      )}

      {q.type === "spot" && (
        <SpotQuestion
          q={q}
          order={order}
          value={resp}
          locked={locked}
          showFeedback={showFeedback}
          onChange={(r) => {
            if (locked) return;
            setResp(r);
            if (exam) onChange?.(r);
            else {
              // Identificação corrige na hora, sem precisar de botão.
              setTimeout(() => finishWith(r), 0);
            }
          }}
        />
      )}

      {q.type === "mcq" && (
        <div className="options" role="radiogroup" aria-label="Alternativas">
          {order.map((oi, k) => {
            const sel = resp === oi;
            const isAns = oi === q.answer;
            const cls = showFeedback ? (isAns ? "right" : sel ? "wrong" : "dim") : sel ? "sel" : "";
            return (
              <button key={oi} role="radio" aria-checked={sel} className={`option ${cls}`} onClick={() => update(oi)} disabled={locked}>
                <span className="option-key">{String.fromCharCode(65 + k)}</span>
                <span className="option-text">{q.options[oi]}</span>
                {showFeedback && isAns && <Check size={18} className="option-mark" aria-label="Correta" />}
                {showFeedback && sel && !isAns && <X size={18} className="option-mark" aria-label="Sua resposta" />}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "tf" && (
        <div className="tf" role="radiogroup" aria-label="Verdadeiro ou falso">
          {[true, false].map((v) => {
            const sel = resp === v;
            const cls = showFeedback ? (v === q.answer ? "right" : sel ? "wrong" : "dim") : sel ? "sel" : "";
            return (
              <button key={String(v)} role="radio" aria-checked={sel} className={`option tf-option ${cls}`} onClick={() => update(v)} disabled={locked}>
                {v ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
                <span>{v ? "Verdadeiro" : "Falso"}</span>
              </button>
            );
          })}
        </div>
      )}

      {q.type === "match" && (
        <div className="match">
          {q.pairs.map((p, i) => {
            const val = resp?.[i];
            const ok = showFeedback ? val === i : null;
            return (
              <div key={i} className={`match-row ${ok === true ? "right" : ok === false ? "wrong" : ""}`}>
                <span className="match-left">{p.left}</span>
                <select
                  id={`match-${q.id}-${i}`}
                  value={val ?? ""}
                  onChange={(e) => update({ ...(resp || {}), [i]: e.target.value === "" ? null : Number(e.target.value) })}
                  disabled={locked}
                  aria-label={`Associação para ${p.left}`}
                >
                  <option value="">Escolha…</option>
                  {order.map((ri) => (
                    <option key={ri} value={ri}>
                      {q.pairs[ri].right}
                    </option>
                  ))}
                </select>
                {showFeedback && ok === false && <span className="match-fix">Correto: {p.right}</span>}
              </div>
            );
          })}
        </div>
      )}

      {q.type === "open" && (
        <div className="open">
          <textarea
            id={`open-${q.id}`}
            value={resp?.text || ""}
            onChange={(e) => update({ ...(resp || {}), text: e.target.value, verdict: undefined })}
            placeholder="Escreva sua resposta com suas palavras…"
            rows={4}
            disabled={locked || openStage !== "write"}
          />
          {(openStage !== "write" || review) && (
            <div className="model-answer">
              <div className="label">Resposta esperada (segundo o material)</div>
              <p>{q.answer}</p>
              {q.keyPoints?.length > 0 && (
                <ul className="keypoints">
                  {q.keyPoints.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              )}
              {aiNote && (
                <div className="ai-note">
                  <Sparkles size={14} aria-hidden="true" /> {aiNote}
                </div>
              )}
              {openStage === "reveal" && !review && (
                <div className="selfgrade">
                  <span>Compare com a sua resposta. Como foi?</span>
                  <div className="row-wrap">
                    <Button variant="good" size="sm" icon={Check} onClick={() => selfGrade("correct")}>
                      Acertei
                    </Button>
                    <Button variant="soft" size="sm" onClick={() => selfGrade("partial")}>
                      Acertei em parte
                    </Button>
                    <Button variant="bad" size="sm" icon={X} onClick={() => selfGrade("incorrect")}>
                      Errei
                    </Button>
                    {aiAvailable() && (
                      <Button variant="ghost" size="sm" icon={Sparkles} onClick={aiGrade} disabled={aiBusy}>
                        {aiBusy ? "Corrigindo…" : "Corrigir com o professor"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showFeedback && (
        <div className={`feedback ${result ? "ok" : "bad"}`} role="status">
          <div className="feedback-head">
            {result ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
            <strong>{result ? "Você acertou" : q.type === "open" && verdictOpen === "partial" ? "Parcialmente correta" : "Não foi dessa vez"}</strong>
            {msg && <span className="feedback-msg">{msg}</span>}
          </div>
          {!result && q.type !== "open" && (
            <p className="feedback-answer">
              <span className="label">Resposta correta</span> {correctText(q)}
            </p>
          )}
          {q.explanation && (
            <div className="feedback-expl">
              <Lightbulb size={16} aria-hidden="true" />
              <Rich text={q.explanation} />
            </div>
          )}
          <div className="feedback-foot">
            <Source src={q.src} />
          </div>
        </div>
      )}

      {!exam && !review && (
        <div className="q-actions">
          {!checked && q.type !== "open" && q.type !== "spot" && (
            <Button onClick={check} disabled={!isAnswered(q, resp)} icon={Check}>
              Responder
            </Button>
          )}
          {!checked && q.type === "open" && openStage === "write" && (
            <Button onClick={check} disabled={!isAnswered(q, resp)} icon={Eye}>
              Ver resposta esperada
            </Button>
          )}
          {checked && !result && (
            <Button variant="soft" icon={RotateCcw} onClick={retry}>
              Tentar novamente
            </Button>
          )}
          {checked && onNext && <Button onClick={onNext}>{nextLabel}</Button>}
          <span className="spacer" />
          <Button variant="ghost" size="sm" icon={MessageCircleQuestion} onClick={() => openTutor({ topicId: q.topicId, seed: { question: q, response: resp } })}>
            Perguntar ao professor
          </Button>
        </div>
      )}
    </article>
  );
}

export function verdictLabel(v) {
  return v === "correct" ? "acertou" : v === "partial" ? "acertou em parte" : v === "incorrect" ? "errou" : "sem avaliação";
}
