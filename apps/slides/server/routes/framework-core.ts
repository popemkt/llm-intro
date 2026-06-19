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

type FrameworkStatusRouteOptions = {
  actions?: SlideDeckActions;
  terminalBridge?: AgentTerminalBridge;
  localModelProvider?: LocalDeckModelProvider;
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

function registerFrameworkStatusRoutes(router: Router, options: FrameworkStatusRouteOptions) {
  router.get("/env-status", (_req, res) => {
    const status = getLocalProviderStatus(options.localModelProvider);
    res.json(createEnvStatus(status));
  });

  router.get("/builder/status", (_req, res) => {
    res.json({
      configured: false,
      connected: false,
      builderAvailable: false,
      hosted: false,
      localFrameAvailable: true,
      authRequired: false,
      runtime: "local-agent-native",
    });
  });

  router.get("/agent-engine/status", (_req, res) => {
    res.json(createAgentEngineStatus());
  });

  router.get("/available-clis", async (_req, res) => {
    res.json((await options.terminalBridge?.listAvailableClis()) ?? []);
  });

  router.get("/agent-terminal-info", (_req, res) => {
    res.json(options.terminalBridge?.getTerminalInfo() ?? { available: false });
  });

  router.get("/agent-loop-settings", (_req, res) => {
    res.json({
      mode: "app",
      availableModes: ["app", ...(localCodeModeEnabled() ? ["code"] : [])],
      hosted: false,
      requiresHostedModel: false,
      persistence: "process-local",
      approvals: "not-configured",
    });
  });

  router.get("/local-runtime/protocols", (_req, res) => {
    const status = getLocalProviderStatus(options.localModelProvider);
    res.json(createLocalRuntimeProtocols(options, status));
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

function createEnvStatus(status: LocalModelStatus) {
  return [
    {
      id: "local-openai-compatible",
      label: "Local OpenAI-compatible model",
      configured: status.available,
      hosted: false,
      source: status.source,
      model: status.model ?? null,
      baseURL: status.baseURL ?? null,
      reason: status.reason ?? null,
      secrets: {
        OPENAI_API_KEY: status.available && !status.baseURL ? "configured" : "not-required",
      },
    },
  ];
}

function createAgentEngineStatus() {
  const codeModeAvailable = localCodeModeEnabled();
  return {
    configured: true,
    connected: true,
    available: true,
    hosted: false,
    requiresHostedModel: false,
    defaultMode: "app",
    modes: {
      app: {
        ...APP_AGENT_MANIFEST.modes.app,
        available: true,
        capabilitiesUrl: "/_agent-native/app-agent/capabilities",
      },
      code: {
        ...APP_AGENT_MANIFEST.modes.code,
        available: codeModeAvailable,
      },
    },
  };
}

function createLocalRuntimeProtocols(
  options: FrameworkStatusRouteOptions,
  status: LocalModelStatus,
) {
  return {
    hosted: false,
    requiresBuilderAuth: false,
    defaultMode: "app",
    protocols: [
      {
        id: "app-agent-http",
        mode: "app",
        label: "Local App Mode HTTP runtime",
        available: true,
        endpoint: "/_agent-native/app-agent",
        hosted: false,
        toolBoundary: "product-actions",
        description: "Deck-scoped product prompts routed through slide/deck/group actions.",
      },
      {
        id: "actions-http",
        mode: "app",
        label: "Agent-Native action HTTP",
        available: Boolean(options.actions),
        endpoint: "/_agent-native/actions/:name",
        hosted: false,
        toolBoundary: "product-actions",
        description: "Direct invocation of validated product actions.",
      },
      {
        id: "actions-mcp",
        mode: "app",
        label: "MCP-compatible action tools",
        available: Boolean(options.actions),
        endpoint: "/_agent-native/actions/mcp",
        hosted: false,
        toolBoundary: "product-actions",
        description: "MCP-shaped tool discovery and calls over the same action registry.",
      },
      {
        id: "local-openai-compatible-model",
        mode: "app",
        label: "Local OpenAI-compatible model harness",
        available: status.available,
        endpoint: status.baseURL ?? null,
        hosted: false,
        toolBoundary: "prompt-drafting-only",
        model: status.model ?? null,
        reason: status.reason ?? null,
        description: "Optional local model used by prompt deck drafting actions.",
      },
      ...createLocalHarnessProtocols(),
      {
        id: "local-terminal-code-mode",
        mode: "code",
        label: "Local terminal Code Mode",
        available: localCodeModeEnabled(),
        endpoint: getTerminalEndpoint(options.terminalBridge),
        hosted: false,
        toolBoundary: "trusted-local-cli",
        description: "Trusted local CLI bridge for repository self-modification.",
      },
    ],
  };
}

function localHarnessEnvValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

function createLocalHarnessProtocols() {
  const httpEndpoint = localHarnessEnvValue(
    "LOCAL_HARNESS_HTTP_URL",
    "AGENT_NATIVE_LOCAL_HARNESS_HTTP_URL",
  );
  const openapiEndpoint = localHarnessEnvValue(
    "LOCAL_HARNESS_OPENAPI_URL",
    "AGENT_NATIVE_LOCAL_HARNESS_OPENAPI_URL",
  );
  const mcpEndpoint = localHarnessEnvValue(
    "LOCAL_HARNESS_MCP_URL",
    "AGENT_NATIVE_LOCAL_HARNESS_MCP_URL",
  );

  return [
    {
      id: "local-harness-http",
      mode: "app",
      label: "External local harness HTTP",
      available: Boolean(httpEndpoint),
      endpoint: httpEndpoint,
      hosted: false,
      toolBoundary: "external-local-harness",
      description: "Optional local HTTP harness endpoint discovered from environment.",
    },
    {
      id: "local-harness-openapi",
      mode: "app",
      label: "External local harness OpenAPI",
      available: Boolean(openapiEndpoint),
      endpoint: openapiEndpoint,
      hosted: false,
      toolBoundary: "external-local-harness",
      description: "Optional OpenAPI document for a local harness service.",
    },
    {
      id: "local-harness-mcp",
      mode: "app",
      label: "External local harness MCP",
      available: Boolean(mcpEndpoint),
      endpoint: mcpEndpoint,
      hosted: false,
      toolBoundary: "external-local-harness",
      description: "Optional local MCP server for harness tools and resources.",
    },
  ];
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

function getTerminalEndpoint(terminalBridge?: AgentTerminalBridge) {
  const info = terminalBridge?.getTerminalInfo();
  if (!info?.available) return null;
  return `ws://127.0.0.1:${info.wsPort}/ws`;
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

  registerFrameworkIdentityRoutes(router);

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

function registerFrameworkIdentityRoutes(router: Router) {
  router.get("/auth/session", (_req, res) => {
    res.json(createLocalSession());
  });

  router.get("/org/me", (_req, res) => {
    res.json(createLocalOrgSession());
  });
}

function createLocalSession() {
  return {
    authenticated: true,
    provider: "local",
    hosted: false,
    requiresBuilderAuth: false,
    user: {
      id: "local-user",
      email: null,
      name: "Local User",
    },
    org: {
      id: "local-workspace",
      name: "Local Workspace",
    },
  };
}

function createLocalOrgSession() {
  return {
    org: {
      id: "local-workspace",
      name: "Local Workspace",
      hosted: false,
    },
    user: {
      id: "local-user",
      email: null,
      name: "Local User",
    },
    auth: {
      provider: "local",
      requiresBuilderAuth: false,
    },
  };
}

type FrameworkResource = {
  id: string;
  uri: string;
  type: "deck" | "slide" | "group";
  name: string;
  title: string;
  parentId?: string;
  metadata: Record<string, unknown>;
};

function isFrameworkResource(resource: FrameworkResource | null): resource is FrameworkResource {
  return resource !== null;
}

function createDeckResource(deck: unknown): FrameworkResource | null {
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

function createSlideResource(deckId: number, slide: unknown): FrameworkResource | null {
  if (!slide || typeof slide !== "object" || !("id" in slide)) return null;
  const id = Number(slide.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const title = "title" in slide && typeof slide.title === "string" ? slide.title : `Slide ${id}`;
  const kind = "kind" in slide && typeof slide.kind === "string" ? slide.kind : "db";

  return {
    id: `slide:${deckId}:${id}`,
    uri: `slides://deck/${deckId}/slide/${id}`,
    type: "slide",
    name: title,
    title,
    parentId: `deck:${deckId}`,
    metadata: {
      deckId,
      slideId: id,
      kind,
      actions: {
        open: {
          action: "navigate-app",
          input: { view: "slide-editor", deckId, slideId: id },
        },
      },
    },
  };
}

function createGroupResource(deckId: number, group: unknown): FrameworkResource | null {
  if (!group || typeof group !== "object" || !("id" in group)) return null;
  const id = Number(group.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const title = "title" in group && typeof group.title === "string" ? group.title : `Group ${id}`;

  return {
    id: `group:${deckId}:${id}`,
    uri: `slides://deck/${deckId}/group/${id}`,
    type: "group",
    name: title,
    title,
    parentId: `deck:${deckId}`,
    metadata: {
      deckId,
      groupId: id,
      actions: {
        update: "update-group",
      },
    },
  };
}

async function listWorkspaceResources(actions: SlideDeckActions | undefined) {
  const decks = await runFrameworkAction(actions, "list-decks", {});
  if (!Array.isArray(decks)) return [];
  const resources: FrameworkResource[] = [];

  for (const deck of decks) {
    const deckResource = createDeckResource(deck);
    if (!deckResource) continue;
    resources.push(deckResource);

    const deckId = Number(deckResource.metadata.deckId);
    const groups = await runFrameworkAction(actions, "list-groups", { pid: deckId });
    if (Array.isArray(groups)) {
      resources.push(
        ...groups.map((group) => createGroupResource(deckId, group)).filter(isFrameworkResource),
      );
    }

    const slides = await runFrameworkAction(actions, "list-slides", { pid: deckId });
    if (Array.isArray(slides)) {
      resources.push(
        ...slides.map((slide) => createSlideResource(deckId, slide)).filter(isFrameworkResource),
      );
    }
  }

  return resources;
}

function resourceTree(resources: Awaited<ReturnType<typeof listWorkspaceResources>>) {
  const deckResources = resources.filter((resource) => resource.type === "deck");
  return [
    {
      id: "slides",
      type: "collection",
      name: "Slides",
      title: "Slides",
      children: deckResources.map((resource) => resource.id),
    },
    ...deckResources.map((deck) => ({
      id: deck.id,
      type: "deck",
      name: deck.name,
      title: deck.title,
      children: resources
        .filter((resource) => resource.parentId === deck.id)
        .map((resource) => resource.id),
    })),
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
      const resources = await listWorkspaceResources(options.actions);
      res.json({ items: resources, resources, tree: resourceTree(resources) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/resources", async (_req, res, next) => {
    try {
      const resources = await listWorkspaceResources(options.actions);
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
        ...createLocalHarnessMcpServers(),
      ],
    });
  });

  router.get("/mcp/builtin", (_req, res) => {
    res.json({ tools: createFrameworkMcpTools(options.actions) });
  });
}

function createLocalHarnessMcpServers() {
  const url = localHarnessEnvValue("LOCAL_HARNESS_MCP_URL", "AGENT_NATIVE_LOCAL_HARNESS_MCP_URL");
  if (!url) return [];
  return [
    {
      id: "local-harness",
      name: "Local Harness",
      transport: "http",
      url,
      hosted: false,
      toolBoundary: "external-local-harness",
    },
  ];
}
