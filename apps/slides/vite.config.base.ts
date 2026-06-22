import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { UserConfig } from "vite";

const SRC_DIR = path.resolve(__dirname, "src");

/**
 * Shared Vite configuration consumed by both the main app build
 * and the single-file HTML export pipeline.
 */
export const baseConfig: UserConfig = {
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": SRC_DIR,
    },
    // App and @agent-native/core must share one react-router instance, or core
    // components (the extensions tray) lose the Router context. Versions are
    // aligned in package.json; dedupe collapses any remaining duplicate copies.
    dedupe: ["react", "react-dom", "react-router", "react-router-dom"],
  },
};
