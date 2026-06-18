import { defineAction } from "@agent-native/core";
import type { createGroupsService } from "../server/services/groups.js";
import { parseGroupCreate, parseGroupPatch } from "../server/validation.js";
import { z } from "zod";

type GroupsService = ReturnType<typeof createGroupsService>;

const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };
const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

export function createGroupActions(groupsService: GroupsService) {
  return {
    "list-groups": defineAction({
      description: "List slide groups for a presentation deck.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
      }),
      http: {
        method: "GET",
        path: "list-groups",
      },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        ...publicReadAction,
        title: "List groups",
        description: "List slide groups for a presentation deck.",
      },
      run: ({ pid }) => groupsService.list(pid),
    }),

    "create-group": defineAction({
      description: "Create a slide group.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
        title: z.string().optional(),
      }),
      http: {
        method: "POST",
        path: "create-group",
      },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Create group",
        description: "Create a slide group.",
      },
      run: ({ pid, ...input }) => groupsService.create(pid, parseGroupCreate(input).title),
    }),

    "update-group": defineAction({
      description: "Update a slide group title or collapsed state.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
        gid: z.coerce.number().int().positive(),
        title: z.string().optional(),
        collapsed: z.boolean().optional(),
      }),
      http: {
        method: "PUT",
        path: "update-group",
      },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Update group",
        description: "Update a slide group title or collapsed state.",
      },
      run: ({ pid, gid, ...patch }) => groupsService.update(pid, gid, parseGroupPatch(patch)),
    }),

    "delete-group": defineAction({
      description: "Delete a slide group and ungroup its slides.",
      schema: z.object({
        pid: z.coerce.number().int().positive(),
        gid: z.coerce.number().int().positive(),
      }),
      http: {
        method: "DELETE",
        path: "delete-group",
      },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Delete group",
        description: "Delete a slide group and ungroup its slides.",
      },
      run: ({ pid, gid }) => {
        groupsService.delete(pid, gid);
        return null;
      },
    }),
  };
}
