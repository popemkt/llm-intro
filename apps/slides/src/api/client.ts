import { callAction } from "@agent-native/core/client";
import type { ApiPresentation, ApiSlide, ApiSlideGroup, LayoutInput, ThemeName } from "@/types";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export const api = {
  presentations: {
    list: () => callAction<ApiPresentation[]>("list-decks", {}, { method: "GET" }),
    get: (id: number) => callAction<ApiPresentation>("get-deck", { id }, { method: "GET" }),
    create: (name: string, theme: ThemeName = "dark-green") =>
      callAction<ApiPresentation>("create-deck", { name, theme }, { method: "POST" }),
    update: (id: number, patch: Partial<Pick<ApiPresentation, "name" | "theme">>) =>
      callAction<ApiPresentation>("update-deck", { id, ...patch }, { method: "PUT" }),
    delete: async (id: number) => {
      await callAction<null>("delete-deck", { id }, { method: "DELETE" });
    },
  },

  slides: {
    list: (pid: number) => callAction<ApiSlide[]>("list-slides", { pid }, { method: "GET" }),
    create: (pid: number, title?: string) =>
      callAction<ApiSlide>("create-slide", { pid, title }, { method: "POST" }),
    update: (
      pid: number,
      sid: number,
      patch: { title?: string; blocks?: unknown[]; notes?: string },
    ) => callAction<ApiSlide>("update-slide", { pid, sid, ...patch }, { method: "PUT" }),
    delete: async (pid: number, sid: number) => {
      await callAction<null>("delete-slide", { pid, sid }, { method: "DELETE" });
    },
    layout: (pid: number, layout: LayoutInput) =>
      callAction<ApiSlide[]>("update-deck-layout", { pid, ...layout }, { method: "PUT" }),
  },

  groups: {
    list: (pid: number) => callAction<ApiSlideGroup[]>("list-groups", { pid }, { method: "GET" }),
    create: (pid: number, title?: string) =>
      callAction<ApiSlideGroup>("create-group", { pid, title }, { method: "POST" }),
    update: (pid: number, gid: number, patch: { title?: string; collapsed?: boolean }) =>
      callAction<ApiSlideGroup>("update-group", { pid, gid, ...patch }, { method: "PUT" }),
    delete: async (pid: number, gid: number) => {
      await callAction<null>("delete-group", { pid, gid }, { method: "DELETE" });
    },
  },
};
