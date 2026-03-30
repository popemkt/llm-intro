import type { ThemeName } from '@/types'
import { THEME_NAMES } from '@/types'

const STORAGE_KEY = 'app-theme'

export function getStoredAppTheme(): ThemeName {
  const stored = localStorage.getItem(STORAGE_KEY)
  return THEME_NAMES.includes(stored as ThemeName) ? (stored as ThemeName) : 'dark-green'
}

export function applyAppTheme(theme: ThemeName) {
  const root = document.documentElement
  if (theme === 'dark-green') root.removeAttribute('data-app-theme')
  else root.setAttribute('data-app-theme', theme)
  localStorage.setItem(STORAGE_KEY, theme)
}
