import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestContext } from "./test-context.js";

function expectPublicAction(
  actions: Record<string, unknown>,
  name: string,
  input: { readOnly: boolean; isConsequential?: boolean },
) {
  expect(actions[name]).toMatchObject({
    name,
    ...input,
    exposure: {
      http: true,
      agentTool: true,
      mcp: true,
      a2a: true,
    },
  });
}

describe("Agent Native app context actions", () => {
  const { app } = createTestContext({ seedSystemPresentation: false });

  it("GET /_agent-native/actions exposes context and navigation actions", async () => {
    const res = await request(app).get("/_agent-native/actions");

    expect(res.status).toBe(200);
    expectPublicAction(res.body.actions, "get-current-app-context", { readOnly: true });
    expectPublicAction(res.body.actions, "navigate-app", { readOnly: false });
    expectPublicAction(res.body.actions, "get-active-deck-context", { readOnly: true });
    expectPublicAction(res.body.actions, "get-theme-catalog", { readOnly: true });
    expectPublicAction(res.body.actions, "set-app-theme", { readOnly: false });
    expectPublicAction(res.body.actions, "list-design-systems", { readOnly: true });
    expectPublicAction(res.body.actions, "apply-design-system", { readOnly: false });
    expectPublicAction(res.body.actions, "create-deck-snapshot", { readOnly: false });
    expectPublicAction(res.body.actions, "list-deck-snapshots", { readOnly: true });
    expectPublicAction(res.body.actions, "restore-deck-snapshot", {
      readOnly: false,
      isConsequential: true,
    });
    expectPublicAction(res.body.actions, "get-local-model-status", { readOnly: true });
    expectPublicAction(res.body.actions, "draft-deck-from-prompt", { readOnly: true });
    expectPublicAction(res.body.actions, "create-deck-from-prompt", { readOnly: false });
    expectPublicAction(res.body.actions, "export-deck-json", { readOnly: true });
    expectPublicAction(res.body.actions, "import-deck-json", { readOnly: false });
    expectPublicAction(res.body.actions, "export-deck-markdown", { readOnly: true });
    expectPublicAction(res.body.actions, "import-deck-markdown", { readOnly: false });
  });

  it("GET /_agent-native/actions/get-current-app-context reads route state", async () => {
    await request(app)
      .put("/_agent-native/application-state/__url__")
      .send({ pathname: "/p/12", search: "", hash: "", searchParams: {} });
    await request(app)
      .put("/_agent-native/application-state/navigation")
      .send({ view: "deck", label: "Deck 12", pathname: "/p/12", deckId: 12 });

    const res = await request(app).get("/_agent-native/actions/get-current-app-context");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      url: { pathname: "/p/12" },
      navigation: { view: "deck", deckId: 12 },
    });
  });

  it("POST /_agent-native/actions/navigate-app queues a semantic navigation command", async () => {
    const res = await request(app)
      .post("/_agent-native/actions/navigate-app")
      .send({ view: "slide-editor", deckId: 7, slideId: 9 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      queued: true,
      command: { view: "slide-editor", deckId: 7, slideId: 9 },
    });

    const commandRes = await request(app).get("/_agent-native/application-state/navigate");
    expect(commandRes.status).toBe(200);
    expect(commandRes.body).toMatchObject({
      view: "slide-editor",
      deckId: 7,
      slideId: 9,
    });
    expect(commandRes.body._writeId).toEqual(expect.any(String));
  });
});

