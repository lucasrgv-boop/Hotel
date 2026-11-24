// Converte dist/index.html (Vite, arquivo único) no formato de página do Artifact:
// sem <!doctype>/<html>/<head>/<body>; título e estilos no topo, depois o app.
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const head = html.match(/<!--ARTIFACT-HEAD-START-->([\s\S]*?)<!--ARTIFACT-HEAD-END-->/)[1].trim();
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]).join("\n");
const scripts = [...html.matchAll(/<script type="module"[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);
if (!scripts.length) throw new Error("script não encontrado");
const out = `${head}\n${styles}\n<div id="root"></div>\n${scripts.join("\n")}\n`;
writeFileSync("dist/artifact.html", out);
console.log(`dist/artifact.html: ${(out.length / 1024).toFixed(0)} KB`);
