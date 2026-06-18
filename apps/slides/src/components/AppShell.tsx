import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AgentSidebar, AgentToggleButton } from "@agent-native/core/client";
import { LayoutDashboard, PanelLeftClose, PanelLeftOpen, Settings, Sparkles } from "lucide-react";

const navItems = [
  { label: "Decks", to: "/", icon: LayoutDashboard },
  { label: "Theme", to: "/settings", icon: Settings },
];

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
  const deckScope = useMemo(() => deckScopeFromPath(location.pathname), [location.pathname]);

  const setShellCollapsed = (next: boolean) => {
    setCollapsed(next);
    localStorage.setItem("slides-shell-collapsed", String(next));
  };

  return (
    <AgentSidebar
      position="right"
      defaultOpen={false}
      defaultSidebarWidth={420}
      emptyStateText="Ask about this deck"
      suggestions={[
        "Create a title slide for this deck",
        "Add a bullets slide after the current topic",
        "Turn this outline into normal slides",
      ]}
      dynamicSuggestions
      scope={deckScope}
      storageKey="llm-intro-slides-agent"
    >
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
            <AgentToggleButton />
          </div>
        </aside>

        <main className="slides-app-shell__main">{children}</main>
      </div>
    </AgentSidebar>
  );
}
