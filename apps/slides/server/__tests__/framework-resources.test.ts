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
    const asset = (
      await request(app).post("/_agent-native/actions/import-deck-asset").send({
        pid: deck.id,
        name: "Resource Logo",
        content: '<svg viewBox="0 0 1 1"><path d="M0 0h1v1H0z"/></svg>',
        sourceName: "Test",
      })
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
          expect.objectContaining({
            id: `asset:${deck.id}:${asset.id}`,
            uri: `slides://deck/${deck.id}/asset/${asset.id}`,
            type: "asset",
            parentId: `deck:${deck.id}`,
            name: "Resource Logo",
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
                  expect.objectContaining({
                    path: `slides/deck-${deck.id}/assets/asset-${asset.id}.md`,
                    resource: expect.objectContaining({ id: `asset:${deck.id}:${asset.id}` }),
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
              `asset:${deck.id}:${asset.id}`,
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
          expect.objectContaining({ id: `asset:${deck.id}:${asset.id}`, type: "asset" }),
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
