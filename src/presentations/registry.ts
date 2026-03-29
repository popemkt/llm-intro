import type { SlideDefinition } from '@/types'
import { slides as llmIntroSlides } from '@/slides/index'

export interface CodePresentation {
  slug: string
  name: string
  description: string
  slides: SlideDefinition[]
}

export const codePresentations: CodePresentation[] = [
  {
    slug: 'llm-intro',
    name: 'LLM & Agent Basics',
    description: 'Intro to LLMs, tool use, Claude Desktop, and browser automation with Playwright',
    slides: llmIntroSlides,
  },
]
