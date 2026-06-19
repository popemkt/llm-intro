import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import Database from "better-sqlite3";
import { bootstrapDatabase } from "../db.js";
import { createTestContext } from "./test-context.js";

describe("Presentations API", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });

  beforeEach(() => {
    db.exec("DELETE FROM slides; DELETE FROM presentations;");
  });

  it("GET / returns empty array when no user presentations exist", async () => {
    const res = await request(app).get("/api/presentations");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST / creates a presentation", async () => {
    const res = await request(app)
      .post("/api/presentations")
      .send({ name: "Test", theme: "dark-blue" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Test");
    expect(res.body.theme).toBe("dark-blue");
    expect(res.body.id).toBeDefined();
  });

  it("POST / rejects missing name", async () => {
    expect((await request(app).post("/api/presentations").send({})).status).toBe(400);
  });

  it("GET /:id returns the presentation", async () => {
    const {
      body: { id },
    } = await request(app).post("/api/presentations").send({ name: "Hello" });
    expect((await request(app).get(`/api/presentations/${id}`)).body.name).toBe("Hello");
  });

  it("GET /:id returns 404 for unknown id", async () => {
    expect((await request(app).get("/api/presentations/99999")).status).toBe(404);
  });

  it("PATCH /:id updates fields", async () => {
    const {
      body: { id },
    } = await request(app).post("/api/presentations").send({ name: "Old" });
    const res = await request(app)
      .patch(`/api/presentations/${id}`)
      .send({ name: "New", theme: "neon" });
    expect(res.body.name).toBe("New");
    expect(res.body.theme).toBe("neon");
  });

  it("DELETE /:id removes a user presentation", async () => {
    const {
      body: { id },
    } = await request(app).post("/api/presentations").send({ name: "ToDelete" });
    expect((await request(app).delete(`/api/presentations/${id}`)).status).toBe(204);
    expect((await request(app).get(`/api/presentations/${id}`)).status).toBe(404);
  });

  it("GET /_agent-native/actions/list-decks returns presentations through an action", async () => {
    await request(app).post("/api/presentations").send({ name: "Action Deck", theme: "dark-blue" });

    const res = await request(app).get("/_agent-native/actions/list-decks");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        name: "Action Deck",
        theme: "dark-blue",
      }),
    ]);
  });

  it("POST /_agent-native/actions/list-decks rejects the wrong method", async () => {
    const res = await request(app).post("/_agent-native/actions/list-decks").send({});

    expect(res.status).toBe(405);
    expect(res.body.error).toContain("method POST is not supported");
  });
});

describe("Agent Native A2A exposure", () => {
  const { app } = createTestContext({ seedSystemPresentation: false });

  it("GET /_agent-native/a2a/agent-card advertises slide skills", async () => {
    const res = await request(app).get("/_agent-native/a2a/agent-card");

    expect(res.status).toBe(200);
    expect(res.body.skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "list-decks",
          name: "List decks",
        }),
        expect.objectContaining({
          id: "update-slide",
          name: "Update slide",
        }),
        expect.objectContaining({
          id: "create-normal-slide",
          name: "Create normal slide",
        }),
        expect.objectContaining({
          id: "create-manual-slide",
          name: "Create manual slide",
        }),
        expect.objectContaining({
          id: "create-html-slide",
          name: "Create HTML slide",
        }),
        expect.objectContaining({
          id: "create-normal-slides",
          name: "Create normal slides",
        }),
      ]),
    );
  });
});

describe("Normal slide actions", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });
  let pid: number;

  beforeEach(async () => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
    pid = (await request(app).post("/api/presentations").send({ name: "Pres" })).body.id;
  });

  it("POST /_agent-native/actions/create-normal-slide creates a standard layout slide", async () => {
    const res = await request(app)
      .post("/_agent-native/actions/create-normal-slide")
      .send({
        pid,
        layout: "bullets",
        title: "Agent Native Adoption",
        label: "Migration",
        bullets: ["Keep themeability", "Expose actions", "Use the shell"],
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Agent Native Adoption");
    expect(res.body.kind).toBe("db");
    expect(res.body.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "title",
          type: "text",
          markdown: "## Agent Native Adoption",
        }),
        expect.objectContaining({
          id: "bullets",
          type: "text",
          markdown: expect.stringContaining("Keep themeability"),
        }),
      ]),
    );
    expect(res.body.blocks.every((block: { x?: number }) => typeof block.x === "number")).toBe(
      true,
    );
  });

  it("POST /_agent-native/actions/create-normal-slides creates outline slides", async () => {
    const res = await request(app)
      .post("/_agent-native/actions/create-normal-slides")
      .send({
        pid,
        slides: [
          {
            layout: "title",
            title: "Adopting Agent Native",
            subtitle: "Keep our product, improve the shell",
          },
          {
            layout: "two-column",
            title: "What moves",
            leftBullets: ["Action registry", "Agent panel"],
            rightBullets: ["Theme bridge", "Local CLI mode"],
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      title: "Adopting Agent Native",
      kind: "db",
    });
    expect(res.body[1].blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "left",
          markdown: expect.stringContaining("Action registry"),
        }),
        expect.objectContaining({
          id: "right",
          markdown: expect.stringContaining("Local CLI mode"),
        }),
      ]),
    );
  });
});

