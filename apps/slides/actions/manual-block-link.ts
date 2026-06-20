import { defineAction } from "@agent-native/core";
import type { Block } from "@llm-intro/api-contract";
import { z } from "zod";
import { AppError } from "../server/errors.js";
import type { createSlidesService } from "../server/services/slides.js";
import { parseBlocks } from "../server/validation.js";

type SlidesService = ReturnType<typeof createSlidesService>;

const publicWriteAction = {
  expose: true,
  isConsequential: true,
  readOnly: false,
  requiresAuth: false,
};
const manualBlockLinkTargetInput = z.enum(["_self", "_blank"]);

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

export function createSetManualBlockLinkAction(slidesService: SlidesService) {
  return defineAction({
    description: "Set or clear hyperlink metadata on manual slide blocks.",
    http: { method: "PUT", path: "set-manual-block-link" },
    publicAgent: {
      ...publicWriteAction,
      description: "Set or clear hyperlink metadata on manual slide blocks.",
      title: "Set manual block link",
    },
    requiresAuth: false,
    schema: z.object({
      blockIds: z.array(z.string().min(1)).min(1),
      linkTarget: manualBlockLinkTargetInput.optional(),
      linkTitle: z.string().min(1).max(120).nullable().optional(),
      linkUrl: z.string().min(1).max(2048).nullable(),
      pid: z.coerce.number().int().positive(),
      sid: z.coerce.number().int().positive(),
    }),
    run: ({ pid, sid, blockIds, linkUrl, linkTitle, linkTarget }) => {
      const slide = getManualSlide(slidesService, pid, sid);
      assertBlockIdsExist(slide.blocks, blockIds);
      assertBlocksUnlocked(slide.blocks, blockIds);
      const selected = new Set(blockIds);
      const blocks = slide.blocks.map((block) => {
        if (!selected.has(block.id)) return block;
        return parseOneBlock({
          ...block,
          linkTarget: linkUrl ? (linkTarget ?? block.linkTarget ?? "_blank") : undefined,
          linkTitle: linkUrl
            ? linkTitle === undefined
              ? block.linkTitle
              : (linkTitle ?? undefined)
            : undefined,
          linkUrl: linkUrl ?? undefined,
        });
      });
      return slidesService.update(pid, sid, { blocks });
    },
  });
}
