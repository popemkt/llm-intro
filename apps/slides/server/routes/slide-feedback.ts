import { Router, type Request } from "express";
import type { SlideFeedbackSourceLocation } from "@llm-intro/api-contract";
import type { createSlideFeedbackService } from "../services/slide-feedback.js";
import { AppError } from "../errors.js";

type SlideFeedbackService = ReturnType<typeof createSlideFeedbackService>;
type PresentationParams = { pid: string };
type FeedbackParams = PresentationParams & { sid: string; feedbackId: string };

function parseSlideId(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(400, "slideId must be positive");
  return parsed;
}

function parseCreateBody(body: unknown) {
  if (!body || typeof body !== "object") throw new AppError(400, "request body is required");
  const record = body as Record<string, unknown>;
  const slideId = parseSlideId(record.slideId);
  if (!slideId) throw new AppError(400, "slideId is required");
  if (typeof record.text !== "string") throw new AppError(400, "text is required");
  const location =
    record.location && typeof record.location === "object"
      ? (record.location as Partial<SlideFeedbackSourceLocation>)
      : undefined;
  return { slideId, text: record.text, location };
}

export function createSlideFeedbackRouter(feedbackService: SlideFeedbackService) {
  const router = Router({ mergeParams: true });

  router.get("/", (req: Request<PresentationParams>, res) => {
    res.json(feedbackService.list(Number(req.params.pid), parseSlideId(req.query.slideId)));
  });

  router.post("/", (req: Request<PresentationParams>, res) => {
    const body = parseCreateBody(req.body);
    res.status(201).json(
      feedbackService.create(Number(req.params.pid), body.slideId, {
        text: body.text,
        location: body.location,
      }),
    );
  });

  router.patch("/:sid/:feedbackId/resolve", (req: Request<FeedbackParams>, res) => {
    res.json(
      feedbackService.resolve(
        Number(req.params.pid),
        Number(req.params.sid),
        req.params.feedbackId,
      ),
    );
  });

  return router;
}