describe("Agent Native theme design actions", () => {
  const { app } = createTestContext({ seedSystemPresentation: false });

  it("GET /_agent-native/actions/get-theme-catalog returns shared theme metadata", async () => {
    const res = await request(app).get("/_agent-native/actions/get-theme-catalog");

    expect(res.status).toBe(200);
    expect(res.body.themes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "dark-green",
          label: "Dark Green",
          desc: "Terminal signal green",
        }),
        expect.objectContaining({
          name: "ocean",
          label: "Ocean",
        }),
      ]),
    );
  });

  it("POST /_agent-native/actions/set-app-theme queues a browser app theme command", async () => {
    const res = await request(app)
      .post("/_agent-native/actions/set-app-theme")
      .send({ theme: "ocean" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      queued: true,
      command: { theme: "ocean" },
    });

    const commandRes = await request(app).get("/_agent-native/application-state/app-theme-command");
    expect(commandRes.body).toMatchObject({ theme: "ocean" });
    expect(commandRes.body._writeId).toEqual(expect.any(String));
  });

  it("GET /_agent-native/actions/list-design-systems returns built-in theme mappings", async () => {
    const res = await request(app).get("/_agent-native/actions/list-design-systems");

    expect(res.status).toBe(200);
    expect(res.body.designSystems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "signal-console",
          theme: "dark-green",
          storage: "built-in",
        }),
        expect.objectContaining({
          id: "ocean-system",
          theme: "ocean",
        }),
      ]),
    );
  });

  it("POST /_agent-native/actions/apply-design-system applies deck and app themes", async () => {
    const deck = (await request(app).post("/api/presentations").send({ name: "Design Deck" })).body;

    const res = await request(app)
      .post("/_agent-native/actions/apply-design-system")
      .send({ deckId: deck.id, systemId: "ocean-system", target: "both" });

    expect(res.status).toBe(200);
    expect(res.body.designSystem).toMatchObject({ id: "ocean-system", theme: "ocean" });
    expect(res.body.deck).toMatchObject({ id: deck.id, theme: "ocean" });
    expect(res.body.appThemeCommand).toMatchObject({ theme: "ocean" });

    const updatedDeck = await request(app).get(`/_agent-native/actions/get-deck?id=${deck.id}`);
    expect(updatedDeck.body).toMatchObject({ id: deck.id, theme: "ocean" });

    const commandRes = await request(app).get("/_agent-native/application-state/app-theme-command");
    expect(commandRes.body).toMatchObject({ theme: "ocean" });
    expect(commandRes.body._writeId).toEqual(expect.any(String));
  });
});

describe("Agent Native active deck context", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });
  let pid: number;

  beforeEach(async () => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
    pid = (await request(app).post("/api/presentations").send({ name: "Context Deck" })).body.id;
    await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "Context Slide" });
    await request(app)
      .post(`/_agent-native/actions/create-group`)
      .send({ pid, title: "Context Group" });
    await request(app)
      .put("/_agent-native/application-state/navigation")
      .send({ view: "deck", label: "Context Deck", pathname: `/p/${pid}`, deckId: pid });
  });

  it("GET /_agent-native/actions/get-active-deck-context reads the route-scoped deck", async () => {
    const res = await request(app).get("/_agent-native/actions/get-active-deck-context");

    expect(res.status).toBe(200);
    expect(res.body.deck).toMatchObject({ id: pid, name: "Context Deck" });
    expect(res.body.slides).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Context Slide" })]),
    );
    expect(res.body.groups).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Context Group" })]),
    );
    expect(res.body.navigation).toMatchObject({ view: "deck", deckId: pid });
  });
});

