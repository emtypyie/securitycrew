import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-popup",
      writeBundle() {
        const src = resolve(__dirname, "src/popup.html");
        const destDir = resolve(__dirname, "dist/src");
        mkdirSync(destDir, { recursive: true });
        copyFileSync(src, resolve(destDir, "popup.html"));
      },
    },
  ],
  base: "./",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        options: resolve(__dirname, "src/options/index.html"),
        background: resolve(__dirname, "src/background.ts"),
        content: resolve(__dirname, "src/content.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name].[hash].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "../shared"),
    },
  },
});
