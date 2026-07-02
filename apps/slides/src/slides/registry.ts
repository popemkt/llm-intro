import type { ComponentType } from "react";
import type { SlideProps } from "@/types";
import Opener from "./llm/01-opener";
import LinearRegression from "./llm/02-linear-regression";
import WordDimensions from "./llm/10-word-dimensions";
import PredictionInputs from "./llm/11-prediction-inputs";
import Context from "./llm/03-context";
import ToolUse from "./llm/04-tool-use";
import ClaudeDesktop from "./llm/05-claude-desktop";
import BrowserControl from "./llm/06-browser-control";
import WorkspaceSetup from "./llm/07-workspace-setup";
import WorkspaceConcepts from "./llm/08-workspace-concepts";
import Appendix from "./llm/09-appendix";
import SshTitle from "./ssh/01-title";
import SshWhat from "./ssh/02-what";
import SshProblem from "./ssh/03-problem";
import SshFlow from "./ssh/04-flow";
import SshKeyExchange from "./ssh/05-keyexchange";
import SshServerAuth from "./ssh/06-serverauth";
import SshClientAuth from "./ssh/07-clientauth";
import SshPubKey from "./ssh/08-pubkey";
import SshSymmetric from "./ssh/09-symmetric";
import SshGetStarted from "./ssh/10-getstarted";
import SshConfig from "./ssh/11-config";
import SshBeyond from "./ssh/12-beyond";
import SshSecurity from "./ssh/13-security";
import HarnessTitle from "./harness/00-title";
import HarnessTowerHistory from "./harness/01-tower-history";
import HarnessTowerToday from "./harness/02-tower-today";
import HarnessCast from "./harness/03-cast";
import HarnessWorld from "./harness/04-world";
import HarnessTyped from "./harness/05-typed";

/** Maps the code_id stored in the DB to the React component that renders it. */
export const codeSlideRegistry: Record<string, ComponentType<SlideProps>> = {
  "01-opener": Opener,
  "02-linear-regression": LinearRegression,
  "10-word-dimensions": WordDimensions,
  "11-prediction-inputs": PredictionInputs,
  "03-context": Context,
  "04-tool-use": ToolUse,
  "05-claude-desktop": ClaudeDesktop,
  "06-browser-control": BrowserControl,
  "07-workspace-setup": WorkspaceSetup,
  "08-workspace-concepts": WorkspaceConcepts,
  "09-appendix": Appendix,
  "ssh-01-title": SshTitle,
  "ssh-02-what": SshWhat,
  "ssh-03-problem": SshProblem,
  "ssh-04-flow": SshFlow,
  "ssh-05-keyexchange": SshKeyExchange,
  "ssh-06-serverauth": SshServerAuth,
  "ssh-07-clientauth": SshClientAuth,
  "ssh-08-pubkey": SshPubKey,
  "ssh-09-symmetric": SshSymmetric,
  "ssh-10-getstarted": SshGetStarted,
  "ssh-11-config": SshConfig,
  "ssh-12-beyond": SshBeyond,
  "ssh-13-security": SshSecurity,
  "harness-00-title": HarnessTitle,
  "harness-01-tower-history": HarnessTowerHistory,
  "harness-02-tower-today": HarnessTowerToday,
  "harness-03-cast": HarnessCast,
  "harness-04-world": HarnessWorld,
  "harness-05-typed": HarnessTyped,
};
