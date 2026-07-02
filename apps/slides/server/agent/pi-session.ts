import { readFileSync } from "node:fs";
import path from "node:path";

import { sendAgentHarnessEvent } from "@agent-native/core/agent/harness";
import {
  AuthStorage,
  ModelRegistry,
  createAgentSession,
  getAgentDir,
} from "@earendil-works/pi-coding-agent";

/**
 * Product-chat backend on Pi's NATIVE SDK (`createAgentSession`).
 *
 * Why not `@ai-sdk/harness-pi`: that wrapper runs each session in a hermetic
 * throwaway agent dir (`tmpdir()/ai-sdk-harness/pi/<id>`), so it never sees the
 * host `~/.pi/agent` login and demands an env API key. `createAgentSession`
 * defaults to the real agent dir + auth.json, so it uses whatever provider you
 * authed locally (`pi login`) — OAuth or key, any provider. The model picker
 * (pi-models.ts) reads the same AuthStorage, so picker and turn stay aligned.
 *
 * Tools are disabled (`noTools: "all"`): this is a chat assistant, not a
 * server-side coding agent. Deck mutations stay on the deterministic app-actions.
 *
 * TODO(interop): wrap this as a `PiAgentEngine` (the open `registerAgentEngine`
 * seam) so the everything-app dispatch / A2A / sub-agent callers route through the
 * same engine the product chat uses. Pi's native session owns its own loop, so the
 * engine would stream off `@earendil-works/pi-ai` `stream(model, ctx, opts)` (raw
 * round-trip, OAuth-capable) rather than this `createAgentSession` wrapper. Until
 * then this native runner is the chat backend; AgentEngine stays the future home.
 */

const THINKING_LEVELS = new Set(["off", "minimal", "low", "medium", "high", "xhigh"]);

export type PiChatTurnResult = { text: string };

function realAuthStorage() {
  return AuthStorage.create(path.join(getAgentDir(), "auth.json"));
}

/** The local default model id (settings.json), or null. Matches the picker default. */
function readDefaultModelId(): string | null {
  try {
    const raw = readFileSync(path.join(getAgentDir(), "settings.json"), "utf8");
    const value = (JSON.parse(raw) as { defaultModel?: unknown }).defaultModel;
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Find a locally-authed model by id. Falls back to the local default (settings.json
 * `defaultModel`) — NOT `available[0]` — so a no-model turn matches the picker's
 * default and avoids ids a ChatGPT-account Codex rejects (e.g. `gpt-5.2`).
 */
function findAuthedModel(authStorage: ReturnType<typeof realAuthStorage>, id?: string) {
  const available = ModelRegistry.create(authStorage).getAvailable();
  const wanted = id ?? readDefaultModelId() ?? undefined;
  if (wanted) {
    const exact = available.find((m) => m.id === wanted);
    if (exact) return exact;
  }
  return available[0];
}

/** Pull plain text out of a Pi assistant message (content is parts or a string). */
function assistantText(message: unknown): string {
  const content = (message as { content?: unknown })?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        part && typeof part === "object" && (part as { type?: string }).type === "text"
          ? String((part as { text?: unknown }).text ?? "")
          : "",
      )
      .join("");
  }
  return "";
}

/**
 * Run one product-chat turn through Pi's native agent session, forwarding output
 * to `send` as canonical AgentHarness events. Returns the accumulated assistant
 * text so the caller can persist the thread. Never resolves silently on a model
 * error — emits a `{type:"error"}` event and returns the text gathered so far.
 */
export async function runPiChatTurn(opts: {
  prompt: string;
  cwd?: string;
  model?: string;
  effort?: string;
  signal?: AbortSignal;
  send: (event: unknown) => void;
}): Promise<PiChatTurnResult> {
  const emit = sendAgentHarnessEvent as (
    send: (event: unknown) => void,
    event: { type: string; [k: string]: unknown },
  ) => void;

  const authStorage = realAuthStorage();
  const model = findAuthedModel(authStorage, opts.model);
  const thinkingLevel = opts.effort && THINKING_LEVELS.has(opts.effort) ? opts.effort : undefined;

  const { session } = await createAgentSession({
    authStorage,
    ...(model ? { model } : {}),
    ...(thinkingLevel ? { thinkingLevel } : {}),
    ...(opts.cwd ? { cwd: opts.cwd } : {}),
    noTools: "all",
  } as Parameters<typeof createAgentSession>[0]);

  let text = "";
  const unsubscribe = session.subscribe((event: { type: string; message?: unknown }) => {
    if (event.type !== "message_end") return;
    const message = event.message as { role?: string; stopReason?: string; errorMessage?: string };
    if (message?.role !== "assistant") return;
    if (message.stopReason === "error") {
      emit(opts.send, {
        type: "error",
        error: message.errorMessage ?? "Pi model turn failed.",
      });
      return;
    }
    const chunk = assistantText(message);
    if (chunk) {
      text += chunk;
      emit(opts.send, { type: "text-delta", text: chunk });
    }
  });

  try {
    await session.prompt(opts.prompt);
  } finally {
    unsubscribe?.();
    await (session as { destroy?: () => Promise<void> }).destroy?.();
  }
  return { text };
}