describe("Manual slide actions", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });
  let pid: number;

  beforeEach(async () => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
    pid = (await request(app).post("/api/presentations").send({ name: "Manual Pres" })).body.id;
  });

  it("POST /_agent-native/actions/create-manual-slide preserves styled manual blocks", async () => {
    const res = await request(app)
      .post("/_agent-native/actions/create-manual-slide")
      .send({
        pid,
        title: "Styled Manual",
        notes: "Speaker note",
        blocks: [
          {
            id: "headline",
            type: "text",
            markdown: "# Hello",
            x: 8,
            y: 10,
            w: 72,
            h: 24,
            rotation: -2,
            opacity: 0.85,
            groupId: "hero-group",
            groupName: "Hero",
            locked: true,
            fontSize: 42,
            color: "#ffffff",
            background: "#123456",
            align: "center",
            padding: 16,
          },
          {
            id: "logo",
            type: "image",
            url: "data:image/svg+xml,%3Csvg%2F%3E",
            alt: "Logo",
            objectFit: "cover",
            borderRadius: 18,
            x: 80,
            y: 10,
            w: 12,
            h: 12,
            groupId: "hero-group",
            groupName: "Hero",
          },
          {
            id: "badge",
            type: "shape",
            shape: "pill",
            color: "#25d366",
            label: "Ready",
            textColor: "#0d0f0e",
            borderColor: "#ffffff",
            borderWidth: 2,
            x: 10,
            y: 72,
            w: 24,
            h: 10,
          },
          {
            id: "arrow",
            type: "line",
            color: "#ffd93d",
            strokeWidth: 5,
            dash: "dash",
            startX: 4,
            startY: 50,
            endX: 96,
            endY: 50,
            endArrow: true,
            x: 38,
            y: 72,
            w: 48,
            h: 10,
          },
          {
            id: "matrix",
            type: "table",
            rows: [
              ["Mode", "Use"],
              ["Manual", "Structured"],
              ["HTML", "Freeform"],
            ],
            headerRows: 1,
            fontSize: 14,
            color: "#ffffff",
            background: "#101412",
            headerBackground: "#123456",
            borderColor: "#ffffff",
            borderWidth: 1,
            cellPadding: 8,
            align: "center",
            x: 10,
            y: 84,
            w: 76,
            h: 12,
          },
          {
            id: "chart",
            type: "chart",
            chart: "bar",
            title: "Adoption",
            categories: ["Manual", "HTML", "Code"],
            series: [{ name: "Usage", values: [42, 24, 18], color: "#25d366" }],
            showLegend: true,
            showValues: true,
            labelColor: "#ffffff",
            axisColor: "#8aa39b",
            x: 10,
            y: 4,
            w: 42,
            h: 28,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: "Styled Manual",
      kind: "db",
      notes: "Speaker note",
      blocks: [
        expect.objectContaining({
          id: "headline",
          fontSize: 42,
          background: "#123456",
          align: "center",
          rotation: -2,
          opacity: 0.85,
          groupId: "hero-group",
          groupName: "Hero",
          locked: true,
        }),
        expect.objectContaining({
          id: "logo",
          objectFit: "cover",
          borderRadius: 18,
          groupId: "hero-group",
          groupName: "Hero",
        }),
        expect.objectContaining({
          id: "badge",
          textColor: "#0d0f0e",
          borderColor: "#ffffff",
          borderWidth: 2,
        }),
        expect.objectContaining({
          id: "arrow",
          type: "line",
          color: "#ffd93d",
          strokeWidth: 5,
          dash: "dash",
          endArrow: true,
        }),
        expect.objectContaining({
          id: "matrix",
          type: "table",
          rows: [
            ["Mode", "Use"],
            ["Manual", "Structured"],
            ["HTML", "Freeform"],
          ],
          headerRows: 1,
          headerBackground: "#123456",
          borderColor: "#ffffff",
          align: "center",
        }),
        expect.objectContaining({
          id: "chart",
          type: "chart",
          chart: "bar",
          title: "Adoption",
          categories: ["Manual", "HTML", "Code"],
          series: [expect.objectContaining({ name: "Usage", values: [42, 24, 18] })],
          showLegend: true,
          showValues: true,
        }),
      ],
    });
  });

  it("manual block actions add, update, group, ungroup, and delete typed blocks", async () => {
    const slide = (
      await request(app)
        .post("/_agent-native/actions/create-manual-slide")
        .send({ pid, title: "Block Actions", blocks: [] })
    ).body;

    const added = await request(app)
      .post("/_agent-native/actions/add-manual-block")
      .send({
        pid,
        sid: slide.id,
        block: { id: "title", type: "text", markdown: "Hello", x: 10, y: 10, w: 40, h: 12 },
      });
    expect(added.status).toBe(200);
    expect(added.body.blocks).toEqual([expect.objectContaining({ id: "title" })]);

    const updated = await request(app)
      .put("/_agent-native/actions/update-manual-block")
      .send({ pid, sid: slide.id, bid: "title", patch: { markdown: "# Updated", fontSize: 42 } });
    expect(updated.status).toBe(200);
    expect(updated.body.blocks[0]).toMatchObject({ markdown: "# Updated", fontSize: 42 });

    await request(app)
      .post("/_agent-native/actions/add-manual-block")
      .send({
        pid,
        sid: slide.id,
        block: {
          id: "badge",
          type: "shape",
          shape: "pill",
          color: "#25d366",
          label: "Ready",
          x: 52,
          y: 10,
          w: 18,
          h: 10,
        },
      });

    const grouped = await request(app)
      .put("/_agent-native/actions/group-manual-blocks")
      .send({
        pid,
        sid: slide.id,
        blockIds: ["title", "badge"],
        groupId: "hero",
        groupName: "Hero",
      });
    expect(grouped.status).toBe(200);
    expect(grouped.body.blocks).toEqual([
      expect.objectContaining({ id: "title", groupId: "hero", groupName: "Hero" }),
      expect.objectContaining({ id: "badge", groupId: "hero", groupName: "Hero" }),
    ]);

    const ungrouped = await request(app)
      .put("/_agent-native/actions/ungroup-manual-blocks")
      .send({ pid, sid: slide.id, groupId: "hero" });
    expect(ungrouped.status).toBe(200);
    expect(ungrouped.body.blocks.every((block: { groupId?: string }) => !block.groupId)).toBe(true);

    const deleted = await request(app)
      .delete("/_agent-native/actions/delete-manual-block")
      .send({ pid, sid: slide.id, bid: "badge" });
    expect(deleted.status).toBe(200);
    expect(deleted.body.blocks).toEqual([expect.objectContaining({ id: "title" })]);
  });

  it("manual arrange actions align, distribute, duplicate, and reorder blocks", async () => {
    const slide = (
      await request(app)
        .post("/_agent-native/actions/create-manual-slide")
        .send({
          pid,
          title: "Arrange Blocks",
          blocks: [
            { id: "a", type: "text", markdown: "A", x: 10, y: 10, w: 10, h: 10 },
            { id: "b", type: "text", markdown: "B", x: 35, y: 20, w: 10, h: 10 },
            { id: "c", type: "text", markdown: "C", x: 80, y: 30, w: 10, h: 10 },
          ],
        })
    ).body;

    const aligned = await request(app)
      .put("/_agent-native/actions/arrange-manual-blocks")
      .send({ pid, sid: slide.id, blockIds: ["a", "b", "c"], action: "align-top" });
    expect(aligned.status).toBe(200);
    expect(aligned.body.blocks.map((block: { y: number }) => block.y)).toEqual([10, 10, 10]);

    const distributed = await request(app)
      .put("/_agent-native/actions/arrange-manual-blocks")
      .send({
        pid,
        sid: slide.id,
        blockIds: ["a", "b", "c"],
        action: "distribute-horizontal",
      });
    expect(distributed.status).toBe(200);
    expect(distributed.body.blocks.map((block: { x: number }) => block.x)).toEqual([10, 45, 80]);

    const duplicated = await request(app)
      .post("/_agent-native/actions/duplicate-manual-blocks")
      .send({ pid, sid: slide.id, blockIds: ["b"], offsetX: 4, offsetY: 5 });
    expect(duplicated.status).toBe(200);
    const copy = duplicated.body.blocks[2];
    expect(copy).toMatchObject({ markdown: "B", x: 49, y: 15 });
    expect(copy.id).not.toBe("b");

    const layered = await request(app)
      .put("/_agent-native/actions/move-manual-block-layer")
      .send({ pid, sid: slide.id, blockIds: ["a"], direction: "front" });
    expect(layered.status).toBe(200);
    expect(layered.body.blocks.at(-1)).toMatchObject({ id: "a" });
  });

  it("manual block locks protect layout edits and can be toggled", async () => {
    const slide = (
      await request(app)
        .post("/_agent-native/actions/create-manual-slide")
        .send({
          pid,
          title: "Locked Blocks",
          blocks: [
            { id: "locked", type: "text", markdown: "Locked", x: 10, y: 10, w: 20, h: 10 },
            { id: "free", type: "text", markdown: "Free", x: 40, y: 10, w: 20, h: 10 },
          ],
        })
    ).body;

    const locked = await request(app)
      .put("/_agent-native/actions/set-manual-block-lock")
      .send({ pid, sid: slide.id, blockIds: ["locked"], locked: true });
    expect(locked.status).toBe(200);
    expect(locked.body.blocks[0]).toMatchObject({ id: "locked", locked: true });

    const rejectedArrange = await request(app)
      .put("/_agent-native/actions/arrange-manual-blocks")
      .send({ pid, sid: slide.id, blockIds: ["locked"], action: "fit-slide" });
    expect(rejectedArrange.status).toBe(400);
    expect(rejectedArrange.body.error).toContain("block is locked");

    const rejectedDelete = await request(app)
      .delete("/_agent-native/actions/delete-manual-block")
      .send({ pid, sid: slide.id, bid: "locked" });
    expect(rejectedDelete.status).toBe(400);
    expect(rejectedDelete.body.error).toContain("block is locked");

    const unlocked = await request(app)
      .put("/_agent-native/actions/set-manual-block-lock")
      .send({ pid, sid: slide.id, blockIds: ["locked"], locked: false });
    expect(unlocked.status).toBe(200);
    expect(unlocked.body.blocks[0]).toMatchObject({ id: "locked", locked: false });

    const arranged = await request(app)
      .put("/_agent-native/actions/arrange-manual-blocks")
      .send({ pid, sid: slide.id, blockIds: ["locked"], action: "fit-slide" });
    expect(arranged.status).toBe(200);
    expect(arranged.body.blocks[0]).toMatchObject({ id: "locked", x: 5, y: 5, w: 90, h: 90 });
  });

  it("inserts reusable manual presets as typed blocks", async () => {
    const slide = (
      await request(app)
        .post("/_agent-native/actions/create-manual-slide")
        .send({ pid, title: "Preset Blocks", blocks: [] })
    ).body;

    const res = await request(app)
      .post("/_agent-native/actions/insert-manual-preset")
      .send({ pid, sid: slide.id, presetId: "comparison" });

    expect(res.status).toBe(200);
    expect(res.body.blocks).toHaveLength(4);
    expect(res.body.blocks).toEqual([
      expect.objectContaining({ type: "shape", label: "Option A" }),
      expect.objectContaining({ type: "shape", label: "Option B" }),
      expect.objectContaining({ type: "text", markdown: expect.stringContaining("Current") }),
      expect.objectContaining({ type: "text", markdown: expect.stringContaining("Target") }),
    ]);
    expect(new Set(res.body.blocks.map((block: { id: string }) => block.id)).size).toBe(4);
  });
});

