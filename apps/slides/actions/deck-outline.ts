import { defineAction } from "@agent-native/core";
import { THEME_NAMES } from "@llm-intro/api-contract";
import { z } from "zod";
import type { createPresentationsService } from "../server/services/presentations.js";
import type { createSlidesService } from "../server/services/slides.js";
import { buildNormalSlideBlocks } from "./normal-slide-layouts.js";
import { normalSlideFieldsSchema, slideTitle } from "./normal-slide-action.js";

type PresentationsService = ReturnType<typeof createPresentationsService>;
type SlidesService = ReturnType<typeof createSlidesService>;

const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

export function createDeckOutlineAction(
  presentationsService: PresentationsService,
  slidesService: SlidesService,
) {
  return defineAction({
    description:
      "Create a new deck and populate it with themeable normal slides from a structured outline.",
    schema: z.object({
      name: z.string().min(1),
      theme: z.enum(THEME_NAMES).default("dark-green"),
      slides: z.array(normalSlideFieldsSchema).min(1).max(30),
    }),
    http: {
      method: "POST",
      path: "create-deck-from-outline",
    },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Create deck from outline",
      description:
        "Create a deck and fill it with standard, themeable slides from a structured outline.",
    },
    run: ({ name, theme, slides }) => {
      const deck = presentationsService.create({ name, theme });
      const createdSlides = slides.map(({ layout, ...input }) =>
        slidesService.create(deck.id, {
          title: slideTitle(layout, input.title),
          blocks: buildNormalSlideBlocks({ layout, ...input }),
        }),
      );

      return { deck, slides: createdSlides };
    },
  });
}
