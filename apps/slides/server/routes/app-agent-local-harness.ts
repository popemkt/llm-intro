import type { SlideDeckActions } from "../../actions/index.js";

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function runAction(action: unknown, args: unknown) {
  const candidate = action as
    | {
        run?: (args: never, context: { caller: "tool"; orgId: null }) => unknown | Promise<unknown>;
      }
    | undefined;
  if (!candidate?.run) return null;
  return candidate.run(args as never, { caller: "tool", orgId: null });
}

function responseTextForLocalHarnessStatus(result: unknown) {
  if (!result || typeof result !== "object") {
    return "I cannot read the local harness status yet.";
  }
  const protocols =
    "protocols" in result && Array.isArray(result.protocols) ? result.protocols : [];
  const available = protocols.filter(
    (protocol): protocol is { label?: unknown; endpoint?: unknown } =>
      Boolean(
        protocol && typeof protocol === "object" && "available" in protocol && protocol.available,
      ),
  );
  if (available.length === 0) {
    return "Local harness is not configured. Set LOCAL_HARNESS_MCP_URL, LOCAL_HARNESS_OPENAPI_URL, or LOCAL_HARNESS_HTTP_URL to advertise one.";
  }
  const labels = available
    .map((protocol) => {
      const label = "label" in protocol ? getText(protocol.label) : "Local harness";
      const endpoint = "endpoint" in protocol ? getText(protocol.endpoint) : "";
      return endpoint ? `${label} at ${endpoint}` : label;
    })
    .join("; ");
  return `Local harness is configured for discovery: ${labels}. MCP tools can be listed with list-local-harness-tools and called with call-local-harness-tool.`;
}

function responseTextForLocalHarnessTools(result: unknown) {
  if (!result || typeof result !== "object") {
    return "I cannot read local harness tools yet.";
  }
  const tools = "tools" in result && Array.isArray(result.tools) ? result.tools : [];
  if (tools.length === 0) {
    return "No local harness MCP tools are connected. Set LOCAL_HARNESS_MCP_URL to connect one.";
  }
  return tools
    .map((tool, index) => {
      const title = tool && typeof tool === "object" && "title" in tool ? getText(tool.title) : "";
      const name = tool && typeof tool === "object" && "name" in tool ? getText(tool.name) : "";
      const description =
        tool && typeof tool === "object" && "description" in tool ? getText(tool.description) : "";
      return `${index + 1}. ${title || name}${description ? ` - ${description}` : ""}`;
    })
    .join("\n");
}

export async function handleLocalHarnessPrompt(actions: SlideDeckActions, normalized: string) {
  if (
    !/\blocal\s+harness\b.*\b(status|available|configured|provider|protocol|mcp|openapi|http)\b/.test(
      normalized,
    )
  ) {
    return null;
  }

  const result = await runAction(actions["get-local-harness-status"], {});
  return responseTextForLocalHarnessStatus(result);
}

export async function handleLocalHarnessToolsPrompt(actions: SlideDeckActions, normalized: string) {
  if (!/\blocal\s+harness\b.*\b(list|show|tools?|capabilities)\b/.test(normalized)) {
    return null;
  }

  const result = await runAction(actions["list-local-harness-tools"], {});
  return responseTextForLocalHarnessTools(result);
}