describe("Deck asset actions", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });
  let pid: number;

  beforeEach(async () => {
    db.exec(
      "DELETE FROM deck_assets; DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;",
    );
    pid = (await request(app).post("/api/presentations").send({ name: "Asset Deck" })).body.id;
  });

  it("imports, lists, updates, and deletes deck-local SVG assets", async () => {
    const imported = await request(app)
      .post("/_agent-native/actions/import-deck-asset")
      .send({
        pid,
        name: "Example Logo",
        content: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>',
        sourceUrl: "https://example.com/logo.svg",
        sourceName: "Example",
        license: "internal-test",
        usage: "cover slide",
        metadata: { variant: "default" },
      });

    expect(imported.status).toBe(200);
    expect(imported.body).toMatchObject({
      presentation_id: pid,
      name: "Example Logo",
      kind: "svg",
      mime_type: "image/svg+xml",
      source_url: "https://example.com/logo.svg",
      source_name: "Example",
      license: "internal-test",
      usage: "cover slide",
      metadata: { variant: "default" },
    });

    const listed = await request(app).get("/_agent-native/actions/list-deck-assets").query({ pid });
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual([
      expect.objectContaining({
        id: imported.body.id,
        name: "Example Logo",
        contentLength: expect.any(Number),
      }),
    ]);
    expect(listed.body[0]).not.toHaveProperty("content");

    const listedWithContent = await request(app)
      .get("/_agent-native/actions/list-deck-assets")
      .query({ pid, includeContent: "true" });
    expect(listedWithContent.status).toBe(200);
    expect(listedWithContent.body[0]).toMatchObject({
      id: imported.body.id,
      content: expect.stringContaining("<svg"),
    });

    const updated = await request(app)
      .put("/_agent-native/actions/update-deck-asset-metadata")
      .send({
        pid,
        assetId: imported.body.id,
        name: "Updated Logo",
        usage: "closing slide",
        metadata: { variant: "dark" },
      });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id: imported.body.id,
      name: "Updated Logo",
      usage: "closing slide",
      metadata: { variant: "dark" },
    });

    const deleted = await request(app)
      .delete("/_agent-native/actions/delete-deck-asset")
      .send({ pid, assetId: imported.body.id });
    expect(deleted.status).toBe(200);
    expect(deleted.body).toBeNull();
  });

  it("rejects non-SVG content for SVG imports", async () => {
    const res = await request(app)
      .post("/_agent-native/actions/import-deck-asset")
      .send({ pid, name: "Bad", content: "not svg" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("<svg>");
  });
});

