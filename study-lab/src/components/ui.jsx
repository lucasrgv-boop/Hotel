import React, { useEffect, useRef } from "react";
import { X, FileText, ShieldCheck } from "lucide-react";
import { useApp } from "../state.jsx";
import { srcLabel } from "../lib/content.js";
import { highlightParts } from "../lib/search.js";

export function Button({ variant = "primary", size, icon: Icon, children, className = "", ...rest }) {
  return (
    <button className={`btn btn-${variant} ${size ? "btn-" + size : ""} ${className}`} {...rest}>
      {Icon && <Icon size={size === "sm" ? 15 : 17} strokeWidth={2.2} aria-hidden="true" />}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className = "", ...rest }) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}

export function Badge({ tone = "neutral", children, icon: Icon }) {
  return (
    <span className={`badge badge-${tone}`}>
      {Icon && <Icon size={12} strokeWidth={2.4} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Bar({ value, tone = "accent", label, thin }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className={`bar ${thin ? "bar-thin" : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <div className={`bar-fill tone-${tone}`} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, tone = "accent", children, label }) {
  const v = Math.max(0, Math.min(1, value || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className={`ring-fill tone-${tone}`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? "on" : ""}
          onClick={() => onChange(o.value)}
          disabled={o.disabled}
        >
          {o.icon && <o.icon size={15} strokeWidth={2.2} aria-hidden="true" />}
          <span>{o.label}</span>
          {o.count != null && <em>{o.count}</em>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && (
        <div className="empty-icon">
          <Icon size={26} strokeWidth={1.8} aria-hidden="true" />
        </div>
      )}
      <h3>{title}</h3>
      {children && <div className="empty-text">{children}</div>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function PageHead({ eyebrow, title, children, actions }) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {children && <p className="lead">{children}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </header>
  );
}

// Etiqueta de origem: material e página. Abre o trecho original.
export function Source({ src, compact }) {
  const { content, openSource } = useApp();
  const l = srcLabel(content, src);
  if (!l) return null;
  return (
    <button className={`source ${compact ? "source-compact" : ""}`} onClick={() => openSource(src)} title="Abrir o trecho no material">
      <FileText size={12} strokeWidth={2.2} aria-hidden="true" />
      <span className="source-title">{l.title}</span>
      {l.where && <span className="source-where">{l.where}</span>}
      {src.ok && <ShieldCheck size={12} strokeWidth={2.2} className="source-ok" aria-label="Trecho conferido no texto" />}
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide, footer, labelledBy }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <h2 id={labelledBy}>{title}</h2>
          <IconButton icon={X} label="Fechar" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Highlight({ text, query }) {
  if (!query) return text;
  return highlightParts(text, query).map((p, i) => (p.m ? <mark key={i}>{p.t}</mark> : <React.Fragment key={i}>{p.t}</React.Fragment>));
}

// Markdown mínimo e seguro: parágrafos, listas, **negrito**, *itálico*, `código` e citações [n].
export function Rich({ text, onCite, cites }) {
  const blocks = String(text || "").split(/\n{2,}/);
  return (
    <div className="rich">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
          const ordered = /^\s*\d/.test(lines[0]);
          const L = ordered ? "ol" : "ul";
          return (
            <L key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), onCite, cites)}</li>
              ))}
            </L>
          );
        }
        if (/^#{1,4}\s/.test(lines[0])) {
          return (
            <React.Fragment key={i}>
              <h4>{inline(lines[0].replace(/^#+\s/, ""), onCite, cites)}</h4>
              {lines.length > 1 && <p>{inlineLines(lines.slice(1), onCite, cites)}</p>}
            </React.Fragment>
          );
        }
        return <p key={i}>{inlineLines(lines, onCite, cites)}</p>;
      })}
    </div>
  );
}

function inlineLines(lines, onCite, cites) {
  return lines.map((l, j) => (
    <React.Fragment key={j}>
      {j > 0 && <br />}
      {inline(l, onCite, cites)}
    </React.Fragment>
  ));
}

function inline(s, onCite, cites) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[(\d+(?:\s*[,;]\s*\d+)*)\])/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const nums = m[2].split(/[,;]/).map((x) => parseInt(x.trim(), 10));
      nums.forEach((n) => {
        const has = cites && cites[n - 1];
        out.push(
          has ? (
            <button key={k++} className="cite" onClick={() => onCite?.(n)} title={has.title}>
              {n}
            </button>
          ) : (
            <sup key={k++}>[{n}]</sup>
          )
        );
      });
    } else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone || "neutral"}`}>
          <strong>{t.title}</strong>
          {t.text && <span>{t.text}</span>}
        </div>
      ))}
    </div>
  );
}
