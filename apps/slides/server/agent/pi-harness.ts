import {
  getAgentHarnessEntry,
  isAgentHarnessPackageInstalled,
  registerBuiltinAgentHarnesses,
} from "@agent-native/core/agent/harness";

/**
 * Product-chat harness gate.
 *
 * The product chat runs turns through Pi's NATIVE SDK (`pi-session.ts`,
 * `createAgentSession`) so it uses the locally-authed provider/OAuth rather than an
 * env API key. This module is only the opt-in toggle + readiness check: the chat
 * route turns on the Pi branch when `SLIDES_AGENT_HARNESS` is set and the runtime
 * package resolves; default stays the zero-dependency deterministic App Mode.
 *
 * The heavier `AgentHarnessAdapter` path (`@ai-sdk/harness-pi`, sandbox, host tools)
 * was removed here: it runs each session in a hermetic throwaway dir and demands an
 * env key, so it can't see the host `pi login` creds — the wrong abstraction for a
 * chat assistant. See `pi-session.ts` for the rationale and the AgentEngine TODO.
 */

let builtinsRegistered = false;

function ensureBuiltinsRegistered(): void {
  if (builtinsRegistered) return;
  registerBuiltinAgentHarnesses();
  builtinsRegistered = true;
}

/** Configured harness name (e.g. "ai-sdk-harness:pi"), or null when disabled. */
export function configuredHarnessName(): string | null {
  const name = process.env.SLIDES_AGENT_HARNESS?.trim();
  return name ? name : null;
}

/** True when the named harness is registered and its runtime packages resolve. */
export function isHarnessReady(name: string): boolean {
  ensureBuiltinsRegistered();
  const entry = getAgentHarnessEntry(name);
  if (!entry) return false;
  return isAgentHarnessPackageInstalled({ installPackage: entry.installPackage });
}
