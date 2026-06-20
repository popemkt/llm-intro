import { defineAction } from "@agent-native/core";
import type { Block } from "@llm-intro/api-contract";
import { z } from "zod";
import { AppError } from "../server/errors.js";
import type { createSlidesService } from "../server/services/slides.js";

type SlidesService = ReturnType<typeof createSlidesService>;
type RectPercent = { h: number; w: number; x: number; y: number };

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

function snap(value: number, step: number) {
  return Math.round(value / step) * step;
}

function snapBlockToGrid(
  block: Block,
  { includeSize, step }: { includeSize: boolean; step: number },
) {
  const rect = blockRect(block);
  const w = includeSize ? clamp(snap(rect.w, step), 5, 100) : rect.w;
  const h = includeSize ? clamp(snap(rect.h, step), 5, 100) : rect.h;
  const x = clamp(snap(rect.x, step), 0, 100 - w);
  const y = clamp(snap(rect.y, step), 0, 100 - h);
  return { ...block, h, w, x, y } as Block;
}

export function createSnapManualBlocksToGridAction(slidesService: SlidesService) {
  return defineAction({
    description: "Snap manual slide block geometry to a configurable percentage grid.",
    http: { method: "PUT", path: "snap-manual-blocks-to-grid" },
    publicAgent: {
      ...publicWriteAction,
      description: "Snap manual slide block geometry to a configurable percentage grid.",
      title: "Snap manual blocks to grid",
    },
    requiresAuth: false,
    schema: z.object({
      blockIds: z.array(z.string().min(1)).min(1),
      includeSize: z.coerce.boolean().default(true),
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      step: z.coerce.number().min(0.5).max(25).default(5),
    }),
    run: ({ pid, sid, blockIds, step, includeSize }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      assertBlockIdsExist(slide.blocks, blockIds);
      assertBlocksUnlocked(slide.blocks, blockIds);

      const selected = new Set(blockIds);
      return slidesService.update(pid, sid, {
        blocks: slide.blocks.map((block) =>
          selected.has(block.id) ? snapBlockToGrid(block, { includeSize, step }) : block,
        ),
      });
    },
  });
}
