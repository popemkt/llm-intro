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