describe("App agent runtime", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });
  let pid: number;

  beforeEach(async () => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
    pid = (await request(app).post("/api/presentations").send({ name: "Pres" })).body.id;
  });

  it("POST /_agent-native/app-agent lists slides through app actions", async () => {
    await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "Existing" });

    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({ prompt: "list slides", scope: { type: "deck", id: String(pid) } });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Existing");
  });

  it("POST /_agent-native/app-agent creates a normal slide through app actions", async () => {
    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({
        prompt: 'create a title slide called "Local App Mode"',
        scope: { type: "deck", id: String(pid) },
      });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Local App Mode");
    await expect(
      request(app).get(`/_agent-native/actions/list-slides?pid=${pid}`),
    ).resolves.toMatchObject({
      body: expect.arrayContaining([
        expect.objectContaining({
          title: "Local App Mode",
          kind: "db",
        }),
      ]),
    });
  });

  it("POST /_agent-native/app-agent creates a normal slide sequence from an outline", async () => {
    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({
        prompt: "create slides\n- Title slide called Kickoff\n- Bullets slide called Risks",
        scope: { type: "deck", id: String(pid) },
      });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Created 2 normal slides");
    await expect(
      request(app).get(`/_agent-native/actions/list-slides?pid=${pid}`),
    ).resolves.toMatchObject({
      body: expect.arrayContaining([
        expect.objectContaining({ title: "Kickoff", kind: "db" }),
        expect.objectContaining({ title: "Risks", kind: "db" }),
      ]),
    });
  });

  it("POST /_agent-native/app-agent changes the deck theme through app actions", async () => {
    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({
        prompt: "change theme to ocean",
        scope: { type: "deck", id: String(pid) },
      });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("ocean");
    await expect(
      request(app).get(`/_agent-native/actions/get-deck?id=${pid}`),
    ).resolves.toMatchObject({
      body: expect.objectContaining({ theme: "ocean" }),
    });
  });

  it("POST /_agent-native/app-agent creates and lists groups through app actions", async () => {
    const createRes = await request(app)
      .post("/_agent-native/app-agent")
      .send({
        prompt: 'create group called "Decision Points"',
        scope: { type: "deck", id: String(pid) },
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.text).toContain("Decision Points");

    const listRes = await request(app)
      .post("/_agent-native/app-agent")
      .send({ prompt: "list groups", scope: { type: "deck", id: String(pid) } });

    expect(listRes.status).toBe(200);
    expect(listRes.body.text).toContain("Decision Points");
  });
});

