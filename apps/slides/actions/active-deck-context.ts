import { defineAction } from "@agent-native/core";
import { z } from "zod";
import type { createPresentationsService } from "../server/services/presentations.js";
import type { createSlidesService } from "../server/services/slides.js";
import type { createGroupsService } from "../server/services/groups.js";
import { readApplicationState } from "../server/application-state-store.js";

type PresentationsService = ReturnType<typeof createPresentationsService>;
type SlidesService = ReturnType<typeof createSlidesService>;
type GroupsService = ReturnType<typeof createGroupsService>;

const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };

function readNavigationDeckId() {
  const navigation = readApplicationState("navigation");
  if (!navigation || typeof navigation !== "object" || !("deckId" in navigation)) return null;
  const deckId = Number(navigation.deckId);
  return Number.isInteger(deckId) && deckId > 0 ? deckId : null;
}

export function createActiveDeckContextAction(services: {
  presentationsService: PresentationsService;
  slidesService: SlidesService;
  groupsService: GroupsService;
}) {
  return defineAction({
    description:
      "Read the active deck context, including deck metadata, slide list, group list, and current navigation state.",
    schema: z.object({
      deckId: z.coerce.number().int().positive().optional(),
    }),
    http: {
      method: "GET",
      path: "get-active-deck-context",
    },
    requiresAuth: false,
    readOnly: true,
    publicAgent: {
      ...publicReadAction,
      title: "Get active deck context",
      description:
        "Read the active deck context, including deck metadata, slide list, group list, and current navigation state.",
    },
    run: ({ deckId }) => {
      const activeDeckId = deckId ?? readNavigationDeckId();
      const navigation = readApplicationState("navigation") ?? null;
      if (!activeDeckId) {
        return { deck: null, slides: [], groups: [], navigation };
      }

      return {
        deck: services.presentationsService.get(activeDeckId),
        slides: services.slidesService.list(activeDeckId),
        groups: services.groupsService.list(activeDeckId),
        navigation,
      };
    },
  });
}
