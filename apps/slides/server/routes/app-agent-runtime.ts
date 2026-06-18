import { Router } from "express";
import { AppError } from "../errors.js";
import type { SlideDeckActions } from "../../actions/index.js";

type AppAgentRequest = {
  prompt?: string;
  scope?: {
    type?: string;
    id?: string;
    label?: string;
  } | null;
};

type CallableAction = {
  run?: (args: unknown, context: { caller: "tool"; orgId: null }) => unknown | Promise<unknown>;
};

const normalLayoutKeywords = [
  { layout: "two-column", terms: ["two column", "two-column", "compare", "comparison"] },
  { layout: "bullets", terms: ["bullet", "bullets", "list", "points"] },
  { layout: "metrics", terms: ["metric", "metrics", "stats", "numbers"] },
  { layout: "quote", terms: ["quote", "quotation"] },
  { layout: "title", terms: ["title", "cover", "opening"] },
] as const;

function getDeckId(scope: AppAgentRequest["scope"]) {
  if (scope?.type !== "deck") return null;
  const id = Number(scope.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function inferTitle(prompt: string, fallback: string) {
  const quoted = prompt.match(/["“](.+?)["”]/)?.[1]?.trim();
  if (quoted) return quoted;

  const titled = prompt.match(/\b(?:called|titled|named)\s+(.+)$/i)?.[1]?.trim();
  if (titled) return titled.replace(/[.!?]+$/, "");

  return fallback;
}

function inferBullets(prompt: string) {
  const lines = prompt
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  return lines.length > 1 ? lines.slice(1, 6) : undefined;
}

function inferLayout(prompt: string) {
  const normalized = prompt.toLowerCase();
  return normalLayoutKeywords.find(({ terms }) => terms.some((term) => normalized.includes(term)))
    ?.layout;
}

async function runAction(action: unknown, args: unknown) {
  const callable = action as CallableAction | undefined;
  if (!callable || typeof callable.run !== "function") {
    throw new AppError(500, "app agent action is not available");
  }
  return callable.run(args, { caller: "tool", orgId: null });
}

function formatSlideList(result: unknown) {
  if (!Array.isArray(result)) return "I could not read the slide list.";
  if (result.length === 0) return "This deck has no slides yet.";

  return result
    .map((slide, index) => {
      const title =
        slide && typeof slide === "object" && "title" in slide ? getText(slide.title) : "";
      return `${index + 1}. ${title || "Untitled slide"}`;
    })
    .join("\n");
}

function responseTextForCreatedSlide(result: unknown) {
  const title =
    result && typeof result === "object" && "title" in result ? getText(result.title) : "";
  return `Created ${title ? `"${title}"` : "a normal slide"}.`;
}

async function handlePrompt(actions: SlideDeckActions, body: AppAgentRequest) {
  const prompt = getText(body.prompt);
  const deckId = getDeckId(body.scope);
  const normalized = prompt.toLowerCase();

  if (!deckId) {
    return "Open a deck first, then I can list slides or create normal slides in that deck.";
  }

  if (/\b(list|show|summarize)\b.*\bslides?\b/.test(normalized)) {
    const slides = await runAction(actions["list-slides"], { pid: deckId });
    return `Slides in this deck:\n${formatSlideList(slides)}`;
  }

  if (/\b(create|add|make)\b/.test(normalized) && /\bslide\b/.test(normalized)) {
    const layout = inferLayout(prompt) ?? "bullets";
    const title = inferTitle(prompt, `${layout} slide`);
    const result = await runAction(actions["create-normal-slide"], {
      pid: deckId,
      layout,
      title,
      bullets: layout === "bullets" ? inferBullets(prompt) : undefined,
    });
    return responseTextForCreatedSlide(result);
  }

  return [
    "I can work with this deck through app actions.",
    "",
    "Try:",
    "- list slides",
    '- create a title slide called "Roadmap"',
    "- create a bullets slide with a short outline",
    "",
    "For repository code changes, switch to CLI mode and use your local Codex or Claude Code login.",
  ].join("\n");
}

export function createAppAgentRuntimeRouter(actions: SlideDeckActions) {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      res.json({ text: await handlePrompt(actions, req.body as AppAgentRequest) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
