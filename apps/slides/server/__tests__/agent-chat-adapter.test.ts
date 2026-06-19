import { describe, expect, it } from "vitest";
import request from "supertest";
import { createTestContext } from "./test-context.js";

describe("Agent Native local agent-chat adapter", () => {
  const { app } = createTestContext({ seedSystemPresentation: false });

  it("POST /_agent-native/agent-chat delegates to the local app agent", async () => {
    const deck = (await request(app).post("/api/presentations").send({ name: "Chat Deck" })).body;
    await request(app).post(`/api/presentations/${deck.id}/slides`).send({ title: "Intro" });

    const res = await request(app)
      .post("/_agent-native/agent-chat")
      .send({ prompt: "list slides", scope: { type: "deck", id: String(deck.id) } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      runtime: "local-app-agent",
      hosted: false,
      streaming: false,
    });
    expect(res.body.text).toContain("Slides in this deck");
    expect(res.body.text).toContain("Intro");
    expect(res.body.thread).toMatchObject({
      id: res.body.threadId,
      messageCount: 2,
      messages: [
        expect.objectContaining({ role: "user", text: "list slides" }),
        expect.objectContaining({ role: "assistant" }),
      ],
    });
  });

  it("GET /_agent-native/agent-chat/threads lists and reads local threads", async () => {
    const deck = (await request(app).post("/api/presentations").send({ name: "Thread Deck" })).body;

    const first = await request(app)
      .post("/_agent-native/agent-chat")
      .send({ prompt: "summarize this deck", scope: { type: "deck", id: String(deck.id) } });
    const threadId = first.body.threadId;

    await request(app)
      .post("/_agent-native/agent-chat")
      .send({
        threadId,
        prompt: "list slides",
        scope: { type: "deck", id: String(deck.id) },
      });

    const list = await request(app).get("/_agent-native/agent-chat/threads");
    expect(list.status).toBe(200);
    expect(list.body.threads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: threadId,
          messageCount: 4,
          scope: expect.objectContaining({ type: "deck" }),
        }),
      ]),
    );
    const summary = list.body.threads.find((thread: { id?: string }) => thread.id === threadId);
    expect(summary?.messages).toBeUndefined();

    const read = await request(app).get(`/_agent-native/agent-chat/threads/${threadId}`);
    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({ id: threadId, messageCount: 4 });
    expect(read.body.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "user", text: "summarize this deck" }),
        expect.objectContaining({ role: "user", text: "list slides" }),
      ]),
    );
  });

  it("supports stock Agent Native thread persistence helpers", async () => {
    const threadId = "local-stock-panel-thread";

    const empty = await request(app).get(`/_agent-native/agent-chat/threads/${threadId}`);
    expect(empty.status).toBe(200);
    expect(empty.body).toMatchObject({
      id: threadId,
      title: "New chat",
      messageCount: 0,
    });

    const save = await request(app)
      .put(`/_agent-native/agent-chat/threads/${threadId}`)
      .send({
        title: "Saved title",
        preview: "Saved preview",
        messageCount: 3,
        threadData: { messages: [{ id: "m1" }] },
      });

    expect(save.status).toBe(200);
    expect(save.body).toMatchObject({
      id: threadId,
      title: "Saved title",
      preview: "Saved preview",
      messageCount: 3,
      threadData: { messages: [{ id: "m1" }] },
    });

    const rename = await request(app)
      .post(`/_agent-native/agent-chat/threads/${threadId}/rename`)
      .send({ title: "Renamed thread" });
    expect(rename.status).toBe(200);
    expect(rename.body).toMatchObject({ title: "Renamed thread" });

    const pin = await request(app)
      .post(`/_agent-native/agent-chat/threads/${threadId}/pin`)
      .send({ pinned: true });
    expect(pin.status).toBe(200);
    expect(pin.body.pinnedAt).toEqual(expect.any(Number));

    const runs = await request(app).get("/_agent-native/runs?limit=12");
    expect(runs.status).toBe(200);
    expect(runs.body).toEqual({ runs: [] });
  });

  it("supports stock Agent Native context and title helper routes locally", async () => {
    const manifest = await request(app)
      .get("/_agent-native/actions/context-manifest-get")
      .query({ threadId: "local-context-thread" });
    expect(manifest.status).toBe(200);
    expect(manifest.body).toMatchObject({
      threadId: "local-context-thread",
      totalTokens: 0,
      rawTokens: 0,
      reclaimedTokens: 0,
      tokenCountMethod: "estimate",
      source: "structured",
      enforceable: true,
      segments: [],
    });

    const title = await request(app)
      .post("/_agent-native/agent-chat/generate-title")
      .send({ message: "Create a sharper story for the investor update deck" });
    expect(title.status).toBe(200);
    expect(title.body).toEqual({
      title: "Create a sharper story for the investor update deck",
    });
  });

  it("accepts stock Agent Native local resource create calls", async () => {
    const create = await request(app)
      .post("/_agent-native/resources")
      .send({ path: "agent_scratch/test.md", content: "# Test" });

    expect(create.status).toBe(200);
    expect(create.body.resource).toMatchObject({
      path: "agent_scratch/test.md",
      owner: "local-user",
      content: "# Test",
      visibility: "personal",
    });
  });

  it("POST /_agent-native/agent-chat can emit a local event stream", async () => {
    const deck = (await request(app).post("/api/presentations").send({ name: "Stream Chat Deck" }))
      .body;

    const res = await request(app)
      .post("/_agent-native/agent-chat")
      .set("Accept", "text/event-stream")
      .send({ prompt: "summarize this deck", scope: { type: "deck", id: String(deck.id) } });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.text).toContain('"type":"message"');
    expect(res.text).toContain('"type":"done"');
    expect(res.text).toContain('"threadId"');
    expect(res.text).toContain("Current deck");
  });
});
