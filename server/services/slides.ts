import type { Block } from '../../shared/api.js'
import { AppError } from '../errors.js'
import type { createPresentationsRepository } from '../repositories/presentations.js'
import type { createSlidesRepository } from '../repositories/slides.js'

type PresentationsRepository = ReturnType<typeof createPresentationsRepository>
type SlidesRepository = ReturnType<typeof createSlidesRepository>

export function createSlidesService(
  presentationsRepo: PresentationsRepository,
  slidesRepo: SlidesRepository,
) {
  const getPresentation = (presentationId: number) => {
    const presentation = presentationsRepo.getById(presentationId)
    if (!presentation) throw new AppError(404, 'presentation not found')
    return presentation
  }

  return {
    list(presentationId: number) {
      getPresentation(presentationId)
      return slidesRepo.listByPresentationId(presentationId)
    },

    create(presentationId: number, input: { title: string; blocks: Block[] }) {
      const presentation = getPresentation(presentationId)
      if (presentation.is_system) throw new AppError(403, 'built-in presentations are read-only')
      return slidesRepo.create(presentationId, input)
    },

    update(presentationId: number, slideId: number, patch: { title?: string; blocks?: Block[] }) {
      getPresentation(presentationId)
      const slide = slidesRepo.getById(presentationId, slideId)
      if (!slide) throw new AppError(404, 'slide not found')
      if (slide.kind === 'code') throw new AppError(403, 'code slides are read-only')

      return slidesRepo.update(presentationId, slideId, {
        title: patch.title ?? slide.title,
        blocks: patch.blocks ?? slide.blocks,
      })
    },

    delete(presentationId: number, slideId: number) {
      const presentation = getPresentation(presentationId)
      if (presentation.is_system) throw new AppError(403, 'built-in presentations are read-only')

      const slide = slidesRepo.getById(presentationId, slideId)
      if (!slide) throw new AppError(404, 'slide not found')
      if (slide.kind === 'code') throw new AppError(403, 'code slides are read-only')

      slidesRepo.delete(presentationId, slideId)
    },

    reorder(presentationId: number, ids: number[]) {
      const presentation = getPresentation(presentationId)
      if (presentation.is_system) throw new AppError(403, 'built-in presentations are read-only')

      const slides = slidesRepo.listByPresentationId(presentationId)
      const slideIds = slides.map((slide) => slide.id)

      if (slideIds.length !== ids.length) throw new AppError(400, 'ids must include every slide exactly once')
      if (!ids.every((id) => slideIds.includes(id))) throw new AppError(400, 'ids must belong to this presentation')

      return slidesRepo.replaceOrder(presentationId, ids)
    },
  }
}