describe("Agent Native deck snapshots", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });
  let pid: number;

  beforeEach(async () => {
    db.exec(
      "DELETE FROM deck_snapshots; DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;",
    );
    pid = (await request(app).post("/api/presentations").send({ name: "Snapshot Deck" })).body.id;
    await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "Snapshot Slide" });
    await request(app)
      .post(`/_agent-native/actions/create-group`)
      .send({ pid, title: "Snapshot Group" });
  });

  it("POST /_agent-native/actions/create-deck-snapshot captures deck state", async () => {
    const res = await request(app)
      .post("/_agent-native/actions/create-deck-snapshot")
      .send({ pid, label: "Before edits" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      presentation_id: pid,
      label: "Before edits",
      deck_name: "Snapshot Deck",
      slide_count: 1,
      group_count: 1,
      payload: {
        deck: expect.objectContaining({ id: pid, name: "Snapshot Deck" }),
        slides: [expect.objectContaining({ title: "Snapshot Slide" })],
        groups: [expect.objectContaining({ title: "Snapshot Group" })],
      },
    });

    const listRes = await request(app).get(`/_agent-native/actions/list-deck-snapshots?pid=${pid}`);
    expect(listRes.body).toEqual([
      expect.objectContaining({
        id: res.body.id,
        label: "Before edits",
        slide_count: 1,
      }),
    ]);

    const getRes = await request(app).get(
      `/_agent-native/actions/get-deck-snapshot?pid=${pid}&snapshotId=${res.body.id}`,
    );
    expect(getRes.body.payload.slides).toEqual([
      expect.objectContaining({ title: "Snapshot Slide" }),
    ]);
  });

  it("POST /_agent-native/actions/restore-deck-snapshot replaces live deck state", async () => {
    const snapshotRes = await request(app)
      .post("/_agent-native/actions/create-deck-snapshot")
      .send({ pid, label: "Original" });

    await request(app)
      .post(`/api/presentations/${pid}/slides`)
      .send({ title: "Later Slide" })
      .expect(201);

    const restoreRes = await request(app)
      .post("/_agent-native/actions/restore-deck-snapshot")
      .send({ pid, snapshotId: snapshotRes.body.id });

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body).toMatchObject({
      snapshot: { id: snapshotRes.body.id, label: "Original" },
      deck: { id: pid, name: "Snapshot Deck" },
      slides: [expect.objectContaining({ title: "Snapshot Slide" })],
      groups: [expect.objectContaining({ title: "Snapshot Group" })],
    });

    const slidesRes = await request(app).get(`/_agent-native/actions/list-slides?pid=${pid}`);
    expect(slidesRes.body).toEqual([expect.objectContaining({ title: "Snapshot Slide" })]);
  });
});

describe("Agent Native deck outline creation", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });

  beforeEach(() => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
  });

  it("POST /_agent-native/actions/create-deck-from-outline creates a deck with normal slides", async () => {
    const res = await request(app)
      .post("/_agent-native/actions/create-deck-from-outline")
      .send({
        name: "Outline Deck",
        theme: "ocean",
        slides: [
          {
            layout: "title",
            title: "From Outline",
            subtitle: "Generated through the action registry",
          },
          {
            layout: "bullets",
            title: "What changed",
            bullets: ["Deck action", "Typed slide blocks"],
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.deck).toMatchObject({ name: "Outline Deck", theme: "ocean" });
    expect(res.body.slides).toHaveLength(2);
    expect(res.body.slides[0]).toMatchObject({ title: "From Outline", kind: "db" });
    expect(res.body.slides[1].blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "bullets",
          markdown: expect.stringContaining("Typed slide blocks"),
        }),
      ]),
    );
  });
});

