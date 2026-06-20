import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestContext } from "./test-context.js";

describe("Slide feedback markers", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });
  let pid: number;
  let sid: number;

  beforeEach(async () => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
    pid = (await request(app).post("/api/presentations").send({ name: "Feedback" })).body.id;
    const slide = await request(app).post("/_agent-native/actions/create-html-slide").send({
      html: "<main><h1>Hello</h1><p>Body</p></main>",
      pid,
      title: "HTML feedback",
    });
    sid = slide.body.id;
  });

  it("creates, lists, and resolves HTML source feedback through actions", async () => {
    const created = await request(app)
      .post("/_agent-native/actions/create-slide-feedback")
      .send({
        location: {
          domPath: "main:nth-of-type(1) > h1:nth-of-type(1)",
          elementLabel: "h1 Hello",
          rect: { h: 32, w: 180, x: 24, y: 28 },
          sourceKind: "html",
        },
        pid,
        slideId: sid,
        text: "Make this heading larger.",
      });

    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({
      slide_id: sid,
      status: "open",
      text: "Make this heading larger.",
    });
    expect(created.body.id).toMatch(/^c-[a-f0-9]+$/);

    const slides = await request(app).get(`/api/presentations/${pid}/slides`);
    expect(slides.body[0].html).toContain("@slide-comment");

    const listed = await request(app)
      .get("/_agent-native/actions/list-slide-feedback")
      .query({ pid, slideId: sid });
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual([
      expect.objectContaining({
        id: created.body.id,
        location: expect.objectContaining({
          domPath: "main:nth-of-type(1) > h1:nth-of-type(1)",
        }),
        status: "open",
      }),
    ]);

    const resolved = await request(app).post("/_agent-native/actions/resolve-slide-feedback").send({
      feedbackId: created.body.id,
      pid,
      slideId: sid,
    });
    expect(resolved.status).toBe(200);
    expect(resolved.body).toMatchObject({ id: created.body.id, status: "resolved" });

    const afterResolve = await request(app)
      .get("/api/presentations/" + pid + "/slide-feedback")
      .query({ slideId: sid });
    expect(afterResolve.body[0]).toMatchObject({ id: created.body.id, status: "resolved" });
  });
});
