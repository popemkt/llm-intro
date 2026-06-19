import { describe, expect, it } from "vitest";
import request from "supertest";
import { createTestContext } from "./test-context.js";

describe("Agent Native resource and app-state probes", () => {
  const { app } = createTestContext({ seedSystemPresentation: false });

  it("GET workspace resource probes expose local deck resources", async () => {
    const deck = (await request(app).post("/api/presentations").send({ name: "Resource Deck" }))
      .body;
    const group = (
      await request(app)
        .post(`/api/presentations/${deck.id}/groups`)
        .send({ title: "Resource Group" })
    ).body;
    const slide = (
      await request(app)
        .post(`/api/presentations/${deck.id}/slides`)
        .send({ title: "Resource Slide" })
    ).body;

    await expect(
      request(app).get("/_agent-native/resources/tree?scope=workspace"),
    ).resolves.toMatchObject({
      status: 200,
      body: {
        resources: expect.arrayContaining([
          expect.objectContaining({
            id: `deck:${deck.id}`,
            uri: `slides://deck/${deck.id}`,
            type: "deck",
            name: "Resource Deck",
            metadata: expect.objectContaining({
              deckId: deck.id,
              actions: expect.objectContaining({
                read: `/_agent-native/actions/get-deck?id=${deck.id}`,
                slides: `/_agent-native/actions/list-slides?pid=${deck.id}`,
              }),
            }),
          }),
          expect.objectContaining({
            id: `group:${deck.id}:${group.id}`,
            uri: `slides://deck/${deck.id}/group/${group.id}`,
            type: "group",
            parentId: `deck:${deck.id}`,
            name: "Resource Group",
          }),
          expect.objectContaining({
            id: `slide:${deck.id}:${slide.id}`,
            uri: `slides://deck/${deck.id}/slide/${slide.id}`,
            type: "slide",
            parentId: `deck:${deck.id}`,
            name: "Resource Slide",
          }),
        ]),
        tree: expect.arrayContaining([
          expect.objectContaining({
            path: "slides",
            type: "folder",
            children: expect.arrayContaining([
              expect.objectContaining({
                path: `slides/deck-${deck.id}`,
                type: "folder",
                children: expect.arrayContaining([
                  expect.objectContaining({
                    path: `slides/deck-${deck.id}/group-${group.id}.md`,
                    resource: expect.objectContaining({ id: `group:${deck.id}:${group.id}` }),
                  }),
                  expect.objectContaining({
                    path: `slides/deck-${deck.id}/slide-${slide.id}.md`,
                    resource: expect.objectContaining({ id: `slide:${deck.id}:${slide.id}` }),
                  }),
                ]),
              }),
            ]),
          }),
        ]),
        legacyTree: expect.arrayContaining([
          expect.objectContaining({
            id: `deck:${deck.id}`,
            children: expect.arrayContaining([
              `group:${deck.id}:${group.id}`,
              `slide:${deck.id}:${slide.id}`,
            ]),
          }),
        ]),
      },
    });
    await expect(request(app).get("/_agent-native/resources")).resolves.toMatchObject({
      status: 200,
      body: {
        resources: expect.arrayContaining([
          expect.objectContaining({ id: `deck:${deck.id}`, type: "deck" }),
          expect.objectContaining({ id: `slide:${deck.id}:${slide.id}`, type: "slide" }),
        ]),
      },
    });
    await expect(request(app).get("/_agent-native/mcp/servers")).resolves.toMatchObject({
      status: 200,
      body: {
        servers: [
          expect.objectContaining({
            id: "slides-actions",
            transport: "http",
            url: "/_agent-native/actions/mcp",
            hosted: false,
          }),
        ],
      },
    });
    await expect(request(app).get("/_agent-native/mcp/builtin")).resolves.toMatchObject({
      status: 200,
      body: {
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "list-decks", server: "slides-actions" }),
          expect.objectContaining({ name: "create-normal-slide", server: "slides-actions" }),
        ]),
      },
    });
  });

  it("GET/PUT/DELETE /_agent-native/application-state stores shell state", async () => {
    const value = { pathname: "/p/12", search: "", hash: "", searchParams: {} };
    const putRes = await request(app).put("/_agent-native/application-state/__url__").send(value);

    expect(putRes.status).toBe(200);

    const getRes = await request(app).get("/_agent-native/application-state/__url__");
    expect(getRes.status).toBe(200);
    expect(getRes.body).toEqual(value);

    expect((await request(app).delete("/_agent-native/application-state/__url__")).status).toBe(
      200,
    );
    expect((await request(app).get("/_agent-native/application-state/__url__")).status).toBe(204);
  });
});