describe("Agent Native chat shell probes", () => {
  const { app } = createTestContext({ seedSystemPresentation: false });

  it("GET auth shell probes return local identity defaults", async () => {
    await expect(request(app).get("/_agent-native/auth/session")).resolves.toMatchObject({
      status: 200,
      body: {
        authenticated: true,
        provider: "local",
        hosted: false,
        requiresBuilderAuth: false,
        user: { id: "local-user" },
        org: { id: "local-workspace" },
      },
    });
    await expect(request(app).get("/_agent-native/org/me")).resolves.toMatchObject({
      status: 200,
      body: {
        org: { id: "local-workspace", hosted: false },
        user: { id: "local-user" },
        auth: { provider: "local", requiresBuilderAuth: false },
      },
    });
  });

  it("GET agent-chat mode reports local App and Code mode", async () => {
    await expect(request(app).get("/_agent-native/agent-chat/mode")).resolves.toMatchObject({
      status: 200,
      body: {
        devMode: true,
        canToggle: false,
        appMode: {
          runtime: "local-app-agent",
          hosted: false,
          requiresHostedModel: false,
          toolBoundary: "product-actions",
          capabilitiesUrl: "/_agent-native/app-agent/capabilities",
          promptFamilies: expect.arrayContaining([
            "normal-slide-creation",
            "local-model-status",
            "local-harness-status",
          ]),
          suggestions: expect.arrayContaining(["Summarize this deck"]),
        },
        codeMode: {
          runtime: "local-terminal",
          hosted: false,
          toolBoundary: "trusted-local-cli",
          available: true,
        },
      },
    });
  });

  it("GET chat thread and run probes return empty runtime defaults", async () => {
    await expect(request(app).get("/_agent-native/agent-chat/threads")).resolves.toMatchObject({
      status: 200,
      body: { threads: [] },
    });
    await expect(
      request(app).get("/_agent-native/agent-chat/runs/list?goalId=agent-team"),
    ).resolves.toMatchObject({
      status: 200,
      body: { runs: [] },
    });
    await expect(
      request(app).get("/_agent-native/agent-chat/runs/active?threadId=test"),
    ).resolves.toMatchObject({
      status: 200,
      body: { active: false, status: "idle" },
    });
  });
});

