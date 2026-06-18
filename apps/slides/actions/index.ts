import type { createPresentationsService } from '../server/services/presentations.js'
import type { createSlidesService } from '../server/services/slides.js'
import type { createGroupsService } from '../server/services/groups.js'
import { createDeckActions } from './decks.js'
import { createSlideActions } from './slides.js'
import { createGroupActions } from './groups.js'

type PresentationsService = ReturnType<typeof createPresentationsService>
type SlidesService = ReturnType<typeof createSlidesService>
type GroupsService = ReturnType<typeof createGroupsService>

export function createSlideDeckActions(services: {
  presentationsService: PresentationsService
  slidesService: SlidesService
  groupsService: GroupsService
}) {
  return {
    ...createDeckActions(services.presentationsService),
    ...createSlideActions(services.slidesService),
    ...createGroupActions(services.groupsService),
  }
}

export type SlideDeckActions = ReturnType<typeof createSlideDeckActions>
