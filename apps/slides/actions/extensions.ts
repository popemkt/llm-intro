import { defineAction } from "@agent-native/core";
import { z } from "zod";
import type { ExtensionsRepository } from "../server/repositories/extensions.js";

const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Deterministic scaffold so a freshly-created extension renders something real
// immediately (the local app agent can't synthesize a full app without a model).
// The user — or a model-backed agent — edits the content from here.
function scaffoldContent(name: string, description: string) {
  const desc =
    description.trim() || "Describe what this extension should do, then edit its content.";
  return `<div class="space-y-3" x-data="{}">
  <h2 class="text-base font-semibold text-foreground">${escapeHtml(name)}</h2>
  <p class="text-xs text-muted-foreground">${escapeHtml(desc)}</p>
  <div class="rounded-lg border border-dashed p-3 text-[11px] leading-relaxed text-muted-foreground">
    Extension scaffold. Edit the content to build your widget — it runs Alpine.js + Tailwind
    in a sandbox and can call <code>window.agentNative</code> for data and actions.
  </div>
</div>`;
}

export function createExtensionActions(extensions: ExtensionsRepository) {
  return {
    "list-extensions": defineAction({
      description: "List installed extensions (sandboxed widgets).",
      schema: z.object({}),
      http: { method: "GET", path: "list-extensions" },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        expose: true,
        readOnly: true,
        requiresAuth: false,
        title: "List extensions",
        description: "List installed extensions.",
      },
      run: () => extensions.list(),
    }),

    "create-extension": defineAction({
      description: "Create a new extension (a sandboxed Alpine.js + Tailwind widget).",
      schema: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        icon: z.string().optional(),
      }),
      http: { method: "POST", path: "create-extension" },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Create extension",
        description: "Create a sandboxed extension widget from a name and description.",
      },
      run: ({ name, description, content, icon }) => {
        const finalName = (name ?? "").trim() || "New extension";
        return extensions.create({
          name: finalName,
          description,
          icon,
          content: content ?? scaffoldContent(finalName, description ?? ""),
        });
      },
    }),
  };
}
