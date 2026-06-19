import { defineAction } from "@agent-native/core";
import { THEME_NAMES, type Block, type ThemeName } from "@llm-intro/api-contract";
import { z } from "zod";
import type { createPresentationsService } from "../server/services/presentations.js";
import type { createSlidesService } from "../server/services/slides.js";

type PresentationsService = ReturnType<typeof createPresentationsService>;
type SlidesService = ReturnType<typeof createSlidesService>;

const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };
const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

type ParsedMarkdownSlide = {
  title: string;
  markdown: string;
  notes: string;
};

const importDeckMarkdownSchema = z.object({
  name: z.string().optional(),
  markdown: z.string().min(1),
  theme: z.enum(THEME_NAMES as [ThemeName, ...ThemeName[]]).optional(),
});

function sortedBlocks(blocks: Block[]) {
  return [...blocks].sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0));
}

function blockToMarkdown(block: Block) {
  switch (block.type) {
    case "text":
      return block.markdown.trim();
    case "image":
      return `![${block.alt?.trim() || "Slide image"}](${block.url})`;
    case "iframe":
      return `[Embedded frame](${block.url})`;
    case "shape":
      return block.label?.trim() ? `> ${block.label.trim()}` : "";
  }
}

function slideToMarkdown(index: number, slide: ReturnType<SlidesService["list"]>[number]) {
  const lines = [`## ${index + 1}. ${slide.title}`];

  if (slide.kind === "code") {
    lines.push("", `Code slide: \`${slide.code_id ?? "unknown"}\``);
  } else {
    const blockMarkdown = sortedBlocks(slide.blocks).map(blockToMarkdown).filter(Boolean);
    if (blockMarkdown.length > 0) lines.push("", blockMarkdown.join("\n\n"));
  }

  if (slide.notes.trim()) {
    lines.push("", "### Speaker Notes", "", slide.notes.trim());
  }

  return lines.join("\n");
}

function stripNumberedSlidePrefix(title: string) {
  return title.replace(/^\d+[).:-]?\s+/, "").trim();
}

function parseMarkdownDeck(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const titleLine = lines.find((line) => /^#\s+/.test(line));
  const themeLine = lines.find((line) => /^Theme:\s*/i.test(line));
  const themeMatch = themeLine?.match(/Theme:\s*`?([a-z-]+)`?/i)?.[1] as ThemeName | undefined;
  const theme = themeMatch && THEME_NAMES.includes(themeMatch) ? themeMatch : undefined;
  const deckName = titleLine?.replace(/^#\s+/, "").trim();

  const slides: ParsedMarkdownSlide[] = [];
  let current: { title: string; body: string[] } | null = null;

  for (const line of lines) {
    const slideMatch = line.match(/^##\s+(.+)$/);
    if (slideMatch) {
      if (current) slides.push(parseSlideSection(current.title, current.body));
      current = { title: stripNumberedSlidePrefix(slideMatch[1] ?? "Untitled slide"), body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }

  if (current) slides.push(parseSlideSection(current.title, current.body));

  return {
    name: deckName || "Imported Markdown deck",
    theme,
    slides,
  };
}

function parseSlideSection(title: string, bodyLines: string[]): ParsedMarkdownSlide {
  const notesIndex = bodyLines.findIndex((line) => /^###\s+Speaker Notes\s*$/i.test(line.trim()));
  const contentLines = notesIndex >= 0 ? bodyLines.slice(0, notesIndex) : bodyLines;
  const notesLines = notesIndex >= 0 ? bodyLines.slice(notesIndex + 1) : [];
  const markdown = contentLines.join("\n").trim();
  const notes = notesLines.join("\n").trim();
  return {
    title: title || "Untitled slide",
    markdown,
    notes,
  };
}

function textBlock(markdown: string): Block[] {
  return markdown
    ? [
        {
          id: "body",
          type: "text",
          markdown,
          x: 8,
          y: 18,
          w: 84,
          h: 68,
        },
      ]
    : [];
}

export function createDeckMarkdownActions(services: {
  presentationsService: PresentationsService;
  slidesService: SlidesService;
}) {
  return {
    "export-deck-markdown": defineAction({
      description: "Export a deck as readable Markdown text.",
      schema: z.object({
        id: z.coerce.number().int().positive(),
      }),
      http: { method: "GET", path: "export-deck-markdown" },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        ...publicReadAction,
        title: "Export deck Markdown",
        description: "Export a deck as readable Markdown text.",
      },
      run: ({ id }) => {
        const deck = services.presentationsService.get(id);
        const slides = services.slidesService.list(id);
        const markdown = [
          `# ${deck.name}`,
          "",
          `Theme: \`${deck.theme}\``,
          "",
          ...slides.map((slide, index) => slideToMarkdown(index, slide)),
        ].join("\n\n");

        return {
          id: deck.id,
          name: deck.name,
          format: "markdown",
          slideCount: slides.length,
          markdown,
        };
      },
    }),

    "import-deck-markdown": defineAction({
      description: "Import readable Markdown as a new typed deck.",
      schema: importDeckMarkdownSchema,
      http: { method: "POST", path: "import-deck-markdown" },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Import deck Markdown",
        description: "Import readable Markdown as a new typed deck.",
      },
      run: (input) => {
        const source = importDeckMarkdownSchema.parse(input);
        const parsed = parseMarkdownDeck(source.markdown);
        const deck = services.presentationsService.create({
          name: source.name?.trim() || parsed.name,
          theme: source.theme ?? parsed.theme ?? "dark-green",
        });
        const slides = parsed.slides.map((slide) =>
          services.slidesService.create(deck.id, {
            title: slide.title,
            blocks: textBlock(slide.markdown),
            notes: slide.notes,
          }),
        );

        return {
          deck,
          slides,
          importedSlideCount: slides.length,
        };
      },
    }),
  };
}
