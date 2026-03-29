import type { ComponentType } from 'react'

export interface SlideProps {
  isActive: boolean
}

export type ThemeName = 'dark-green' | 'dark-blue' | 'light' | 'neon'
export const THEME_NAMES: ThemeName[] = ['dark-green', 'dark-blue', 'light', 'neon']

// Block types for content slides
export type TextBlock   = { id: string; type: 'text';   markdown: string }
export type ImageBlock  = { id: string; type: 'image';  url: string; alt?: string }
export type IframeBlock = { id: string; type: 'iframe'; url: string; height?: number }
export type Block = TextBlock | ImageBlock | IframeBlock

// Shape returned by the API
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
  blocks: Block[]   // server returns parsed array
  created_at: string
  updated_at: string
}

// Discriminated union used by OverviewGrid + PresentationView
export type UnifiedSlide =
  | { kind: 'code'; id: number; title: string; component: ComponentType<SlideProps> }
  | { kind: 'db';   id: number; title: string; blocks: Block[]; theme: ThemeName }
