import { Router, type Request } from "express";
import type { AgentTerminalBridge } from "../agent-terminal.js";
import type { LocalDeckModelProvider, LocalModelStatus } from "../local-model-provider.js";
import type { SlideDeckActions } from "../../actions/index.js";
import { APP_AGENT_MANIFEST } from "../../shared/app-agent-manifest.js";
import { handleAppAgentPrompt, type AppAgentRequest } from "./app-agent-runtime.js";

type LocalAgentChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
};

type LocalAgentChatThread = {
  id: string;
  title: string;
  preview: string;
  messages: LocalAgentChatMessage[];
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  scope: AppAgentRequest["scope"];
};

function localCodeModeEnabled() {
  return process.env.NODE_ENV !== "production" && !process.env.FRAME_PORT;
}

export function createFrameworkCoreRouter(
  options: {
    actions?: SlideDeckActions;
    terminalBridge?: AgentTerminalBridge;
    localModelProvider?: LocalDeckModelProvider;
  } = {},
) {
  const router = Router();

  registerFrameworkHealthRoutes(router);
  registerFrameworkStatusRoutes(router, options);
  registerFrameworkChatRoutes(router, options);
  registerFrameworkResourceRoutes(router, options);

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
  options: { terminalBridge?: AgentTerminalBridge; localModelProvider?: LocalDeckModelProvider },
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
    const status = getLocalProviderStatus(options.localModelProvider);
    res.json({
      provider: "local-openai-compatible",
      model: status.model ?? null,
      baseURL: status.baseURL ?? null,
      configured: status.available,
      hosted: false,
      requiresHostedModel: false,
      providers: [createLocalProviderDescriptor(status)],
    });
  });

  router.post("/actions/manage-agent-engine", (_req, res) => {
    const status = getLocalProviderStatus(options.localModelProvider);
    res.json({
      engines: [
        {
          id: "local-app-agent",
          label: "Local App Agent",
          runtime: "local-app-agent",
          hosted: false,
          configured: true,
        },
        {
          id: "local-code-mode",
          label: "Local Code Mode",
          runtime: "local-terminal",
          hosted: false,
          configured: localCodeModeEnabled(),
        },
      ],
      providers: [createLocalProviderDescriptor(status)],
      configured: status.available,
      hosted: false,
      requiresHostedModel: false,
    });
  });
}

function getLocalProviderStatus(provider?: LocalDeckModelProvider): LocalModelStatus {
  return (
    provider?.status() ?? {
      available: false,
      provider: "openai-compatible",
      hosted: false,
      source: "local-env",
      reason: "Local model provider is not configured.",
    }
  );
}

function createLocalProviderDescriptor(status: LocalModelStatus) {
  return {
    id: "local-openai-compatible",
    label: "Local OpenAI-compatible",
    provider: status.provider,
    source: status.source,
    hosted: false,
    configured: status.available,
    available: status.available,
    model: status.model ?? null,
    baseURL: status.baseURL ?? null,
    reason: status.reason ?? null,
  };
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

function getThreadIdFromAgentChatBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  if ("threadId" in body && typeof body.threadId === "string") return body.threadId;
  if ("thread_id" in body && typeof body.thread_id === "string") return body.thread_id;
  if ("thread" in body && body.thread && typeof body.thread === "object") {
    const thread = body.thread;
    if ("id" in thread && typeof thread.id === "string") return thread.id;
  }
  return null;
}