describe("Agent Native prompt deck creation", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });

  beforeEach(() => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
  });

  it("POST /_agent-native/actions/create-deck-from-prompt creates typed normal slides", async () => {
    const res = await request(app).post("/_agent-native/actions/create-deck-from-prompt").send({
      name: "Prompt Deck",
      theme: "ocean",
      prompt: "Create a deck about agent native adoption with shell, actions, and local code mode",
    });

    expect(res.status).toBe(200);
    expect(res.body.deck).toMatchObject({ name: "Prompt Deck", theme: "ocean" });
    expect(res.body.slides).toHaveLength(6);
    expect(res.body.slides[0]).toMatchObject({ kind: "db" });
    expect(res.body.slides[0].blocks).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "text" })]),
    );
    expect(res.body.draftSource).toBe("deterministic");
  });

  it("GET /_agent-native/actions/get-local-model-status exposes local harness availability", async () => {
    const res = await request(app).get("/_agent-native/actions/get-local-model-status");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      available: false,
      provider: "openai-compatible",
      hosted: false,
    });
  });

  it("POST /_agent-native/prompt-deck-stream streams deck and slide creation events", async () => {
    const res = await request(app).post("/_agent-native/prompt-deck-stream").send({
      name: "Stream Deck",
      theme: "ocean",
      prompt: "Create a deck about streaming prompt deck creation with actions",
    });

    expect(res.status).toBe(200);
    const events = res.text
      .trim()
      .split("\n")
      .map(
        (line) =>
          JSON.parse(line) as {
            type: string;
            deck?: { id: number };
            source?: string;
            title?: string;
          },
      );
    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining(["status", "draft", "deck", "slide", "done"]),
    );
    expect(events.filter((event) => event.type === "slide")).toHaveLength(6);
    expect(events.find((event) => event.type === "draft")).toMatchObject({
      source: "deterministic",
    });
    const deckEvent = events.find((event) => event.type === "deck");
    expect(deckEvent?.deck?.id).toEqual(expect.any(Number));

    const slidesRes = await request(app).get(
      `/_agent-native/actions/list-slides?pid=${deckEvent?.deck?.id}`,
    );
    expect(slidesRes.body).toHaveLength(6);
  });
});