describe("Slides API", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });
  let pid: number;

  beforeEach(async () => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
    pid = (await request(app).post("/api/presentations").send({ name: "Pres" })).body.id;
  });

  it("GET / returns empty array", async () => {
    expect((await request(app).get(`/api/presentations/${pid}/slides`)).body).toEqual([]);
  });

  it("GET / returns 404 for an unknown presentation", async () => {
    expect((await request(app).get("/api/presentations/99999/slides")).status).toBe(404);
  });

  it("POST / creates a db slide", async () => {
    const res = await request(app)
      .post(`/api/presentations/${pid}/slides`)
      .send({ title: "S1", notes: "Opening note" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("S1");
    expect(res.body.notes).toBe("Opening note");
    expect(res.body.kind).toBe("db");
    expect(Array.isArray(res.body.blocks)).toBe(true);
  });

  it("POST /_agent-native/actions/create-html-slide creates an HTML slide", async () => {
    const res = await request(app).post("/_agent-native/actions/create-html-slide").send({
      pid,
      title: "HTML Demo",
      html: '<main style="width:100%;height:100%">Hello HTML</main>',
      notes: "HTML note",
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: "HTML Demo",
      kind: "html",
      html: '<main style="width:100%;height:100%">Hello HTML</main>',
      notes: "HTML note",
      blocks: [],
    });
  });

  it("persists slide transition metadata through create and update actions", async () => {
    const created = await request(app)
      .post("/_agent-native/actions/create-manual-slide")
      .send({
        pid,
        title: "Transition Demo",
        blocks: [],
        transition: { engine: "waapi", name: "fade", duration: 250, easing: "ease-out" },
      });

    expect(created.status).toBe(200);
    expect(created.body.transition).toMatchObject({ name: "fade", duration: 250 });

    const updated = await request(app)
      .put("/_agent-native/actions/update-slide")
      .send({
        pid,
        sid: created.body.id,
        transition: {
          engine: "waapi",
          name: "custom",
          duration: 450,
          easing: "ease-in-out",
          enter: {
            keyframes: [
              { opacity: 0, transform: "translateY(16px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
          },
          exit: {
            keyframes: [
              { opacity: 1, filter: "blur(0)" },
              { opacity: 0, filter: "blur(10px)" },
            ],
            duration: 300,
          },
        },
      });

    expect(updated.status).toBe(200);
    expect(updated.body.transition).toMatchObject({
      name: "custom",
      duration: 450,
      enter: { keyframes: [{ opacity: 0, transform: "translateY(16px)" }, expect.any(Object)] },
      exit: { duration: 300 },
    });
  });

  it("PUT /_agent-native/actions/update-slide updates HTML source on HTML slides", async () => {
    const slide = (
      await request(app)
        .post("/_agent-native/actions/create-html-slide")
        .send({ pid, title: "HTML Demo", html: "<main>Before</main>" })
    ).body;

    const res = await request(app)
      .put("/_agent-native/actions/update-slide")
      .send({ pid, sid: slide.id, html: "<main>After</main>" });

    expect(res.status).toBe(200);
    expect(res.body.html).toBe("<main>After</main>");
  });

  it("PATCH /:sid updates a slide", async () => {
    const {
      body: { id: sid },
    } = await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "Old" });
    const res = await request(app)
      .patch(`/api/presentations/${pid}/slides/${sid}`)
      .send({
        title: "New",
        notes: "Speaker cue",
        blocks: [{ id: "x", type: "text", markdown: "hi" }],
      });
    expect(res.body.title).toBe("New");
    expect(res.body.notes).toBe("Speaker cue");
    expect(res.body.blocks[0].markdown).toBe("hi");
  });

  it("DELETE /:sid removes a slide", async () => {
    const {
      body: { id: sid },
    } = await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "Gone" });
    expect((await request(app).delete(`/api/presentations/${pid}/slides/${sid}`)).status).toBe(204);
  });

  it("PUT /layout reorders slides within ungrouped bucket", async () => {
    const ids = await Promise.all(
      ["A", "B", "C"].map(async (title) => {
        const response = await request(app)
          .post(`/api/presentations/${pid}/slides`)
          .send({ title });
        return response.body.id as number;
      }),
    );

    const res = await request(app)
      .put(`/api/presentations/${pid}/slides/layout`)
      .send({ ungrouped: ids.reverse(), groups: [] });
    expect(res.status).toBe(200);
    expect(res.body.map((slide: { title: string }) => slide.title)).toEqual(["C", "B", "A"]);
  });

  it("PUT /layout rejects incomplete payloads", async () => {
    const a = await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "A" });
    await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "B" });

    const res = await request(app)
      .put(`/api/presentations/${pid}/slides/layout`)
      .send({ ungrouped: [a.body.id], groups: [] });
    expect(res.status).toBe(400);
  });

  it("cascade deletes slides when presentation is deleted", async () => {
    await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "Child" });
    await request(app).delete(`/api/presentations/${pid}`);
    expect((await request(app).get(`/api/presentations/${pid}/slides`)).status).toBe(404);
  });
});

