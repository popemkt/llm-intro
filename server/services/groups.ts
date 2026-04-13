import { AppError } from '../errors.js'
import type { createPresentationsRepository } from '../repositories/presentations.js'
import type { createGroupsRepository } from '../repositories/groups.js'

type PresentationsRepository = ReturnType<typeof createPresentationsRepository>
type GroupsRepository = ReturnType<typeof createGroupsRepository>

export function createGroupsService(
  presentationsRepo: PresentationsRepository,
  groupsRepo: GroupsRepository,
) {
  const getPresentation = (presentationId: number) => {
    const presentation = presentationsRepo.getById(presentationId)
    if (!presentation) throw new AppError(404, 'presentation not found')
    return presentation
  }

  return {
    list(presentationId: number) {
      getPresentation(presentationId)
      return groupsRepo.listByPresentationId(presentationId)
    },

    create(presentationId: number, title: string) {
      getPresentation(presentationId)
      return groupsRepo.create(presentationId, title)
    },

    update(presentationId: number, groupId: number, patch: { title?: string; collapsed?: boolean }) {
      getPresentation(presentationId)
      const group = groupsRepo.getById(presentationId, groupId)
      if (!group) throw new AppError(404, 'group not found')
      return groupsRepo.update(presentationId, groupId, patch)!
    },

    delete(presentationId: number, groupId: number) {
      getPresentation(presentationId)
      const group = groupsRepo.getById(presentationId, groupId)
      if (!group) throw new AppError(404, 'group not found')
      groupsRepo.delete(presentationId, groupId)
    },
  }
}
