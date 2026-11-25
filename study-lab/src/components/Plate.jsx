import React, { useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

// Ilustração da apostila com as etiquetas originais por cima.
// Cada etiqueta pode ficar coberta (?), revelada, destacada, certa ou errada.
//   cover: "all" | "none" | Set de ids cobertos
//   marks: { [labelId]: "right" | "wrong" | "reveal" }
export function Plate({ plate, cover = "all", highlight, marks = {}, onTap, disabled, numbered, className = "", zoomable = true, caption, fit = "56vh" }) {
  const [zoom, setZoom] = useState(false);
  if (!plate) return null;
  const isCovered = (id) => (cover === "all" ? true : cover === "none" ? false : cover.has(id));
  return (
    <figure className={`plate ${zoom ? "zoomed" : ""} ${className}`}>
      <div className="plate-scroll">
        <div
          className="plate-canvas"
          style={{ aspectRatio: `${plate.w} / ${plate.h}`, width: zoom ? "170%" : `min(100%, calc(${fit} * ${(plate.w / plate.h).toFixed(3)}))` }}
        >
          <img src={plate.img} alt={plate.title} draggable="false" />
          {plate.labels.map((l, i) => {
            const mark = marks[l.id];
            const covered = isCovered(l.id) && mark !== "right" && mark !== "reveal";
            const hl = highlight === l.id;
            const cls = ["pl", covered ? "pl-cover" : "pl-open", hl ? "pl-hl" : "", mark ? "pl-" + mark : "", onTap && !disabled ? "pl-tap" : ""].join(" ");
            const style = { left: `${l.x}%`, top: `${l.y}%`, width: `${l.w}%`, height: `${l.h}%` };
            const content = covered ? <span className="pl-q">{numbered ? i + 1 : hl ? "?" : ""}</span> : null;
            return onTap && !disabled ? (
              <button key={l.id} className={cls} style={style} onClick={() => onTap(l)} aria-label={covered ? `Etiqueta escondida ${i + 1}` : l.name}>
                {content}
              </button>
            ) : (
              <span key={l.id} className={cls} style={style} aria-hidden="true">
                {content}
              </span>
            );
          })}
        </div>
      </div>
      {(zoomable || caption) && (
        <figcaption className="plate-cap">
          {caption && <span>{caption}</span>}
          {zoomable && (
            <button className="plate-zoom" onClick={() => setZoom((z) => !z)} aria-pressed={zoom}>
              {zoom ? <ZoomOut size={15} aria-hidden="true" /> : <ZoomIn size={15} aria-hidden="true" />}
              {zoom ? "Reduzir" : "Ampliar"}
            </button>
          )}
        </figcaption>
      )}
    </figure>
  );
}

// Nomes distintos de uma ilustração, para as alternativas.
export function plateNames(plate) {
  return [...new Set(plate.labels.map((l) => l.name))];
}
