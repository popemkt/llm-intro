import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AgentPanel } from "@agent-native/core/client";
import {
  LayoutDashboard,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
} from "lucide-react";

const navItems = [
  { label: "Decks", to: "/", icon: LayoutDashboard },
  { label: "Theme", to: "/settings", icon: Settings },
];

const localCodeAccess = {
  enabled: true,
  unavailableTitle: "Local CLI unavailable",
  unavailableDescription:
    "Start the local dev server to use Codex or Claude Code from the app shell.",
};

function deckScopeFromPath(pathname: string) {
  const match = pathname.match(/^\/p\/(\d+)/);
  if (!match) return null;
  return { type: "deck" as const, id: match[1], label: `Deck ${match[1]}` };
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
          <AgentPanel
            emptyStateText="Ask about this deck"
            suggestions={agentSuggestions}
            dynamicSuggestions
            onCollapse={() => setAgentOpenPersisted(false)}
            storageKey="llm-intro-slides-agent"
            scope={deckScope}
            agentChatSurface="dev-frame"
            codeAccess={localCodeAccess}
          />
        </aside>
      )}
    </div>
  );
}
