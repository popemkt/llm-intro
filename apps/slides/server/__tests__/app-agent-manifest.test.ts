import { describe, expect, it } from "vitest";
import request from "supertest";
import { createTestContext } from "./test-context.js";

describe("Agent Native app-agent manifest", () => {
  const { app } = createTestContext({ seedSystemPresentation: false });

  it("GET /_agent-native/app-agent exposes local App Mode capabilities", async () => {
    await expect(request(app).get("/_agent-native/app-agent")).resolves.toMatchObject({
      status: 200,
      body: {
        id: "llm-intro:app-agent",
        runtime: "local-app-agent",
        hosted: false,
        requiresHostedModel: false,
        toolBoundary: "product-actions",
        chat: {
          streaming: false,
          history: true,
          structuredContent: true,
          attachments: false,
        },
        tools: {
          filesystem: false,
          shell: false,
        },
        actions: {
          registry: "/_agent-native/actions",
          mcp: "/_agent-native/actions/mcp",
        },
        promptFamilies: expect.arrayContaining([
          "active-deck-context",
          "prompt-deck-creation",
          "snapshot-create-list-restore",
          "local-harness-status",
          "local-harness-mcp-tools",
        ]),
        suggestions: expect.arrayContaining([
          "Summarize this deck",
          "Check local harness status",
          "List local harness tools",
        ]),
      },
    });
  });

  it("GET /_agent-native/app-agent/capabilities exposes the compact capability view", async () => {
    await expect(request(app).get("/_agent-native/app-agent/capabilities")).resolves.toMatchObject({
      status: 200,
      body: {
        id: "llm-intro:app-agent",
        runtime: "local-app-agent",
        hosted: false,
        requiresHostedModel: false,
        chat: expect.objectContaining({ streaming: false }),
        promptFamilies: expect.arrayContaining([
          "markdown-import",
          "slide-editing",
          "local-harness-status",
          "local-harness-mcp-tools",
        ]),
        suggestions: expect.arrayContaining(["Export this deck as HTML"]),
      },
    });
  });
});