describe("Agent Native deck export action", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });

  beforeEach(() => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
  });

  it("GET /_agent-native/actions/get-deck-export returns the existing HTML export URL", async () => {
    const deck = (await request(app).post("/api/presentations").send({ name: "Exportable" })).body;

    const res = await request(app).get(`/_agent-native/actions/get-deck-export?id=${deck.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: deck.id,
      name: "Exportable",
      format: "html",
      method: "POST",
      url: `/api/presentations/${deck.id}/export`,
    });
  });

  it("exports and imports typed deck JSON", async () => {
    const deck = (
      await request(app).post("/api/presentations").send({ name: "Portable Deck", theme: "ocean" })
    ).body;
    const groupRes = await request(app)
      .post("/_agent-native/actions/create-group")
      .send({ pid: deck.id, title: "Portable Group" });
    await request(app)
      .put("/_agent-native/actions/update-group")
      .send({ pid: deck.id, gid: groupRes.body.id, collapsed: true });
    const slideRes = await request(app)
      .post("/_agent-native/actions/create-slide")
      .send({
        pid: deck.id,
        title: "Portable Slide",
        notes: "Presenter note",
        blocks: [{ id: "portable", type: "text", markdown: "# Portable" }],
      });
    await request(app)
      .put("/_agent-native/actions/update-deck-layout")
      .send({
        pid: deck.id,
        ungrouped: [],
        groups: [{ id: groupRes.body.id, slideIds: [slideRes.body.id] }],
      });

    const exported = await request(app).get(
      `/_agent-native/actions/export-deck-json?id=${deck.id}`,
    );

    expect(exported.status).toBe(200);
    expect(exported.body).toMatchObject({
      version: 1,
      deck: { name: "Portable Deck", theme: "ocean" },
      groups: [expect.objectContaining({ title: "Portable Group", collapsed: true })],
      slides: [expect.objectContaining({ title: "Portable Slide", notes: "Presenter note" })],
    });

    const imported = await request(app)
      .post("/_agent-native/actions/import-deck-json")
      .send({ ...exported.body, name: "Imported Portable Deck" });

    expect(imported.status).toBe(200);
    expect(imported.body.deck).toMatchObject({ name: "Imported Portable Deck", theme: "ocean" });
    expect(imported.body.groups).toEqual([
      expect.objectContaining({ title: "Portable Group", collapsed: true }),
    ]);
    expect(imported.body.slides).toEqual([
      expect.objectContaining({
        title: "Portable Slide",
        notes: "Presenter note",
        group_id: imported.body.groups[0].id,
        blocks: [expect.objectContaining({ markdown: "# Portable" })],
      }),
    ]);
    expect(imported.body.skippedCodeSlides).toEqual([]);
  });
});

describe("Agent Native deck Markdown actions", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });

  beforeEach(() => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
  });

  it("exports a deck as readable Markdown", async () => {
    const deck = (
      await request(app).post("/api/presentations").send({ name: "Markdown Deck", theme: "ocean" })
    ).body;
    await request(app)
      .post("/_agent-native/actions/create-slide")
      .send({
        pid: deck.id,
        title: "Markdown Slide",
        notes: "Say this out loud.",
        blocks: [
          { id: "body", type: "text", markdown: "## Main point", x: 10, y: 20 },
          { id: "logo", type: "image", url: "https://example.com/logo.png", alt: "Logo" },
          { id: "embed", type: "iframe", url: "https://example.com/demo" },
          { id: "label", type: "shape", shape: "pill", color: "#123456", label: "Status" },
        ],
      });

    const res = await request(app).get(`/_agent-native/actions/export-deck-markdown?id=${deck.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: deck.id,
      name: "Markdown Deck",
      format: "markdown",
      slideCount: 1,
    });
    expect(res.body.markdown).toContain("# Markdown Deck");
    expect(res.body.markdown).toContain("Theme: `ocean`");
    expect(res.body.markdown).toContain("## 1. Markdown Slide");
    expect(res.body.markdown).toContain("## Main point");
    expect(res.body.markdown).toContain("![Logo](https://example.com/logo.png)");
    expect(res.body.markdown).toContain("[Embedded frame](https://example.com/demo)");
    expect(res.body.markdown).toContain("> Status");
    expect(res.body.markdown).toContain("### Speaker Notes");
    expect(res.body.markdown).toContain("Say this out loud.");
  });

  it("imports readable Markdown as a typed deck", async () => {
    const res = await request(app)
      .post("/_agent-native/actions/import-deck-markdown")
      .send({
        markdown: [
          "# Markdown Import",
          "",
          "Theme: `ocean`",
          "",
          "## 1. Opening",
          "",
          "Hello from markdown.",
          "",
          "### Speaker Notes",
          "",
          "Read this note.",
          "",
          "## 2. Next",
          "",
          "- One",
          "- Two",
        ].join("\n"),
      });

    expect(res.status).toBe(200);
    expect(res.body.deck).toMatchObject({ name: "Markdown Import", theme: "ocean" });
    expect(res.body.importedSlideCount).toBe(2);
    expect(res.body.slides).toEqual([
      expect.objectContaining({
        title: "Opening",
        notes: "Read this note.",
        blocks: [expect.objectContaining({ markdown: "Hello from markdown." })],
      }),
      expect.objectContaining({
        title: "Next",
        notes: "",
        blocks: [expect.objectContaining({ markdown: "- One\n- Two" })],
      }),
    ]);
  });
});

describe("App agent route context runtime", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });
  let pid: number;

  beforeEach(async () => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
    pid = (await request(app).post("/api/presentations").send({ name: "Pres" })).body.id;
  });

  it("POST /_agent-native/app-agent reads current app context", async () => {
    await request(app)
      .put("/_agent-native/application-state/navigation")
      .send({ view: "deck", label: `Deck ${pid}`, pathname: `/p/${pid}`, deckId: pid });

    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({ prompt: "where am I?", scope: { type: "deck", id: String(pid) } });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain(`Deck ${pid}`);
  });

  it("POST /_agent-native/app-agent queues app navigation commands", async () => {
    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({ prompt: "open app settings", scope: { type: "deck", id: String(pid) } });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Opening app settings");

    const commandRes = await request(app).get("/_agent-native/application-state/navigate");
    expect(commandRes.body).toMatchObject({ view: "app-settings" });
  });
});

