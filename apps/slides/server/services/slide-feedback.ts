import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { customAlphabet } from "nanoid";
import type {
  ApiSlide,
  ApiSlideFeedback,
  SlideFeedbackSourceLocation,
} from "@llm-intro/api-contract";
import { AppError } from "../errors.js";
import type { createPresentationsRepository } from "../repositories/presentations.js";
import type { createSlidesRepository } from "../repositories/slides.js";
import {
  insertHtmlFeedbackMarker,
  insertJsxFeedbackMarker,
  parseFeedbackMarkers,
  replaceFeedbackMarker,
  serializeFeedbackMarker,
} from "../source-feedback-markers.js";

type PresentationsRepository = ReturnType<typeof createPresentationsRepository>;
type SlidesRepository = ReturnType<typeof createSlidesRepository>;

type FeedbackInput = {
  text: string;
  location?: Partial<SlideFeedbackSourceLocation>;
};

const createCommentId = customAlphabet("0123456789abcdef", 8);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_SOURCE_ROOT = path.resolve(__dirname, "../../src/slides");

function requirePresentation(presentationsRepo: PresentationsRepository, presentationId: number) {
  const presentation = presentationsRepo.getById(presentationId);
  if (!presentation) throw new AppError(404, "presentation not found");
  return presentation;
}

function requireSlide(slidesRepo: SlidesRepository, presentationId: number, slideId: number) {
  const slide = slidesRepo.getById(presentationId, slideId);
  if (!slide) throw new AppError(404, "slide not found");
  return slide;
}

/** Recursively list slide source files, skipping shared chrome (`_*.tsx`). */
function listSlideSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSlideSources(full));
    } else if (entry.isFile() && entry.name.endsWith(".tsx") && !entry.name.startsWith("_")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * The code_id a slide file maps to, derived from its location under
 * `src/slides`: a file in folder `X` is `X-<basename>`; a root file is just
 * `<basename>`. This matches the registry's own keys (e.g. `ssh-01-title`,
 * `harness-00-title`, `01-opener`).
 */
function deriveCodeId(fullPath: string): string {
  const rel = path.relative(SLIDES_SOURCE_ROOT, fullPath).replace(/\.tsx$/, "");
  const parts = rel.split(path.sep);
  const base = parts.pop() ?? rel;
  const folder = parts.join("-");
  return folder ? `${folder}-${base}` : base;
}

/**
 * Resolve a code slide's source file by scanning the slides tree. Works for any
 * deck folder without special-casing, and falls back to a bare-basename match
 * so a slide can be moved between folders without breaking feedback.
 */
function resolveCodeSlideSource(codeId: string) {
  if (!/^[a-z0-9-]+$/.test(codeId)) throw new AppError(400, "invalid code slide id");
  const files = listSlideSources(SLIDES_SOURCE_ROOT);
  const match =
    files.find((f) => deriveCodeId(f) === codeId) ??
    files.find((f) => path.basename(f, ".tsx") === codeId);
  if (!match) throw new AppError(404, "code slide source not found");
  const relativePath = path.relative(process.cwd(), match).replaceAll(path.sep, "/");
  return { fullPath: match, relativePath };
}

function baseLocation(slide: ApiSlide, sourcePath?: string): SlideFeedbackSourceLocation {
  if (slide.kind === "code") {
    return {
      sourceKind: "code",
      codeId: slide.code_id ?? undefined,
      sourcePath,
    };
  }
  if (slide.kind === "html") {
    return {
      sourceKind: "html",
      sourcePath: `slides:${slide.id}:html`,
    };
  }
  return { sourceKind: "manual" };
}

function createFeedbackRecord(
  presentationId: number,
  slide: ApiSlide,
  text: string,
  location: SlideFeedbackSourceLocation,
): ApiSlideFeedback {
  const now = new Date().toISOString();
  return {
    id: `c-${createCommentId()}`,
    presentation_id: presentationId,
    slide_id: slide.id,
    slide_kind: slide.kind,
    slide_title: slide.title,
    status: "open",
    text,
    location,
    storage: "source-marker",
    created_at: now,
    updated_at: now,
    resolved_at: null,
  };
}

function filterSlideFeedback(
  feedback: ApiSlideFeedback[],
  presentationId: number,
  slideId: number,
) {
  return feedback.filter(
    (entry) => entry.presentation_id === presentationId && entry.slide_id === slideId,
  );
}

function readSlideFeedback(presentationId: number, slide: ApiSlide) {
  if (slide.kind === "code") {
    if (!slide.code_id) return [];
    const source = resolveCodeSlideSource(slide.code_id);
    const content = fs.readFileSync(source.fullPath, "utf8");
    return filterSlideFeedback(
      parseFeedbackMarkers(content, "jsx", {
        presentationId,
        slide,
        sourcePath: source.relativePath,
      }),
      presentationId,
      slide.id,
    );
  }

  if (slide.kind === "html") {
    return filterSlideFeedback(
      parseFeedbackMarkers(slide.html, "html", { presentationId, slide }),
      presentationId,
      slide.id,
    );
  }

  return [];
}

