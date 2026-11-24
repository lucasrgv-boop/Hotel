// Extração de texto dos arquivos importados, direto no navegador.
// PDF: pdf.js · DOCX: mammoth · PPTX: JSZip · TXT/MD: leitura direta.
import { loadScript } from "./util.js";

const CDN = "https://cdn.jsdelivr.net/npm/";
const LIBS = {
  pdf: [CDN + "pdfjs-dist@3.11.174/build/pdf.min.js", "vendor-local/pdf.min.js"],
  pdfWorker: [CDN + "pdfjs-dist@3.11.174/build/pdf.worker.min.js", "vendor-local/pdf.worker.min.js"],
  mammoth: [CDN + "mammoth@1.6.0/mammoth.browser.min.js", "vendor-local/mammoth.browser.min.js"],
  jszip: [CDN + "jszip@3.10.1/dist/jszip.min.js", "vendor-local/jszip.min.js"],
};

export const ACCEPT = ".pdf,.docx,.pptx,.txt,.md,.markdown,.csv";

export function kindOf(name) {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "pptx") return "pptx";
  if (["txt", "md", "markdown", "csv"].includes(ext)) return "texto";
  return null;
}

const clean = (s) =>
  s
    .replace(/­/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

async function readPdf(file, onProgress) {
  await loadScript(LIBS.pdf);
  // O worker roda na própria página (o navegador do Artifact não permite workers de outros domínios).
  if (!window.pdfjsWorker) await loadScript(LIBS.pdfWorker);
  const lib = window.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker[0];
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await lib.getDocument({ data, isEvalSupported: false }).promise;
  const chunks = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let text = "";
    let lastY = null;
    for (const it of tc.items) {
      const y = it.transform ? it.transform[5] : null;
      if (lastY != null && y != null && Math.abs(y - lastY) > 2) text += "\n";
      else if (text && !text.endsWith(" ") && !text.endsWith("\n")) text += " ";
      text += it.str;
      if (it.hasEOL) text += "\n";
      lastY = y;
    }
    chunks.push({ page: i, text: clean(text.replace(/-\n(?=[a-zà-ú])/g, "")) });
    onProgress?.(i / doc.numPages);
  }
  return { chunks, pageLabel: "p." };
}

async function readDocx(file) {
  await loadScript(LIBS.mammoth);
  const { value: html } = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const dom = new DOMParser().parseFromString(html, "text/html");
  const lines = [];
  dom.body.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,td").forEach((el) => {
    const t = el.textContent.trim();
    if (!t) return;
    if (/^H\d$/.test(el.tagName)) lines.push("\n## " + t);
    else if (el.tagName === "LI") lines.push("• " + t);
    else lines.push(t);
  });
  return { chunks: sectionize(lines.join("\n")), pageLabel: "seção" };
}

async function readPptx(file) {
  await loadScript(LIBS.jszip);
  const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => parseInt(a.match(/(\d+)\.xml/)[1]) - parseInt(b.match(/(\d+)\.xml/)[1]));
  const chunks = [];
  for (const name of slideNames) {
    const n = parseInt(name.match(/(\d+)\.xml/)[1]);
    const xml = await zip.file(name).async("string");
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const paras = [...doc.getElementsByTagNameNS("*", "p")].map((p) =>
      [...p.getElementsByTagNameNS("*", "t")].map((t) => t.textContent).join("")
    );
    let text = paras.filter(Boolean).join("\n");
    const notes = zip.file(`ppt/notesSlides/notesSlide${n}.xml`);
    if (notes) {
      const nx = new DOMParser().parseFromString(await notes.async("string"), "application/xml");
      const nt = [...nx.getElementsByTagNameNS("*", "t")].map((t) => t.textContent).join(" ").trim();
      if (nt && !/^\d+$/.test(nt)) text += "\n\nAnotações: " + nt;
    }
    chunks.push({ page: n, text: clean(text) });
  }
  return { chunks, pageLabel: "slide" };
}

// Divide texto sem páginas em seções de tamanho parecido, respeitando títulos.
function sectionize(text, target = 2800) {
  const parts = text.split(/\n(?=## )/);
  const out = [];
  let buf = "";
  for (const part of parts) {
    if ((buf + part).length > target && buf) {
      out.push(buf);
      buf = "";
    }
    if (part.length > target * 1.6) {
      const paras = part.split(/\n+/);
      for (const p of paras) {
        if ((buf + p).length > target && buf) {
          out.push(buf);
          buf = "";
        }
        buf += (buf ? "\n" : "") + p;
      }
    } else buf += (buf ? "\n" : "") + part;
  }
  if (buf.trim()) out.push(buf);
  return out.map((t, i) => ({ page: i + 1, text: clean(t.replace(/^## /gm, "")) }));
}

export async function extractFile(file, onProgress) {
  const kind = kindOf(file.name);
  if (!kind) throw new Error("Formato não suportado. Use PDF, DOCX, PPTX, TXT ou MD.");
  let res;
  if (kind === "pdf") res = await readPdf(file, onProgress);
  else if (kind === "docx") res = await readDocx(file);
  else if (kind === "pptx") res = await readPptx(file);
  else res = { chunks: sectionize(await file.text()), pageLabel: "seção" };
  const totalText = res.chunks.reduce((s, c) => s + c.text.length, 0);
  if (totalText < 40) {
    throw new Error(
      kind === "pdf"
        ? "Não encontrei texto neste PDF. Ele parece ser digitalizado (imagem). Envie o arquivo no chat do Claude para que ele leia as páginas."
        : "Não encontrei texto neste arquivo."
    );
  }
  return { kind, ...res };
}
