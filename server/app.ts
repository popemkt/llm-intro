import express from 'express'
import cors from 'cors'
import { AppError } from './errors.js'
import { createPresentationsRouter } from './routes/presentations.js'
import { createSlidesRouter } from './routes/slides.js'
import type { createPresentationsService } from './services/presentations.js'
import type { createSlidesService } from './services/slides.js'

type PresentationsService = ReturnType<typeof createPresentationsService>
type SlidesService = ReturnType<typeof createSlidesService>

export function createApp(services: {
  presentationsService: PresentationsService
  slidesService: SlidesService
}) {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.use('/api/presentations', createPresentationsRouter(services.presentationsService))
  app.use('/api/presentations/:pid/slides', createSlidesRouter(services.slidesService))

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.message })
      return
    }

    console.error(err)
    res.status(500).json({ error: 'internal server error' })
  })

  return app
}
