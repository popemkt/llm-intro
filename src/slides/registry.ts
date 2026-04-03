import type { ComponentType } from 'react'
import type { SlideProps } from '@/types'
import Opener            from './01-opener'
import LinearRegression  from './02-linear-regression'
import Context           from './03-context'
import ToolUse           from './04-tool-use'
import ClaudeDesktop     from './05-claude-desktop'
import BrowserControl    from './06-browser-control'
import WorkspaceSetup    from './07-workspace-setup'
import WorkspaceConcepts from './08-workspace-concepts'
import Appendix          from './09-appendix'

/** Maps the code_id stored in the DB to the React component that renders it. */
export const codeSlideRegistry: Record<string, ComponentType<SlideProps>> = {
  '01-opener':             Opener,
  '02-linear-regression':  LinearRegression,
  '03-context':            Context,
  '04-tool-use':           ToolUse,
  '05-claude-desktop':     ClaudeDesktop,
  '06-browser-control':    BrowserControl,
  '07-workspace-setup':    WorkspaceSetup,
  '08-workspace-concepts': WorkspaceConcepts,
  '09-appendix':           Appendix,
}
