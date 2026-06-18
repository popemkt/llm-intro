/**
 * T — hardcoded hex values for code-backed slides (intentionally static).
 * C — CSS variable references for app-shell UI (responds to the active app theme).
 */
export const C = {
  bg:          'var(--color-bg)',
  surface:     'var(--color-surface)',
  border:      'var(--color-border)',
  muted:       'var(--color-muted)',
  text:        'var(--color-text)',
  textDim:     'var(--color-text-dim)',
  accent:      'var(--color-accent)',
  accentDim:   'var(--color-accent-dim)',
  highlight:   'var(--color-highlight)',
  accentSubtle:'color-mix(in srgb, var(--color-accent) 9%, transparent)',
} as const

/** JS colour constants — use these for inline SVG styles and canvas */
export const T = {
  bg:          '#0d0f0e',
  surface:     '#141a17',
  border:      '#1f2d27',
  muted:       '#3a4d42',
  text:        '#e8f0eb',
  textDim:     '#7a9985',
  accent:      '#25d366',
  accentDim:   '#1a9448',
  highlight:   '#00ffa3',
} as const
