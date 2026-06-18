import { Router, type Response } from "express";
import type { SlideDeckActions } from "../../actions/index.js";
import { AppError } from "../errors.js";

type CallableAction = {
  run?: (args: unknown, context: { caller: "tool"; orgId: null }) => unknown | Promise<unknown>;
};

type DraftSlide = {
  layout: string;
  title: string;
  [key: string]: unknown;
};

type DraftResult = {
  name: string;
  slides: DraftSlide[];
};

type DeckResult = {
  id: number;
  name: string;
  theme: string;
};

function getAction(actions: SlideDeckActions, name: keyof SlideDeckActions) {
  const action = actions[name] as CallableAction | undefined;
  if (!action || typeof action.run !== "function") {
    throw new AppError(500, `action ${String(name)} is not available`);
  }
  return action.run;
}

function writeEvent(res: Response, event: unknown) {
  res.write(`${JSON.stringify(event)}\n`);
}

export function createPromptDeckStreamRouter(actions: SlideDeckActions) {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const runDraft = getAction(actions, "draft-deck-from-prompt");
      const runCreateDeck = getAction(actions, "create-deck");
      const runCreateSlide = getAction(actions, "create-normal-slide");

      writeEvent(res, { type: "status", message: "Drafting deck" });
      const draft = (await runDraft(body, { caller: "tool", orgId: null })) as DraftResult;
      writeEvent(res, { type: "draft", name: draft.name, slideCount: draft.slides.length });

      const deck = (await runCreateDeck(
        {
          name:
            "name" in body && typeof body.name === "string" && body.name.trim()
              ? body.name.trim()
              : draft.name,
          theme: "theme" in body ? body.theme : "dark-green",
        },
        { caller: "tool", orgId: null },
      )) as DeckResult;
      writeEvent(res, { type: "deck", deck });

      for (const [index, slide] of draft.slides.entries()) {
        const created = await runCreateSlide(
          {
            pid: deck.id,
            ...slide,
          },
          { caller: "tool", orgId: null },
        );
        writeEvent(res, {
          type: "slide",
          index,
          total: draft.slides.length,
          title: slide.title,
          slide: created,
        });
      }

      writeEvent(res, { type: "done", deck });
      res.end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
