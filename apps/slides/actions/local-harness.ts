import { defineAction } from "@agent-native/core";
import { z } from "zod";
import {
  callLocalHarnessMcpTool,
  listLocalHarnessMcpTools,
} from "../server/local-harness-provider.js";

const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };
const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

export function createLocalHarnessActions() {
  return {
    "list-local-harness-tools": defineAction({
      description: "List tools exposed by the configured external local harness MCP server.",
      schema: z.object({}),
      http: { method: "GET", path: "list-local-harness-tools" },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        ...publicReadAction,
        title: "List local harness tools",
        description: "List tools exposed by the configured external local harness MCP server.",
      },
      run: () => listLocalHarnessMcpTools(),
    }),

    "call-local-harness-tool": defineAction({
      description: "Call one tool on the configured external local harness MCP server.",
      schema: z.object({
        toolName: z.string().min(1),
        args: z.unknown().optional(),
      }),
      http: { method: "POST", path: "call-local-harness-tool" },
      requiresAuth: false,
      readOnly: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Call local harness tool",
        description: "Call one tool on the configured external local harness MCP server.",
      },
      run: ({ toolName, args }) => callLocalHarnessMcpTool({ toolName, args }),
    }),
  };
}
