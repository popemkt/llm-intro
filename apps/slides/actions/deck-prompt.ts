import { defineAction } from "@agent-native/core";
import { THEME_NAMES, type ThemeName } from "@llm-intro/api-contract";
import { z } from "zod";
import type { createPresentationsService } from "../server/services/presentations.js";
import type { createSlidesService } from "../server/services/slides.js";
import {
  createDisabledLocalDeckModelProvider,
  type LocalDeckModelProvider,
} from "../server/local-model-provider.js";
import { buildNormalSlideBlocks } from "./normal-slide-layouts.js";
import type { NormalSlideInput } from "./normal-slide-layouts.js";
import { slideTitle } from "./normal-slide-action.js";

type PresentationsService = ReturnType<typeof createPresentationsService>;
type SlidesService = ReturnType<typeof createSlidesService>;

const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };
const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

const promptDeckSchema = z.object({
  prompt: z.string().min(8),
  name: z.string().optional(),
  theme: z.enum(THEME_NAMES).default("dark-green"),
  slideCount: z.coerce.number().int().min(4).max(12).default(6),
});

function cleanPhrase(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "")
    .trim();
}

function titleCase(value: string) {
  return cleanPhrase(value)
    .split(" ")
    .map((word) => (word.length <= 3 ? word : `${word[0]?.toUpperCase()}${word.slice(1)}`))
    .join(" ");
}

function inferTopic(prompt: string) {
  const match = prompt.match(/\b(?:about|for|on)\s+(.+?)(?:\s+with|\s+including|$)/i);
  const topic = match?.[1] ?? prompt.replace(/\b(create|generate|make)\b/gi, "");
  return titleCase(topic);
}

function inferDeckName(prompt: string, name?: string) {
  if (name?.trim()) return cleanPhrase(name);
  const named = prompt.match(/\b(?:called|titled|named)\s+["“]?(.+?)["”]?(?:$|[.;])/i)?.[1];
  return named ? cleanPhrase(named) : inferTopic(prompt);
}

function keywordBullets(prompt: string, topic: string) {
  const explicit = prompt
    .split(/including|with|covering/i)
    .slice(1)
    .join(" ")
    .split(/[;,]/)
    .map(cleanPhrase)
    .filter(Boolean)
    .slice(0, 4);

  return explicit.length > 0
    ? explicit
    : [
        `What ${topic} changes`,
        "Where the current workflow breaks down",
        "How the proposed approach improves the path",
      ];
}

function buildPromptDeckSlides(prompt: string, input: { name?: string; slideCount: number }) {
  const topic = inferTopic(prompt);
  const name = inferDeckName(prompt, input.name);
  const bullets = keywordBullets(prompt, topic);
  const slides: NormalSlideInput[] = [
    {
      layout: "title",
      title: name,
      label: "Generated deck",
      subtitle: `A practical walkthrough of ${topic}`,
    },
    { layout: "section", title: "Why it matters", label: topic },
    {
      layout: "bullets",
      title: "Current pressure",
      label: "Context",
      bullets,
    },
    {
      layout: "two-column",
      title: "Approach",
      label: "Plan",
      leftBullets: ["Keep the working product model", "Add framework-native actions"],
      rightBullets: ["Improve creation flow", "Preserve themeability and export"],
    },
    {
      layout: "metrics",
      title: "Signals to watch",
      metrics: [
        { value: "1", label: "Shared action surface" },
        { value: "3", label: "User-facing workflows" },
        { value: "0", label: "Raw HTML slide forks" },
      ],
    },
    {
      layout: "closing",
      title: "Next steps",
      subtitle: "Review, edit, and present the generated draft.",
    },
  ];

  return slides.slice(0, input.slideCount);
}

function deterministicPromptDeckDraft(
  prompt: string,
  input: { name?: string; slideCount: number },
) {
  return {
    name: inferDeckName(prompt, input.name),
    slides: buildPromptDeckSlides(prompt, input),
    source: "deterministic" as const,
  };
}

async function draftPromptDeck(
  localModelProvider: LocalDeckModelProvider,
  prompt: string,
  input: { name?: string; slideCount: number },
) {
  const status = localModelProvider.status();
  if (!status.available) return deterministicPromptDeckDraft(prompt, input);

  try {
    const draft = await localModelProvider.draftDeck({ prompt, ...input });
    return {
      name: draft.name,
      slides: draft.slides as NormalSlideInput[],
      source: "local-model" as const,
      model: status.model,
    };
  } catch (err) {
    return {
      ...deterministicPromptDeckDraft(prompt, input),
      modelError: err instanceof Error ? err.message : String(err),
    };
  }
}

export function createDeckPromptActions(
  presentationsService: PresentationsService,
  slidesService: SlidesService,
  localModelProvider: LocalDeckModelProvider = createDisabledLocalDeckModelProvider(),
) {
  return {
    "get-local-model-status": defineAction({
      description:
        "Report whether the local OpenAI-compatible model harness is available for prompt deck drafting.",
      schema: z.object({}),
      http: { method: "GET", path: "get-local-model-status" },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        ...publicReadAction,
        title: "Get local model status",
        description:
          "Report whether the local OpenAI-compatible model harness is available for prompt deck drafting.",
      },
      run: () => localModelProvider.status(),
    }),

    "draft-deck-from-prompt": defineAction({
      description: "Draft a typed normal-slide outline from a freeform deck prompt.",
      schema: promptDeckSchema,
      http: { method: "GET", path: "draft-deck-from-prompt" },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        ...publicReadAction,
        title: "Draft deck from prompt",
        description: "Draft a typed normal-slide outline from a freeform deck prompt.",
      },
      run: ({ prompt, name, slideCount }) =>
        draftPromptDeck(localModelProvider, prompt, { name, slideCount }),
    }),

    "create-deck-from-prompt": defineAction({
      description:
        "Create a new deck from a freeform prompt using standard themeable slide layouts.",
      schema: promptDeckSchema,
      http: { method: "POST", path: "create-deck-from-prompt" },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Create deck from prompt",
        description:
          "Create a new deck from a freeform prompt using standard themeable slide layouts.",
      },
      run: async ({ prompt, name, theme, slideCount }) => {
        const draft = await draftPromptDeck(localModelProvider, prompt, { name, slideCount });
        const deckName = draft.name;
        const deck = presentationsService.create({ name: deckName, theme: theme as ThemeName });
        const createdSlides = draft.slides.map(({ layout, ...slide }) =>
          slidesService.create(deck.id, {
            title: slideTitle(layout, slide.title),
            blocks: buildNormalSlideBlocks({ layout, ...slide }),
          }),
        );
        return { deck, slides: createdSlides, draft: draft.slides, draftSource: draft.source };
      },
    }),
  };
}
