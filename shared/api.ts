export type ThemeName = 'dark-green' | 'dark-blue' | 'light' | 'neon' | 'warm' | 'ocean'

export const THEME_NAMES: ThemeName[] = ['dark-green', 'dark-blue', 'light', 'neon', 'warm', 'ocean']

type BlockPos = {
  x?: number
  y?: number
  w?: number
  h?: number
}

export type TextBlock = { id: string; type: 'text'; markdown: string } & BlockPos
export type ImageBlock = { id: string; type: 'image'; url: string; alt?: string } & BlockPos
export type IframeBlock = { id: string; type: 'iframe'; url: string; height?: number } & BlockPos
export type ShapeBlock = {
  id: string
  type: 'shape'
  shape: 'rect' | 'pill' | 'circle'
  color: string
  label?: string
  width?: string
  height?: string
} & BlockPos

export type Block = TextBlock | ImageBlock | IframeBlock | ShapeBlock

export interface ApiPresentation {
  id: number
  name: string
  theme: ThemeName
  created_at: string
  updated_at: string
}

export interface ApiSlide {
  id: number
  presentation_id: number
  position: number
  kind: 'code' | 'db'
  code_id: string | null
  title: string
  blocks: Block[]
  created_at: string
  updated_at: string
}
