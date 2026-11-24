import React, { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Search, FileText, Presentation, FileType, Trash2, Pencil, Sparkles, Eye, Loader2, Check, AlertTriangle, FolderPlus, X, Star, Wand2 } from "lucide-react";
import { useApp } from "../state.jsx";
import { Button, PageHead, Empty, Badge, Highlight, IconButton } from "../components/ui.jsx";
import { searchIndex, snippet } from "../lib/search.js";
import { extractFile, ACCEPT } from "../lib/importers.js";
import { generateAuto, generateWithAi } from "../lib/generate.js";
import { aiAvailable, errorCopy } from "../lib/ai.js";
import { uid, norm, plural } from "../lib/util.js";
import { DemoBanner } from "./Dashboard.jsx";

const KIND_ICON = { pdf: FileText, pptx: Presentation, docx: FileType, texto: FileText };
const KIND_LABEL = { pdf: "PDF", pptx: "Apresentação", docx: "Documento", texto: "Texto" };

export default function Library() {
  const { content, params, setLast } = useApp();
  const [q, setQ] = useState("");
  const [showImport, setShowImport] = useState(!!params.import);
  useEffect(() => setLast({ route: "biblioteca", params: {}, label: "Biblioteca" }), []); // eslint-disable-line
  useEffect(() => {
    if (params.import) setShowImport(true);
  }, [params.import]);

  return (
    <div className="page">
      {content.showingDemo && <DemoBanner />}
      <PageHead
        eyebrow="Seus materiais"
        title="Biblioteca"
        actions={
          <Button icon={Upload} onClick={() => setShowImport((s) => !s)} aria-expanded={showImport}>
            Importar arquivos
          </Button>
        }
      >
        PDFs, documentos, apresentações e textos, organizados por matéria. Tudo o que o app ensina vem daqui.
      </PageHead>
      {showImport && <Importer onClose={() => setShowImport(false)} />}
      <div className="search-box">
        <Search size={18} aria-hidden="true" />
        <input id="lib-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar palavras e conceitos em todos os materiais…" aria-label="Pesquisar nos materiais" />
        {q && <IconButton icon={X} label="Limpar busca" onClick={() => setQ("")} />}
      </div>
      {q.trim().length >= 2 ? <Results q={q} /> : <Overview />}
    </div>
  );
}

