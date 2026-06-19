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
  invocation: "discovery-only";
  protocols: LocalHarnessProtocol[];
};

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
  return {
    available: protocols.some((protocol) => protocol.available),
    hosted: false,
    requiresBuilderAuth: false,
    invocation: "discovery-only",
    protocols,
  };
}