describe("App agent active deck context runtime", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });
  let pid: number;

  beforeEach(async () => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
    pid = (await request(app).post("/api/presentations").send({ name: "Runtime Context" })).body.id;
    await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "Visible Slide" });
  });

  it("POST /_agent-native/app-agent summarizes the active deck context", async () => {
    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({ prompt: "summarize this deck", scope: { type: "deck", id: String(pid) } });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Runtime Context");
    expect(res.body.text).toContain("1 slide");
  });

  it("POST /_agent-native/app-agent reports local model status", async () => {
    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({
        prompt: "is the local model harness configured?",
        scope: { type: "deck", id: String(pid) },
      });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Local model harness is not configured");
  });

  it("POST /_agent-native/app-agent renames slides through app actions", async () => {
    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({
        prompt: "rename slide 1 to Runtime Renamed",
        scope: { type: "deck", id: String(pid) },
      });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Runtime Renamed");

    const slides = await request(app).get(`/_agent-native/actions/list-slides?pid=${pid}`);
    expect(slides.body[0]).toMatchObject({ title: "Runtime Renamed" });
  });

  it("POST /_agent-native/app-agent updates speaker notes through app actions", async () => {
    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({
        prompt: 'set slide 1 notes to "Pause for questions"',
        scope: { type: "deck", id: String(pid) },
      });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("notes");

    const slides = await request(app).get(`/_agent-native/actions/list-slides?pid=${pid}`);
    expect(slides.body[0]).toMatchObject({ notes: "Pause for questions" });
  });
});

describe("App agent theme runtime", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });

  beforeEach(() => {
    db.exec("DELETE FROM presentations;");
  });

  it("POST /_agent-native/app-agent lists available themes", async () => {
    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({ prompt: "list available themes" });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("dark-green");
    expect(res.body.text).toContain("Ocean");
  });

  it("POST /_agent-native/app-agent queues an app shell theme change", async () => {
    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({ prompt: "set app theme to ocean" });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("app shell theme");

    const commandRes = await request(app).get("/_agent-native/application-state/app-theme-command");
    expect(commandRes.body).toMatchObject({ theme: "ocean" });
  });

  it("POST /_agent-native/app-agent lists available design systems", async () => {
    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({ prompt: "list available design systems" });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("signal-console");
    expect(res.body.text).toContain("Ocean System");
  });

  it("POST /_agent-native/app-agent applies a design system to the active deck", async () => {
    const deck = (await request(app).post("/api/presentations").send({ name: "Agent Design" }))
      .body;

    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({
        prompt: "apply ocean design system to this deck",
        scope: { type: "deck", id: String(deck.id) },
      });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Ocean System");

    const updatedDeck = await request(app).get(`/_agent-native/actions/get-deck?id=${deck.id}`);
    expect(updatedDeck.body).toMatchObject({ id: deck.id, theme: "ocean" });
  });
});

describe("App agent export runtime", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });
  let pid: number;

  beforeEach(async () => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
    pid = (await request(app).post("/api/presentations").send({ name: "Export Runtime" })).body.id;
  });

  it("POST /_agent-native/app-agent returns a deck HTML export URL", async () => {
    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({ prompt: "export this deck as HTML", scope: { type: "deck", id: String(pid) } });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("HTML export");
    expect(res.body.text).toContain(`/api/presentations/${pid}/export`);
  });

  it("POST /_agent-native/app-agent summarizes a typed JSON export", async () => {
    await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "JSON Slide" });

    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({ prompt: "export this deck as JSON", scope: { type: "deck", id: String(pid) } });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Typed JSON export");
    expect(res.body.text).toContain("1 slide");
    expect(res.body.text).toContain("export-deck-json");
  });

  it("POST /_agent-native/app-agent summarizes a Markdown export", async () => {
    await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "Markdown Slide" });

    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({ prompt: "export this deck as Markdown", scope: { type: "deck", id: String(pid) } });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Markdown export");
    expect(res.body.text).toContain("1 slide");
    expect(res.body.text).toContain("export-deck-markdown");
  });

  it("POST /_agent-native/app-agent imports pasted Markdown", async () => {
    const res = await request(app)
      .post("/_agent-native/app-agent")
      .send({
        prompt: [
          "Import this Markdown deck",
          "",
          "# App Agent Markdown Import",
          "",
          "## 1. First",
          "",
          "Imported from App Mode.",
        ].join("\n"),
      });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Imported Markdown deck");
    expect(res.body.text).toContain("App Agent Markdown Import");
    expect(res.body.text).toContain("1 slide");
  });
});

