import { Router } from "express";
import type { AgentTerminalBridge } from "../agent-terminal.js";

function localCodeModeEnabled() {
  return process.env.NODE_ENV !== "production" && !process.env.FRAME_PORT;
}

export function createFrameworkCoreRouter(options: { terminalBridge?: AgentTerminalBridge } = {}) {
  const router = Router();

  registerFrameworkHealthRoutes(router);
  registerFrameworkStatusRoutes(router, options);
  registerFrameworkChatRoutes(router);
  registerFrameworkResourceRoutes(router);

  return router;
}

function registerFrameworkHealthRoutes(router: Router) {
  router.get("/ping", (_req, res) => {
    res.json({ ok: true });
  });

  router.get("/poll", (_req, res) => {
    res.json({ version: 0, events: [] });
  });

  router.get("/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ version: 0, events: [] })}\n\n`);

    const heartbeat = setInterval(() => {
      res.write(": keepalive\n\n");
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      res.end();
    });
  });

  router.get("/demo/status", (_req, res) => {
    res.json({ enabled: false, forced: false });
  });
}

function registerFrameworkStatusRoutes(
  router: Router,
  options: { terminalBridge?: AgentTerminalBridge },
) {
  router.get("/env-status", (_req, res) => {
    res.json([]);
  });

  router.get("/builder/status", (_req, res) => {
    res.json({
      configured: false,
      connected: false,
      builderAvailable: false,
    });
  });

  router.get("/agent-engine/status", (_req, res) => {
    res.json({
      configured: false,
      connected: false,
      available: false,
    });
  });

  router.get("/available-clis", async (_req, res) => {
    res.json((await options.terminalBridge?.listAvailableClis()) ?? []);
  });

  router.get("/agent-terminal-info", (_req, res) => {
    res.json(options.terminalBridge?.getTerminalInfo() ?? { available: false });
  });

  router.get("/agent-loop-settings", (_req, res) => {
    res.json({});
  });

  router.get("/agent-model-defaults", (_req, res) => {
    res.json({});
  });

  router.post("/actions/manage-agent-engine", (_req, res) => {
    res.json({
      engines: [],
      providers: [],
      configured: false,
    });
  });
}

function registerFrameworkChatRoutes(router: Router) {
  router.get("/auth/session", (_req, res) => {
    res.json({ error: "not_authenticated" });
  });

  router.get("/org/me", (_req, res) => {
    res.json({ org: null, user: null });
  });

  router.get("/agent-chat/mode", (_req, res) => {
    res.json({ devMode: localCodeModeEnabled(), canToggle: false });
  });

  router.get("/agent-chat/threads", (_req, res) => {
    res.json({ threads: [] });
  });

  router.get("/agent-chat/threads/:threadId", (req, res) => {
    res.json({
      id: req.params.threadId,
      title: "",
      preview: "",
      messages: [],
      messageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scope: null,
    });
  });

  router.get("/agent-chat/runs/list", (_req, res) => {
    res.json({ runs: [] });
  });

  router.get("/agent-chat/runs/active", (_req, res) => {
    res.json({ active: false, status: "idle" });
  });
}

function registerFrameworkResourceRoutes(router: Router) {
  router.get("/resources/tree", (_req, res) => {
    res.json({ items: [], resources: [], tree: [] });
  });

  router.get("/resources", (_req, res) => {
    res.json({ resources: [] });
  });

  router.get("/mcp/servers", (_req, res) => {
    res.json({ servers: [] });
  });

  router.get("/mcp/builtin", (_req, res) => {
    res.json({ tools: [] });
  });
}
