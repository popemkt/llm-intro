import { api } from '@/api/client'
import type { DataProvider } from './types'

export function createApiProvider(): DataProvider {
  return {
    presentations: {
      get:  (id) => api.presentations.get(id),
      list: ()   => api.presentations.list(),
    },
    slides: {
      list: (pid) => api.slides.list(pid),
    },
    groups: {
      list: (pid) => api.groups.list(pid),
    },
  }
}
