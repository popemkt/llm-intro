import type { ThemeName } from '../../shared/api.js'
import { AppError } from '../errors.js'
import type { createPresentationsRepository } from '../repositories/presentations.js'

type PresentationsRepository = ReturnType<typeof createPresentationsRepository>

export function createPresentationsService(presentationsRepo: PresentationsRepository) {
  return {
    list() {
      return presentationsRepo.list()
    },

    get(id: number) {
      const presentation = presentationsRepo.getById(id)
      if (!presentation) throw new AppError(404, 'presentation not found')
      return presentation
    },

    create(input: { name: string; theme: ThemeName }) {
      return presentationsRepo.create(input)
    },

    update(id: number, patch: { name?: string; theme?: ThemeName }) {
      const current = this.get(id)

      return presentationsRepo.update(id, {
        name: patch.name ?? current.name,
        theme: patch.theme ?? current.theme,
      })
    },

    delete(id: number) {
      this.get(id)
      presentationsRepo.delete(id)
    },
  }
}
