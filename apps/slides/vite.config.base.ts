import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { UserConfig } from 'vite'

const SRC_DIR = path.resolve(__dirname, 'src')

/**
 * Shared Vite configuration consumed by both the main app build
 * and the single-file HTML export pipeline.
 */
export const baseConfig: UserConfig = {
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': SRC_DIR,
    },
  },
}
