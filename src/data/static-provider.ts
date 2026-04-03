import type { ApiPresentation, ApiSlide } from '@/types'
import type { DataProvider } from './types'

export interface ExportData {
  presentation: ApiPresentation
  slides: ApiSlide[]
}

declare global {
  interface Window {
    __EXPORT_DATA__?: ExportData
  }
}

export function createStaticProvider(data: ExportData): DataProvider {
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
  }
}
