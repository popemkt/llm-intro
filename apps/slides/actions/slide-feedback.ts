import { defineAction } from "@agent-native/core";
import { z } from "zod";
import type { createSlideFeedbackService } from "../server/services/slide-feedback.js";

type SlideFeedbackService = ReturnType<typeof createSlideFeedbackService>;

const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };
const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

const rectInput = z.object({
  h: z.coerce.number(),
  w: z.coerce.number(),
  x: z.coerce.number(),
  y: z.coerce.number(),
});

const locationInput = z
  .object({
    blockId: z.string().min(1).optional(),
    codeId: z.string().min(1).optional(),
    column: z.coerce.number().int().positive().optional(),
    domPath: z.string().min(1).optional(),
    elementLabel: z.string().min(1).optional(),
    line: z.coerce.number().int().positive().optional(),
    rect: rectInput.optional(),
    selector: z.string().min(1).optional(),
    sourceKind: z.enum(["code", "html", "manual"]).optional(),
    sourcePath: z.string().min(1).optional(),
  })
  .optional();

export function createSlideFeedbackActions(feedbackService: SlideFeedbackService) {
  return {
    "list-slide-feedback": defineAction({
      description: "List source-linked feedback comments for a deck or one slide.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
        slideId: z.coerce.number().int().positive().optional(),
      }),
      http: { method: "GET", path: "list-slide-feedback" },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        ...publicReadAction,
        title: "List slide feedback",
        description: "List source-linked feedback comments for a deck or one slide.",
      },
      run: ({ pid, slideId }) => feedbackService.list(pid, slideId),
    }),

    "create-slide-feedback": defineAction({
      description:
        "Create source-linked feedback for a code-backed or HTML slide by writing an Open Slide-style source marker.",
      schema: z.object({
        location: locationInput,
        pid: z.coerce.number().int().positive(),
        slideId: z.coerce.number().int().positive(),
        text: z.string().min(1),
      }),
      http: { method: "POST", path: "create-slide-feedback" },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Create slide feedback",
        description:
          "Create source-linked feedback for a code-backed or HTML slide by writing an Open Slide-style source marker.",
      },
      run: ({ pid, slideId, text, location }) =>
        feedbackService.create(pid, slideId, { text, location }),
    }),

    "resolve-slide-feedback": defineAction({
      description: "Mark a source-linked slide feedback marker as resolved.",
      schema: z.object({
        feedbackId: z.string().regex(/^c-[a-f0-9]+$/),
        pid: z.coerce.number().int().positive(),
        slideId: z.coerce.number().int().positive(),
      }),
      http: { method: "POST", path: "resolve-slide-feedback" },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Resolve slide feedback",
        description: "Mark a source-linked slide feedback marker as resolved.",
      },
      run: ({ pid, slideId, feedbackId }) => feedbackService.resolve(pid, slideId, feedbackId),
    }),
  };
}
