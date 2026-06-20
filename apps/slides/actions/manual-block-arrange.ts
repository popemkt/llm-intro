import { defineAction } from "@agent-native/core";
import type { Block } from "@llm-intro/api-contract";
import { z } from "zod";
import { AppError } from "../server/errors.js";
import type { createSlidesService } from "../server/services/slides.js";

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
  | "fit-slide"
  | "match-width"
  | "match-height"
  | "match-size";

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
  "match-width",
  "match-height",
  "match-size",
] as const;
const publicWriteAction = {
  expose: true,
  isConsequential: true,
  readOnly: false,
  requiresAuth: false,
};
const blockDefaults: Record<Block["type"], RectPercent> = {
  chart: { x: 10, y: 16, w: 80, h: 58 },
  iframe: { x: 5, y: 5, w: 90, h: 88 },
  image: { x: 10, y: 12, w: 80, h: 70 },
  line: { x: 20, y: 45, w: 60, h: 10 },
  shape: { x: 30, y: 30, w: 40, h: 30 },
  table: { x: 8, y: 14, w: 84, h: 54 },
  text: { x: 5, y: 5, w: 90, h: 30 },
};

function getManualSlide(slidesService: SlidesService, pid: number, sid: number) {
  const slide = slidesService.list(pid).find((entry) => entry.id === sid);
  if (!slide) throw new AppError(404, "slide not found");
  if (slide.kind !== "db") throw new AppError(400, "manual block actions require a manual slide");
  return slide;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function blockRect(block: Block): RectPercent {
  const defaults = blockDefaults[block.type];
  return {
    h: block.h ?? defaults.h,
    w: block.w ?? defaults.w,
    x: block.x ?? defaults.x,
    y: block.y ?? defaults.y,
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
    case "align-bottom":
      return { ...block, y: maxY };
    case "align-center":
      return { ...block, x: clamp((100 - rect.w) / 2, 0, maxX) };
    case "align-left":
      return { ...block, x: 0 };
    case "align-middle":
      return { ...block, y: clamp((100 - rect.h) / 2, 0, maxY) };
    case "align-right":
      return { ...block, x: maxX };
    case "align-top":
      return { ...block, y: 0 };
    case "fit-height":
      return { ...block, y: 5, h: 90 };
    case "fit-slide":
      return { ...block, x: 5, y: 5, w: 90, h: 90 };
    case "fit-width":
      return { ...block, x: 5, w: 90 };
    case "distribute-horizontal":
    case "distribute-vertical":
    case "match-height":
    case "match-size":
    case "match-width":
      return block;
  }
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

function matchManualBlockSize(
  blocks: Block[],
  blockIds: string[],
  action: "match-width" | "match-height" | "match-size",
) {
  const selected = new Set(blockIds);
  const reference = blocks.find((block) => block.id === blockIds[0]);
  if (!reference) return blocks;
  const referenceRect = blockRect(reference);
  return blocks.map((block) => {
    if (!selected.has(block.id)) return block;
    const patch = {
      ...(action === "match-width" || action === "match-size" ? { w: referenceRect.w } : {}),
      ...(action === "match-height" || action === "match-size" ? { h: referenceRect.h } : {}),
    };
    return { ...block, ...patch } as Block;
  });
}

function arrangeManualBlocks(blocks: Block[], blockIds: string[], action: ManualArrangeAction) {
  const selected = new Set(blockIds);
  const selectedBlocks = blocks.filter((block) => selected.has(block.id));
  if (selectedBlocks.length === 0) return blocks;
  if (
    action === "fit-height" ||
    action === "fit-slide" ||
    action === "fit-width" ||
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
  if (action === "match-height" || action === "match-size" || action === "match-width") {
    return matchManualBlockSize(blocks, blockIds, action);
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

export function createArrangeManualBlocksAction(slidesService: SlidesService) {
  return defineAction({
    description:
      "Align, distribute, match size, or fit manual slide blocks on the normalized canvas.",
    http: { method: "PUT", path: "arrange-manual-blocks" },
    publicAgent: {
      ...publicWriteAction,
      description:
        "Align, distribute, match size, or fit manual slide blocks on the normalized canvas.",
      title: "Arrange manual blocks",
    },
    requiresAuth: false,
    schema: z.object({
      action: z.enum(manualArrangeActions),
      blockIds: z.array(z.string().min(1)).min(1),
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
    }),
    run: ({ pid, sid, blockIds, action }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      assertBlockIdsExist(slide.blocks, blockIds);
      assertBlocksUnlocked(slide.blocks, blockIds);
      return slidesService.update(pid, sid, {
        blocks: arrangeManualBlocks(slide.blocks, blockIds, action),
      });
    },
  });
}