function Results({ q }) {
  const { content, openSource, go } = useApp();
  const hits = useMemo(() => searchIndex(content.index, q, { limit: 30 }), [content.index, q]);
  const nq = norm(q);
  const concepts = useMemo(
    () =>
      content.topics.flatMap((t) => t.concepts.filter((c) => norm(c.term).includes(nq) || norm(c.definition).includes(nq)).map((c) => ({ c, t }))).slice(0, 8),
    [content.topics, nq]
  );
  // Agrupa os resultados por material para deixar a origem clara.
  const groups = {};
  hits.forEach((h) => (groups[h.doc.materialId] = groups[h.doc.materialId] || []).push(h));
  return (
    <div className="results">
      {concepts.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Conceitos</h2>
          </div>
          <ul className="concept-hits">
            {concepts.map(({ c, t }, i) => (
              <li key={i}>
                <button onClick={() => go("resumos", { topicId: t.id })}>
                  <strong>
                    <Highlight text={c.term} query={q} />
                  </strong>
                  <span>
                    <Highlight text={c.definition} query={q} />
                  </span>
                  <small className="muted">{t.title}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {hits.length === 0 && !concepts.length ? (
        <Empty icon={Search} title="Nada encontrado">
          Nenhum material menciona “{q}”. Se isso cai na prova, vale conferir se o arquivo certo foi enviado.
        </Empty>
      ) : (
        Object.entries(groups).map(([mid, hs]) => {
          const m = content.byMaterial[mid];
          return (
            <section key={mid} className="panel">
              <div className="panel-head">
                <h2>{m.title}</h2>
                <span className="muted small">{plural(hs.length, "trecho", "trechos")}</span>
              </div>
              <ul className="hits">
                {hs.map((h) => (
                  <li key={h.doc.id}>
                    <button onClick={() => openSource({ m: mid, p: h.doc.page, q, search: true })}>
                      <span className="hit-where">{h.doc.label || `${m.pageLabel} ${h.doc.page}`}</span>
                      <span className="hit-text">
                        <Highlight text={snippet(h.doc.text, q)} query={q} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function Overview() {
  const { content, go } = useApp();
  const important = [...content.topics].sort((a, b) => b.importance - a.importance || a.order - b.order).slice(0, 6);
  const subjects = content.subjects
    .map((s) => ({ s, mats: content.materials.filter((m) => m.subjectId === s.id) }))
    .filter((g) => g.mats.length || !g.s.id.startsWith("guia"));
  return (
    <>
      {content.notes?.length > 0 && (
        <div className="notes">
          {content.notes.map((n, i) => (
            <p key={i} className="note">
              <AlertTriangle size={15} aria-hidden="true" /> {n}
            </p>
          ))}
        </div>
      )}
      {important.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Assuntos mais importantes</h2>
          </div>
          <ul className="important">
            {important.map((t) => (
              <li key={t.id}>
                <button onClick={() => go("resumos", { topicId: t.id })}>
                  <span className="imp-stars" aria-label={`Importância ${t.importance} de 3`}>
                    {[1, 2, 3].map((n) => (
                      <Star key={n} size={13} className={n <= t.importance ? "on" : ""} aria-hidden="true" />
                    ))}
                  </span>
                  <span className="imp-text">
                    <strong>{t.title}</strong>
                    {t.why && <small>{t.why}</small>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {subjects.length === 0 && (
        <Empty icon={FileText} title="Nenhum material ainda">
          Envie seus arquivos no chat do Claude ou importe-os aqui.
        </Empty>
      )}
      {subjects.map(({ s, mats }) => (
        <section key={s.id} className="subject">
          <h2 className="subject-title">{s.name}</h2>
          {mats.length ? (
            <div className="materials">
              {mats.map((m) => (
                <MaterialCard key={m.id} m={m} />
              ))}
            </div>
          ) : (
            <p className="muted small">Nenhum material nesta matéria.</p>
          )}
        </section>
      ))}
    </>
  );
}

function MaterialCard({ m }) {
  const { content, openSource, removeImport, renameImport, settings, updateSettings, updateImportGen, toast } = useApp();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(m.title);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState("");
  const Icon = KIND_ICON[m.kind] || FileText;
  const topics = content.topics.filter((t) => t.materialIds.includes(m.id));
  const nq = content.questions.filter((q) => topics.some((t) => t.id === q.topicId)).length;
  const imported = m.origin === "import";
  const chars = m.chunks.reduce((s, c) => s + c.text.length, 0);

  const regenerate = async () => {
    setBusy("Lendo com o Claude…");
    try {
      const gen = await generateWithAi(m, { onStep: setBusy });
      if (!gen.topics.length) throw { code: "empty_completion" };
      await updateImportGen(m.id, gen, "ai");
      toast({ tone: "good", title: "Material reorganizado", text: `${gen.topics.length} assuntos, ${gen.questions.length} questões e ${gen.flashcards.length} cartões.` });
    } catch (e) {
      toast({ tone: "bad", title: "Não foi possível gerar com o Claude", text: errorCopy(e) });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="material">
      <div className="material-top">
        <span className="material-icon">
          <Icon size={20} aria-hidden="true" />
        </span>
        <div className="material-text">
          {editing ? (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                renameImport(m.id, title.trim() || m.title);
                setEditing(false);
              }}
            >
              <input id={`rename-${m.id}`} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus aria-label="Novo nome" />
              <Button size="sm" type="submit">
                Salvar
              </Button>
            </form>
          ) : (
            <h3>{m.title}</h3>
          )}
          <div className="material-meta">
            <span>{KIND_LABEL[m.kind] || m.kind}</span>
            <span>{plural(m.chunks.length, m.pageLabel === "slide" ? "slide" : m.pageLabel === "seção" ? "seção" : "página", m.pageLabel === "slide" ? "slides" : m.pageLabel === "seção" ? "seções" : "páginas")}</span>
            <span>{plural(topics.length, "assunto", "assuntos")}</span>
            <span>{plural(nq, "questão", "questões")}</span>
          </div>
        </div>
      </div>
      <div className="row-wrap tight">
        {m.demo ? (
          <Badge tone="neutral">Demonstração</Badge>
        ) : m.origin === "pack" ? (
          <Badge tone="accent" icon={Sparkles}>
            Lido pelo Claude
          </Badge>
        ) : m.generator === "ai" ? (
          <Badge tone="accent" icon={Sparkles}>
            Importado · organizado com o Claude
          </Badge>
        ) : (
          <Badge tone="neutral" icon={Wand2}>
            Importado · geração automática
          </Badge>
        )}
        {m.fileName && <span className="muted small file-name">{m.fileName}</span>}
      </div>
      {imported && (
        <label className="material-subject" htmlFor={`move-${m.id}`}>
          Matéria
          <select
            id={`move-${m.id}`}
            className="select-sm"
            value={m.subjectId}
            onChange={(e) => updateSettings({ matSubject: { ...settings.matSubject, [m.id]: e.target.value } })}
          >
            {content.subjects
              .filter((s) => !s.id.startsWith("guia"))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
      )}
      {busy && (
        <p className="muted small busy">
          <Loader2 size={14} className="spin" aria-hidden="true" /> {busy}
        </p>
      )}
      <div className="material-actions">
        <Button size="sm" variant="soft" icon={Eye} onClick={() => openSource({ m: m.id, p: m.chunks[0]?.page })}>
          Ver conteúdo
        </Button>
        {imported && m.generator !== "ai" && aiAvailable() && (
          <Button size="sm" variant="ghost" icon={Sparkles} onClick={regenerate} disabled={!!busy || chars < 200}>
            Organizar com o Claude
          </Button>
        )}
        {imported && (
          <>
            <span className="spacer" />
            <IconButton icon={Pencil} label="Renomear" onClick={() => setEditing((e) => !e)} />
            <IconButton icon={Trash2} label="Remover" onClick={() => setConfirm(true)} />
          </>
        )}
      </div>
      {confirm && (
        <div className="confirm small">
          <span>Remover “{m.title}” e as questões e cartões gerados a partir dele?</span>
          <div className="row-wrap tight">
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button size="sm" variant="bad" onClick={() => removeImport(m.id)}>
              Remover
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Importer({ onClose }) {
  const { content, settings, updateSettings, addImport } = useApp();
  const realSubjects = content.subjects.filter((s) => !s.id.startsWith("guia"));
  const [subject, setSubject] = useState(realSubjects[0]?.id || "__new");
  const [newName, setNewName] = useState("");
  const [useAi, setUseAi] = useState(aiAvailable());
  const [jobs, setJobs] = useState([]);
  const [drag, setDrag] = useState(false);
  const input = useRef(null);
  const ai = aiAvailable();

  const setJob = (id, patch) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const resolveSubject = () => {
    if (subject !== "__new") return subject;
    const name = newName.trim() || "Minha matéria";
    const existing = settings.subjects.find((s) => norm(s.name) === norm(name));
    if (existing) return existing.id;
    const id = uid("s");
    updateSettings({ subjects: [...settings.subjects, { id, name }] });
    setSubject(id);
    return id;
  };

  const handle = async (files) => {
    const list = [...files];
    if (!list.length) return;
    const subjectId = resolveSubject();
    for (const file of list) {
      const id = uid("job");
      setJobs((js) => [...js, { id, name: file.name, state: "Lendo o arquivo…" }]);
      try {
        const ex = await extractFile(file, (p) => setJob(id, { state: `Lendo o arquivo… ${Math.round(p * 100)}%` }));
        const mid = uid("m");
        const material = {
          id: mid,
          subjectId,
          title: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
          fileName: file.name,
          kind: ex.kind,
          pageLabel: ex.pageLabel,
          addedAt: Date.now(),
          chunks: ex.chunks.map((c, i) => ({ id: `${mid}-c${i}`, page: c.page, text: c.text })),
        };
        let gen;
        let generator = "auto";
        if (useAi && ai) {
          try {
            gen = await generateWithAi(material, { onStep: (s) => setJob(id, { state: s }) });
            if (gen.topics.length) generator = "ai";
            else gen = null;
          } catch (e) {
            setJob(id, { warn: errorCopy(e) + " Usei a geração automática." });
          }
        }
        if (!gen) {
          setJob(id, { state: "Organizando automaticamente…" });
          gen = generateAuto(material);
        }
        await addImport(material, gen, generator);
        setJob(id, { state: "done", summary: `${plural(gen.topics.length, "assunto", "assuntos")}, ${plural(gen.questions.length, "questão", "questões")}, ${plural(gen.flashcards.length, "cartão", "cartões")}` });
      } catch (e) {
        setJob(id, { state: "error", error: e?.message || errorCopy(e) });
      }
    }
  };

  return (
    <section className="importer" aria-label="Importar materiais">
      <div className="importer-head">
        <h2>Importar materiais</h2>
        <IconButton icon={X} label="Fechar" onClick={onClose} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="imp-subject">Matéria</label>
          <select id="imp-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {realSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="__new">+ Nova matéria</option>
          </select>
        </div>
        {subject === "__new" && (
          <div className="field">
            <label htmlFor="imp-new">Nome da nova matéria</label>
            <input id="imp-new" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: o nome da disciplina" />
          </div>
        )}
      </div>
      <label className="switch">
        <input id="imp-ai" type="checkbox" checked={useAi && ai} disabled={!ai} onChange={(e) => setUseAi(e.target.checked)} />
        <span className="switch-ui" aria-hidden="true" />
        <span>
          Organizar com o Claude (resumos, questões e cartões elaborados)
          {!ai && <small className="muted block">Indisponível aqui: uso a geração automática, que monta resumos e questões só com frases do próprio arquivo.</small>}
        </span>
      </label>
      <div
        className={`dropzone ${drag ? "drag" : ""}`}
        onDragOver={(e) => (e.preventDefault(), setDrag(true))}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files);
        }}
      >
        <Upload size={26} aria-hidden="true" />
        <strong>Arraste os arquivos aqui</strong>
        <span className="muted small">PDF, DOCX, PPTX, TXT ou MD</span>
        <Button variant="soft" size="sm" onClick={() => input.current?.click()}>
          Escolher arquivos
        </Button>
        <input id="imp-file" ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => (handle(e.target.files), (e.target.value = ""))} />
      </div>
      {jobs.length > 0 && (
        <ul className="jobs">
          {jobs.map((j) => (
            <li key={j.id} className={j.state === "error" ? "err" : j.state === "done" ? "ok" : ""}>
              {j.state === "done" ? <Check size={16} aria-hidden="true" /> : j.state === "error" ? <AlertTriangle size={16} aria-hidden="true" /> : <Loader2 size={16} className="spin" aria-hidden="true" />}
              <div>
                <strong>{j.name}</strong>
                <span className="muted small">{j.state === "done" ? j.summary : j.state === "error" ? j.error : j.state}</span>
                {j.warn && <span className="muted small block">{j.warn}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">
        Dica: para o melhor resultado, envie os arquivos também no chat do Claude. Lá eu leio tudo com calma (inclusive PDFs digitalizados) e monto o plano de estudos completo.
      </p>
    </section>
  );
}