describe("Slide groups API", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });
  let pid: number;

  beforeEach(async () => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
    pid = (await request(app).post("/api/presentations").send({ name: "Pres" })).body.id;
  });

  it("creates, lists, renames, and deletes a group", async () => {
    const created = await request(app)
      .post(`/api/presentations/${pid}/groups`)
      .send({ title: "Intro" });
    expect(created.status).toBe(201);
    expect(created.body.title).toBe("Intro");
    expect(created.body.collapsed).toBe(false);

    const list = await request(app).get(`/api/presentations/${pid}/groups`);
    expect(list.body).toHaveLength(1);

    const patched = await request(app)
      .patch(`/api/presentations/${pid}/groups/${created.body.id}`)
      .send({ title: "Setup", collapsed: true });
    expect(patched.body.title).toBe("Setup");
    expect(patched.body.collapsed).toBe(true);

    expect(
      (await request(app).delete(`/api/presentations/${pid}/groups/${created.body.id}`)).status,
    ).toBe(204);
    expect((await request(app).get(`/api/presentations/${pid}/groups`)).body).toHaveLength(0);
  });

  it("applies a layout that moves slides into and across groups", async () => {
    const s1 = (await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "A" }))
      .body.id;
    const s2 = (await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "B" }))
      .body.id;
    const s3 = (await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "C" }))
      .body.id;
    const g1 = (await request(app).post(`/api/presentations/${pid}/groups`).send({ title: "G1" }))
      .body.id;
    const g2 = (await request(app).post(`/api/presentations/${pid}/groups`).send({ title: "G2" }))
      .body.id;

    const res = await request(app)
      .put(`/api/presentations/${pid}/slides/layout`)
      .send({
        ungrouped: [s2],
        groups: [
          { id: g1, slideIds: [s1] },
          { id: g2, slideIds: [s3] },
        ],
      });
    expect(res.status).toBe(200);
    const slides = res.body as Array<{ id: number; title: string; group_id: number | null }>;
    expect(slides.map((s) => s.title)).toEqual(["B", "A", "C"]);
    expect(slides.find((s) => s.id === s1)?.group_id).toBe(g1);
    expect(slides.find((s) => s.id === s2)?.group_id).toBeNull();
    expect(slides.find((s) => s.id === s3)?.group_id).toBe(g2);
  });

  it("deleting a group unsets slide.group_id", async () => {
    const sid = (await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "A" }))
      .body.id;
    const gid = (await request(app).post(`/api/presentations/${pid}/groups`).send({ title: "G" }))
      .body.id;
    await request(app)
      .put(`/api/presentations/${pid}/slides/layout`)
      .send({
        ungrouped: [],
        groups: [{ id: gid, slideIds: [sid] }],
      });
    await request(app).delete(`/api/presentations/${pid}/groups/${gid}`);
    const slides = (await request(app).get(`/api/presentations/${pid}/slides`)).body as Array<{
      id: number;
      group_id: number | null;
    }>;
    expect(slides.find((s) => s.id === sid)?.group_id).toBeNull();
  });
});

