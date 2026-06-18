import type { Block } from '@llm-intro/api-contract'

export const NORMAL_SLIDE_LAYOUTS = [
  'title',
  'section',
  'bullets',
  'two-column',
  'quote',
  'metrics',
  'closing',
] as const

export type NormalSlideLayout = typeof NORMAL_SLIDE_LAYOUTS[number]

type Metric = {
  value: string
  label: string
}

export type NormalSlideInput = {
  layout: NormalSlideLayout
  title?: string
  label?: string
  subtitle?: string
  bullets?: string[]
  leftBullets?: string[]
  rightBullets?: string[]
  quote?: string
  attribution?: string
  metrics?: Metric[]
  visualDescription?: string
}

type Rect = {
  x: number
  y: number
  w: number
  h: number
}

function text(id: string, markdown: string, rect: Rect): Block {
  return { id, type: 'text', markdown, ...rect }
}

function shape(id: string, label: string, rect: Rect): Block {
  return {
    id,
    type: 'shape',
    shape: 'rect',
    color: '#1f2d27',
    label,
    ...rect,
  }
}

function bulletMarkdown(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- Key point'
}

function metricMarkdown(metrics: Metric[]) {
  const values = metrics.length > 0 ? metrics.slice(0, 3) : [
    { value: '3x', label: 'Faster iteration' },
    { value: '80%', label: 'Less manual work' },
    { value: '24/7', label: 'Available context' },
  ]

  return values.map((metric) => `## ${metric.value}\n${metric.label}`).join('\n\n')
}

type LayoutBuilder = (input: NormalSlideInput, title: string, label?: string, subtitle?: string) => Block[]

const layoutBuilders: Record<NormalSlideLayout, LayoutBuilder> = {
  title: (_input, title, label, subtitle) => [
    text('label', label ? label.toUpperCase() : 'PRESENTATION', { x: 8, y: 16, w: 42, h: 8 }),
    text('title', `# ${title}`, { x: 8, y: 33, w: 72, h: 22 }),
    text('subtitle', subtitle || 'Add a subtitle or presenter note', { x: 8, y: 60, w: 54, h: 10 }),
  ],

  section: (_input, title, label) => [
    text('label', label ? label.toUpperCase() : 'SECTION', { x: 8, y: 24, w: 28, h: 8 }),
    text('title', `# ${title}`, { x: 8, y: 38, w: 78, h: 24 }),
  ],

  bullets: (input, title, label) => [
    text('label', label ? label.toUpperCase() : 'OVERVIEW', { x: 8, y: 10, w: 42, h: 7 }),
    text('title', `## ${title}`, { x: 8, y: 20, w: 72, h: 15 }),
    text('bullets', bulletMarkdown(input.bullets ?? []), { x: 10, y: 42, w: 76, h: 38 }),
  ],

  'two-column': (input, title, label) => [
    text('label', label ? label.toUpperCase() : 'DETAILS', { x: 8, y: 10, w: 42, h: 7 }),
    text('title', `## ${title}`, { x: 8, y: 20, w: 76, h: 13 }),
    text('left', bulletMarkdown(input.leftBullets ?? input.bullets ?? []), { x: 8, y: 40, w: 38, h: 42 }),
    input.visualDescription
      ? shape('visual', input.visualDescription, { x: 54, y: 40, w: 36, h: 42 })
      : text('right', bulletMarkdown(input.rightBullets ?? ['Supporting detail', 'Second point']), { x: 54, y: 40, w: 36, h: 42 }),
  ],

  quote: (input, title, _label, subtitle) => [
    shape('rule', '', { x: 8, y: 24, w: 8, h: 1.2 }),
    text('quote', `# "${input.quote?.trim() || title}"`, { x: 8, y: 34, w: 78, h: 26 }),
    text('attribution', input.attribution?.trim() || subtitle || 'Attribution', { x: 8, y: 66, w: 46, h: 8 }),
  ],

  metrics: (input, title, label) => [
    text('label', label ? label.toUpperCase() : 'METRICS', { x: 8, y: 10, w: 42, h: 7 }),
    text('title', `## ${title}`, { x: 8, y: 20, w: 76, h: 13 }),
    text('metrics', metricMarkdown(input.metrics ?? []), { x: 8, y: 44, w: 84, h: 34 }),
  ],

  closing: (_input, title, label, subtitle) => [
    text('label', label ? label.toUpperCase() : 'NEXT STEPS', { x: 8, y: 20, w: 42, h: 8 }),
    text('title', `# ${title}`, { x: 8, y: 36, w: 74, h: 22 }),
    text('subtitle', subtitle || 'Add the call to action or contact details', { x: 8, y: 65, w: 58, h: 10 }),
  ],
}

export function buildNormalSlideBlocks(input: NormalSlideInput): Block[] {
  const title = input.title?.trim() || 'Untitled slide'
  const label = input.label?.trim()
  const subtitle = input.subtitle?.trim()
  return layoutBuilders[input.layout](input, title, label, subtitle)
}
