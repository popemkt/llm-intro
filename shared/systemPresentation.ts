import type { ThemeName } from './api'

export const SYSTEM_PRESENTATION_KEY = 'llm-intro'
export const SYSTEM_PRESENTATION_NAME = 'LLM & Agent Basics'
export const SYSTEM_PRESENTATION_THEME: ThemeName = 'dark-green'

export const BUILT_IN_SLIDES = [
  { code_id: '01-opener', title: 'What is an LLM?' },
  { code_id: '02-linear-regression', title: 'Linear Regression -> LLM' },
  { code_id: '03-tool-use', title: 'Tool Use / Agent Loop' },
  { code_id: '04-claude-desktop', title: 'Claude Desktop' },
  { code_id: '05-browser-control', title: 'Browser Control (Playwright)' },
  { code_id: '06-workspace-setup', title: 'Workspace Setup' },
  { code_id: '07-workspace-concepts', title: 'Workspace Concepts' },
  { code_id: '08-appendix', title: 'Tech Landscape (Appendix)' },
] as const
