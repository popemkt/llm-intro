import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { config } from "dotenv";
import { resolve } from "path";
import { z } from "zod";

const slideLayoutSchema = z.enum([
  "title",
  "section",
  "bullets",
  "two-column",
  "quote",
  "metrics",
  "closing",
]);

const localDeckDraftSchema = z.object({
  name: z.string().min(1).max(90),
  slides: z
    .array(
      z.object({
        layout: slideLayoutSchema,
        title: z.string().min(1).max(90),
        label: z.string().max(60).optional(),
        subtitle: z.string().max(180).optional(),
        body: z.string().max(320).optional(),
        quote: z.string().max(220).optional(),
        attribution: z.string().max(90).optional(),
        bullets: z.array(z.string().min(1).max(120)).max(6).optional(),
        leftTitle: z.string().max(60).optional(),
        rightTitle: z.string().max(60).optional(),
        leftBullets: z.array(z.string().min(1).max(120)).max(5).optional(),
        rightBullets: z.array(z.string().min(1).max(120)).max(5).optional(),
        metrics: z
          .array(z.object({ value: z.string().max(24), label: z.string().max(80) }))
          .max(4)
          .optional(),
      }),
    )
    .min(4)
    .max(12),
});

export type LocalDeckDraft = z.infer<typeof localDeckDraftSchema>;

export type LocalModelStatus = {
  available: boolean;
  provider: "openai-compatible";
  hosted: false;
  source: "local-env";
  model?: string;
  baseURL?: string;
  reason?: string;
};

export type LocalDeckModelProvider = {
  status: () => LocalModelStatus;
  draftDeck: (input: {
    prompt: string;
    name?: string;
    slideCount: number;
  }) => Promise<LocalDeckDraft>;
};

type Env = Record<string, string | undefined>;

let envLoaded = false;

function loadLocalModelEnv() {
  if (envLoaded) return;
  envLoaded = true;
  config({ path: resolve(process.cwd(), ".env"), quiet: true });
  config({ path: resolve(process.cwd(), "demos/.env"), quiet: true, override: false });
}

function configuredStatus(env: Env): LocalModelStatus {
  const baseURL = env.OPENAI_BASE_URL?.trim() || undefined;
  const apiKey = env.OPENAI_API_KEY?.trim() || (baseURL ? "local" : undefined);
  const model = env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";

  if (!apiKey) {
    return {
      available: false,
      provider: "openai-compatible",
      hosted: false,
      source: "local-env",
      model,
      reason: "Set OPENAI_API_KEY, or set OPENAI_BASE_URL for a local OpenAI-compatible server.",
    };
  }

  return {
    available: true,
    provider: "openai-compatible",
    hosted: false,
    source: "local-env",
    model,
    baseURL,
  };
}

export function createDisabledLocalDeckModelProvider(
  reason = "Local model provider disabled.",
): LocalDeckModelProvider {
  return {
    status: () => ({
      available: false,
      provider: "openai-compatible",
      hosted: false,
      source: "local-env",
      reason,
    }),
    async draftDeck() {
      throw new Error(reason);
    },
  };
}

export function createLocalDeckModelProvider(env: Env = process.env): LocalDeckModelProvider {
  loadLocalModelEnv();
  const status = configuredStatus(env);

  return {
    status: () => status,
    async draftDeck(input) {
      if (!status.available) {
        throw new Error(status.reason ?? "Local model provider is not configured.");
      }

      const provider = createOpenAI({
        baseURL: status.baseURL,
        apiKey: env.OPENAI_API_KEY?.trim() || "local",
      });

      const result = await generateObject({
        model: provider.chat(status.model ?? "gpt-5.4-mini"),
        schema: localDeckDraftSchema,
        prompt: [
          "Create a concise, editable slide deck draft as typed slide data.",
          "Use only these layouts: title, section, bullets, two-column, quote, metrics, closing.",
          "Prefer themeable slide content over raw HTML or visual styling instructions.",
          `Target slide count: ${input.slideCount}.`,
          input.name ? `Deck name: ${input.name}.` : "",
          `User prompt: ${input.prompt}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });

      return result.object;
    },
  };
}
