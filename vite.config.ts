import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// One UI for both targets: `tauri dev/build` loads it in the desktop shell, `web:build`
// deploys the same `dist/` as a static site.
export default defineConfig({
  root: "ui",
  base: "./",
  plugins: [react()],
  clearScreen: false,
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: { port: 1420, strictPort: true },
  worker: { format: "es" },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: ["es2022", "chrome105", "safari15"],
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
});
