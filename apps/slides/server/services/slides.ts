import type { Block, LayoutInput } from "@llm-intro/api-contract";
import { AppError } from "../errors.js";
import type { createPresentationsRepository } from "../repositories/presentations.js";
import type { createSlidesRepository, SlideCreateInput } from "../repositories/slides.js";

type PresentationsRepository = ReturnType<typeof createPresentationsRepository>;
type SlidesRepository = ReturnType<typeof createSlidesRepository>;

export function createSlidesService(
  presentationsRepo: PresentationsRepository,
  slidesRepo: SlidesRepository,
) {
  const getPresentation = (presentationId: number) => {
    const presentation = presentationsRepo.getById(presentationId);
    if (!presentation) throw new AppError(404, "presentation not found");
    return presentation;
  };

  return {
    list(presentationId: number) {
      getPresentation(presentationId);
      return slidesRepo.listByPresentationId(presentationId);
    },

    create(presentationId: number, input: SlideCreateInput) {
      getPresentation(presentationId);
      return slidesRepo.create(presentationId, input);
    },

    update(
      presentationId: number,
      slideId: number,
      patch: { title?: string; blocks?: Block[]; html?: string; notes?: string },
    ) {
      getPresentation(presentationId);
      const slide = slidesRepo.getById(presentationId, slideId);
      if (!slide) throw new AppError(404, "slide not found");
      if (slide.kind === "code" && (patch.blocks || patch.html !== undefined))
        throw new AppError(403, "code slide content is read-only");
      if (slide.kind === "db" && patch.html !== undefined)
        throw new AppError(400, "database-backed slides do not support html content");
      if (slide.kind === "html" && patch.blocks)
        throw new AppError(400, "html slides do not support block content");

      return slidesRepo.update(presentationId, slideId, {
        title: patch.title ?? slide.title,
        blocks: patch.blocks ?? slide.blocks,
        html: patch.html ?? slide.html,
        notes: patch.notes ?? slide.notes,
      });
    },

    delete(presentationId: number, slideId: number) {
      getPresentation(presentationId);
      const slide = slidesRepo.getById(presentationId, slideId);
      if (!slide) throw new AppError(404, "slide not found");
      if (slide.kind === "code") throw new AppError(403, "code slides cannot be deleted");

      slidesRepo.delete(presentationId, slideId);
    },

    applyLayout(presentationId: number, layout: LayoutInput) {
      getPresentation(presentationId);
      try {
        return slidesRepo.applyLayout(presentationId, layout);
      } catch (err) {
        throw new AppError(400, err instanceof Error ? err.message : "invalid layout");
      }
    },
  };
}
