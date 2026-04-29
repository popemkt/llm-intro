import type { ApiPresentation, ApiSlide, ApiSlideGroup, LayoutInput, ThemeName } from '@/types'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong'
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers)
  headers.set('Accept', 'application/json')
  if (options?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(url, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    throw new ApiError(res.status, err.error ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  presentations: {
    list:   ()                => request<ApiPresentation[]>('/api/presentations'),
    get:    (id: number)      => request<ApiPresentation>(`/api/presentations/${id}`),
    create: (name: string, theme: ThemeName = 'dark-green') =>
      request<ApiPresentation>('/api/presentations', { method: 'POST', body: JSON.stringify({ name, theme }) }),
    update: (id: number, patch: Partial<Pick<ApiPresentation, 'name' | 'theme'>>) =>
      request<ApiPresentation>(`/api/presentations/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    delete: (id: number) => request<void>(`/api/presentations/${id}`, { method: 'DELETE' }),
  },

  slides: {
    list:   (pid: number)                   => request<ApiSlide[]>(`/api/presentations/${pid}/slides`),
    create: (pid: number, title?: string)   =>
      request<ApiSlide>(`/api/presentations/${pid}/slides`, { method: 'POST', body: JSON.stringify({ title }) }),
    update: (pid: number, sid: number, patch: { title?: string; blocks?: unknown[] }) =>
      request<ApiSlide>(`/api/presentations/${pid}/slides/${sid}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    delete: (pid: number, sid: number)      => request<void>(`/api/presentations/${pid}/slides/${sid}`, { method: 'DELETE' }),
    layout: (pid: number, layout: LayoutInput) =>
      request<ApiSlide[]>(`/api/presentations/${pid}/slides/layout`, { method: 'PUT', body: JSON.stringify(layout) }),
  },

  groups: {
    list:   (pid: number)                      => request<ApiSlideGroup[]>(`/api/presentations/${pid}/groups`),
    create: (pid: number, title?: string)      =>
      request<ApiSlideGroup>(`/api/presentations/${pid}/groups`, { method: 'POST', body: JSON.stringify({ title }) }),
    update: (pid: number, gid: number, patch: { title?: string; collapsed?: boolean }) =>
      request<ApiSlideGroup>(`/api/presentations/${pid}/groups/${gid}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    delete: (pid: number, gid: number)         =>
      request<void>(`/api/presentations/${pid}/groups/${gid}`, { method: 'DELETE' }),
  },
}
