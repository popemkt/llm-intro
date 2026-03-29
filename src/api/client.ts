import type { ApiPresentation, ApiSlide, ThemeName } from '@/types'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
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
    reorder:(pid: number, ids: number[])    =>
      request<ApiSlide[]>(`/api/presentations/${pid}/slides/order`, { method: 'PUT', body: JSON.stringify({ ids }) }),
  },
}
