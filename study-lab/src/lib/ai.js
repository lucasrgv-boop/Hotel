// Acesso ao Claude pela capacidade `sample` do Artifact.
// Quando não está disponível (página fora do Claude, permissão negada),
// o app usa as alternativas locais: busca nos trechos e geração automática.

let samplePromise = null;
let denied = false;
const listeners = new Set();
let status = "checking"; // checking | ready | off | denied

function setStatus(s) {
  status = s;
  listeners.forEach((fn) => fn(s));
}
export function onAiStatus(fn) {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

export function getSample() {
  if (!samplePromise) {
    samplePromise = (async () => {
      try {
        if (!window.claude?.use) return null;
        const s = await window.claude.use("sample");
        return s || null;
      } catch {
        return null;
      }
    })().then((s) => {
      setStatus(s ? "ready" : "off");
      return s;
    });
  }
  return samplePromise;
}

export function aiAvailable() {
  return status === "ready" && !denied;
}

export const ERROR_COPY = {
  not_granted: "O uso do Claude não foi permitido nesta página. O professor segue respondendo com os trechos dos seus materiais.",
  sampling_disabled: "O Claude não está disponível para esta conta. Uso os trechos dos materiais como alternativa.",
  rate_limited: "Muitas perguntas seguidas ou limite de uso atingido. Espere um pouco e tente de novo.",
  session_expired: "Sua sessão expirou. Entre novamente no Claude e recarregue a página.",
  prompt_too_large: "O pedido ficou grande demais. Tente uma pergunta mais específica.",
  refused: "O Claude não respondeu a esse pedido. Tente reformular.",
  empty_completion: "A resposta veio vazia. Tente reformular a pergunta.",
  invalid_json: "A resposta veio num formato inesperado. Tente de novo.",
  upstream_error: "Falha de conexão com o Claude. Tente de novo.",
};

export function errorCopy(e) {
  return ERROR_COPY[e?.code] || ERROR_COPY.upstream_error;
}

export function markDenied(e) {
  if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(e?.code)) {
    denied = true;
    setStatus("denied");
  }
}

export async function ask(input, opts = {}) {
  const s = await getSample();
  if (!s || denied) throw { code: "not_granted", message: "unavailable" };
  try {
    return await s(input, opts);
  } catch (e) {
    markDenied(e);
    throw e;
  }
}

export async function askJson(input, opts = {}) {
  const s = await getSample();
  if (!s || denied) throw { code: "not_granted", message: "unavailable" };
  try {
    return await s.json(input, opts);
  } catch (e) {
    markDenied(e);
    throw e;
  }
}
