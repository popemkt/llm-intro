import { readFileSync } from "node:fs";
import { join } from "node:path";

import { AuthStorage, ModelRegistry, getAgentDir } from "@earendil-works/pi-coding-agent";

/**
 * Authed-model discovery for the product-chat model picker.
 *
 * Pi's `ModelRegistry.getAvailable()` returns only the models whose provider has
 * auth configured — read from the same `~/.pi/agent/auth.json` the harness uses —
 * so the picker lists exactly what the signed-in creds can drive. `pi login` (or a
 * provider key) is the single source; nothing here is hard-coded per provider.
 *
 * The packaged AgentPanel (`useChatModels`) only renders engines whose `name` is in
 * a fixed allowlist, so we bucket authed models into those names. The bucket name is
 * cosmetic to us: the `/agent-chat` SSE branch ignores `engine` and routes to the
 * harness, honoring only the picked `model` id. Models whose provider maps to no
 * bucket are dropped (and counted in `dropped`).
 */

// Engine names the packaged client will render; anything else is filtered out.
const OPENAI_ENGINE = "ai-sdk:openai";
const ANTHROPIC_ENGINE = "anthropic";
const GOOGLE_ENGINE = "ai-sdk:google";

type Bucket = { name: string; label: string; supportedModels: string[] };

export type HarnessEngine = {
  name: string;
  label: string;
  supportedModels: string[];
  // Some client versions read `models`; emit both for robustness.
  models: string[];
  packageInstalled: true;
  requiredEnvVars: string[];
  configured: true;
};

export type HarnessEnginesPayload = {
  engines: HarnessEngine[];
  current?: { engine: string; model: string };
  dropped: number;
};

function bucketForProvider(provider: string): { name: string; label: string } | null {
  const p = provider.toLowerCase();
  if (p.includes("anthropic") || p.includes("claude"))
    return { name: ANTHROPIC_ENGINE, label: "Anthropic (Pi)" };
  if (p.includes("google") || p.includes("gemini") || p.includes("vertex"))
    return { name: GOOGLE_ENGINE, label: "Google (Pi)" };
  if (p.includes("openai") || p.includes("codex") || p.includes("azure"))
    return { name: OPENAI_ENGINE, label: "OpenAI / Codex (Pi)" };
  // Other providers (openrouter, groq, xai, …) have no allowlisted bucket; the
  // packaged client cannot render them, so they are reported as dropped.
  return null;
}

function readDefaultModelId(): string | null {
  try {
    const raw = readFileSync(join(getAgentDir(), "settings.json"), "utf8");
    const value = (JSON.parse(raw) as { defaultModel?: unknown }).defaultModel;
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

function pickCurrent(engines: HarnessEngine[]): { engine: string; model: string } {
  const preferred = readDefaultModelId();
  if (preferred) {
    for (const engine of engines)
      if (engine.supportedModels.includes(preferred))
        return { engine: engine.name, model: preferred };
  }
  const first = engines[0];
  return { engine: first.name, model: first.supportedModels[0] };
}

/**
 * Enumerate the locally-authed Pi models, bucketed into client-renderable engines.
 * Never throws — returns an empty payload if Pi/auth is unavailable.
 */
export function getAuthedHarnessEngines(): HarnessEnginesPayload {
  let available: Array<{ id?: unknown; provider?: unknown }> = [];
  try {
    const authStorage = AuthStorage.create(join(getAgentDir(), "auth.json"));
    available = ModelRegistry.create(authStorage).getAvailable();
  } catch {
    return { engines: [], dropped: 0 };
  }

  const buckets = new Map<string, Bucket>();
  let dropped = 0;
  for (const model of available) {
    const id = typeof model.id === "string" ? model.id : "";
    const provider = typeof model.provider === "string" ? model.provider : "";
    if (!id) continue;
    const target = bucketForProvider(provider);
    if (!target) {
      dropped += 1;
      continue;
    }
    const bucket = buckets.get(target.name) ?? {
      name: target.name,
      label: target.label,
      supportedModels: [],
    };
    if (!bucket.supportedModels.includes(id)) bucket.supportedModels.push(id);
    buckets.set(target.name, bucket);
  }

  const engines: HarnessEngine[] = [...buckets.values()].map((bucket) => ({
    name: bucket.name,
    label: bucket.label,
    supportedModels: bucket.supportedModels,
    models: bucket.supportedModels,
    packageInstalled: true,
    requiredEnvVars: [],
    configured: true,
  }));

  if (engines.length === 0) return { engines: [], dropped };
  return { engines, current: pickCurrent(engines), dropped };
}
