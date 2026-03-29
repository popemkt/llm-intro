import type { SlideDefinition } from '@/types'
import Opener            from './01-opener'
import LinearRegression  from './02-linear-regression'
import ToolUse           from './03-tool-use'
import ClaudeDesktop     from './04-claude-desktop'
import BrowserControl    from './05-browser-control'
import WorkspaceSetup    from './06-workspace-setup'
import WorkspaceConcepts from './07-workspace-concepts'
import Appendix          from './08-appendix'

export const slides: SlideDefinition[] = [
  { id: 1, title: 'What is an LLM?',             component: Opener            },
  { id: 2, title: 'Linear Regression → LLM',     component: LinearRegression  },
  { id: 3, title: 'Tool Use / Agent Loop',        component: ToolUse           },
  { id: 4, title: 'Claude Desktop',              component: ClaudeDesktop     },
  { id: 5, title: 'Browser Control (Playwright)', component: BrowserControl    },
  { id: 6, title: 'Workspace Setup',             component: WorkspaceSetup    },
  { id: 7, title: 'Workspace Concepts',          component: WorkspaceConcepts },
  { id: 8, title: 'Tech Landscape (Appendix)',   component: Appendix          },
]
