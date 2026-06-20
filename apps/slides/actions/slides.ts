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
import { buildManualPresetBlocks, MANUAL_PRESET_IDS } from "../shared/manual-presets.js";
import { createArrangeManualBlocksAction } from "./manual-block-arrange.js";
import { applyManualBlockFormat, copyManualBlockFormat } from "./manual-block-format.js";
import { createUpdateManualBlocksAction } from "./manual-block-batch.js";
import { createTransformManualBlocksAction } from "./manual-block-geometry.js";
import { createSnapManualBlocksToGridAction } from "./manual-block-grid.js";
import { createNormalSlideAction, createNormalSlidesAction } from "./normal-slide-action.js";
import { z } from "zod";

type SlidesService = ReturnType<typeof createSlidesService>;
type RectPercent = { h: number; w: number; x: number; y: number };
type ManualLayerDirection = "forward" | "backward" | "front" | "back";

const blockInput = z.record(z.string(), z.unknown());
const blockAnimationInput = z
  .object({
    delay: z.coerce.number().min(0).max(10000).optional(),
    duration: z.coerce.number().min(0).max(10000).optional(),
    easing: z.string().min(1).max(160).optional(),
    iterationCount: z.coerce.number().min(1).max(20).optional(),
    preset: z.enum([
      "fade-in",
      "rise",
      "scale-in",
      "slide-left",
      "slide-right",
      "wipe-right",
      "pulse",
    ]),
  })
  .nullable();
const transitionInput = z.record(z.string(), z.unknown()).nullable();
const backgroundInput = z
  .object({
    fill: z.string().optional(),
    imageUrl: z.string().optional(),
    imageFit: z.enum(["cover", "contain", "fill"]).optional(),
    imagePosition: z.string().optional(),
  })
  .nullable();
const manualLayerDirections = ["forward", "backward", "front", "back"] as const;
const blockDefaults: Record<Block["type"], RectPercent> = {
  text: { x: 5, y: 5, w: 90, h: 30 },
  image: { x: 10, y: 12, w: 80, h: 70 },
  iframe: { x: 5, y: 5, w: 90, h: 88 },
  shape: { x: 30, y: 30, w: 40, h: 30 },
  line: { x: 20, y: 45, w: 60, h: 10 },
  table: { x: 8, y: 14, w: 84, h: 54 },
  chart: { x: 10, y: 16, w: 80, h: 58 },
};
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function blockRect(block: Block): RectPercent {
  const defaults = blockDefaults[block.type];
  return {
    x: block.x ?? defaults.x,
    y: block.y ?? defaults.y,
    w: block.w ?? defaults.w,
    h: block.h ?? defaults.h,
  };
}

function assertBlockIdsExist(blocks: Block[], blockIds: string[]) {
  const ids = new Set(blocks.map((block) => block.id));
  const missing = blockIds.filter((id) => !ids.has(id));
  if (missing.length > 0) throw new AppError(404, `block not found: ${missing[0]}`);
}

function assertBlocksUnlocked(blocks: Block[], blockIds: string[]) {
  const selected = new Set(blockIds);
  const locked = blocks.find((block) => selected.has(block.id) && block.locked);
  if (locked) throw new AppError(400, `block is locked: ${locked.id}`);
}

function duplicateManualBlocks(
  blocks: Block[],
  blockIds: string[],
  offsetX: number,
  offsetY: number,
) {
  const selected = new Set(blockIds);
  const groupIdCopies = new Map<string, string>();
  const copies = blocks
    .filter((block) => selected.has(block.id))
    .map((source) => {
      const rect = blockRect(source);
      const nextGroupId = source.groupId
        ? (groupIdCopies.get(source.groupId) ?? `group-${nanoid(8)}`)
        : undefined;
      if (source.groupId && nextGroupId) groupIdCopies.set(source.groupId, nextGroupId);
      return {
        copy: {
          ...source,
          id: nanoid(),
          locked: undefined,
          groupId: nextGroupId,
          x: clamp(rect.x + offsetX, 0, 100 - rect.w),
          y: clamp(rect.y + offsetY, 0, 100 - rect.h),
        } as Block,
        sourceId: source.id,
      };
    });
  const copiesBySource = new Map(copies.map((entry) => [entry.sourceId, entry.copy]));
  const next: Block[] = [];
  for (const block of blocks) {
    next.push(block);
    const copy = copiesBySource.get(block.id);
    if (copy) next.push(copy);
  }
  return next;
}

