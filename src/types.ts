import type { ComponentType } from 'react'
import type { Block, ThemeName } from '../shared/api'

export type { ApiPresentation, ApiSlide, Block, ShapeBlock, ThemeName } from '../shared/api'
export { THEME_NAMES } from '../shared/api'

export interface SlideProps {
  isActive: boolean
}

// Discriminated union used by OverviewGrid + PresentationView
export type UnifiedSlide =
  | { kind: 'code'; id: number; title: string; component: ComponentType<SlideProps> }
  | { kind: 'db';   id: number; title: string; blocks: Block[]; theme: ThemeName }
