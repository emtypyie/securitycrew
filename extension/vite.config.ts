import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync, mkdirSync } from "fs";

export default defineConfig({
  plugins: [
    {
      name: "copy-html",
      writeBundle() {
        const destDir = resolve(__dirname, "dist/src");
        mkdirSync(destDir, { recursive: true });
        copyFileSync(resolve(__dirname, "src/popup.html"), resolve(destDir, "popup.html"));
        copyFileSync(resolve(__dirname, "src/options.html"), resolve(destDir, "options.html"));
      },
    },
  ],
  base: "./",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
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
