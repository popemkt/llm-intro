import type { ComponentType } from 'react'
import type { SlideProps } from '@/types'
import Opener            from './01-opener'
import LinearRegression  from './02-linear-regression'
import ToolUse           from './03-tool-use'
import ClaudeDesktop     from './04-claude-desktop'
import BrowserControl    from './05-browser-control'
import WorkspaceSetup    from './06-workspace-setup'
import WorkspaceConcepts from './07-workspace-concepts'
import Appendix          from './08-appendix'

/** Maps the code_id stored in the DB to the React component that renders it. */
export const codeSlideRegistry: Record<string, ComponentType<SlideProps>> = {
  '01-opener':            Opener,
  '02-linear-regression': LinearRegression,
  '03-tool-use':          ToolUse,
  '04-claude-desktop':    ClaudeDesktop,
  '05-browser-control':   BrowserControl,
  '06-workspace-setup':   WorkspaceSetup,
  '07-workspace-concepts': WorkspaceConcepts,
  '08-appendix':          Appendix,
}
