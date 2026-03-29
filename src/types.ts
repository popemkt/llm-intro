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
