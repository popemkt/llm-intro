import { defineAction } from "@agent-native/core";
import type { createSnapshotsService } from "../server/services/snapshots.js";
import { z } from "zod";

type SnapshotsService = ReturnType<typeof createSnapshotsService>;

const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };
const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

export function createSnapshotActions(snapshotsService: SnapshotsService) {
  return {
    "list-deck-snapshots": defineAction({
      description: "List saved snapshots for a deck.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
      }),
      http: {
        method: "GET",
        path: "list-deck-snapshots",
      },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        ...publicReadAction,
        title: "List deck snapshots",
        description: "List saved snapshots for a deck.",
      },
      run: ({ pid }) => snapshotsService.list(pid),
    }),

    "get-deck-snapshot": defineAction({
      description: "Read one saved deck snapshot, including captured deck, slides, and groups.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
        snapshotId: z.coerce.number().int().positive(),
      }),
      http: {
        method: "GET",
        path: "get-deck-snapshot",
      },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        ...publicReadAction,
        title: "Get deck snapshot",
        description: "Read one saved deck snapshot, including captured deck, slides, and groups.",
      },
      run: ({ pid, snapshotId }) => snapshotsService.get(pid, snapshotId),
    }),

    "create-deck-snapshot": defineAction({
      description: "Save a snapshot of the current deck, slide list, and groups.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
        label: z.string().optional(),
      }),
      http: {
        method: "POST",
        path: "create-deck-snapshot",
      },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Create deck snapshot",
        description: "Save a snapshot of the current deck, slide list, and groups.",
      },
      run: ({ pid, label }) => snapshotsService.create(pid, { label }),
    }),

    "restore-deck-snapshot": defineAction({
      description:
        "Restore a deck to one saved snapshot. This replaces the live deck, slide list, and groups.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
        snapshotId: z.coerce.number().int().positive(),
      }),
      http: {
        method: "POST",
        path: "restore-deck-snapshot",
      },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Restore deck snapshot",
        description:
          "Restore a deck to one saved snapshot. This replaces the live deck, slide list, and groups.",
      },
      run: ({ pid, snapshotId }) => snapshotsService.restore(pid, snapshotId),
    }),
  };
}
