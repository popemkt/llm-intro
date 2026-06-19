import { defineAction } from "@agent-native/core";
import type { Block } from "@llm-intro/api-contract";
import { z } from "zod";
import type { createPresentationsService } from "../server/services/presentations.js";
import type { createSlidesService } from "../server/services/slides.js";

type PresentationsService = ReturnType<typeof createPresentationsService>;
type SlidesService = ReturnType<typeof createSlidesService>;

const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };

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
  };
}
