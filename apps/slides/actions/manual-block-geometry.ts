import { defineAction } from "@agent-native/core";
import type { Block } from "@llm-intro/api-contract";
import { z } from "zod";
import { AppError } from "../server/errors.js";
import type { createSlidesService } from "../server/services/slides.js";

type SlidesService = ReturnType<typeof createSlidesService>;
type RectPercent = { h: number; w: number; x: number; y: number };
type GeometryDelta = { dh: number; dw: number; dx: number; dy: number };

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

function transformBlockGeometry(block: Block, { dx, dy, dh, dw }: GeometryDelta) {
  const rect = blockRect(block);
  const w = clamp(rect.w + dw, 5, 100);
  const h = clamp(rect.h + dh, 5, 100);
  const x = clamp(rect.x + dx, 0, 100 - w);
  const y = clamp(rect.y + dy, 0, 100 - h);
  return { ...block, h, w, x, y } as Block;
}

function rectBounds(rects: RectPercent[]): RectPercent {
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.w));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.h));
  return { h: bottom - top, w: right - left, x: left, y: top };
}

function transformSelectionBounds(bounds: RectPercent, { dx, dy, dh, dw }: GeometryDelta) {
  const w = clamp(bounds.w + dw, 5, 100);
  const h = clamp(bounds.h + dh, 5, 100);
  return {
    h,
    w,
    x: clamp(bounds.x + dx, 0, 100 - w),
    y: clamp(bounds.y + dy, 0, 100 - h),
  };
}

function scaleBlockWithinBounds(
  block: Block,
  sourceBounds: RectPercent,
  targetBounds: RectPercent,
) {
  const rect = blockRect(block);
  const scaleX = sourceBounds.w <= 0 ? 1 : targetBounds.w / sourceBounds.w;
  const scaleY = sourceBounds.h <= 0 ? 1 : targetBounds.h / sourceBounds.h;
  const w = clamp(rect.w * scaleX, 5, 100);
  const h = clamp(rect.h * scaleY, 5, 100);
  const x = clamp(targetBounds.x + (rect.x - sourceBounds.x) * scaleX, 0, 100 - w);
  const y = clamp(targetBounds.y + (rect.y - sourceBounds.y) * scaleY, 0, 100 - h);
  return { ...block, h, w, x, y } as Block;
}

function scaleSelectionGeometry(blocks: Block[], blockIds: string[], delta: GeometryDelta) {
  const selected = new Set(blockIds);
  const selectedBlocks = blocks.filter((block) => selected.has(block.id));
  if (selectedBlocks.length === 0) return blocks;
  const sourceBounds = rectBounds(selectedBlocks.map(blockRect));
  const targetBounds = transformSelectionBounds(sourceBounds, delta);
  return blocks.map((block) => {
    if (!selected.has(block.id)) return block;
    return scaleBlockWithinBounds(block, sourceBounds, targetBounds);
  });
}

export function createTransformManualBlocksAction(slidesService: SlidesService) {
  return defineAction({
    description:
      "Move or resize manual slide blocks by relative percentage deltas, optionally scaling the selected bounds proportionally.",
    http: { method: "PUT", path: "transform-manual-blocks" },
    publicAgent: {
      ...publicWriteAction,
      description:
        "Move or resize manual slide blocks by relative percentage deltas, optionally scaling the selected bounds proportionally.",
      title: "Transform manual blocks",
    },
    requiresAuth: false,
    schema: z.object({
      blockIds: z.array(z.string().min(1)).min(1),
      dh: z.coerce.number().min(-100).max(100).default(0),
      dw: z.coerce.number().min(-100).max(100).default(0),
      dx: z.coerce.number().min(-100).max(100).default(0),
      dy: z.coerce.number().min(-100).max(100).default(0),
      pid: z.coerce.number().int().positive(),
      scaleSelection: z.boolean().default(false),
      sid: z.coerce.number().int().positive(),
    }),
    run: ({ pid, sid, blockIds, dx, dy, dw, dh, scaleSelection }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      assertBlockIdsExist(slide.blocks, blockIds);
      assertBlocksUnlocked(slide.blocks, blockIds);

      const selected = new Set(blockIds);
      return slidesService.update(pid, sid, {
        blocks: scaleSelection
          ? scaleSelectionGeometry(slide.blocks, blockIds, { dx, dy, dw, dh })
          : slide.blocks.map((block) =>
              selected.has(block.id) ? transformBlockGeometry(block, { dx, dy, dw, dh }) : block,
            ),
      });
    },
  });
}
