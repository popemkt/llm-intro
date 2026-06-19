import { describe, expect, it } from "vitest";
import request from "supertest";
import { createTestContext } from "./test-context.js";

const { app } = createTestContext({ seedSystemPresentation: false });

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

describe("Agent Native framework health routes", () => {
  it("GET /_agent-native/poll and /demo/status provide no-op framework core routes", async () => {
    const pollRes = await request(app).get("/_agent-native/poll?since=0");
    expect(pollRes.status).toBe(200);
    expect(pollRes.body).toEqual({ version: 0, events: [] });

    const demoRes = await request(app).get("/_agent-native/demo/status");
    expect(demoRes.status).toBe(200);
    expect(demoRes.body).toEqual({ enabled: false, forced: false });
  });
});

describe("Agent Native framework provider status routes", () => {
  it("GET provider and Builder status probes report local non-hosted defaults", async () => {
    await expect(request(app).get("/_agent-native/env-status")).resolves.toMatchObject({
      status: 200,
      body: [
        expect.objectContaining({
          id: "local-openai-compatible",
          configured: false,
          hosted: false,
          secrets: { OPENAI_API_KEY: "not-required" },
        }),
      ],
    });
    await expect(request(app).get("/_agent-native/builder/status")).resolves.toMatchObject({
      status: 200,
      body: expect.objectContaining({
        configured: false,
        connected: false,
        builderAvailable: false,
        hosted: false,
        localFrameAvailable: true,
        authRequired: false,
      }),
    });
  });
});

describe("Agent Native framework mode status routes", () => {
  it("GET mode and terminal probes report local App and Code mode", async () => {
    await expect(request(app).get("/_agent-native/agent-engine/status")).resolves.toMatchObject({
      status: 200,
      body: {
        configured: true,
        connected: true,
        available: true,
        hosted: false,
        requiresHostedModel: false,
        defaultMode: "app",
        modes: {
          app: expect.objectContaining({
            runtime: "local-app-agent",
            available: true,
            hosted: false,
          }),
          code: expect.objectContaining({
            runtime: "local-terminal",
            hosted: false,
          }),
        },
      },
    });
    await expect(request(app).get("/_agent-native/available-clis")).resolves.toMatchObject({
      status: 200,
      body: expect.arrayContaining([
        expect.objectContaining({ command: "codex", label: "Codex" }),
        expect.objectContaining({ command: "claude", label: "Claude Code" }),
      ]),
    });
    await expect(request(app).get("/_agent-native/agent-terminal-info")).resolves.toMatchObject({
      status: 200,
      body: { available: false },
    });
    await expect(request(app).get("/_agent-native/agent-loop-settings")).resolves.toMatchObject({
      status: 200,
      body: {
        mode: "app",
        availableModes: expect.arrayContaining(["app"]),
        hosted: false,
        requiresHostedModel: false,
        persistence: "process-local",
      },
    });
  });
});