describe("App agent snapshot runtime", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });
  let pid: number;

  beforeEach(async () => {
    db.exec(
      "DELETE FROM deck_snapshots; DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;",
    );
    pid = (await request(app).post("/api/presentations").send({ name: "Snapshot Runtime" })).body
      .id;
    await request(app).post(`/api/presentations/${pid}/slides`).send({ title: "Runtime Slide" });
  });

  it("POST /_agent-native/app-agent creates and lists deck snapshots", async () => {
    const createRes = await request(app)
      .post("/_agent-native/app-agent")
      .send({
        prompt: 'save snapshot called "Checkpoint"',
        scope: { type: "deck", id: String(pid) },
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.text).toContain("Checkpoint");

    const listRes = await request(app)
      .post("/_agent-native/app-agent")
      .send({ prompt: "list snapshots", scope: { type: "deck", id: String(pid) } });

    expect(listRes.status).toBe(200);
    expect(listRes.body.text).toContain("Checkpoint");
  });

  it("POST /_agent-native/app-agent restores a named snapshot id", async () => {
    const snapshotRes = await request(app)
      .post("/_agent-native/actions/create-deck-snapshot")
      .send({ pid, label: "Runtime Original" });
    await request(app)
      .post(`/api/presentations/${pid}/slides`)
      .send({ title: "Runtime Later Slide" });

    const restoreRes = await request(app)
      .post("/_agent-native/app-agent")
      .send({
        prompt: `restore snapshot ${snapshotRes.body.id}`,
        scope: { type: "deck", id: String(pid) },
      });

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.text).toContain("Runtime Original");

    const slidesRes = await request(app).get(`/_agent-native/actions/list-slides?pid=${pid}`);
    expect(slidesRes.body).toEqual([expect.objectContaining({ title: "Runtime Slide" })]);
  });
});

describe("App agent deck outline runtime", () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false });

  beforeEach(() => {
    db.exec("DELETE FROM slides; DELETE FROM slide_groups; DELETE FROM presentations;");
  });

  it("POST /_agent-native/app-agent creates a deck from an outline", async () => {
    const res = await request(app).post("/_agent-native/app-agent").send({
      prompt:
        "create deck called Agent Native Roadmap\n- Title slide called Start\n- Bullets slide called Adoption Steps",
    });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Agent Native Roadmap");

    const decks = await request(app).get("/_agent-native/actions/list-decks");
    const created = decks.body.find(
      (deck: { name?: string }) => deck.name === "Agent Native Roadmap",
    );
    expect(created).toBeTruthy();
    await expect(
      request(app).get(`/_agent-native/actions/list-slides?pid=${created.id}`),
    ).resolves.toMatchObject({
      body: expect.arrayContaining([
        expect.objectContaining({ title: "Start", kind: "db" }),
        expect.objectContaining({ title: "Adoption Steps", kind: "db" }),
      ]),
    });
  });

  it("POST /_agent-native/app-agent creates a deck from a freeform prompt", async () => {
    const res = await request(app).post("/_agent-native/app-agent").send({
      prompt: "create deck about local agent native adoption with actions and code mode",
    });

    expect(res.status).toBe(200);
    expect(res.body.text).toContain("Created deck");

    const decks = await request(app).get("/_agent-native/actions/list-decks");
    const created = decks.body.find((deck: { name?: string }) =>
      deck.name?.includes("Local Agent Native Adoption"),
    );
    expect(created).toBeTruthy();
  });
});
