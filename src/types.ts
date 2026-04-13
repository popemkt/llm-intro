import type { ComponentType } from 'react'
import type { Block, ThemeName } from '../shared/api'

export type { ApiPresentation, ApiSlide, ApiSlideGroup, Block, LayoutInput, ShapeBlock, ThemeName } from '../shared/api'
export { THEME_NAMES } from '../shared/api'

export interface SlideProps {
  isActive: boolean
}

// Discriminated union used by OverviewGrid + PresentationView
export type UnifiedSlide =
  | { kind: 'code'; id: number; groupId: number | null; title: string; component: ComponentType<SlideProps> }
  | { kind: 'db';   id: number; groupId: number | null; title: string; blocks: Block[]; theme: ThemeName }
