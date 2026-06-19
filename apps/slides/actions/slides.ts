import { defineAction } from "@agent-native/core";
import type { createSlidesService } from "../server/services/slides.js";
import {
  parseHtmlSlideCreate,
  parseLayout,
  parseSlideCreate,
  parseSlidePatch,
} from "../server/validation.js";
import { createNormalSlideAction, createNormalSlidesAction } from "./normal-slide-action.js";
import { z } from "zod";

type SlidesService = ReturnType<typeof createSlidesService>;

const blockInput = z.record(z.string(), z.unknown());
const transitionInput = z.record(z.string(), z.unknown()).nullable();
const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };
const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

function createListSlidesAction(slidesService: SlidesService) {
  return defineAction({
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
  });
}

function createRawSlideAction(slidesService: SlidesService) {
  return defineAction({
    description: "Create a database-backed slide.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      title: z.string().optional(),
      blocks: z.array(blockInput).optional(),
      notes: z.string().optional(),
      transition: transitionInput.optional(),
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
  });
}

function createManualSlideAction(slidesService: SlidesService) {
  return defineAction({
    description: "Create a manual slide from typed editable blocks.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      title: z.string().optional(),
      blocks: z.array(blockInput).default([]),
      notes: z.string().optional(),
      transition: transitionInput.optional(),
    }),
    http: {
      method: "POST",
      path: "create-manual-slide",
    },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Create manual slide",
      description:
        "Create a manual, PowerPoint-style slide from typed editable blocks with layout and appearance fields.",
    },
    run: ({ pid, ...input }) => slidesService.create(pid, parseSlideCreate(input)),
  });
}

function createHtmlSlideAction(slidesService: SlidesService) {
  return defineAction({
    description: "Create an HTML slide from authored HTML, CSS, and optional JavaScript.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      title: z.string().optional(),
      html: z.string(),
      notes: z.string().optional(),
      transition: transitionInput.optional(),
    }),
    http: {
      method: "POST",
      path: "create-html-slide",
    },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Create HTML slide",
      description: "Create a full-canvas HTML/CSS/JS slide.",
    },
    run: ({ pid, ...input }) => slidesService.create(pid, parseHtmlSlideCreate(input)),
  });
}

function createUpdateSlideAction(slidesService: SlidesService) {
  return defineAction({
    description: "Update slide title, speaker notes, blocks, HTML source, or transition.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      title: z.string().optional(),
      blocks: z.array(blockInput).optional(),
      html: z.string().optional(),
      notes: z.string().optional(),
      transition: transitionInput.optional(),
    }),
    http: {
      method: "PUT",
      path: "update-slide",
    },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Update slide",
      description: "Update slide title, speaker notes, blocks, HTML source, or transition.",
    },
    run: ({ pid, sid, ...patch }) => slidesService.update(pid, sid, parseSlidePatch(patch)),
  });
}

function createDeleteSlideAction(slidesService: SlidesService) {
  return defineAction({
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
  });
}

function createUpdateDeckLayoutAction(slidesService: SlidesService) {
  return defineAction({
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
  });
}

export function createSlideActions(slidesService: SlidesService) {
  return {
    "list-slides": createListSlidesAction(slidesService),
    "create-slide": createRawSlideAction(slidesService),
    "create-manual-slide": createManualSlideAction(slidesService),
    "create-html-slide": createHtmlSlideAction(slidesService),
    "create-normal-slide": createNormalSlideAction(slidesService),
    "create-normal-slides": createNormalSlidesAction(slidesService),
    "update-slide": createUpdateSlideAction(slidesService),
    "delete-slide": createDeleteSlideAction(slidesService),
    "update-deck-layout": createUpdateDeckLayoutAction(slidesService),
  };
}
