import type { ComponentType } from 'react'

export interface SlideProps {
  /** True when this is the active slide in presentation mode.
   *  Gates entrance animations — always false in overview thumbnails. */
  isActive: boolean
}

export interface SlideDefinition {
  id: number
  title: string
  component: ComponentType<SlideProps>
}

export type ThemeName = 'dark-green' | 'dark-blue' | 'light' | 'neon'

export const THEME_NAMES: ThemeName[] = ['dark-green', 'dark-blue', 'light', 'neon']

// Block types for DB-backed slides
export type TextBlock = { id: string; type: 'text'; markdown: string }
export type ImageBlock = { id: string; type: 'image'; url: string; alt?: string }
export type IframeBlock = { id: string; type: 'iframe'; url: string; height?: number }
export type Block = TextBlock | ImageBlock | IframeBlock

// DB-backed slide (as returned by the API)
export interface DbSlide {
  id: number
  presentation_id: number
  position: number
  title: string
  blocks: string  // JSON string
  created_at: string
  updated_at: string
}

export interface DbPresentation {
  id: number
  name: string
  theme: ThemeName
  created_at: string
  updated_at: string
}

// Unified slide for OverviewGrid + PresentationView
export type UnifiedSlide =
  | { kind: 'code'; id: number; title: string; component: ComponentType<SlideProps> }
  | { kind: 'db';   id: number; title: string; blocks: Block[]; theme: ThemeName }
