export type LocalHarnessProtocol = {
  id: "local-harness-http" | "local-harness-openapi" | "local-harness-mcp";
  mode: "app";
  label: string;
  available: boolean;
  endpoint: string | null;
  hosted: false;
  toolBoundary: "external-local-harness";
  description: string;
};

export type LocalHarnessStatus = {
  available: boolean;
  hosted: false;
  requiresBuilderAuth: false;
  invocation: "discovery-only" | "mcp-tools";
  protocols: LocalHarnessProtocol[];
};

type LocalHarnessMcpManager = import("@agent-native/core/mcp-client").McpClientManager;

let mcpManagerCache: {
  url: string;
  manager: LocalHarnessMcpManager;
  started: boolean;
} | null = null;

export function localHarnessEnvValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

export function createLocalHarnessProtocols(): LocalHarnessProtocol[] {
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

export function getLocalHarnessStatus(): LocalHarnessStatus {
  const protocols = createLocalHarnessProtocols();
  const mcpAvailable = protocols.some(
    (protocol) => protocol.id === "local-harness-mcp" && protocol.available,
  );
  return {
    available: protocols.some((protocol) => protocol.available),
    hosted: false,
    requiresBuilderAuth: false,
    invocation: mcpAvailable ? "mcp-tools" : "discovery-only",
    protocols,
  };
}

function localHarnessMcpUrl() {
  return localHarnessEnvValue("LOCAL_HARNESS_MCP_URL", "AGENT_NATIVE_LOCAL_HARNESS_MCP_URL");
}

async function localHarnessMcpManager() {
  const url = localHarnessMcpUrl();
  if (!url) return null;

  if (mcpManagerCache?.url !== url) {
    await mcpManagerCache?.manager.stop();
    const { McpClientManager } = await import("@agent-native/core/mcp-client");
    mcpManagerCache = {
      url,
      manager: new McpClientManager(
        {
          source: "local-harness-env",
          servers: {
            "local-harness": {
              type: "http",
              url,
              description: "External local harness MCP server.",
            },
          },
        },
        { debug: false },
      ),
      started: false,
    };
  }

  if (!mcpManagerCache.started) {
    await mcpManagerCache.manager.start();
    mcpManagerCache.started = true;
  }

  return mcpManagerCache.manager;
}

export async function listLocalHarnessMcpTools() {
  const status = getLocalHarnessStatus();
  const manager = await localHarnessMcpManager();
  if (!manager) {
    return {
      ...status,
      configured: false,
      tools: [],
    };
  }

  return {
    ...status,
    configured: true,
    connectedServers: manager.connectedServers,
    tools: manager.getTools().map((tool) => ({
      name: tool.name,
      originalName: tool.originalName,
      title: tool.title ?? null,
      description: tool.description,
      inputSchema: tool.inputSchema,
      source: tool.source,
      readOnly: tool.annotations?.readOnlyHint === true,
    })),
  };
}

function resolveLocalHarnessTool(manager: LocalHarnessMcpManager, toolName: string) {
  return (
    manager.getTool(toolName) ??
    manager
      .getTools()
      .find((tool) => tool.originalName === toolName || tool.name.endsWith(`__${toolName}`)) ??
    null
  );
}

export async function callLocalHarnessMcpTool(input: { toolName: string; args?: unknown }) {
  const manager = await localHarnessMcpManager();
  if (!manager) {
    throw new Error("Set LOCAL_HARNESS_MCP_URL to call local harness MCP tools.");
  }

  const tool = resolveLocalHarnessTool(manager, input.toolName);
  if (!tool) {
    throw new Error(`Local harness MCP tool not found: ${input.toolName}`);
  }

  const raw = await manager.callTool(tool.name, input.args ?? {});
  const { flattenMcpToolResult } = await import("@agent-native/core/mcp-client");
  return {
    toolName: tool.name,
    originalToolName: tool.originalName,
    source: tool.source,
    text: flattenMcpToolResult(raw),
    raw,
  };
}
