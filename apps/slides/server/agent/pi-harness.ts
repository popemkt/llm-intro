import {
  getAgentHarnessEntry,
  isAgentHarnessPackageInstalled,
  registerBuiltinAgentHarnesses,
  resolveAgentHarness,
  sendAgentHarnessEvent,
  type AgentHarnessEvent,
} from "@agent-native/core/agent/harness";

/**
 * Product-chat harness backend.
 *
 * Agent-Native ships built-in "harness agents" (Claude Code, Codex, Pi) that own
 * their own agent loop and native tools — distinct from the deterministic local
 * App Mode runtime. This module is the plumbing that lets the product chat
 * (`POST /_agent-native/agent-chat`) optionally run a turn through one of those
 * harnesses (default: Pi) and relay its native event stream back to the
 * AgentPanel as canonical AgentChatEvents.
 *
 * It is opt-in via the SLIDES_AGENT_HARNESS env var so the zero-dependency
 * deterministic App Mode stays the default. The harness runtime needs an LLM
 * provider/model configured; without one, createSession/streamTurn throws and
 * the caller surfaces the error (it does not silently degrade).
 *
 * Ref: https://www.agent-native.com/docs/harness-agents
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

export type HarnessTurnResult = { text: string };

/**
 * Run one product-chat turn through the named harness agent, forwarding native
 * harness events to `send` as canonical AgentChatEvents. Returns the accumulated
 * assistant text so the caller can persist the thread.
 */
export async function runHarnessChatTurn(opts: {
  name: string;
  prompt: string;
  cwd?: string;
  instructions?: string;
  signal?: AbortSignal;
  send: (event: unknown) => void;
}): Promise<HarnessTurnResult> {
  ensureBuiltinsRegistered();
  const adapter = resolveAgentHarness(opts.name);
  const session = await adapter.createSession({
    cwd: opts.cwd ?? process.cwd(),
    instructions: opts.instructions,
    permissionMode: "allow-reads",
    signal: opts.signal,
  });

  const emit = sendAgentHarnessEvent as (
    send: (event: unknown) => void,
    event: AgentHarnessEvent,
  ) => void;

  let text = "";
  try {
    for await (const event of session.streamTurn({
      prompt: opts.prompt,
      abortSignal: opts.signal,
    })) {
      if (event.type === "text-delta") text += event.text;
      emit(opts.send, event);
    }
  } finally {
    await session.destroy?.();
  }
  return { text };
}