describe("System presentation bootstrap", () => {
  it("keeps a renamed seed deck stable across re-bootstrap", () => {
    const db = new Database(":memory:");
    bootstrapDatabase(db);
    db.prepare(
      "UPDATE presentations SET name='Renamed Built-in' WHERE system_key='llm-intro'",
    ).run();
    bootstrapDatabase(db);

    const rows = db.prepare("SELECT name, system_key FROM presentations").all() as Array<{
      name: string;
      system_key: string | null;
    }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ name: "Renamed Built-in", system_key: "llm-intro" });
  });

  it("allows reordering and renaming code slides but blocks deleting them", async () => {
    const { app } = createTestContext();

    const presentations = (await request(app).get("/api/presentations")).body as Array<{
      id: number;
    }>;
    const pid = presentations[0].id;

    const slides = (await request(app).get(`/api/presentations/${pid}/slides`)).body as Array<{
      id: number;
      kind: string;
    }>;
    const codeSlide = slides.find((s) => s.kind === "code")!;

    // Rename works
    expect(
      (
        await request(app)
          .patch(`/api/presentations/${pid}/slides/${codeSlide.id}`)
          .send({ title: "Renamed" })
      ).status,
    ).toBe(200);
    // Delete blocked
    expect(
      (await request(app).delete(`/api/presentations/${pid}/slides/${codeSlide.id}`)).status,
    ).toBe(403);
  });

  it("exports a filtered HTML deck", { timeout: 60000 }, async () => {
    const { app } = createTestContext();

    const presentations = (await request(app).get("/api/presentations")).body as Array<{
      id: number;
    }>;
    const pid = presentations[0].id;
    const slides = (await request(app).get(`/api/presentations/${pid}/slides`)).body as Array<{
      id: number;
      code_id: string | null;
    }>;
    const subsetIds = ["01-opener", "02-linear-regression"].map(
      (code) => slides.find((s) => s.code_id === code)!.id,
    );

    const res = await request(app)
      .post(`/api/presentations/${pid}/export`)
      .send({ slideIds: subsetIds });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^text\/html/);
    expect(res.headers["content-disposition"]).toContain(".html");
    expect(res.text).toContain("02-linear-regression");
    expect(res.text).not.toContain("03-context");
    expect(res.text).toContain(".absolute{position:absolute");
    expect(res.text).toContain("__EXPORT_META__");
    expect(res.text).toContain('exportMode:"player"');
    expect(res.text).toContain("__EXPORT_DATA__");
  });

  it("exports deck mode with overview shell metadata", { timeout: 60000 }, async () => {
    const { app } = createTestContext();

    const presentations = (await request(app).get("/api/presentations")).body as Array<{
      id: number;
    }>;
    const pid = presentations[0].id;

    const res = await request(app).post(`/api/presentations/${pid}/export`).send({ mode: "deck" });

    expect(res.status).toBe(200);
    expect(res.text).toContain('exportMode:"deck"');
    expect(res.text).toContain("artifactVersion:1");
    expect(res.text).toContain("export-deck-overview");
    expect(res.text).toContain("LLM & Agent Basics");
    expect(res.text).toMatch(/slideCount:\d+/);
  });

  it("exports HTML through the Agent-Native file route", { timeout: 60000 }, async () => {
    const { app } = createTestContext();

    const presentations = (await request(app).get("/api/presentations")).body as Array<{
      id: number;
    }>;
    const pid = presentations[0].id;

    const res = await request(app)
      .post(`/_agent-native/export/presentations/${pid}`)
      .send({ mode: "deck" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^text\/html/);
    expect(res.text).toContain("export-deck-overview");
    expect(res.text).toContain("LLM & Agent Basics");
  });
});