function moveManualBlockLayer(
  blocks: Block[],
  blockIds: string[],
  direction: ManualLayerDirection,
) {
  const selected = new Set(blockIds);
  const selectedBlocks = blocks.filter((block) => selected.has(block.id));
  const remaining = blocks.filter((block) => !selected.has(block.id));
  if (direction === "front") return [...remaining, ...selectedBlocks];
  if (direction === "back") return [...selectedBlocks, ...remaining];

  const next = [...blocks];
  if (direction === "forward") {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (selected.has(next[index]!.id) && !selected.has(next[index + 1]!.id)) {
        [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
      }
    }
  } else {
    for (let index = 1; index < next.length; index += 1) {
      if (selected.has(next[index]!.id) && !selected.has(next[index - 1]!.id)) {
        [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
      }
    }
  }
  return next;
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
      background: backgroundInput.optional(),
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
      background: backgroundInput.optional(),
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

function createManualPresetSlideAction(slidesService: SlidesService) {
  return defineAction({
    description: "Create a manual slide from a reusable typed block preset.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      presetId: z.enum(MANUAL_PRESET_IDS),
      title: z.string().optional(),
      notes: z.string().optional(),
      transition: transitionInput.optional(),
      background: backgroundInput.optional(),
    }),
    http: {
      method: "POST",
      path: "create-manual-preset-slide",
    },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Create manual preset slide",
      description:
        "Create a manual, PowerPoint-style slide from a reusable editable layout preset.",
    },
    run: ({ pid, presetId, ...input }) =>
      slidesService.create(
        pid,
        parseSlideCreate({
          ...input,
          title: input.title ?? `${presetId} slide`,
          blocks: buildManualPresetBlocks(presetId),
        }),
      ),
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
      background: backgroundInput.optional(),
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
    description:
      "Update slide title, speaker notes, blocks, HTML source, transition, or background.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      title: z.string().optional(),
      blocks: z.array(blockInput).optional(),
      html: z.string().optional(),
      notes: z.string().optional(),
      transition: transitionInput.optional(),
      background: backgroundInput.optional(),
    }),
    http: {
      method: "PUT",
      path: "update-slide",
    },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Update slide",
      description:
        "Update slide title, speaker notes, blocks, HTML source, transition, or background.",
    },
    run: ({ pid, sid, ...patch }) => slidesService.update(pid, sid, parseSlidePatch(patch)),
  });
}

function createDuplicateSlideAction(slidesService: SlidesService) {
  return defineAction({
    description: "Duplicate an editable manual or HTML slide with the same content metadata.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      title: z.string().optional(),
    }),
    http: {
      method: "POST",
      path: "duplicate-slide",
    },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Duplicate slide",
      description: "Duplicate an editable manual or HTML slide with the same content metadata.",
    },
    run: ({ pid, sid, title }) => {
      const source = slidesService.list(pid).find((slide) => slide.id === sid);
      if (!source) throw new AppError(404, "slide not found");
      if (source.kind === "code") throw new AppError(403, "code slides cannot be duplicated");
      const duplicateTitle = title?.trim() || `${source.title} copy`;
      if (source.kind === "html") {
        return slidesService.create(pid, {
          kind: "html",
          title: duplicateTitle,
          html: source.html,
          notes: source.notes,
          transition: source.transition,
          background: source.background,
        });
      }
      return slidesService.create(pid, {
        title: duplicateTitle,
        blocks: source.blocks.map((block) => ({ ...block })),
        notes: source.notes,
        transition: source.transition,
        background: source.background,
      });
    },
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

function createInsertManualPresetAction(slidesService: SlidesService) {
  return defineAction({
    description: "Insert a reusable manual slide preset as ordinary typed blocks.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      presetId: z.enum(MANUAL_PRESET_IDS),
    }),
    http: { method: "POST", path: "insert-manual-preset" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Insert manual preset",
      description: "Insert a reusable manual slide preset as ordinary typed blocks.",
    },
    run: ({ pid, sid, presetId }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      return updateManualSlideBlocks(slidesService, pid, sid, [
        ...slide.blocks,
        ...buildManualPresetBlocks(presetId),
      ]);
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
      assertBlockIdsExist(slide.blocks, [bid]);
      assertBlocksUnlocked(slide.blocks, [bid]);
      return updateManualSlideBlocks(
        slidesService,
        pid,
        sid,
        slide.blocks.filter((block) => block.id !== bid),
      );
    },
  });
}

