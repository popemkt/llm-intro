import { defineAction } from "@agent-native/core";
import type { Block } from "@llm-intro/api-contract";
import { z } from "zod";

import { AppError } from "../server/errors.js";
import type { createSlidesService } from "../server/services/slides.js";
import {
  getManualBlockStylePreset,
  type ManualBlockStylePresetId,
} from "../shared/manual-style-presets.js";
import { applyManualBlockFormat } from "./manual-block-format.js";

type SlidesService = ReturnType<typeof createSlidesService>;
type SlideList = Awaited<ReturnType<SlidesService["list"]>>;

const manualBlockStylePresetSchema = z.union([
  z.literal("accent-card"),
  z.literal("soft-note"),
  z.literal("outline-callout"),
  z.literal("code-panel"),
  z.literal("media-frame"),
]);

function findManualSlide(sid: number, slides: SlideList) {
  const slide = slides.find((candidate) => candidate.id === sid);
  if (!slide) throw new AppError(404, `slide not found: ${sid}`);
  return slide;
}

function assertBlockIdsExist(blocks: Block[], blockIds: string[]) {
  const existing = new Set(blocks.map((block) => block.id));
  const missing = blockIds.find((blockId) => !existing.has(blockId));
  if (missing) throw new AppError(404, `block not found: ${missing}`);
}

function assertBlocksUnlocked(blocks: Block[], blockIds: string[]) {
  const selected = new Set(blockIds);
  const locked = blocks.find((block) => selected.has(block.id) && block.locked);
  if (locked) throw new AppError(400, `block is locked: ${locked.id}`);
}

function applyStylePreset(
  block: Block,
  blockIds: string[],
  presetId: ManualBlockStylePresetId,
): Block {
  if (!blockIds.includes(block.id)) return block;
  const preset = getManualBlockStylePreset(presetId);
  return applyManualBlockFormat(block, {
    patch: preset.patch as Partial<Block>,
    sourceType: block.type,
  });
}

export function createApplyManualBlockStylePresetAction(slidesService: SlidesService) {
  return defineAction({
    http: { method: "PUT", path: "apply-manual-block-style-preset" },
    description:
      "Apply a named reusable appearance preset to one or more unlocked manual slide blocks without changing their content, geometry, grouping, or IDs.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
      blockIds: z.array(z.string().min(1)).min(1),
      presetId: manualBlockStylePresetSchema,
    }),
    run: async ({ pid, sid, blockIds, presetId }) => {
      const slides = await slidesService.list(pid);
      const slide = findManualSlide(sid, slides);
      assertBlockIdsExist(slide.blocks, blockIds);
      assertBlocksUnlocked(slide.blocks, blockIds);

      const blocks = slide.blocks.map((block) => applyStylePreset(block, blockIds, presetId));
      const updated = await slidesService.update(pid, sid, { blocks });
      return { slide: updated };
    },
  });
}
