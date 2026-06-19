import { defineAction } from "@agent-native/core";
import { nanoid } from "nanoid";
import type { Block } from "@llm-intro/api-contract";
import type { createSlidesService } from "../server/services/slides.js";
import {
  parseHtmlSlideCreate,
  parseBlocks,
  parseLayout,
  parseSlideCreate,
  parseSlidePatch,
} from "../server/validation.js";
import { AppError } from "../server/errors.js";
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

function getManualSlide(slidesService: SlidesService, pid: number, sid: number) {
  const slide = slidesService.list(pid).find((entry) => entry.id === sid);
  if (!slide) throw new AppError(404, "slide not found");
  if (slide.kind !== "db") throw new AppError(400, "manual block actions require a manual slide");
  return slide;
}

function updateManualSlideBlocks(
  slidesService: SlidesService,
  pid: number,
  sid: number,
  blocks: Block[],
) {
  return slidesService.update(pid, sid, { blocks });
}

function parseOneBlock(input: unknown) {
  const blocks = parseBlocks([input]);
  const block = blocks?.[0];
  if (!block) throw new AppError(400, "block is required");
  return block;
}

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

function createAddManualBlockAction(slidesService: SlidesService) {
  return defineAction({
    description: "Add one typed editable block to a manual slide.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      block: blockInput,
    }),
    http: { method: "POST", path: "add-manual-block" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Add manual block",
      description: "Add one typed editable block to a manual slide.",
    },
    run: ({ pid, sid, block }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      const parsed = parseOneBlock(block);
      return updateManualSlideBlocks(slidesService, pid, sid, [...slide.blocks, parsed]);
    },
  });
}

function createUpdateManualBlockAction(slidesService: SlidesService) {
  return defineAction({
    description: "Update one typed editable block on a manual slide.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      bid: z.string().min(1),
      patch: blockInput,
    }),
    http: { method: "PUT", path: "update-manual-block" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Update manual block",
      description: "Update one typed editable block on a manual slide.",
    },
    run: ({ pid, sid, bid, patch }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      const index = slide.blocks.findIndex((block) => block.id === bid);
      if (index < 0) throw new AppError(404, "block not found");
      const merged = { ...slide.blocks[index], ...patch, id: bid };
      const parsed = parseOneBlock(merged);
      const blocks = [...slide.blocks];
      blocks[index] = parsed;
      return updateManualSlideBlocks(slidesService, pid, sid, blocks);
    },
  });
}

function createDeleteManualBlockAction(slidesService: SlidesService) {
  return defineAction({
    description: "Delete one typed editable block from a manual slide.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      bid: z.string().min(1),
    }),
    http: { method: "DELETE", path: "delete-manual-block" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Delete manual block",
      description: "Delete one typed editable block from a manual slide.",
    },
    run: ({ pid, sid, bid }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      if (!slide.blocks.some((block) => block.id === bid))
        throw new AppError(404, "block not found");
      return updateManualSlideBlocks(
        slidesService,
        pid,
        sid,
        slide.blocks.filter((block) => block.id !== bid),
      );
    },
  });
}

function createGroupManualBlocksAction(slidesService: SlidesService) {
  return defineAction({
    description: "Group existing manual slide blocks so they select and move together.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      blockIds: z.array(z.string().min(1)).min(2),
      groupId: z.string().min(1).optional(),
      groupName: z.string().min(1).optional(),
    }),
    http: { method: "PUT", path: "group-manual-blocks" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Group manual blocks",
      description: "Group existing manual slide blocks so they select and move together.",
    },
    run: ({ pid, sid, blockIds, groupId, groupName }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      const selected = new Set(blockIds);
      const missing = blockIds.filter((id) => !slide.blocks.some((block) => block.id === id));
      if (missing.length > 0) throw new AppError(404, `block not found: ${missing[0]}`);
      const nextGroupId = groupId ?? `group-${nanoid(8)}`;
      const blocks = slide.blocks.map((block) =>
        selected.has(block.id)
          ? ({ ...block, groupId: nextGroupId, groupName: groupName ?? "Group" } as Block)
          : block,
      );
      return updateManualSlideBlocks(slidesService, pid, sid, blocks);
    },
  });
}

function createUngroupManualBlocksAction(slidesService: SlidesService) {
  return defineAction({
    description: "Remove block grouping metadata from manual slide blocks.",
    schema: z
      .object({
        pid: z.coerce.number().int().positive(),
        sid: z.coerce.number().int().positive(),
        blockIds: z.array(z.string().min(1)).optional(),
        groupId: z.string().min(1).optional(),
      })
      .refine((input) => input.groupId || (input.blockIds && input.blockIds.length > 0), {
        message: "groupId or blockIds is required",
      }),
    http: { method: "PUT", path: "ungroup-manual-blocks" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Ungroup manual blocks",
      description: "Remove block grouping metadata from manual slide blocks.",
    },
    run: ({ pid, sid, blockIds, groupId }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      const selected = new Set(blockIds ?? []);
      const blocks = slide.blocks.map((block) =>
        block.groupId === groupId || selected.has(block.id)
          ? ({ ...block, groupId: undefined, groupName: undefined } as Block)
          : block,
      );
      return updateManualSlideBlocks(slidesService, pid, sid, blocks);
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
    "add-manual-block": createAddManualBlockAction(slidesService),
    "update-manual-block": createUpdateManualBlockAction(slidesService),
    "delete-manual-block": createDeleteManualBlockAction(slidesService),
    "group-manual-blocks": createGroupManualBlocksAction(slidesService),
    "ungroup-manual-blocks": createUngroupManualBlocksAction(slidesService),
    "update-deck-layout": createUpdateDeckLayoutAction(slidesService),
  };
}
