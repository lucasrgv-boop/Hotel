import React, { useEffect, useRef } from "react";
import { useApp } from "../state.jsx";
import { Modal, Highlight } from "../components/ui.jsx";
import { norm } from "../lib/util.js";

// Mostra o texto original do material, rolando até a página citada.
export default function SourceViewer() {
  const { content, viewer, closeSource } = useApp();
  const m = content.byMaterial[viewer.m];
  const body = useRef(null);

  useEffect(() => {
    if (!m) return;
    const el = body.current?.querySelector(`[data-page="${CSS.escape(String(viewer.p ?? m.chunks[0]?.page))}"]`);
    if (el) setTimeout(() => el.scrollIntoView({ block: "start" }), 30);
  }, [viewer, m]);

  if (!m) return null;
  const quote = viewer.q && !viewer.search ? viewer.q : null;
  return (
    <Modal open onClose={closeSource} title={m.title} wide>
      <div className="viewer-meta">
        <span className="muted small">
          {m.fileName || m.title} · {m.chunks.length} {m.pageLabel === "slide" ? "slides" : m.pageLabel === "seção" ? "seções" : "páginas"}
        </span>
        <div className="page-jump" aria-label="Ir para">
          {m.chunks.length > 1 &&
            m.chunks.map((c) => (
              <button
                key={c.id}
                className={String(c.page) === String(viewer.p) ? "on" : ""}
                onClick={() => body.current?.querySelector(`[data-page="${CSS.escape(String(c.page))}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" })}
              >
                {c.page}
              </button>
            ))}
        </div>
      </div>
      <div className="viewer-body" ref={body}>
        {m.chunks.map((c) => (
          <section key={c.id} data-page={c.page} className={`viewer-page ${String(c.page) === String(viewer.p) ? "target" : ""}`}>
            <div className="viewer-page-label">{c.label || `${m.pageLabel === "p." ? "Página" : m.pageLabel === "slide" ? "Slide" : "Seção"} ${c.page}`}</div>
            {(m.figures || [])
              .filter((f) => String(f.page) === String(c.page))
              .map((f) => (
                <figure key={f.img} className="viewer-figure">
                  <img src={f.img} alt={f.caption || "Ilustração do material"} loading="lazy" />
                  {f.caption && <figcaption>{f.caption}</figcaption>}
                </figure>
              ))}
            <div className="viewer-text">
              {String(c.page) === String(viewer.p) && quote ? <QuoteMark text={c.text} quote={quote} /> : viewer.search ? <Highlight text={c.text} query={viewer.q} /> : c.text}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}

// Destaca a citação exata, se ela estiver no texto.
function QuoteMark({ text, quote }) {
  const nq = norm(quote).slice(0, 80);
  if (nq.length < 8) return text;
  // Busca aproximada: compara a versão normalizada de janelas do texto.
  const words = text.split(/(\s+)/);
  const nwords = words.map((w) => norm(w));
  const target = nq.split(" ");
  for (let i = 0; i < words.length; i++) {
    if (!nwords[i]) continue;
    let k = 0;
    let j = i;
    while (j < words.length && k < target.length) {
      if (!nwords[j]) {
        j++;
        continue;
      }
      if (nwords[j] === target[k] || (k === target.length - 1 && nwords[j].startsWith(target[k]))) {
        k++;
        j++;
      } else break;
    }
    if (k === target.length) {
      // estende até o fim da frase
      let end = j;
      while (end < words.length && !/[.!?;]$/.test(words[end - 1] || "")) end++;
      return (
        <>
          {words.slice(0, i).join("")}
          <mark className="quote-mark">{words.slice(i, end).join("")}</mark>
          {words.slice(end).join("")}
        </>
      );
    }
  }
  return text;
}
