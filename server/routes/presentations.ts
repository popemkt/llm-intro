import { Router } from 'express'
import type { createPresentationsService } from '../services/presentations.js'
import { parsePresentationCreate, parsePresentationPatch } from '../validation.js'

type PresentationsService = ReturnType<typeof createPresentationsService>

export function createPresentationsRouter(presentationsService: PresentationsService) {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(presentationsService.list())
  })

  router.post('/', (req, res) => {
    res.status(201).json(presentationsService.create(parsePresentationCreate(req.body)))
  })

  router.get('/:id', (req, res) => {
    res.json(presentationsService.get(Number(req.params.id)))
  })

  router.patch('/:id', (req, res) => {
    res.json(presentationsService.update(Number(req.params.id), parsePresentationPatch(req.body)))
  })

  router.delete('/:id', (req, res) => {
    presentationsService.delete(Number(req.params.id))
    res.status(204).send()
  })

  return router
}
