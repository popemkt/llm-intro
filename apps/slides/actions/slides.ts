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
import { createNormalSlideAction, createNormalSlidesAction } from "./normal-slide-action.js";
import { z } from "zod";

type SlidesService = ReturnType<typeof createSlidesService>;
type RectPercent = { h: number; w: number; x: number; y: number };
type ManualArrangeAction =
  | "align-left"
  | "align-center"
  | "align-right"
  | "align-top"
  | "align-middle"
  | "align-bottom"
  | "distribute-horizontal"
  | "distribute-vertical"
  | "fit-width"
  | "fit-height"
  | "fit-slide";
type ManualLayerDirection = "forward" | "backward" | "front" | "back";

const blockInput = z.record(z.string(), z.unknown());
const transitionInput = z.record(z.string(), z.unknown()).nullable();
const manualArrangeActions = [
  "align-left",
  "align-center",
  "align-right",
  "align-top",
  "align-middle",
  "align-bottom",
  "distribute-horizontal",
  "distribute-vertical",
  "fit-width",
  "fit-height",
  "fit-slide",
] as const;
const manualLayerDirections = ["forward", "backward", "front", "back"] as const;
const blockDefaults: Record<Block["type"], RectPercent> = {
  text: { x: 5, y: 5, w: 90, h: 30 },
  image: { x: 10, y: 12, w: 80, h: 70 },
  iframe: { x: 5, y: 5, w: 90, h: 88 },
  shape: { x: 30, y: 30, w: 40, h: 30 },
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

function selectionBounds(blocks: Block[]) {
  const rects = blocks.map((block) => ({ id: block.id, ...blockRect(block) }));
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.w));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.h));
  return { bottom, height: bottom - top, left, rects, right, top, width: right - left };
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

function arrangeOneBlock(block: Block, action: ManualArrangeAction): Block {
  const rect = blockRect(block);
  const maxX = Math.max(0, 100 - rect.w);
  const maxY = Math.max(0, 100 - rect.h);
  switch (action) {
    case "align-left":
      return { ...block, x: 0 };
    case "align-center":
      return { ...block, x: clamp((100 - rect.w) / 2, 0, maxX) };
    case "align-right":
      return { ...block, x: maxX };
    case "align-top":
      return { ...block, y: 0 };
    case "align-middle":
      return { ...block, y: clamp((100 - rect.h) / 2, 0, maxY) };
    case "align-bottom":
      return { ...block, y: maxY };
    case "fit-width":
      return { ...block, x: 5, w: 90 };
    case "fit-height":
      return { ...block, y: 5, h: 90 };
    case "fit-slide":
      return { ...block, x: 5, y: 5, w: 90, h: 90 };
    case "distribute-horizontal":
    case "distribute-vertical":
      return block;
  }
}

function arrangeManualBlocks(blocks: Block[], blockIds: string[], action: ManualArrangeAction) {
  const selected = new Set(blockIds);
  const selectedBlocks = blocks.filter((block) => selected.has(block.id));
  if (selectedBlocks.length === 0) return blocks;
  if (
    action === "fit-width" ||
    action === "fit-height" ||
    action === "fit-slide" ||
    selectedBlocks.length === 1
  ) {
    return blocks.map((block) => (selected.has(block.id) ? arrangeOneBlock(block, action) : block));
  }
  if (action === "distribute-horizontal" || action === "distribute-vertical") {
    if (selectedBlocks.length < 3) {
      throw new AppError(400, "distribute actions require at least three blocks");
    }
    return distributeManualBlocks(blocks, selectedBlocks, action);
  }

  const bounds = selectionBounds(selectedBlocks);
  const patches = new Map<string, { x?: number; y?: number }>();
  for (const rect of bounds.rects) {
    if (action === "align-left") patches.set(rect.id, { x: bounds.left });
    if (action === "align-center")
      patches.set(rect.id, { x: bounds.left + (bounds.width - rect.w) / 2 });
    if (action === "align-right") patches.set(rect.id, { x: bounds.right - rect.w });
    if (action === "align-top") patches.set(rect.id, { y: bounds.top });
    if (action === "align-middle")
      patches.set(rect.id, { y: bounds.top + (bounds.height - rect.h) / 2 });
    if (action === "align-bottom") patches.set(rect.id, { y: bounds.bottom - rect.h });
  }
  return blocks.map((block) => ({ ...block, ...patches.get(block.id) }) as Block);
}

function distributeManualBlocks(
  blocks: Block[],
  selectedBlocks: Block[],
  action: "distribute-horizontal" | "distribute-vertical",
) {
  const axis = action === "distribute-horizontal" ? "x" : "y";
  const size = action === "distribute-horizontal" ? "w" : "h";
  const rects = selectedBlocks.map((block) => ({ id: block.id, ...blockRect(block) }));
  const sorted = rects.sort((a, b) => a[axis] + a[size] / 2 - (b[axis] + b[size] / 2));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const start = first[axis] + first[size] / 2;
  const end = last[axis] + last[size] / 2;
  const step = (end - start) / (sorted.length - 1);
  const patches = new Map<string, { x?: number; y?: number }>();
  sorted.forEach((rect, index) => {
    const center = start + step * index;
    const next = clamp(center - rect[size] / 2, 0, 100 - rect[size]);
    patches.set(rect.id, axis === "x" ? { x: next } : { y: next });
  });
  return blocks.map((block) => ({ ...block, ...patches.get(block.id) }) as Block);
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

function createArrangeManualBlocksAction(slidesService: SlidesService) {
  return defineAction({
    description: "Align, distribute, or fit manual slide blocks on the normalized canvas.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      blockIds: z.array(z.string().min(1)).min(1),
      action: z.enum(manualArrangeActions),
    }),
    http: { method: "PUT", path: "arrange-manual-blocks" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Arrange manual blocks",
      description: "Align, distribute, or fit manual slide blocks on the normalized canvas.",
    },
    run: ({ pid, sid, blockIds, action }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      assertBlockIdsExist(slide.blocks, blockIds);
      assertBlocksUnlocked(slide.blocks, blockIds);
      return updateManualSlideBlocks(
        slidesService,
        pid,
        sid,
        arrangeManualBlocks(slide.blocks, blockIds, action),
      );
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
    "create-html-slide": createHtmlSlideAction(slidesService),
    "create-normal-slide": createNormalSlideAction(slidesService),
    "create-normal-slides": createNormalSlidesAction(slidesService),
    "update-slide": createUpdateSlideAction(slidesService),
    "delete-slide": createDeleteSlideAction(slidesService),
    "add-manual-block": createAddManualBlockAction(slidesService),
    "insert-manual-preset": createInsertManualPresetAction(slidesService),
    "update-manual-block": createUpdateManualBlockAction(slidesService),
    "delete-manual-block": createDeleteManualBlockAction(slidesService),
    "set-manual-block-lock": createSetManualBlockLockAction(slidesService),
    "group-manual-blocks": createGroupManualBlocksAction(slidesService),
    "ungroup-manual-blocks": createUngroupManualBlocksAction(slidesService),
    "arrange-manual-blocks": createArrangeManualBlocksAction(slidesService),
    "duplicate-manual-blocks": createDuplicateManualBlocksAction(slidesService),
    "move-manual-block-layer": createMoveManualBlockLayerAction(slidesService),
    "update-deck-layout": createUpdateDeckLayoutAction(slidesService),
  };
}
