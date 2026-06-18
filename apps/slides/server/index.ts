import { fileURLToPath } from 'url'
import { buildDefaultRuntime } from './runtime.js'

export const { app, db } = buildDefaultRuntime()

const PORT = Number(process.env.PORT ?? 3001)
const isDirectExecution = process.argv[1] === fileURLToPath(import.meta.url)

// Only listen when run directly (not when imported by tests)
if (isDirectExecution) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`)
  })
}
