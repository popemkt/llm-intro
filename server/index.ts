import express from 'express'
import cors from 'cors'
import { presentationsRouter } from './routes/presentations.js'
import { slidesRouter } from './routes/slides.js'

export const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/presentations', presentationsRouter)
app.use('/api/presentations/:pid/slides', slidesRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

const PORT = Number(process.env.PORT ?? 3001)

// Only listen when run directly (not when imported by tests)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`)
  })
}
