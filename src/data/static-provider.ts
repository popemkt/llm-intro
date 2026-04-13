import type { ApiPresentation, ApiSlide, ApiSlideGroup } from '@/types'
import type { DataProvider } from './types'

export interface ExportData {
  presentation: ApiPresentation
  slides: ApiSlide[]
  groups?: ApiSlideGroup[]
}

declare global {
  interface Window {
    __EXPORT_DATA__?: ExportData
  }
}

export function createStaticProvider(data: ExportData): DataProvider {
  const groups = data.groups ?? []
  return {
    presentations: {
      get:  (id) => {
        if (id !== data.presentation.id) throw new Error(`Presentation ${id} not found in export`)
        return Promise.resolve(data.presentation)
      },
      list: () => Promise.resolve([data.presentation]),
    },
    slides: {
      list: (pid) => {
        if (pid !== data.presentation.id) return Promise.resolve([])
        return Promise.resolve(data.slides)
      },
    },
    groups: {
      list: (pid) => {
        if (pid !== data.presentation.id) return Promise.resolve([])
        return Promise.resolve(groups)
      },
    },
  }
}
