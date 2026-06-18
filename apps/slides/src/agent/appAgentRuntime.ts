import { createHttpAgentChatRuntime, type AgentChatRuntime } from "@agent-native/core/client/chat";

type DeckScope = {
  type: "deck";
  id: string;
  label: string;
} | null;

export function createSlidesAppAgentRuntime(scope: DeckScope): AgentChatRuntime {
  return createHttpAgentChatRuntime({
    id: "llm-intro:app-agent",
    label: "Slides App Agent",
    description: "Uses the slide deck action registry for App Mode workflows.",
    endpoint: "/_agent-native/app-agent",
    capabilities: {
      messages: {
        streaming: false,
        history: true,
        structuredContent: true,
        attachments: false,
      },
      tools: { events: false },
      models: { selectable: false, reasoningEffort: false },
    },
    mapRequest: ({ turn }) => ({
      prompt: turn.prompt,
      messages: turn.messages,
      scope,
    }),
  });
}
