import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestContext } from "./test-context.js";

describe("Agent Native action manifest", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });

  beforeEach(() => {
    db.exec("DELETE FROM slides; DELETE FROM presentations;");
  });

  it("GET /_agent-native/actions returns an action manifest", async () => {
    const res = await request(app).get("/_agent-native/actions");

    expect(res.status).toBe(200);
    expect(res.body.actions["list-decks"]).toMatchObject({
      name: "list-decks",
      readOnly: true,
      exposure: {
        http: true,
        agentTool: true,
        mcp: true,
        a2a: true,
      },
    });
    expect(res.body.actions["create-deck"].inputSchema).toMatchObject({
      type: "object",
      properties: {
        name: expect.objectContaining({ type: "string" }),
      },
    });
    expect(res.body.actions["create-normal-slide"]).toMatchObject({
      name: "create-normal-slide",
      readOnly: false,
      exposure: {
        http: true,
        agentTool: true,
        mcp: true,
        a2a: true,
      },
    });
    expect(res.body.actions["create-normal-slides"]).toMatchObject({
      name: "create-normal-slides",
      readOnly: false,
      exposure: {
        http: true,
        agentTool: true,
        mcp: true,
        a2a: true,
      },
    });
  });
});

describe("Agent Native action invocation protocols", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });

  beforeEach(() => {
    db.exec("DELETE FROM slides; DELETE FROM presentations;");
  });

  it("POST /_agent-native/actions/invoke/:name runs an action as a tool caller", async () => {
    await request(app)
      .post("/api/presentations")
      .send({ name: "Invoke Deck", theme: "dark-green" });

    const res = await request(app).post("/_agent-native/actions/invoke/list-decks").send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        name: "Invoke Deck",
        theme: "dark-green",
      }),
    ]);
  });

  it("POST /_agent-native/actions/invoke runs an action envelope as a tool caller", async () => {
    const createRes = await request(app)
      .post("/_agent-native/actions/invoke")
      .send({
        name: "create-deck",
        args: { name: "Envelope Deck", theme: "ocean" },
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body).toMatchObject({
      name: "Envelope Deck",
      theme: "ocean",
    });

    const listRes = await request(app).post("/_agent-native/actions/invoke").send({
      name: "list-decks",
      args: {},
    });

    expect(listRes.status).toBe(200);
    expect(listRes.body).toEqual([
      expect.objectContaining({
        name: "Envelope Deck",
        theme: "ocean",
      }),
    ]);
  });

  it("POST /_agent-native/actions/mcp supports tools/list and tools/call", async () => {
    await request(app).post("/api/presentations").send({ name: "MCP Deck", theme: "dark-blue" });

    const listRes = await request(app)
      .post("/_agent-native/actions/mcp")
      .send({ jsonrpc: "2.0", id: 1, method: "tools/list" });

    expect(listRes.status).toBe(200);
    expect(listRes.body.result.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "list-decks",
          inputSchema: expect.objectContaining({ type: "object" }),
        }),
      ]),
    );

    const callRes = await request(app)
      .post("/_agent-native/actions/mcp")
      .send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "list-decks", arguments: {} },
      });

    expect(callRes.status).toBe(200);
    expect(callRes.body.result.structuredContent).toEqual([
      expect.objectContaining({ name: "MCP Deck" }),
    ]);
  });
});
