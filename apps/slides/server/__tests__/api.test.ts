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

describe("Agent Native action exposure", () => {
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

describe("Agent Native framework core routes", () => {
  const { app } = createTestContext({ seedSystemPresentation: false });

  it("GET /_agent-native/poll and /demo/status provide no-op framework core routes", async () => {
    const pollRes = await request(app).get("/_agent-native/poll?since=0");
    expect(pollRes.status).toBe(200);
    expect(pollRes.body).toEqual({ version: 0, events: [] });

    const demoRes = await request(app).get("/_agent-native/demo/status");
    expect(demoRes.status).toBe(200);
    expect(demoRes.body).toEqual({ enabled: false, forced: false });
  });

  it("GET framework status probes return disabled local defaults", async () => {
    await expect(request(app).get("/_agent-native/env-status")).resolves.toMatchObject({
      status: 200,
      body: [],
    });
    await expect(request(app).get("/_agent-native/builder/status")).resolves.toMatchObject({
      status: 200,
      body: expect.objectContaining({ configured: false, connected: false }),
    });
    await expect(request(app).get("/_agent-native/agent-engine/status")).resolves.toMatchObject({
      status: 200,
      body: expect.objectContaining({ configured: false, connected: false }),
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
  });

  it("GET chat shell probes return empty runtime defaults", async () => {
    await expect(request(app).get("/_agent-native/auth/session")).resolves.toMatchObject({
      status: 200,
      body: { error: "not_authenticated" },
    });
    await expect(request(app).get("/_agent-native/org/me")).resolves.toMatchObject({
      status: 200,
      body: { org: null, user: null },
    });
    await expect(request(app).get("/_agent-native/agent-chat/mode")).resolves.toMatchObject({
      status: 200,
      body: { devMode: true, canToggle: false },
    });
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

  it("GET workspace resource probes return empty shell defaults", async () => {
    await expect(
      request(app).get("/_agent-native/resources/tree?scope=workspace"),
    ).resolves.toMatchObject({
      status: 200,
      body: expect.objectContaining({ resources: [], tree: [] }),
    });
    await expect(request(app).get("/_agent-native/resources")).resolves.toMatchObject({
      status: 200,
      body: { resources: [] },
    });
    await expect(request(app).get("/_agent-native/mcp/servers")).resolves.toMatchObject({
      status: 200,
      body: { servers: [] },
    });
    await expect(request(app).get("/_agent-native/mcp/builtin")).resolves.toMatchObject({
      status: 200,
      body: { tools: [] },
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
});
