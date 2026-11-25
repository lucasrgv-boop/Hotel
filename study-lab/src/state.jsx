import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { normalizePack, mergePacks } from "./lib/content.js";
import { DEMO_PACK } from "./content/demo.js";
import * as store from "./lib/storage.js";
import { emptyProgress, recordAnswer, recordCard, recordExam, recordPrep, recordAtlas, markAchievement } from "./lib/progress.js";
import { debounce, uid } from "./lib/util.js";
import { getSample, onAiStatus } from "./lib/ai.js";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const ROUTES = ["inicio", "preparacao", "atlas", "biblioteca", "resumos", "quiz", "flashcards", "simulado", "revisao", "ajustes"];
const defaultSettings = () => ({ theme: "system", goal: 150, demo: "auto", subjects: [], matSubject: {}, updatedAt: 0 });

function readHash() {
  const h = (location.hash || "").replace("#", "");
  return ROUTES.includes(h) ? h : "inicio";
}

export function AppProvider({ children }) {
  const [basePack, setBasePack] = useState(null);
  const [baseError, setBaseError] = useState(null);
  const [imports, setImports] = useState({ items: [], updatedAt: 0 });
  const [importData, setImportData] = useState({}); // id -> {material, gen}
  const [progress, setProgress] = useState(emptyProgress);
  const [settings, setSettings] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const [route, setRoute] = useState(readHash);
  const [params, setParams] = useState({});
  const [toasts, setToasts] = useState([]);
  const [cloud, setCloud] = useState("connecting");
  const [ai, setAi] = useState("checking");
  const [tutor, setTutor] = useState({ open: false, topicId: null, seed: null });
  const [viewer, setViewer] = useState(null); // {m, p, q}
  const [pop, setPop] = useState(null); // "+10" flutuando

  // ---------- carga inicial ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, s, im] = await Promise.all([store.getLocal("progress"), store.getLocal("settings"), store.getLocal("imports")]);
      if (!alive) return;
      if (p) setProgress({ ...emptyProgress(), ...p });
      if (s) setSettings({ ...defaultSettings(), ...s });
      if (im) {
        setImports(im);
        const data = {};
        for (const it of im.items) {
          const d = await store.getLocal("mat:" + it.id);
          if (d) data[it.id] = d;
        }
        if (alive) setImportData(data);
      }
      setLoaded(true);
      // Conta (db): sincroniza com o que estiver salvo em outro aparelho.
      const ok = await store.initCloud();
      if (!ok || !alive) return;
      const [cp, cs, ci] = await Promise.all([store.loadSynced("progress"), store.loadSynced("settings"), store.loadSynced("imports")]);
      if (!alive) return;
      if (cp) setProgress({ ...emptyProgress(), ...cp });
      if (cs) setSettings({ ...defaultSettings(), ...cs });
      if (ci) {
        setImports(ci);
        for (const it of ci.items) {
          const d = await store.loadSynced("mat:" + it.id);
          if (d && alive) setImportData((prev) => ({ ...prev, [it.id]: d }));
        }
      }
    })();
    fetch("content.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && setBasePack(j ? normalizePack(j, "pack") : normalizePack({}, "pack")))
      .catch(() => {
        if (!alive) return;
        setBaseError(true);
        setBasePack(normalizePack({}, "pack"));
      });
    const offC = store.onCloudStatus(setCloud);
    const offA = onAiStatus(setAi);
    getSample();
    return () => {
      alive = false;
      offC();
      offA();
    };
  }, []);

  // ---------- persistência ----------
  const saveProgress = useMemo(() => debounce((p) => store.save("progress", p), 1200), []);
  const saveSettings = useMemo(() => debounce((s) => store.save("settings", s), 600), []);
  const firstSave = useRef(true);
  useEffect(() => {
    if (!loaded) return;
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    if (progress.updatedAt) saveProgress(progress);
  }, [progress, loaded, saveProgress]);
  useEffect(() => {
    if (loaded && settings.updatedAt) saveSettings(settings);
  }, [settings, loaded, saveSettings]);
  useEffect(() => {
    const flush = () => {
      saveProgress.flush?.(progressRef.current);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [saveProgress]);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // ---------- tema ----------
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "light" || settings.theme === "dark") {
      root.setAttribute("data-theme", settings.theme);
      root.setAttribute("data-theme-owner", "app");
    } else if (root.getAttribute("data-theme-owner") === "app") {
      // Volta a seguir o tema do sistema / do Claude.
      root.removeAttribute("data-theme");
      root.removeAttribute("data-theme-owner");
    }
  }, [settings.theme]);

  // ---------- rotas ----------
  const goingRef = useRef(false);
  useEffect(() => {
    const on = () => {
      // Navegação direta pelo endereço: não carrega parâmetros da tela anterior.
      if (goingRef.current) goingRef.current = false;
      else setParams({});
      setRoute(readHash());
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  // ---------- conteúdo combinado ----------
  const content = useMemo(() => {
    if (!basePack) return null;
    const packs = [basePack];
    for (const it of imports.items) {
      const d = importData[it.id];
      if (!d) continue;
      const subjectId = settings.matSubject[it.id] || it.subjectId;
      packs.push(
        normalizePack(
          {
            subjects: settings.subjects.filter((s) => s.id === subjectId),
            materials: [{ ...d.material, subjectId, origin: "import", generator: d.generator || it.generator }],
            topics: (d.gen?.topics || []).map((t) => ({ ...t, subjectId })),
            questions: d.gen?.questions || [],
            flashcards: d.gen?.flashcards || [],
          },
          "import"
        )
      );
    }
    const real = packs.some((p) => p.materials.length);
    const showDemo = settings.demo === "on" || (settings.demo === "auto" && !real);
    if (showDemo) packs.push(normalizePack(DEMO_PACK, "pack"));
    // Matérias criadas pelo usuário, mesmo vazias.
    packs.push(normalizePack({ subjects: settings.subjects }, "pack"));
    const merged = mergePacks(packs);
    merged.showingDemo = showDemo;
    return merged;
  }, [basePack, imports, importData, settings.matSubject, settings.subjects, settings.demo]);

  // ---------- ações ----------
  const toast = useCallback((t) => {
    const id = uid("toast");
    setToasts((ts) => [...ts.slice(-2), { id, ...t }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), t.ms || 3800);
  }, []);

  const showEvents = useCallback(
    (events) => {
      for (const e of events) {
        if (e.kind === "achievement") toast({ tone: "gold", title: "Conquista: " + e.title, text: e.desc });
        else if (e.kind === "level") toast({ tone: "accent", title: `Nível ${e.level.n}: ${e.level.name}`, text: "Você subiu de nível." });
        else if (e.kind === "goal") toast({ tone: "good", title: "Meta diária cumprida", text: "Ótimo ritmo. O que vier agora é bônus." });
      }
    },
    [toast]
  );

  const apply = useCallback(
    (fn) => {
      let events = [];
      let gained = 0;
      setProgress((prev) => {
        const r = fn(prev);
        events = r.events || [];
        gained = r.gained || 0;
        return r.p;
      });
      setTimeout(() => {
        showEvents(events);
        if (gained > 1) setPop({ n: gained, k: Date.now() });
      }, 0);
    },
    [showEvents]
  );

  const actions = useMemo(
    () => ({
      go(r, prm = {}) {
        setParams(prm);
        if (location.hash.replace("#", "") !== r) {
          goingRef.current = true;
          location.hash = r;
        }
        else setRoute(r);
        window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
      },
      answer(qid, correct, firstTry = true) {
        apply((p) => recordAnswer(p, { qid, correct, firstTry, goal: settings.goal }));
      },
      rateCard(cid, rating) {
        apply((p) => recordCard(p, { cid, rating, goal: settings.goal }));
      },
      finishExam(exam) {
        apply((p) => recordExam(p, exam, settings.goal));
      },
      prep(topicId, patch, allIds) {
        apply((p) => recordPrep(p, topicId, patch, allIds));
      },
      atlasResult(r) {
        apply((p) => recordAtlas(p, r));
      },
      achieve(id) {
        apply((p) => markAchievement(p, id));
      },
      setLast(last) {
        setProgress((p) => ({ ...p, last: { ...last, at: Date.now() }, updatedAt: Date.now() }));
      },
      setExamState(state) {
        setProgress((p) => ({ ...p, examState: state, updatedAt: Date.now() }));
      },
      resetProgress() {
        const p = { ...emptyProgress(), updatedAt: Date.now() };
        setProgress(p);
        store.save("progress", p);
      },
      updateSettings(patch) {
        setSettings((s) => ({ ...s, ...patch, updatedAt: Date.now() }));
      },
      async addImport(material, gen, generator) {
        const item = { id: material.id, title: material.title, fileName: material.fileName, kind: material.kind, subjectId: material.subjectId, addedAt: Date.now(), generator };
        const data = { material, gen, generator, updatedAt: Date.now() };
        await store.save("mat:" + material.id, data);
        setImportData((d) => ({ ...d, [material.id]: data }));
        setImports((im) => {
          const next = { items: [...im.items.filter((x) => x.id !== material.id), item], updatedAt: Date.now() };
          store.save("imports", next);
          return next;
        });
        apply((p) => markAchievement(p, "import"));
      },
      async updateImportGen(id, gen, generator) {
        setImportData((d) => {
          const cur = d[id];
          if (!cur) return d;
          const data = { ...cur, gen, generator, updatedAt: Date.now() };
          store.save("mat:" + id, data);
          return { ...d, [id]: data };
        });
        setImports((im) => {
          const next = { items: im.items.map((x) => (x.id === id ? { ...x, generator } : x)), updatedAt: Date.now() };
          store.save("imports", next);
          return next;
        });
      },
      async removeImport(id) {
        await store.remove("mat:" + id);
        setImportData((d) => {
          const n = { ...d };
          delete n[id];
          return n;
        });
        setImports((im) => {
          const next = { items: im.items.filter((x) => x.id !== id), updatedAt: Date.now() };
          store.save("imports", next);
          return next;
        });
      },
      renameImport(id, title) {
        setImportData((d) => {
          const cur = d[id];
          if (!cur) return d;
          const data = { ...cur, material: { ...cur.material, title }, updatedAt: Date.now() };
          store.save("mat:" + id, data);
          return { ...d, [id]: data };
        });
        setImports((im) => {
          const next = { items: im.items.map((x) => (x.id === id ? { ...x, title } : x)), updatedAt: Date.now() };
          store.save("imports", next);
          return next;
        });
      },
      openTutor(opts = {}) {
        setTutor({ open: true, topicId: opts.topicId ?? null, seed: opts.seed ?? null, key: Date.now() });
      },
      closeTutor() {
        setTutor((t) => ({ ...t, open: false }));
      },
      openSource(src) {
        if (src && src.m) setViewer(src);
      },
      closeSource() {
        setViewer(null);
      },
      toast,
    }),
    [apply, settings.goal, toast]
  );

  const value = { content, baseError, progress, settings, loaded, route, params, toasts, cloud, ai, tutor, viewer, imports, pop, ...actions };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
