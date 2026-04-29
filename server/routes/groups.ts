import { Router } from 'express'
import type { createGroupsService } from '../services/groups.js'
import { parseGroupCreate, parseGroupPatch } from '../validation.js'

type GroupsService = ReturnType<typeof createGroupsService>

export function createGroupsRouter(groupsService: GroupsService) {
  const router = Router({ mergeParams: true })

  router.get('/', (req, res) => {
    res.json(groupsService.list(Number(req.params.pid)))
  })

  router.post('/', (req, res) => {
    res.status(201).json(groupsService.create(Number(req.params.pid), parseGroupCreate(req.body).title))
  })

  router.patch('/:gid', (req, res) => {
    res.json(groupsService.update(Number(req.params.pid), Number(req.params.gid), parseGroupPatch(req.body)))
  })

  router.delete('/:gid', (req, res) => {
    groupsService.delete(Number(req.params.pid), Number(req.params.gid))
    res.status(204).send()
  })

  return router
}
