import { Router } from 'express'
import type { createSlidesService } from '../services/slides.js'
import { parseSlideCreate, parseSlideOrder, parseSlidePatch } from '../validation.js'

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

  router.put('/order', (req, res) => {
    res.json(slidesService.reorder(Number(req.params.pid), parseSlideOrder(req.body).ids))
  })

  return router
}
