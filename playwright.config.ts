import path from 'path'
import { defineConfig, devices } from '@playwright/test'

const e2eDbPath = path.join(process.cwd(), 'server', 'data', `playwright-${process.pid}.db`)
const e2ePort = '3101'
const e2eBaseUrl = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './playwright',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: e2eBaseUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm exec concurrently "vite --host 127.0.0.1 --port 4173" "tsx watch server/index.ts"',
    env: {
      ...process.env,
      LLM_INTRO_DB_PATH: e2eDbPath,
      LLM_INTRO_API_PROXY_TARGET: `http://127.0.0.1:${e2ePort}`,
      PORT: e2ePort,
    },
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 30000,
  },
})
