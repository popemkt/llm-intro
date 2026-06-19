import { Router } from "express";
import { THEME_META, THEME_NAMES, type ThemeName } from "@llm-intro/api-contract";
import { AppError } from "../errors.js";
import type { SlideDeckActions } from "../../actions/index.js";
import type { NormalSlideLayout } from "../../actions/normal-slide-layouts.js";

export type AppAgentRequest = {
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

const designSystemAliases = [
  { id: "signal-console", terms: ["signal console", "signal", "terminal", "green"] },
  { id: "midnight-workbench", terms: ["midnight workbench", "midnight", "workbench", "blue"] },
  { id: "clean-briefing", terms: ["clean briefing", "clean", "briefing", "light"] },
  { id: "neon-lab", terms: ["neon lab", "neon"] },
  { id: "warm-studio", terms: ["warm studio", "warm", "studio"] },
  { id: "ocean-system", terms: ["ocean system", "ocean", "teal"] },
];

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

function inferDeckName(prompt: string) {
  const firstLine = prompt.split(/\r?\n/)[0] ?? "";
  return inferTitle(firstLine, "Generated deck");
}

function inferExplicitDeckName(prompt: string) {
  const firstLine = prompt.split(/\r?\n/)[0] ?? "";
  const explicit = firstLine.match(/\b(?:called|titled|named)\s+(.+)$/i)?.[1]?.trim();
  return explicit ? explicit.replace(/[.!?]+$/, "") : undefined;
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

function formatThemeCatalog(result: unknown) {
  if (
    !result ||
    typeof result !== "object" ||
    !("themes" in result) ||
    !Array.isArray(result.themes)
  ) {
    return `Available themes: ${THEME_NAMES.join(", ")}.`;
  }

  return result.themes
    .map((theme) => {
      if (!theme || typeof theme !== "object" || !("name" in theme)) return null;
      const name = getText(theme.name);
      const label = "label" in theme ? getText(theme.label) : THEME_META[name as ThemeName]?.label;
      const desc = "desc" in theme ? getText(theme.desc) : THEME_META[name as ThemeName]?.desc;
      return `${name}${label ? ` (${label})` : ""}${desc ? `: ${desc}` : ""}`;
    })
    .filter(Boolean)
    .join("\n");
}

function formatDesignSystemCatalog(result: unknown) {
  if (
    !result ||
    typeof result !== "object" ||
    !("designSystems" in result) ||
    !Array.isArray(result.designSystems)
  ) {
    return "I could not read the design-system catalog.";
  }

  return result.designSystems
    .map((system) => {
      if (!system || typeof system !== "object" || !("id" in system)) return null;
      const id = getText(system.id);
      const name = "name" in system ? getText(system.name) : id;
      const theme = "theme" in system ? getText(system.theme) : "";
      const description = "description" in system ? getText(system.description) : "";
      return `${id}${name ? ` (${name})` : ""}${theme ? ` -> ${theme}` : ""}${
        description ? `: ${description}` : ""
      }`;
    })
    .filter(Boolean)
    .join("\n");
}

function inferDesignSystem(prompt: string) {
  const normalized = prompt.toLowerCase();
  return designSystemAliases.find(({ id, terms }) => {
    return normalized.includes(id) || terms.some((term) => normalized.includes(term));
  })?.id;
}

function inferDesignSystemTarget(normalized: string) {
  const mentionsApp = /\b(app|shell|chrome|workspace)\b/.test(normalized);
  const mentionsDeck = /\b(deck|slides?|presentation)\b/.test(normalized);
  if (mentionsApp && mentionsDeck) return "both";
  if (mentionsApp) return "app";
  return "deck";
}

function inferPositiveIntegerAfter(prompt: string, terms: string[]) {
  const termPattern = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const match = prompt.match(new RegExp(`\\b(?:${termPattern})\\s+(\\d+)\\b`, "i"));
  const value = Number(match?.[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function formatCurrentContext(result: unknown) {
  if (!result || typeof result !== "object") return "I cannot read the current app context yet.";
  const context = result as {
    url?: { pathname?: string } | null;
    navigation?: { label?: string; view?: string; deckId?: number; slideId?: number } | null;
  };
  const navigation = context.navigation;
  if (navigation?.label) return `Current screen: ${navigation.label}.`;
  if (navigation?.view) return `Current screen: ${navigation.view}.`;
  if (context.url?.pathname) return `Current path: ${context.url.pathname}.`;
  return "I cannot read the current app context yet.";
}

function formatActiveDeckContext(result: unknown) {
  if (!result || typeof result !== "object" || !("deck" in result)) {
    return "I cannot read the active deck context yet.";
  }
  const context = result as {
    deck?: { id?: number; name?: string; theme?: string } | null;
    slides?: unknown[];
    groups?: unknown[];
  };
  if (!context.deck) return "No active deck is open.";

  const slideCount = Array.isArray(context.slides) ? context.slides.length : 0;
  const groupCount = Array.isArray(context.groups) ? context.groups.length : 0;
  return [
    `Current deck: ${context.deck.name || `Deck ${context.deck.id}`}.`,
    `Theme: ${context.deck.theme || "unknown"}.`,
    `${slideCount} slide${slideCount === 1 ? "" : "s"}, ${groupCount} group${
      groupCount === 1 ? "" : "s"
    }.`,
  ].join("\n");
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

function responseTextForCreatedDeck(result: unknown) {
  if (!result || typeof result !== "object" || !("deck" in result)) {
    return "Created the deck from the outline.";
  }
  const deck = result.deck;
  const slides = "slides" in result && Array.isArray(result.slides) ? result.slides.length : 0;
  const name = deck && typeof deck === "object" && "name" in deck ? getText(deck.name) : "";
  const id = deck && typeof deck === "object" && "id" in deck ? Number(deck.id) : null;
  const suffix = id ? ` Open deck ${id} to review it.` : "";
  return `Created deck ${name ? `"${name}"` : "from the outline"} with ${slides} slides.${suffix}`;
}

function responseTextForPromptDeck(result: unknown) {
  if (!result || typeof result !== "object" || !("deck" in result)) {
    return "Created the deck from the prompt.";
  }
  return responseTextForCreatedDeck(result);
}

function responseTextForCreatedGroup(result: unknown) {
  const title =
    result && typeof result === "object" && "title" in result ? getText(result.title) : "";
  return `Created group ${title ? `"${title}"` : "in this deck"}.`;
}

function responseTextForExport(result: unknown) {
  if (!result || typeof result !== "object" || !("url" in result)) {
    return "The HTML export is ready.";
  }
  const url = getText(result.url);
  const name = "name" in result ? getText(result.name) : "";
  return `HTML export${name ? ` for "${name}"` : ""}: ${url}`;
}

function responseTextForJsonExport(result: unknown) {
  if (!result || typeof result !== "object") return "The typed JSON export is ready.";
  const deck =
    "deck" in result && result.deck && typeof result.deck === "object" ? result.deck : null;
  const groups = "groups" in result && Array.isArray(result.groups) ? result.groups.length : 0;
  const slides = "slides" in result && Array.isArray(result.slides) ? result.slides.length : 0;
  const name = deck && "name" in deck ? getText(deck.name) : "";
  return `Typed JSON export${name ? ` for "${name}"` : ""}: ${slides} slide${
    slides === 1 ? "" : "s"
  }, ${groups} group${groups === 1 ? "" : "s"}. Use export-deck-json for the full payload.`;
}

function responseTextForMarkdownExport(result: unknown) {
  if (!result || typeof result !== "object") return "The Markdown export is ready.";
  const name = "name" in result ? getText(result.name) : "";
  const slideCount = "slideCount" in result ? Number(result.slideCount) : 0;
  return `Markdown export${name ? ` for "${name}"` : ""}: ${slideCount} slide${
    slideCount === 1 ? "" : "s"
  }. Use export-deck-markdown for the full payload.`;
}

function responseTextForMarkdownImport(result: unknown) {
  if (!result || typeof result !== "object") return "Imported the Markdown deck.";
  const deck =
    "deck" in result && result.deck && typeof result.deck === "object" ? result.deck : null;
  const name = deck && "name" in deck ? getText(deck.name) : "";
  const deckId = deck && "id" in deck ? Number(deck.id) : null;
  const slideCount = "importedSlideCount" in result ? Number(result.importedSlideCount) : 0;
  const suffix = deckId ? ` Open deck ${deckId} to review it.` : "";
  return `Imported Markdown deck${name ? ` "${name}"` : ""} with ${slideCount} slide${
    slideCount === 1 ? "" : "s"
  }.${suffix}`;
}

function formatSnapshotList(result: unknown) {
  if (!Array.isArray(result)) return "I could not read the snapshot list.";
  if (result.length === 0) return "This deck has no snapshots yet.";

  return result
    .map((snapshot, index) => {
      const label =
        snapshot && typeof snapshot === "object" && "label" in snapshot
          ? getText(snapshot.label)
          : "";
      const slideCount =
        snapshot && typeof snapshot === "object" && "slide_count" in snapshot
          ? Number(snapshot.slide_count)
          : 0;
      return `${index + 1}. ${label || "Untitled snapshot"} (${slideCount} slide${
        slideCount === 1 ? "" : "s"
      })`;
    })
    .join("\n");
}

function responseTextForCreatedSnapshot(result: unknown) {
  if (!result || typeof result !== "object") return "Saved a deck snapshot.";
  const label = "label" in result ? getText(result.label) : "";
  const slideCount = "slide_count" in result ? Number(result.slide_count) : 0;
  return `Saved snapshot ${label ? `"${label}"` : ""} with ${slideCount} slide${
    slideCount === 1 ? "" : "s"
  }.`;
}

function responseTextForRestoredSnapshot(result: unknown) {
  if (!result || typeof result !== "object") return "Restored the deck snapshot.";
  const snapshot =
    "snapshot" in result && result.snapshot && typeof result.snapshot === "object"
      ? result.snapshot
      : null;
  const deck =
    "deck" in result && result.deck && typeof result.deck === "object" ? result.deck : null;
  const label = snapshot && "label" in snapshot ? getText(snapshot.label) : "";
  const deckName = deck && "name" in deck ? getText(deck.name) : "";
  return `Restored ${deckName ? `"${deckName}"` : "this deck"} from snapshot${
    label ? ` "${label}"` : ""
  }.`;
}

async function handleNavigationPrompt(
  actions: SlideDeckActions,
  prompt: string,
  normalized: string,
  deckId: number | null,
) {
  if (/\b(where am i|current (screen|page|context)|what (screen|page))\b/.test(normalized)) {
    const context = await runAction(actions["get-current-app-context"], {});
    return formatCurrentContext(context);
  }

  if (/\b(open|go to|navigate)\b.*\b(app )?settings\b/.test(normalized)) {
    await runAction(actions["navigate-app"], { view: "app-settings" });
    return "Opening app settings.";
  }

  if (/\b(open|go to|navigate)\b.*\bdecks?\b/.test(normalized)) {
    await runAction(actions["navigate-app"], { view: "decks" });
    return "Opening decks.";
  }

  if (/\b(open|go to|navigate)\b.*\bdeck settings\b/.test(normalized)) {
    const targetDeckId = inferPositiveIntegerAfter(prompt, ["deck"]) ?? deckId;
    if (!targetDeckId) return "Tell me which deck id to open settings for.";
    await runAction(actions["navigate-app"], { view: "deck-settings", deckId: targetDeckId });
    return `Opening deck ${targetDeckId} settings.`;
  }

  if (/\b(open|go to|navigate)\b.*\bslide\b/.test(normalized)) {
    const targetDeckId = inferPositiveIntegerAfter(prompt, ["deck"]) ?? deckId;
    const slideId = inferPositiveIntegerAfter(prompt, ["slide"]);
    if (!targetDeckId || !slideId) return "Tell me which deck id and slide id to open.";
    await runAction(actions["navigate-app"], {
      view: "slide-editor",
      deckId: targetDeckId,
      slideId,
    });
    return `Opening slide ${slideId} in deck ${targetDeckId}.`;
  }

  if (/\b(open|go to|navigate)\b.*\bdeck\b/.test(normalized)) {
    const targetDeckId = inferPositiveIntegerAfter(prompt, ["deck"]) ?? deckId;
    if (!targetDeckId) return "Tell me which deck id to open.";
    await runAction(actions["navigate-app"], { view: "deck", deckId: targetDeckId });
    return `Opening deck ${targetDeckId}.`;
  }

  return null;
}

async function handleDeckReadPrompt(
  actions: SlideDeckActions,
  normalized: string,
  deckId: number | null,
) {
  if (
    /\b(current|active)\b.*\bdeck\b/.test(normalized) ||
    /\bsummarize\b.*\bdeck\b/.test(normalized)
  ) {
    const context = await runAction(actions["get-active-deck-context"], deckId ? { deckId } : {});
    return formatActiveDeckContext(context);
  }

  if (!deckId) return null;

  if (/\b(list|show|summarize)\b.*\bslides?\b/.test(normalized)) {
    const slides = await runAction(actions["list-slides"], { pid: deckId });
    return `Slides in this deck:\n${formatSlideList(slides)}`;
  }

  if (/\b(list|show|summarize)\b.*\bgroups?\b/.test(normalized)) {
    const groups = await runAction(actions["list-groups"], { pid: deckId });
    return `Groups in this deck:\n${formatGroupList(groups)}`;
  }

  if (/\b(export|download)\b.*\bjson\b/.test(normalized)) {
    const result = await runAction(actions["export-deck-json"], { id: deckId });
    return responseTextForJsonExport(result);
  }

  if (/\b(export|download)\b.*\bmarkdown\b/.test(normalized)) {
    const result = await runAction(actions["export-deck-markdown"], { id: deckId });
    return responseTextForMarkdownExport(result);
  }

  if (/\b(export|download)\b/.test(normalized)) {
    const result = await runAction(actions["get-deck-export"], { id: deckId });
    return responseTextForExport(result);
  }

  if (/\b(list|show|summarize)\b.*\bsnapshots?\b/.test(normalized)) {
    const snapshots = await runAction(actions["list-deck-snapshots"], { pid: deckId });
    return `Snapshots in this deck:\n${formatSnapshotList(snapshots)}`;
  }

  return null;
}

async function handleThemePrompt(
  actions: SlideDeckActions,
  prompt: string,
  normalized: string,
  deckId: number | null,
) {
  if (/\b(list|show|what|available)\b.*\bdesign systems?\b/.test(normalized)) {
    const catalog = await runAction(actions["list-design-systems"], {});
    return `Available design systems:\n${formatDesignSystemCatalog(catalog)}`;
  }

  if (/\b(apply|use|set|change)\b.*\bdesign system\b/.test(normalized)) {
    const systemId = inferDesignSystem(prompt);
    if (!systemId) return "Pick a design system first. Try: list available design systems.";
    const target = inferDesignSystemTarget(normalized);
    if ((target === "deck" || target === "both") && !deckId) {
      return "Open a deck first, then I can apply a design system to it.";
    }
    const result = await runAction(actions["apply-design-system"], {
      systemId,
      target,
      deckId: target === "app" ? undefined : deckId,
    });
    const designSystem =
      result && typeof result === "object" && "designSystem" in result ? result.designSystem : null;
    const name =
      designSystem && typeof designSystem === "object" && "name" in designSystem
        ? getText(designSystem.name)
        : systemId;
    return `Applied ${name} to ${target}.`;
  }

  if (/\b(list|show|what|available)\b.*\bthemes?\b/.test(normalized)) {
    const catalog = await runAction(actions["get-theme-catalog"], {});
    return `Available themes:\n${formatThemeCatalog(catalog)}`;
  }

  if (/\b(change|set|update|apply)\b.*\bapp (shell )?themes?\b/.test(normalized)) {
    const theme = inferTheme(prompt);
    if (!theme) return `Pick one of these app themes: ${THEME_NAMES.join(", ")}.`;
    await runAction(actions["set-app-theme"], { theme });
    return `Changing the app shell theme to ${theme}.`;
  }

  return null;
}

async function handleSnapshotPrompt(
  actions: SlideDeckActions,
  prompt: string,
  normalized: string,
  deckId: number,
) {
  if (/\b(create|save|capture|make)\b.*\bsnapshots?\b/.test(normalized)) {
    const label = inferTitle(prompt, "Snapshot");
    const snapshot = await runAction(actions["create-deck-snapshot"], { pid: deckId, label });
    return responseTextForCreatedSnapshot(snapshot);
  }

  if (/\b(restore|revert|rollback|roll back)\b.*\bsnapshots?\b/.test(normalized)) {
    const snapshotId = inferPositiveIntegerAfter(prompt, ["snapshot"]);
    if (!snapshotId) {
      return "Tell me which snapshot id to restore, for example: restore snapshot 3.";
    }
    const restored = await runAction(actions["restore-deck-snapshot"], { pid: deckId, snapshotId });
    return responseTextForRestoredSnapshot(restored);
  }

  return null;
}

export async function handleAppAgentPrompt(actions: SlideDeckActions, body: AppAgentRequest) {
  const prompt = getText(body.prompt);
  const deckId = getDeckId(body.scope);
  const normalized = prompt.toLowerCase();
  const navigationResponse = await handleNavigationPrompt(actions, prompt, normalized, deckId);
  if (navigationResponse) return navigationResponse;

  const themeResponse = await handleThemePrompt(actions, prompt, normalized, deckId);
  if (themeResponse) return themeResponse;

  const readResponse = await handleDeckReadPrompt(actions, normalized, deckId);
  if (readResponse) return readResponse;

  if (/\b(import|create|make)\b.*\bmarkdown\b/.test(normalized)) {
    const result = await runAction(actions["import-deck-markdown"], { markdown: prompt });
    return responseTextForMarkdownImport(result);
  }

  if (/\b(create|make|generate)\b.*\bdeck\b/.test(normalized)) {
    const slides = outlineSlides(prompt);
    const name = inferDeckName(prompt);
    const theme = inferTheme(prompt) ?? "dark-green";
    if (slides.length === 0) {
      const result = await runAction(actions["create-deck-from-prompt"], {
        prompt,
        name: inferExplicitDeckName(prompt),
        theme,
        slideCount: 6,
      });
      return responseTextForPromptDeck(result);
    }
    const result = await runAction(actions["create-deck-from-outline"], { name, theme, slides });
    return responseTextForCreatedDeck(result);
  }

  if (!deckId) {
    return "Open a deck first, then I can list slides or create normal slides in that deck.";
  }

  if (/\b(change|set|update)\b.*\btheme\b/.test(normalized)) {
    const theme = inferTheme(prompt);
    if (!theme) return `Pick one of these themes: ${THEME_NAMES.join(", ")}.`;
    await runAction(actions["update-deck"], { id: deckId, theme });
    return `Changed this deck's theme to ${theme}.`;
  }

  const snapshotResponse = await handleSnapshotPrompt(actions, prompt, normalized, deckId);
  if (snapshotResponse) return snapshotResponse;

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
    "- summarize this deck",
    "- list available themes",
    "- save a snapshot of this deck",
    "- list slides",
    '- create a title slide called "Roadmap"',
    "- create a bullets slide with a short outline",
    "- export this deck as HTML",
    "- export this deck as JSON",
    "- export this deck as Markdown",
    "",
    "For repository code changes, switch to CLI mode and use your local Codex or Claude Code login.",
  ].join("\n");
}

export function createAppAgentRuntimeRouter(actions: SlideDeckActions) {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      res.json({ text: await handleAppAgentPrompt(actions, req.body as AppAgentRequest) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
