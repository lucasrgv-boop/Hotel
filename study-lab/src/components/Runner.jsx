import React, { useState } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import { Question } from "./Question.jsx";
import { Bar, Button } from "./ui.jsx";
import { useApp } from "../state.jsx";
import { pct } from "../lib/util.js";

// Sequência de questões no modo treino. Registra cada resposta no progresso.
export function Runner({ questions, onDone, endActions, title }) {
  const { answer } = useApp();
  const [i, setI] = useState(0);
  const [results, setResults] = useState({}); // qid -> correct na 1ª tentativa
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);
  const [list, setList] = useState(questions);

  if (!list.length) return null;

  if (done) {
    const ids = list.map((q) => q.id);
    const right = ids.filter((id) => results[id]).length;
    const wrongQs = list.filter((q) => !results[q.id]);
    return (
      <div className="runner-end">
        <div className="runner-score">
          <div className={`score-big ${right === ids.length ? "tone-good" : right / ids.length >= 0.6 ? "tone-mid" : "tone-bad"}`}>
            <span className="tabnum">
              {right}/{ids.length}
            </span>
            <small>{pct(right, ids.length)}% de acerto na primeira tentativa</small>
          </div>
          <p className="lead">
            {right === ids.length
              ? "Tudo certo. Esse conteúdo está firme."
              : wrongQs.length === 1
              ? "Só uma ficou para trás. Ela já está na sua revisão."
              : `${wrongQs.length} questões foram para a sua revisão. Vale refazer agora, com a explicação fresca.`}
          </p>
        </div>
        {wrongQs.length > 0 && (
          <ul className="mini-list">
            {wrongQs.map((q) => (
              <li key={q.id}>
                <X size={15} className="tone-bad-text" aria-hidden="true" />
                <span>{q.prompt}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="row-wrap">
          {wrongQs.length > 0 && (
            <Button
              variant="soft"
              icon={RotateCcw}
              onClick={() => {
                setList(wrongQs);
                setResults({});
                setI(0);
                setDone(false);
                setRound((r) => r + 1);
              }}
            >
              Refazer as erradas
            </Button>
          )}
          {endActions}
        </div>
      </div>
    );
  }

  const q = list[i];
  const next = () => {
    if (i + 1 >= list.length) {
      setDone(true);
      onDone?.(results, list);
    } else setI(i + 1);
  };

  return (
    <div className="runner">
      <div className="runner-top">
        {title && <span className="runner-title">{title}</span>}
        <span className="muted small tabnum">
          {i + 1} / {list.length}
        </span>
      </div>
      <Bar value={i / list.length} thin label="Progresso das questões" />
      <Question
        key={q.id + ":" + round}
        q={q}
        onResult={(ok, firstTry) => {
          answer(q.id, ok, firstTry && round === 0);
          if (firstTry) setResults((r) => ({ ...r, [q.id]: ok }));
        }}
        onNext={next}
        nextLabel={i + 1 >= list.length ? "Ver resultado" : "Próxima"}
      />
    </div>
  );
}

export function ResultDot({ ok }) {
  return ok ? <Check size={14} className="tone-good-text" /> : <X size={14} className="tone-bad-text" />;
}