function createSetManualBlockLockAction(slidesService: SlidesService) {
  return defineAction({
    description: "Lock or unlock manual slide blocks.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      blockIds: z.array(z.string().min(1)).min(1),
      locked: z.boolean(),
    }),
    http: { method: "PUT", path: "set-manual-block-lock" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Set manual block lock",
      description: "Lock or unlock manual slide blocks to protect them from layout edits.",
    },
    run: ({ pid, sid, blockIds, locked }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      assertBlockIdsExist(slide.blocks, blockIds);
      const selected = new Set(blockIds);
      const blocks = slide.blocks.map((block) =>
        selected.has(block.id) ? ({ ...block, locked } as Block) : block,
      );
      return updateManualSlideBlocks(slidesService, pid, sid, blocks);
    },
  });
}

function createSetManualBlockVisibilityAction(slidesService: SlidesService) {
  return defineAction({
    description: "Show or hide manual slide blocks without deleting them.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      blockIds: z.array(z.string().min(1)).min(1),
      hidden: z.boolean(),
    }),
    http: { method: "PUT", path: "set-manual-block-visibility" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Set manual block visibility",
      description: "Show or hide manual slide blocks without deleting them.",
    },
    run: ({ pid, sid, blockIds, hidden }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      assertBlockIdsExist(slide.blocks, blockIds);
      const selected = new Set(blockIds);
      const blocks = slide.blocks.map((block) =>
        selected.has(block.id) ? ({ ...block, hidden } as Block) : block,
      );
      return updateManualSlideBlocks(slidesService, pid, sid, blocks);
    },
  });
}

function createSetManualBlockFlipAction(slidesService: SlidesService) {
  return defineAction({
    description: "Flip manual slide blocks horizontally or vertically.",
    schema: z
      .object({
        blockIds: z.array(z.string().min(1)).min(1),
        flipX: z.boolean().optional(),
        flipY: z.boolean().optional(),
        pid: z.coerce.number().int().positive(),
        sid: z.coerce.number().int().positive(),
      })
      .refine((input) => input.flipX !== undefined || input.flipY !== undefined, {
        message: "flipX or flipY is required",
      }),
    http: { method: "PUT", path: "set-manual-block-flip" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Set manual block flip",
      description: "Flip manual slide blocks horizontally or vertically.",
    },
    run: ({ pid, sid, blockIds, flipX, flipY }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      assertBlockIdsExist(slide.blocks, blockIds);
      assertBlocksUnlocked(slide.blocks, blockIds);
      const selected = new Set(blockIds);
      const blocks = slide.blocks.map((block) =>
        selected.has(block.id)
          ? ({ ...block, flipX: flipX ?? block.flipX, flipY: flipY ?? block.flipY } as Block)
          : block,
      );
      return updateManualSlideBlocks(slidesService, pid, sid, blocks);
    },
  });
}

function createSetManualBlockAnimationAction(slidesService: SlidesService) {
  return defineAction({
    description: "Set or clear PowerPoint-style animation metadata on manual slide blocks.",
    schema: z.object({
      animation: blockAnimationInput,
      blockIds: z.array(z.string().min(1)).min(1),
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
    }),
    http: { method: "PUT", path: "set-manual-block-animation" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Set manual block animation",
      description: "Set or clear PowerPoint-style animation metadata on manual slide blocks.",
    },
    run: ({ pid, sid, blockIds, animation }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      assertBlockIdsExist(slide.blocks, blockIds);
      assertBlocksUnlocked(slide.blocks, blockIds);
      const selected = new Set(blockIds);
      const blocks = slide.blocks.map((block) => {
        if (!selected.has(block.id)) return block;
        return parseOneBlock({
          ...block,
          animation: animation ?? undefined,
        });
      });
      return updateManualSlideBlocks(slidesService, pid, sid, blocks);
    },
  });
}

