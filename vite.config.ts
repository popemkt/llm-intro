import { defineConfig, mergeConfig } from 'vitest/config'
import { baseConfig } from './vite.config.base'

const apiProxyTarget = process.env.LLM_INTRO_API_PROXY_TARGET ?? 'http://localhost:3001'

export default defineConfig(
  mergeConfig(baseConfig, {
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test-setup.ts'],
      exclude: ['playwright/**', 'node_modules/**', '.worktrees/**'],
    },
  }),
)
