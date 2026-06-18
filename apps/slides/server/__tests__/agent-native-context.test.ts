import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestContext } from "./test-context.js";

describe("Agent Native app context actions", () => {
  const { app } = createTestContext({ seedSystemPresentation: false });

  it("GET /_agent-native/actions exposes context and navigation actions", async () => {
    const res = await request(app).get("/_agent-native/actions");

    expect(res.status).toBe(200);
    expect(res.body.actions["get-current-app-context"]).toMatchObject({
      name: "get-current-app-context",
      readOnly: true,
      exposure: {
        http: true,
        agentTool: true,
        mcp: true,
        a2a: true,
      },
    });
    expect(res.body.actions["navigate-app"]).toMatchObject({
      name: "navigate-app",
      readOnly: false,
      exposure: {
        http: true,
        agentTool: true,
        mcp: true,
        a2a: true,
      },
    });
    expect(res.body.actions["get-active-deck-context"]).toMatchObject({
      name: "get-active-deck-context",
      readOnly: true,
      exposure: {
        http: true,
        agentTool: true,
        mcp: true,
        a2a: true,
      },
    });
    expect(res.body.actions["get-theme-catalog"]).toMatchObject({
      name: "get-theme-catalog",
      readOnly: true,
      exposure: {
        http: true,
        agentTool: true,
        mcp: true,
        a2a: true,
      },
    });
    expect(res.body.actions["set-app-theme"]).toMatchObject({
      name: "set-app-theme",
      readOnly: false,
      exposure: {
        http: true,
        agentTool: true,
        mcp: true,
        a2a: true,
      },
    });
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
});

describe("App agent theme runtime", () => {
  const { app } = createTestContext({ seedSystemPresentation: false });

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
});
