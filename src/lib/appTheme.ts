import type { ThemeName } from '@/types'
import { THEME_NAMES } from '@/types'

const STORAGE_KEY = 'app-theme'

const THEME_VARS: Record<ThemeName, Record<string, string>> = {
  'dark-green': {
    '--color-bg':         '#0d0f0e',
    '--color-surface':    '#141a17',
    '--color-border':     '#1f2d27',
    '--color-muted':      '#3a4d42',
    '--color-text':       '#e8f0eb',
    '--color-text-dim':   '#7a9985',
    '--color-accent':     '#25d366',
    '--color-accent-dim': '#1a9448',
    '--color-highlight':  '#00ffa3',
  },
  'dark-blue': {
    '--color-bg':         '#0c0e14',
    '--color-surface':    '#121620',
    '--color-border':     '#1d2540',
    '--color-muted':      '#2e3d6b',
    '--color-text':       '#e0e8ff',
    '--color-text-dim':   '#7a8fcc',
    '--color-accent':     '#4c9fff',
    '--color-accent-dim': '#2272c3',
    '--color-highlight':  '#7dd3ff',
  },
  'light': {
    '--color-bg':         '#f4f6f5',
    '--color-surface':    '#ffffff',
    '--color-border':     '#d8e0dc',
    '--color-muted':      '#a8bab2',
    '--color-text':       '#1a2420',
    '--color-text-dim':   '#5a7060',
    '--color-accent':     '#1a9448',
    '--color-accent-dim': '#0f6030',
    '--color-highlight':  '#00c060',
  },
  'neon': {
    '--color-bg':         '#050505',
    '--color-surface':    '#0f0f0f',
    '--color-border':     '#2a0a2a',
    '--color-muted':      '#4a1a4a',
    '--color-text':       '#f0d0f0',
    '--color-text-dim':   '#a060a0',
    '--color-accent':     '#ff00ff',
    '--color-accent-dim': '#aa00aa',
    '--color-highlight':  '#ff80ff',
  },
  'warm': {
    '--color-bg':         '#1a1208',
    '--color-surface':    '#241a0e',
    '--color-border':     '#3d2d18',
    '--color-muted':      '#5a4530',
    '--color-text':       '#f2e4c4',
    '--color-text-dim':   '#9e8060',
    '--color-accent':     '#e8a030',
    '--color-accent-dim': '#b07820',
    '--color-highlight':  '#ffc84a',
  },
  'ocean': {
    '--color-bg':         '#080f18',
    '--color-surface':    '#0d1a28',
    '--color-border':     '#152a40',
    '--color-muted':      '#1e4060',
    '--color-text':       '#c8e8f4',
    '--color-text-dim':   '#5a9ab8',
    '--color-accent':     '#00d4aa',
    '--color-accent-dim': '#009980',
    '--color-highlight':  '#40ffdd',
  },
}

export function getStoredAppTheme(): ThemeName {
  const stored = localStorage.getItem(STORAGE_KEY)
  return THEME_NAMES.includes(stored as ThemeName) ? (stored as ThemeName) : 'dark-green'
}

/** Sets CSS vars as inline styles on <html> — always wins the cascade. */
export function applyAppTheme(theme: ThemeName) {
  const vars = THEME_VARS[theme]
  const root = document.documentElement
  Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val))
  localStorage.setItem(STORAGE_KEY, theme)
}