function createLocalMessageId(role: LocalAgentChatMessage["role"]) {
  return `local-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createLocalThreadId() {
  return `local-agent-thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function titleFromPrompt(prompt: string) {
  const title = prompt.replace(/\s+/g, " ").trim().slice(0, 80);
  return title || "Local chat";
}

function upsertLocalThread(
  threads: Map<string, LocalAgentChatThread>,
  input: {
    prompt: string;
    text: string;
    scope: AppAgentRequest["scope"];
    threadId?: string | null;
  },
) {
  const now = Date.now();
  const id = input.threadId || createLocalThreadId();
  const existing = threads.get(id);
  const thread: LocalAgentChatThread =
    existing ??
    ({
      id,
      title: titleFromPrompt(input.prompt),
      preview: "",
      messages: [],
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
      scope: input.scope,
    } satisfies LocalAgentChatThread);

  thread.messages.push(
    { id: createLocalMessageId("user"), role: "user", text: input.prompt, createdAt: now },
    {
      id: createLocalMessageId("assistant"),
      role: "assistant",
      text: input.text,
      createdAt: Date.now(),
    },
  );
  thread.preview = input.text.slice(0, 160);
  thread.messageCount = thread.messages.length;
  thread.updatedAt = Date.now();
  thread.scope = input.scope;
  threads.set(id, thread);
  return thread;
}

function wantsEventStream(req: Request) {
  return req.get("accept")?.includes("text/event-stream") ?? false;
}

async function runFrameworkAction(
  actions: SlideDeckActions | undefined,
  name: keyof SlideDeckActions,
  args: unknown,
) {
  const action = actions?.[name] as
    | {
        run?: (
          args: unknown,
          context: { caller: "tool"; orgId: null },
        ) => unknown | Promise<unknown>;
      }
    | undefined;
  if (typeof action?.run !== "function") return null;
  return action.run(args, { caller: "tool", orgId: null });
}

function registerFrameworkChatRoutes(router: Router, options: { actions?: SlideDeckActions }) {
  const threads = new Map<string, LocalAgentChatThread>();

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
        ...APP_AGENT_MANIFEST.modes.app,
        promptFamilies: APP_AGENT_MANIFEST.promptFamilies,
        suggestions: APP_AGENT_MANIFEST.suggestions,
        capabilitiesUrl: "/_agent-native/app-agent/capabilities",
      },
      codeMode: {
        ...APP_AGENT_MANIFEST.modes.code,
        available: localCodeModeEnabled(),
      },
    });
  });

  router.get("/agent-chat/threads", (_req, res) => {
    res.json({
      threads: Array.from(threads.values())
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(({ messages: _messages, ...thread }) => thread),
    });
  });

  router.get("/agent-chat/threads/:threadId", (req, res) => {
    const thread = threads.get(req.params.threadId);
    if (!thread) {
      res.status(404).json({ error: "local chat thread not found" });
      return;
    }
    res.json(thread);
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
      const prompt = getPromptFromAgentChatBody(req.body);
      const scope = getScopeFromAgentChatBody(req.body);
      const text = await handleAppAgentPrompt(options.actions, {
        prompt,
        scope,
      });
      const thread = upsertLocalThread(threads, {
        prompt,
        text,
        scope,
        threadId: getThreadIdFromAgentChatBody(req.body),
      });

      if (wantsEventStream(req)) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        });
        res.write(`data: ${JSON.stringify({ type: "message", threadId: thread.id, text })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done", threadId: thread.id })}\n\n`);
        res.end();
        return;
      }

      res.json({
        id: thread.id,
        threadId: thread.id,
        runtime: "local-app-agent",
        hosted: false,
        streaming: false,
        thread,
        text,
      });
    } catch (err) {
      next(err);
    }
  });
}

function createDeckResource(deck: unknown) {
  if (!deck || typeof deck !== "object" || !("id" in deck)) return null;
  const id = Number(deck.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const name = "name" in deck && typeof deck.name === "string" ? deck.name : `Deck ${id}`;
  const theme = "theme" in deck && typeof deck.theme === "string" ? deck.theme : undefined;

  return {
    id: `deck:${id}`,
    uri: `slides://deck/${id}`,
    type: "deck",
    name,
    title: name,
    metadata: {
      deckId: id,
      theme: theme ?? null,
      actions: {
        read: `/_agent-native/actions/get-deck?id=${id}`,
        slides: `/_agent-native/actions/list-slides?pid=${id}`,
        groups: `/_agent-native/actions/list-groups?pid=${id}`,
        open: {
          action: "navigate-app",
          input: { view: "deck", deckId: id },
        },
      },
    },
  };
}

async function listDeckResources(actions: SlideDeckActions | undefined) {
  const decks = await runFrameworkAction(actions, "list-decks", {});
  if (!Array.isArray(decks)) return [];
  return decks.map(createDeckResource).filter((resource) => resource !== null);
}

function resourceTree(resources: Awaited<ReturnType<typeof listDeckResources>>) {
  return [
    {
      id: "slides",
      type: "collection",
      name: "Slides",
      title: "Slides",
      children: resources.map((resource) => resource.id),
    },
  ];
}

type FrameworkActionMetadata = {
  tool?: {
    description?: string;
    parameters?: unknown;
  };
  publicAgent?: {
    expose?: boolean;
    title?: string;
    description?: string;
  };
  agentTool?: boolean;
  readOnly?: boolean;
};

function createFrameworkMcpTools(actions: SlideDeckActions | undefined) {
  return Object.entries(actions ?? {})
    .filter(([, action]) => {
      const metadata = action as FrameworkActionMetadata;
      return metadata.agentTool !== false && metadata.publicAgent?.expose !== false;
    })
    .map(([name, action]) => {
      const metadata = action as FrameworkActionMetadata;
      return {
        name,
        title: metadata.publicAgent?.title ?? name,
        description: metadata.publicAgent?.description ?? metadata.tool?.description ?? "",
        inputSchema: metadata.tool?.parameters ?? { type: "object", properties: {} },
        readOnly: metadata.readOnly ?? false,
        server: "slides-actions",
      };
    });
}

function registerFrameworkResourceRoutes(router: Router, options: { actions?: SlideDeckActions }) {
  router.get("/resources/tree", async (_req, res, next) => {
    try {
      const resources = await listDeckResources(options.actions);
      res.json({ items: resources, resources, tree: resourceTree(resources) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/resources", async (_req, res, next) => {
    try {
      const resources = await listDeckResources(options.actions);
      res.json({ resources });
    } catch (err) {
      next(err);
    }
  });

  router.get("/mcp/servers", (_req, res) => {
    const tools = createFrameworkMcpTools(options.actions);
    res.json({
      servers: [
        {
          id: "slides-actions",
          name: "Slides Actions",
          transport: "http",
          url: "/_agent-native/actions/mcp",
          hosted: false,
          toolCount: tools.length,
        },
      ],
    });
  });

  router.get("/mcp/builtin", (_req, res) => {
    res.json({ tools: createFrameworkMcpTools(options.actions) });
  });
}
