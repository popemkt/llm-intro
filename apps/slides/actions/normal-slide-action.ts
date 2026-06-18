import { defineAction } from "@agent-native/core";
import { z } from "zod";
import type { createSlidesService } from "../server/services/slides.js";
import { buildNormalSlideBlocks, NORMAL_SLIDE_LAYOUTS } from "./normal-slide-layouts.js";

type SlidesService = ReturnType<typeof createSlidesService>;

const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

export function createNormalSlideAction(slidesService: SlidesService) {
  return defineAction({
    description:
      "Create a themeable DB-backed slide using one of the standard normal slide layouts.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      layout: z.enum(NORMAL_SLIDE_LAYOUTS),
      title: z.string().optional(),
      label: z.string().optional(),
      subtitle: z.string().optional(),
      bullets: z.array(z.string()).optional(),
      leftBullets: z.array(z.string()).optional(),
      rightBullets: z.array(z.string()).optional(),
      quote: z.string().optional(),
      attribution: z.string().optional(),
      metrics: z
        .array(
          z.object({
            value: z.string(),
            label: z.string(),
          }),
        )
        .optional(),
      visualDescription: z.string().optional(),
    }),
    http: {
      method: "POST",
      path: "create-normal-slide",
    },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Create normal slide",
      description:
        "Create a standard, themeable slide layout: title, section, bullets, two-column, quote, metrics, or closing.",
    },
    run: ({ pid, layout, ...input }) =>
      slidesService.create(pid, {
        title: input.title?.trim() || `${layout} slide`,
        blocks: buildNormalSlideBlocks({ layout, ...input }),
      }),
  });
}
