import { defineAction } from "@agent-native/core";
import type { Block } from "@llm-intro/api-contract";
import { z } from "zod";
import { AppError } from "../server/errors.js";
import type { createSlidesService } from "../server/services/slides.js";
import { parseBlocks } from "../server/validation.js";

type SlidesService = ReturnType<typeof createSlidesService>;

const blockInput = z.record(z.string(), z.unknown());
const publicWriteAction = {
  expose: true,
  isConsequential: true,
  readOnly: false,
  requiresAuth: false,
};

function getManualSlide(slidesService: SlidesService, pid: number, sid: number) {
  const slide = slidesService.list(pid).find((entry) => entry.id === sid);
  if (!slide) throw new AppError(404, "slide not found");
  if (slide.kind !== "db") throw new AppError(400, "manual block actions require a manual slide");
  return slide;
}

function parseOneBlock(input: unknown) {
  const block = parseBlocks([input])?.[0];
  if (!block) throw new AppError(400, "block is required");
  return block;
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

export function createUpdateManualBlocksAction(slidesService: SlidesService) {
  return defineAction({
    description: "Apply multiple typed editable block patches to a manual slide atomically.",
    http: { method: "PUT", path: "update-manual-blocks" },
    publicAgent: {
      ...publicWriteAction,
      description: "Apply multiple typed editable block patches to a manual slide atomically.",
      title: "Update manual blocks",
    },
    requiresAuth: false,
    schema: z.object({
      patches: z
        .array(
          z.object({
            bid: z.string().min(1),
            patch: blockInput,
          }),
        )
        .min(1),
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
    }),
    run: ({ pid, sid, patches }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      const blockIds = patches.map((patch) => patch.bid);
      if (new Set(blockIds).size !== blockIds.length) {
        throw new AppError(400, "patches must target unique block ids");
      }
      assertBlockIdsExist(slide.blocks, blockIds);
      assertBlocksUnlocked(slide.blocks, blockIds);

      const patchesById = new Map(patches.map((patch) => [patch.bid, patch.patch]));
      const blocks = slide.blocks.map((block) => {
        const patch = patchesById.get(block.id);
        if (!patch) return block;
        return parseOneBlock({ ...block, ...patch, id: block.id });
      });

      return slidesService.update(pid, sid, { blocks });
    },
  });
}
