import { Router } from "express";
import { THEME_NAMES, type ThemeName } from "@llm-intro/api-contract";
import { AppError } from "../errors.js";
import type { SlideDeckActions } from "../../actions/index.js";
import type { NormalSlideLayout } from "../../actions/normal-slide-layouts.js";

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
  { layout: "closing", terms: ["closing", "close", "next steps"] },
  { layout: "section", terms: ["section", "chapter"] },
  { layout: "title", terms: ["title", "cover", "opening"] },
] satisfies { layout: NormalSlideLayout; terms: string[] }[];

const themeAliases: Record<string, ThemeName> = {
  "dark green": "dark-green",
  "dark-green": "dark-green",
  green: "dark-green",
  "dark blue": "dark-blue",
  "dark-blue": "dark-blue",
  blue: "dark-blue",
  light: "light",
  neon: "neon",
  warm: "warm",
  ocean: "ocean",
};

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

function inferTheme(prompt: string) {
  const normalized = prompt.toLowerCase();
  return THEME_NAMES.find((theme) => normalized.includes(theme)) ?? themeAliases[normalized];
}

function formatGroupList(result: unknown) {
  if (!Array.isArray(result)) return "I could not read the group list.";
  if (result.length === 0) return "This deck has no groups yet.";

  return result
    .map((group, index) => {
      const title =
        group && typeof group === "object" && "title" in group ? getText(group.title) : "";
      return `${index + 1}. ${title || "Untitled group"}`;
    })
    .join("\n");
}

function splitOutlineItems(prompt: string) {
  const quoted = [...prompt.matchAll(/["“](.+?)["”]/g)].map((match) => match[1]?.trim() ?? "");
  if (quoted.length > 1) return quoted.filter(Boolean).slice(0, 12);

  const lines = prompt
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

  if (lines.length > 1) return lines.slice(1, 13);

  return prompt
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(1, 13);
}

function outlineSlides(prompt: string) {
  return splitOutlineItems(prompt).map((item) => ({
    layout: inferLayout(item) ?? "bullets",
    title: inferTitle(item, item),
    bullets: inferBullets(item),
  }));
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

function responseTextForCreatedSlides(result: unknown) {
  if (!Array.isArray(result)) return "Created the slide sequence.";
  return `Created ${result.length} normal slides.`;
}

function responseTextForCreatedGroup(result: unknown) {
  const title =
    result && typeof result === "object" && "title" in result ? getText(result.title) : "";
  return `Created group ${title ? `"${title}"` : "in this deck"}.`;
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

  if (/\b(list|show|summarize)\b.*\bgroups?\b/.test(normalized)) {
    const groups = await runAction(actions["list-groups"], { pid: deckId });
    return `Groups in this deck:\n${formatGroupList(groups)}`;
  }

  if (/\b(change|set|update)\b.*\btheme\b/.test(normalized)) {
    const theme = inferTheme(prompt);
    if (!theme) return `Pick one of these themes: ${THEME_NAMES.join(", ")}.`;
    await runAction(actions["update-deck"], { id: deckId, theme });
    return `Changed this deck's theme to ${theme}.`;
  }

  if (/\b(create|add|make)\b.*\bgroups?\b/.test(normalized)) {
    const title = inferTitle(prompt, "Group");
    const group = await runAction(actions["create-group"], { pid: deckId, title });
    return responseTextForCreatedGroup(group);
  }

  if (/\b(create|add|make)\b/.test(normalized) && /\bslides\b/.test(normalized)) {
    const slides = outlineSlides(prompt);
    if (slides.length === 0) {
      return "Send a short outline with one slide per line, then I can create the slide sequence.";
    }
    const result = await runAction(actions["create-normal-slides"], { pid: deckId, slides });
    return responseTextForCreatedSlides(result);
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
