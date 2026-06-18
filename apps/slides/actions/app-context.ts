import { defineAction } from "@agent-native/core";
import { z } from "zod";
import { readApplicationState, writeApplicationState } from "../server/application-state-store.js";

const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };
const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

const navigationCommandSchema = z
  .object({
    view: z
      .enum(["decks", "deck", "slide-editor", "deck-settings", "app-settings"])
      .describe("The app view to navigate to."),
    deckId: z.coerce.number().int().positive().optional(),
    slideId: z.coerce.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    if (["deck", "slide-editor", "deck-settings"].includes(value.view) && !value.deckId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deckId"],
        message: "deckId is required for deck views",
      });
    }
    if (value.view === "slide-editor" && !value.slideId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slideId"],
        message: "slideId is required for slide-editor",
      });
    }
  });

export function createAppContextActions() {
  return {
    "get-current-app-context": defineAction({
      description:
        "Read the current browser route, semantic navigation state, and pending selected text.",
      schema: z.object({}),
      http: {
        method: "GET",
        path: "get-current-app-context",
      },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        ...publicReadAction,
        title: "Get current app context",
        description:
          "Read the current browser route, semantic navigation state, and pending selected text.",
      },
      run: () => ({
        url: readApplicationState("__url__") ?? null,
        navigation: readApplicationState("navigation") ?? null,
        pendingSelection: readApplicationState("pending-selection-context") ?? null,
      }),
    }),

    "navigate-app": defineAction({
      description:
        "Navigate the open slides app to decks, a deck overview, a slide editor, deck settings, or app settings.",
      schema: navigationCommandSchema,
      http: {
        method: "POST",
        path: "navigate-app",
      },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Navigate app",
        description:
          "Navigate the open slides app to decks, a deck overview, a slide editor, deck settings, or app settings.",
      },
      run: (command) => {
        writeApplicationState("navigate", {
          ...command,
          _writeId: `navigate-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        });
        return { queued: true, command };
      },
    }),
  };
}
