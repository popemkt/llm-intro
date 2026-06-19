import { createHttpAgentChatRuntime, type AgentChatRuntime } from "@agent-native/core/client/chat";
import { APP_AGENT_MANIFEST } from "../../shared/app-agent-manifest";

type DeckScope = {
  type: "deck";
  id: string;
  label: string;
} | null;

export function createSlidesAppAgentRuntime(scope: DeckScope): AgentChatRuntime {
  return createHttpAgentChatRuntime({
    id: APP_AGENT_MANIFEST.id,
    label: APP_AGENT_MANIFEST.label,
    description: APP_AGENT_MANIFEST.description,
    endpoint: "/_agent-native/app-agent",
    capabilities: {
      messages: {
        streaming: APP_AGENT_MANIFEST.chat.streaming,
        history: APP_AGENT_MANIFEST.chat.history,
        structuredContent: APP_AGENT_MANIFEST.chat.structuredContent,
        attachments: APP_AGENT_MANIFEST.chat.attachments,
      },
      tools: { events: APP_AGENT_MANIFEST.tools.events },
      models: {
        selectable: APP_AGENT_MANIFEST.models.selectable,
        reasoningEffort: APP_AGENT_MANIFEST.models.reasoningEffort,
      },
    },
    mapRequest: ({ turn }) => ({
      prompt: turn.prompt,
      messages: turn.messages,
      scope,
    }),
  });
}