function updateSlideHtml(
  slidesRepo: SlidesRepository,
  presentationId: number,
  slide: ApiSlide,
  html: string,
) {
  return slidesRepo.update(presentationId, slide.id, {
    title: slide.title,
    blocks: slide.blocks,
    html,
    notes: slide.notes,
    transition: slide.transition,
    background: slide.background,
  });
}

function createCodeFeedback(
  presentationId: number,
  slide: ApiSlide,
  text: string,
  input: FeedbackInput,
) {
  if (!slide.code_id) throw new AppError(400, "code slide has no code_id");
  const source = resolveCodeSlideSource(slide.code_id);
  const location = {
    ...baseLocation(slide, source.relativePath),
    ...input.location,
    sourceKind: "code",
    codeId: slide.code_id,
    sourcePath: source.relativePath,
  } satisfies SlideFeedbackSourceLocation;
  const feedback = createFeedbackRecord(presentationId, slide, text, location);
  const content = fs.readFileSync(source.fullPath, "utf8");
  const next = insertJsxFeedbackMarker(content, serializeFeedbackMarker(feedback, "jsx"));
  if (!next) throw new AppError(400, "could not locate a JSX root for the code slide");
  fs.writeFileSync(source.fullPath, next, "utf8");
  return feedback;
}

function createHtmlFeedback(
  slidesRepo: SlidesRepository,
  presentationId: number,
  slide: ApiSlide,
  text: string,
  input: FeedbackInput,
) {
  const location = {
    ...baseLocation(slide),
    ...input.location,
    sourceKind: "html",
    sourcePath: `slides:${slide.id}:html`,
  } satisfies SlideFeedbackSourceLocation;
  const feedback = createFeedbackRecord(presentationId, slide, text, location);
  updateSlideHtml(
    slidesRepo,
    presentationId,
    slide,
    insertHtmlFeedbackMarker(slide.html, serializeFeedbackMarker(feedback, "html")),
  );
  return feedback;
}

function resolveCodeFeedback(slide: ApiSlide, feedbackId: string, resolved: ApiSlideFeedback) {
  if (!slide.code_id) throw new AppError(400, "code slide has no code_id");
  const source = resolveCodeSlideSource(slide.code_id);
  const content = fs.readFileSync(source.fullPath, "utf8");
  const next = replaceFeedbackMarker(content, "jsx", feedbackId, resolved);
  if (!next) throw new AppError(404, "feedback marker not found");
  fs.writeFileSync(source.fullPath, next, "utf8");
  return resolved;
}

function resolveHtmlFeedback(
  slidesRepo: SlidesRepository,
  presentationId: number,
  slide: ApiSlide,
  feedbackId: string,
  resolved: ApiSlideFeedback,
) {
  const next = replaceFeedbackMarker(slide.html, "html", feedbackId, resolved);
  if (!next) throw new AppError(404, "feedback marker not found");
  updateSlideHtml(slidesRepo, presentationId, slide, next);
  return resolved;
}

export function createSlideFeedbackService(
  presentationsRepo: PresentationsRepository,
  slidesRepo: SlidesRepository,
) {
  return {
    list(presentationId: number, slideId?: number) {
      requirePresentation(presentationsRepo, presentationId);
      const slides = slideId
        ? [requireSlide(slidesRepo, presentationId, slideId)]
        : slidesRepo.listByPresentationId(presentationId);
      return slides.flatMap((slide) => readSlideFeedback(presentationId, slide));
    },

    create(presentationId: number, slideId: number, input: FeedbackInput) {
      requirePresentation(presentationsRepo, presentationId);
      const slide = requireSlide(slidesRepo, presentationId, slideId);
      const text = input.text.trim();
      if (!text) throw new AppError(400, "feedback text is required");
      if (slide.kind !== "code" && slide.kind !== "html") {
        throw new AppError(400, "source feedback is only supported for code and HTML slides");
      }

      if (slide.kind === "code") {
        return createCodeFeedback(presentationId, slide, text, input);
      }

      return createHtmlFeedback(slidesRepo, presentationId, slide, text, input);
    },

    resolve(presentationId: number, slideId: number, feedbackId: string) {
      requirePresentation(presentationsRepo, presentationId);
      const slide = requireSlide(slidesRepo, presentationId, slideId);
      const existing = readSlideFeedback(presentationId, slide).find(
        (entry) => entry.id === feedbackId,
      );
      if (!existing) throw new AppError(404, "feedback not found");

      const now = new Date().toISOString();
      const resolved: ApiSlideFeedback = {
        ...existing,
        status: "resolved",
        updated_at: now,
        resolved_at: now,
      };

      if (slide.kind === "code") {
        return resolveCodeFeedback(slide, feedbackId, resolved);
      }

      if (slide.kind === "html") {
        return resolveHtmlFeedback(slidesRepo, presentationId, slide, feedbackId, resolved);
      }

      throw new AppError(400, "source feedback is only supported for code and HTML slides");
    },
  };
}