function createApplyManualBlockFormatAction(slidesService: SlidesService) {
  return defineAction({
    description:
      "Copy appearance formatting from one manual slide block to other blocks without changing content or geometry.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      sourceBlockId: z.string().min(1),
      targetBlockIds: z.array(z.string().min(1)).min(1),
    }),
    http: { method: "PUT", path: "apply-manual-block-format" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Apply manual block format",
      description:
        "Copy appearance formatting from one manual slide block to other blocks without changing content or geometry.",
    },
    run: ({ pid, sid, sourceBlockId, targetBlockIds }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      assertBlockIdsExist(slide.blocks, [sourceBlockId, ...targetBlockIds]);
      assertBlocksUnlocked(slide.blocks, targetBlockIds);
      const source = slide.blocks.find((block) => block.id === sourceBlockId);
      if (!source) throw new AppError(404, "source block not found");
      const targets = new Set(targetBlockIds);
      const clipboard = copyManualBlockFormat(source);
      const blocks = slide.blocks.map((block) =>
        targets.has(block.id) ? applyManualBlockFormat(block, clipboard) : block,
      );
      return updateManualSlideBlocks(slidesService, pid, sid, blocks);
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

function createDuplicateManualBlocksAction(slidesService: SlidesService) {
  return defineAction({
    description: "Duplicate existing manual slide blocks with fresh block ids.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      blockIds: z.array(z.string().min(1)).min(1),
      offsetX: z.coerce.number().min(-100).max(100).default(3),
      offsetY: z.coerce.number().min(-100).max(100).default(3),
    }),
    http: { method: "POST", path: "duplicate-manual-blocks" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Duplicate manual blocks",
      description: "Duplicate existing manual slide blocks with fresh block ids.",
    },
    run: ({ pid, sid, blockIds, offsetX, offsetY }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      assertBlockIdsExist(slide.blocks, blockIds);
      assertBlocksUnlocked(slide.blocks, blockIds);
      return updateManualSlideBlocks(
        slidesService,
        pid,
        sid,
        duplicateManualBlocks(slide.blocks, blockIds, offsetX, offsetY),
      );
    },
  });
}

function createMoveManualBlockLayerAction(slidesService: SlidesService) {
  return defineAction({
    description: "Move manual slide blocks through the layer stack.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      blockIds: z.array(z.string().min(1)).min(1),
      direction: z.enum(manualLayerDirections),
    }),
    http: { method: "PUT", path: "move-manual-block-layer" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Move manual block layer",
      description: "Move manual slide blocks through the layer stack.",
    },
    run: ({ pid, sid, blockIds, direction }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      assertBlockIdsExist(slide.blocks, blockIds);
      assertBlocksUnlocked(slide.blocks, blockIds);
      return updateManualSlideBlocks(
        slidesService,
        pid,
        sid,
        moveManualBlockLayer(slide.blocks, blockIds, direction),
      );
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
    "create-manual-preset-slide": createManualPresetSlideAction(slidesService),
    "create-html-slide": createHtmlSlideAction(slidesService),
    "create-normal-slide": createNormalSlideAction(slidesService),
    "create-normal-slides": createNormalSlidesAction(slidesService),
    "update-slide": createUpdateSlideAction(slidesService),
    "duplicate-slide": createDuplicateSlideAction(slidesService),
    "delete-slide": createDeleteSlideAction(slidesService),
    "add-manual-block": createAddManualBlockAction(slidesService),
    "insert-manual-preset": createInsertManualPresetAction(slidesService),
    "update-manual-block": createUpdateManualBlockAction(slidesService),
    "update-manual-blocks": createUpdateManualBlocksAction(slidesService),
    "delete-manual-block": createDeleteManualBlockAction(slidesService),
    "set-manual-block-lock": createSetManualBlockLockAction(slidesService),
    "set-manual-block-visibility": createSetManualBlockVisibilityAction(slidesService),
    "set-manual-block-flip": createSetManualBlockFlipAction(slidesService),
    "set-manual-block-animation": createSetManualBlockAnimationAction(slidesService),
    "apply-manual-block-format": createApplyManualBlockFormatAction(slidesService),
    "group-manual-blocks": createGroupManualBlocksAction(slidesService),
    "ungroup-manual-blocks": createUngroupManualBlocksAction(slidesService),
    "arrange-manual-blocks": createArrangeManualBlocksAction(slidesService),
    "transform-manual-blocks": createTransformManualBlocksAction(slidesService),
    "snap-manual-blocks-to-grid": createSnapManualBlocksToGridAction(slidesService),
    "duplicate-manual-blocks": createDuplicateManualBlocksAction(slidesService),
    "move-manual-block-layer": createMoveManualBlockLayerAction(slidesService),
    "update-deck-layout": createUpdateDeckLayoutAction(slidesService),
  };
}
