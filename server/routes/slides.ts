import { Router } from 'express'
import type { createSlidesService } from '../services/slides.js'
import { parseLayout, parseSlideCreate, parseSlidePatch } from '../validation.js'

type SlidesService = ReturnType<typeof createSlidesService>

export function createSlidesRouter(slidesService: SlidesService) {
  const router = Router({ mergeParams: true })

  router.get('/', (req, res) => {
    res.json(slidesService.list(Number(req.params.pid)))
  })

  router.post('/', (req, res) => {
    res.status(201).json(slidesService.create(Number(req.params.pid), parseSlideCreate(req.body)))
  })

  router.patch('/:sid', (req, res) => {
    res.json(slidesService.update(Number(req.params.pid), Number(req.params.sid), parseSlidePatch(req.body)))
  })

  router.delete('/:sid', (req, res) => {
    slidesService.delete(Number(req.params.pid), Number(req.params.sid))
    res.status(204).send()
  })

  router.put('/layout', (req, res) => {
    res.json(slidesService.applyLayout(Number(req.params.pid), parseLayout(req.body)))
  })

  return router
}
