import { Router, type Request } from "express";
import type { AgentTerminalBridge } from "../agent-terminal.js";
import type { SlideDeckActions } from "../../actions/index.js";
import { handleAppAgentPrompt, type AppAgentRequest } from "./app-agent-runtime.js";

function localCodeModeEnabled() {
  return process.env.NODE_ENV !== "production" && !process.env.FRAME_PORT;
}

export function createFrameworkCoreRouter(
  options: { actions?: SlideDeckActions; terminalBridge?: AgentTerminalBridge } = {},
) {
  const router = Router();

  registerFrameworkHealthRoutes(router);
  registerFrameworkStatusRoutes(router, options);
  registerFrameworkChatRoutes(router, options);
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

function getPromptFromAgentChatBody(body: unknown) {
  if (!body || typeof body !== "object") return "";
  if ("prompt" in body && typeof body.prompt === "string") return body.prompt;
  if ("message" in body && typeof body.message === "string") return body.message;
  if (
    "turn" in body &&
    body.turn &&
    typeof body.turn === "object" &&
    "prompt" in body.turn &&
    typeof body.turn.prompt === "string"
  ) {
    return body.turn.prompt;
  }
  return "";
}

function getScopeFromAgentChatBody(body: unknown): AppAgentRequest["scope"] {
  if (!body || typeof body !== "object" || !("scope" in body)) return null;
  const scope = body.scope;
  if (!scope || typeof scope !== "object") return null;
  const type = "type" in scope && typeof scope.type === "string" ? scope.type : undefined;
  const id = "id" in scope && typeof scope.id === "string" ? scope.id : undefined;
  const label = "label" in scope && typeof scope.label === "string" ? scope.label : undefined;
  return { type, id, label };
}

function wantsEventStream(req: Request) {
  return req.get("accept")?.includes("text/event-stream") ?? false;
}

function registerFrameworkChatRoutes(router: Router, options: { actions?: SlideDeckActions }) {
  router.get("/auth/session", (_req, res) => {
    res.json({ error: "not_authenticated" });
  });

  router.get("/org/me", (_req, res) => {
    res.json({ org: null, user: null });
  });

  router.get("/agent-chat/mode", (_req, res) => {
    res.json({
      devMode: localCodeModeEnabled(),
      canToggle: false,
      appMode: {
        runtime: "local-app-agent",
        hosted: false,
        requiresHostedModel: false,
        toolBoundary: "product-actions",
      },
      codeMode: {
        runtime: "local-terminal",
        hosted: false,
        available: localCodeModeEnabled(),
      },
    });
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

  router.post("/agent-chat", async (req, res, next) => {
    if (!options.actions) {
      res.status(503).json({ error: "local app agent is not configured" });
      return;
    }

    try {
      const text = await handleAppAgentPrompt(options.actions, {
        prompt: getPromptFromAgentChatBody(req.body),
        scope: getScopeFromAgentChatBody(req.body),
      });

      if (wantsEventStream(req)) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        });
        res.write(`data: ${JSON.stringify({ type: "message", text })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
        return;
      }

      res.json({
        id: `local-agent-chat-${Date.now()}`,
        runtime: "local-app-agent",
        hosted: false,
        streaming: false,
        text,
      });
    } catch (err) {
      next(err);
    }
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
