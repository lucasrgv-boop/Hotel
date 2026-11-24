import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Gera um único index.html com JS e CSS embutidos (formato aceito pelo Artifact).
// O pacote de conteúdo (public/content.json) é publicado ao lado e lido por fetch.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: "./",
  build: { target: "es2020", cssCodeSplit: false, assetsInlineLimit: 100000000 },
});
