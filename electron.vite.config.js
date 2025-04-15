// electron.vite.config.js
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/main",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "main.js"),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/preload",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "preload.js"),
        },
      },
    },
  },
  renderer: {
    root: ".",
    build: {
      outDir: "dist/renderer",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "index.html"),
        },
      },
      assetsInlineLimit: 0,
    },
    publicDir: "assets",
    resolve: {
      alias: {
        "@": resolve(__dirname, "."),
      },
    },
  },
});
