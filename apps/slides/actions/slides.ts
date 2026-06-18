import { defineAction } from "@agent-native/core";
import type { createSlidesService } from "../server/services/slides.js";
import { parseLayout, parseSlideCreate, parseSlidePatch } from "../server/validation.js";
import { createNormalSlideAction } from "./normal-slide-action.js";
import { z } from "zod";

type SlidesService = ReturnType<typeof createSlidesService>;

const blockInput = z.record(z.string(), z.unknown());
const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };
const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

export function createSlideActions(slidesService: SlidesService) {
  return {
    "list-slides": defineAction({
      description: "List slides for a presentation deck.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
      }),
      http: {
        method: "GET",
        path: "list-slides",
      },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        ...publicReadAction,
        title: "List slides",
        description: "List slides for a presentation deck.",
      },
      run: ({ pid }) => slidesService.list(pid),
    }),

    "create-slide": defineAction({
      description: "Create a database-backed slide.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
        title: z.string().optional(),
        blocks: z.array(blockInput).optional(),
      }),
      http: {
        method: "POST",
        path: "create-slide",
      },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Create slide",
        description: "Create a database-backed slide.",
      },
      run: ({ pid, ...input }) => slidesService.create(pid, parseSlideCreate(input)),
    }),

    "create-normal-slide": createNormalSlideAction(slidesService),

    "update-slide": defineAction({
      description: "Update slide title or blocks.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
        sid: z.coerce.number().int().positive(),
        title: z.string().optional(),
        blocks: z.array(blockInput).optional(),
      }),
      http: {
        method: "PUT",
        path: "update-slide",
      },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Update slide",
        description: "Update slide title or blocks.",
      },
      run: ({ pid, sid, ...patch }) => slidesService.update(pid, sid, parseSlidePatch(patch)),
    }),

    "delete-slide": defineAction({
      description: "Delete a database-backed slide.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
        sid: z.coerce.number().int().positive(),
      }),
      http: {
        method: "DELETE",
        path: "delete-slide",
      },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Delete slide",
        description: "Delete a database-backed slide.",
      },
      run: ({ pid, sid }) => {
        slidesService.delete(pid, sid);
        return null;
      },
    }),

    "update-deck-layout": defineAction({
      description: "Apply slide and group ordering for a deck.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
        ungrouped: z.array(z.coerce.number().int().positive()).default([]),
        groups: z.array(
          z.object({
            id: z.coerce.number().int().positive(),
            slideIds: z.array(z.coerce.number().int().positive()).default([]),
          }),
        ),
      }),
      http: {
        method: "PUT",
        path: "update-deck-layout",
      },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Update deck layout",
        description: "Apply slide and group ordering for a deck.",
      },
      run: ({ pid, ...layout }) => slidesService.applyLayout(pid, parseLayout(layout)),
    }),
  };
}
