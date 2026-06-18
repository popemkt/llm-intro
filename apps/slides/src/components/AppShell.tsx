import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AgentTerminal, AssistantChat, agentNativePath } from "@agent-native/core/client";
import type { AgentChatRuntime } from "@agent-native/core/client/chat";
import {
  LayoutDashboard,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
} from "lucide-react";
import { createSlidesAppAgentRuntime } from "@/agent/appAgentRuntime";

const navItems = [
  { label: "Decks", to: "/", icon: LayoutDashboard },
  { label: "Theme", to: "/settings", icon: Settings },
];

type AgentTerminalInfo =
  | {
      available: true;
      wsPort: number;
      command: string;
    }
  | {
      available: false;
      command?: string;
      error?: string;
    };

function deckScopeFromPath(pathname: string) {
  const match = pathname.match(/^\/(?:p|presentations)\/(\d+)/);
  if (!match) return null;
  return { type: "deck" as const, id: match[1], label: `Deck ${match[1]}` };
}

function SlidesAgentSurface({
  runtime,
  suggestions,
  onCollapse,
}: {
  runtime: AgentChatRuntime;
  suggestions: string[];
  onCollapse: () => void;
}) {
  const [mode, setMode] = useState<"app" | "code">("app");
  const [terminalInfo, setTerminalInfo] = useState<AgentTerminalInfo | null>(null);
  const [terminalConnected, setTerminalConnected] = useState(false);

  useEffect(() => {
    if (mode !== "code") return;

    let active = true;
    setTerminalInfo(null);

    fetch(agentNativePath("/_agent-native/agent-terminal-info"))
      .then((response) => response.json() as Promise<AgentTerminalInfo>)
      .then((info) => {
        if (active) setTerminalInfo(info);
      })
      .catch(() => {
        if (active) {
          setTerminalInfo({
            available: false,
            error: "Start the local dev server to use Codex or Claude Code from the app shell.",
          });
        }
      });

    return () => {
      active = false;
      setTerminalConnected(false);
    };
  }, [mode]);

  const terminalWsUrl =
    terminalInfo?.available === true ? `ws://127.0.0.1:${terminalInfo.wsPort}/ws` : null;
  const terminalUnavailableMessage =
    terminalInfo?.available === false
      ? terminalInfo.error ||
        "Start the local dev server to use Codex or Claude Code from the app shell."
      : "Start the local dev server to use Codex or Claude Code from the app shell.";

  return (
    <div className="slides-agent-surface">
      <div className="slides-agent-surface__header">
        <div className="slides-agent-surface__modes" aria-label="Agent mode">
          <button type="button" data-active={mode === "app"} onClick={() => setMode("app")}>
            App
          </button>
          <button type="button" data-active={mode === "code"} onClick={() => setMode("code")}>
            Code
          </button>
        </div>
        <button
          type="button"
          className="slides-agent-surface__collapse"
          onClick={onCollapse}
          aria-label="Collapse agent"
          title="Collapse agent"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {mode === "app" ? (
        <AssistantChat
          runtime={runtime}
          emptyStateText="Ask about this deck"
          suggestions={suggestions}
          dynamicSuggestions={false}
          providerStatusChecksEnabled={false}
          plusMenuMode="hidden"
          showHeader={false}
          className="slides-agent-surface__chat"
        />
      ) : (
        <div className="slides-agent-surface__terminal">
          <div className="slides-agent-surface__terminal-status">
            <span>{terminalInfo?.available ? terminalInfo.command : "Local CLI"}</span>
            <span data-connected={terminalConnected ? "true" : "false"}>
              {terminalConnected ? "Connected" : "Local"}
            </span>
          </div>
          {terminalInfo === null ? (
            <div className="slides-agent-surface__terminal-message">Starting local CLI...</div>
          ) : terminalInfo.available && terminalWsUrl ? (
            <AgentTerminal
              command={terminalInfo.command}
              wsUrl={terminalWsUrl}
              hideInFrame={false}
              className="slides-agent-surface__terminal-frame"
              onConnectionChange={setTerminalConnected}
            />
          ) : (
            <div className="slides-agent-surface__terminal-message">
              {terminalUnavailableMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("slides-shell-collapsed") === "true",
  );
  const [agentOpen, setAgentOpen] = useState(
    () => localStorage.getItem("agent-native-sidebar-open") === "true",
  );
  const deckScope = useMemo(() => deckScopeFromPath(location.pathname), [location.pathname]);
  const appAgentRuntime = useMemo(() => createSlidesAppAgentRuntime(deckScope), [deckScope]);
  const agentSuggestions = useMemo(
    () => [
      "Create a title slide for this deck",
      "Add a bullets slide after the current topic",
      "Turn this outline into normal slides",
    ],
    [],
  );

  const setShellCollapsed = (next: boolean) => {
    setCollapsed(next);
    localStorage.setItem("slides-shell-collapsed", String(next));
  };

  const setAgentOpenPersisted = (next: boolean) => {
    setAgentOpen(next);
    localStorage.setItem("agent-native-sidebar-open", String(next));
  };

  useEffect(() => {
    const toggle = () => setAgentOpenPersisted(!agentOpen);
    const open = () => setAgentOpenPersisted(true);
    const close = () => setAgentOpenPersisted(false);

    window.addEventListener("agent-panel:toggle", toggle);
    window.addEventListener("agent-panel:open", open);
    window.addEventListener("agent-panel:close", close);

    return () => {
      window.removeEventListener("agent-panel:toggle", toggle);
      window.removeEventListener("agent-panel:open", open);
      window.removeEventListener("agent-panel:close", close);
    };
  }, [agentOpen]);

  return (
    <div className="slides-app-shell" data-shell-collapsed={collapsed ? "true" : "false"}>
      <aside className="slides-app-rail" aria-label="Slides navigation">
        <div className="slides-app-rail__brand">
          <div className="slides-app-rail__mark" aria-hidden>
            <Sparkles size={15} />
          </div>
          {!collapsed && <span>Slides</span>}
        </div>

        <button
          type="button"
          className="slides-app-rail__button"
          onClick={() => setShellCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>

        <nav className="slides-app-rail__nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/" ? location.pathname === "/" : location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="slides-app-rail__link"
                data-active={active ? "true" : "false"}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={16} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="slides-app-rail__agent">
          <button
            type="button"
            className="slides-app-rail__button"
            onClick={() => setAgentOpenPersisted(!agentOpen)}
            aria-label="Toggle agent"
            title="Toggle agent"
            data-active={agentOpen ? "true" : "false"}
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </aside>

      <main className="slides-app-shell__main">{children}</main>

      {agentOpen && (
        <aside className="slides-app-agent-panel agent-sidebar-panel" aria-label="Agent">
          <SlidesAgentSurface
            runtime={appAgentRuntime}
            suggestions={agentSuggestions}
            onCollapse={() => setAgentOpenPersisted(false)}
          />
        </aside>
      )}
    </div>
  );
}
