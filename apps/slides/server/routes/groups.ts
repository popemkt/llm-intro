import { Router, type Request } from 'express'
import type { createGroupsService } from '../services/groups.js'
import { parseGroupCreate, parseGroupPatch } from '../validation.js'

type GroupsService = ReturnType<typeof createGroupsService>
type PresentationParams = { pid: string }
type GroupParams = PresentationParams & { gid: string }

export function createGroupsRouter(groupsService: GroupsService) {
  const router = Router({ mergeParams: true })

  router.get('/', (req: Request<PresentationParams>, res) => {
    res.json(groupsService.list(Number(req.params.pid)))
  })

  router.post('/', (req: Request<PresentationParams>, res) => {
    res.status(201).json(groupsService.create(Number(req.params.pid), parseGroupCreate(req.body).title))
  })

  router.patch('/:gid', (req: Request<GroupParams>, res) => {
    res.json(groupsService.update(Number(req.params.pid), Number(req.params.gid), parseGroupPatch(req.body)))
  })

  router.delete('/:gid', (req: Request<GroupParams>, res) => {
    groupsService.delete(Number(req.params.pid), Number(req.params.gid))
    res.status(204).send()
  })

  return router
}