describe("Agent Native framework runtime protocol routes", () => {
  it("GET local-runtime/protocols lists product-safe and trusted-code paths", async () => {
    await expect(request(app).get("/_agent-native/local-runtime/protocols")).resolves.toMatchObject(
      {
        status: 200,
        body: {
          hosted: false,
          requiresBuilderAuth: false,
          defaultMode: "app",
          protocols: expect.arrayContaining([
            expect.objectContaining({
              id: "app-agent-http",
              mode: "app",
              available: true,
              endpoint: "/_agent-native/app-agent",
              hosted: false,
              toolBoundary: "product-actions",
            }),
            expect.objectContaining({
              id: "actions-mcp",
              mode: "app",
              available: true,
              endpoint: "/_agent-native/actions/mcp",
              hosted: false,
              toolBoundary: "product-actions",
            }),
            expect.objectContaining({
              id: "local-openai-compatible-model",
              mode: "app",
              available: false,
              hosted: false,
              toolBoundary: "prompt-drafting-only",
            }),
            expect.objectContaining({
              id: "local-harness-mcp",
              mode: "app",
              available: false,
              hosted: false,
              toolBoundary: "external-local-harness",
            }),
            expect.objectContaining({
              id: "local-terminal-code-mode",
              mode: "code",
              hosted: false,
              toolBoundary: "trusted-local-cli",
            }),
          ]),
        },
      },
    );
  });

  it("GET local-runtime/protocols includes configured external local harness endpoints", async () => {
    const previousHttp = process.env.LOCAL_HARNESS_HTTP_URL;
    const previousOpenapi = process.env.LOCAL_HARNESS_OPENAPI_URL;
    const previousMcp = process.env.LOCAL_HARNESS_MCP_URL;

    process.env.LOCAL_HARNESS_HTTP_URL = "http://127.0.0.1:8989/actions";
    process.env.LOCAL_HARNESS_OPENAPI_URL = "http://127.0.0.1:8989/openapi.json";
    process.env.LOCAL_HARNESS_MCP_URL = "http://127.0.0.1:8989/mcp";

    try {
      await expect(
        request(app).get("/_agent-native/local-runtime/protocols"),
      ).resolves.toMatchObject({
        status: 200,
        body: {
          protocols: expect.arrayContaining([
            expect.objectContaining({
              id: "local-harness-http",
              available: true,
              endpoint: "http://127.0.0.1:8989/actions",
            }),
            expect.objectContaining({
              id: "local-harness-openapi",
              available: true,
              endpoint: "http://127.0.0.1:8989/openapi.json",
            }),
            expect.objectContaining({
              id: "local-harness-mcp",
              available: true,
              endpoint: "http://127.0.0.1:8989/mcp",
            }),
          ]),
        },
      });
    } finally {
      restoreEnv("LOCAL_HARNESS_HTTP_URL", previousHttp);
      restoreEnv("LOCAL_HARNESS_OPENAPI_URL", previousOpenapi);
      restoreEnv("LOCAL_HARNESS_MCP_URL", previousMcp);
    }
  });

  it("GET /_agent-native/mcp/servers advertises configured external local harness MCP", async () => {
    const previousMcp = process.env.LOCAL_HARNESS_MCP_URL;
    process.env.LOCAL_HARNESS_MCP_URL = "http://127.0.0.1:8989/mcp";

    try {
      await expect(request(app).get("/_agent-native/mcp/servers")).resolves.toMatchObject({
        status: 200,
        body: {
          servers: expect.arrayContaining([
            expect.objectContaining({
              id: "local-harness",
              url: "http://127.0.0.1:8989/mcp",
              hosted: false,
              toolBoundary: "external-local-harness",
            }),
          ]),
        },
      });
    } finally {
      restoreEnv("LOCAL_HARNESS_MCP_URL", previousMcp);
    }
  });
});

describe("Agent Native framework model management routes", () => {
  it("GET model defaults and manage-agent-engine report local provider state", async () => {
    await expect(request(app).get("/_agent-native/agent-model-defaults")).resolves.toMatchObject({
      status: 200,
      body: {
        provider: "local-openai-compatible",
        configured: false,
        hosted: false,
        requiresHostedModel: false,
        providers: [
          expect.objectContaining({
            id: "local-openai-compatible",
            hosted: false,
            configured: false,
          }),
        ],
      },
    });
    await expect(
      request(app).post("/_agent-native/actions/manage-agent-engine"),
    ).resolves.toMatchObject({
      status: 200,
      body: {
        configured: false,
        hosted: false,
        requiresHostedModel: false,
        engines: expect.arrayContaining([
          expect.objectContaining({ id: "local-app-agent", hosted: false }),
          expect.objectContaining({ id: "local-code-mode", hosted: false }),
        ]),
        providers: [
          expect.objectContaining({
            id: "local-openai-compatible",
            hosted: false,
            configured: false,
          }),
        ],
      },
    });
  });
});
