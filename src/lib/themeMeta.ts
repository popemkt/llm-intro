import type { ThemeName } from '@/types'

export const THEME_META: Record<ThemeName, { label: string; desc: string }> = {
  'dark-green': { label: 'Dark Green', desc: 'Terminal signal green' },
  'dark-blue': { label: 'Dark Blue', desc: 'Midnight cool blue' },
  'light': { label: 'Light', desc: 'Clean minimal light' },
  'neon': { label: 'Neon', desc: 'Vivid neon magenta' },
  'warm': { label: 'Warm', desc: 'Amber candlelight dark' },
  'ocean': { label: 'Ocean', desc: 'Deep teal seabed' },
}
