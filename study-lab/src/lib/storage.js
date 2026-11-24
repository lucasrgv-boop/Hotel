// Armazenamento chave-valor com duas camadas:
// 1. Local: IndexedDB (ou memória, se o navegador bloquear).
// 2. Conta: capacidade `db` do Artifact, na área privada do usuário
//    (data/users/<id>/...), para continuar os estudos em outro aparelho.
// Valores grandes são divididos em partes (cada documento do db aceita 256 KiB).

const DB_NAME = "study-lab";
const STORE = "kv";
const PART = 180000; // caracteres por parte

let idbPromise = null;
const memory = new Map();

function openIdb() {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return idbPromise;
}

async function idbGet(key) {
  const db = await openIdb();
  if (!db) return memory.get(key);
  return new Promise((resolve) => {
    try {
      const r = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(memory.get(key));
    } catch {
      resolve(memory.get(key));
    }
  });
}

async function idbSet(key, value) {
  memory.set(key, value);
  const db = await openIdb();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      if (value === undefined) tx.objectStore(STORE).delete(key);
      else tx.objectStore(STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
      tx.onabort = resolve;
    } catch {
      resolve();
    }
  });
}

// ---------- Camada da conta (db) ----------
const cloud = { db: null, uid: null, ready: false, status: "connecting" };
const listeners = new Set();
export function onCloudStatus(fn) {
  listeners.add(fn);
  fn(cloud.status);
  return () => listeners.delete(fn);
}
function setStatus(s) {
  cloud.status = s;
  listeners.forEach((fn) => fn(s));
}

function safeKey(key) {
  return key.replace(/[^A-Za-z0-9_\-.~:@+]/g, "_");
}

export async function initCloud() {
  try {
    if (!window.claude?.use) {
      setStatus("local");
      return false;
    }
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    const id = db && user ? await user.id() : null;
    if (!db || !id) {
      setStatus("local");
      return false;
    }
    cloud.db = db;
    cloud.uid = id;
    cloud.ready = true;
    setStatus("cloud");
    return true;
  } catch {
    setStatus("local");
    return false;
  }
}

function col() {
  return cloud.db.collection("data/users/" + cloud.uid);
}

async function cloudGet(key) {
  if (!cloud.ready) return undefined;
  try {
    const k = safeKey(key);
    const head = await col().doc(k).get();
    if (!head.exists) return undefined;
    const d = head.data();
    if (!d.parts) return d.json ? JSON.parse(d.json) : undefined;
    const parts = [];
    for (let i = 0; i < d.parts; i++) {
      const p = await col().doc(`${k}~${i}`).get();
      if (!p.exists) return undefined;
      parts.push(p.data().s);
    }
    return JSON.parse(parts.join(""));
  } catch {
    return undefined;
  }
}

const writing = new Map();
async function cloudSet(key, value) {
  if (!cloud.ready) return;
  const k = safeKey(key);
  // Uma escrita por vez por chave.
  const prev = writing.get(k) || Promise.resolve();
  const next = prev.then(async () => {
    try {
      if (value === undefined) {
        const head = await col().doc(k).get();
        const n = head.exists ? head.data().parts || 0 : 0;
        for (let i = 0; i < n; i++) await col().doc(`${k}~${i}`).delete();
        await col().doc(k).delete();
        return;
      }
      const json = JSON.stringify(value);
      if (json.length <= PART) {
        await col().doc(k).set({ json, at: Date.now() });
        return;
      }
      const n = Math.ceil(json.length / PART);
      for (let i = 0; i < n; i++) {
        await col().doc(`${k}~${i}`).set({ s: json.slice(i * PART, (i + 1) * PART) });
      }
      await col().doc(k).set({ parts: n, at: Date.now() });
    } catch (e) {
      if (e && e.code === "quota_exceeded") setStatus("quota");
    }
  });
  writing.set(k, next);
  return next;
}

// ---------- API pública ----------
export async function getLocal(key) {
  return idbGet(key);
}

export async function save(key, value) {
  await idbSet(key, value);
  cloudSet(key, value);
}

export async function remove(key) {
  await idbSet(key, undefined);
  cloudSet(key, undefined);
}

// Lê local e nuvem; devolve o mais recente (campo updatedAt).
// Se o local for mais novo, envia para a nuvem.
export async function loadSynced(key) {
  const local = await idbGet(key);
  if (!cloud.ready) return local;
  const remote = await cloudGet(key);
  const lt = local?.updatedAt || 0;
  const rt = remote?.updatedAt || 0;
  if (remote !== undefined && rt > lt) {
    await idbSet(key, remote);
    return remote;
  }
  if (local !== undefined && lt > rt) cloudSet(key, local);
  return local;
}

export const cloudState = cloud;
