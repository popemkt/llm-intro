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

const metricSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const normalSlideFieldsSchema = z.object({
  layout: z.enum(NORMAL_SLIDE_LAYOUTS),
  title: z.string().optional(),
  label: z.string().optional(),
  subtitle: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  leftBullets: z.array(z.string()).optional(),
  rightBullets: z.array(z.string()).optional(),
  quote: z.string().optional(),
  attribution: z.string().optional(),
  metrics: z.array(metricSchema).optional(),
  visualDescription: z.string().optional(),
});

function slideTitle(layout: string, title?: string) {
  return title?.trim() || `${layout} slide`;
}

export function createNormalSlideAction(slidesService: SlidesService) {
  return defineAction({
    description:
      "Create a themeable DB-backed slide using one of the standard normal slide layouts.",
    schema: z
      .object({ pid: z.coerce.number().int().positive() })
      .extend(normalSlideFieldsSchema.shape),
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
        title: slideTitle(layout, input.title),
        blocks: buildNormalSlideBlocks({ layout, ...input }),
      }),
  });
}

export function createNormalSlidesAction(slidesService: SlidesService) {
  return defineAction({
    description:
      "Create multiple themeable DB-backed slides from a structured outline of standard layouts.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      slides: z.array(normalSlideFieldsSchema).min(1).max(20),
    }),
    http: {
      method: "POST",
      path: "create-normal-slides",
    },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Create normal slides",
      description:
        "Create a sequence of standard, themeable slides from an outline while preserving the typed slide model.",
    },
    run: ({ pid, slides }) =>
      slides.map(({ layout, ...input }) =>
        slidesService.create(pid, {
          title: slideTitle(layout, input.title),
          blocks: buildNormalSlideBlocks({ layout, ...input }),
        }),
      ),
  });
}
