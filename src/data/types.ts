import type { ApiPresentation, ApiSlide } from '@/types'

/** Read-only data access interface — works against either the live API or embedded JSON. */
export interface DataProvider {
  presentations: {
    get(id: number): Promise<ApiPresentation>
    list(): Promise<ApiPresentation[]>
  }
  slides: {
    list(pid: number): Promise<ApiSlide[]>
  }
}
