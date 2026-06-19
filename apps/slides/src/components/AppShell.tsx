import { useEffect, useMemo, useRef, useState } from "react";
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
import { applyAppTheme } from "@/lib/appTheme";
import { THEME_NAMES, type ThemeName } from "@/types";

const navItems = [
  { label: "Decks", to: "/", icon: LayoutDashboard },
  { label: "Theme", to: "/settings", icon: Settings },
];

const agentSuggestions = [
  "Summarize this deck",
  "List available themes",
  "Save a snapshot of this deck",
  "Create a title slide for this deck",
  "Add a bullets slide after the current topic",
  "Turn this outline into normal slides",
  "Export this deck as HTML",
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

type SlidesNavigationState =
  | { view: "decks"; label: "Decks"; pathname: string }
  | { view: "app-settings"; label: "App settings"; pathname: string }
  | { view: "deck"; label: string; pathname: string; deckId: number }
  | { view: "deck-settings"; label: string; pathname: string; deckId: number }
  | { view: "slide-editor"; label: string; pathname: string; deckId: number; slideId: number };

type SlidesNavigationCommand = {
  view: "decks" | "deck" | "slide-editor" | "deck-settings" | "app-settings";
  deckId?: number;
  slideId?: number;
};

type AppThemeCommand = {
  theme: ThemeName;
  _writeId?: string;
};

function deckScopeFromPath(pathname: string) {
  const match = pathname.match(/^\/(?:p|presentations)\/(\d+)/);
  if (!match) return null;
  return { type: "deck" as const, id: match[1], label: `Deck ${match[1]}` };
}

function navigationStateFromPath(pathname: string): SlidesNavigationState {
  const editMatch = pathname.match(/^\/p\/(\d+)\/edit\/(\d+)$/);
  if (editMatch) {
    const deckId = Number(editMatch[1]);
    const slideId = Number(editMatch[2]);
    return {
      view: "slide-editor",
      label: `Deck ${deckId}, slide ${slideId} editor`,
      pathname,
      deckId,
      slideId,
    };
  }

  const settingsMatch = pathname.match(/^\/p\/(\d+)\/settings$/);
  if (settingsMatch) {
    const deckId = Number(settingsMatch[1]);
    return { view: "deck-settings", label: `Deck ${deckId} settings`, pathname, deckId };
  }

  const deckMatch = pathname.match(/^\/p\/(\d+)$/);
  if (deckMatch) {
    const deckId = Number(deckMatch[1]);
    return { view: "deck", label: `Deck ${deckId}`, pathname, deckId };
  }

  if (pathname === "/settings") {
    return { view: "app-settings", label: "App settings", pathname };
  }

  return { view: "decks", label: "Decks", pathname };
}

function pathFromNavigationCommand(command: SlidesNavigationCommand) {
  switch (command.view) {
    case "decks":
      return "/";
    case "app-settings":
      return "/settings";
    case "deck":
      return command.deckId ? `/p/${command.deckId}` : null;
    case "deck-settings":
      return command.deckId ? `/p/${command.deckId}/settings` : null;
    case "slide-editor":
      return command.deckId && command.slideId
        ? `/p/${command.deckId}/edit/${command.slideId}`
        : null;
  }
}

function urlStateFromLocation(location: ReturnType<typeof useLocation>) {
  return {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    searchParams: Object.fromEntries(new URLSearchParams(location.search).entries()),
  };
}

async function writeAppState(key: string, value: unknown) {
  await fetch(agentNativePath(`/_agent-native/application-state/${key}`), {
    method: "PUT",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

async function deleteAppState(key: string) {
  await fetch(agentNativePath(`/_agent-native/application-state/${key}`), {
    method: "DELETE",
    headers: { "X-Agent-Native-CSRF": "1" },
  });
}

async function readNavigateCommand() {
  const response = await fetch(agentNativePath("/_agent-native/application-state/navigate"));
  if (!response.ok || response.status === 204) return null;
  return (await response.json()) as SlidesNavigationCommand & { _writeId?: string };
}

async function readAppThemeCommand() {
  const response = await fetch(
    agentNativePath("/_agent-native/application-state/app-theme-command"),
  );
  if (!response.ok || response.status === 204) return null;
  const command = (await response.json()) as AppThemeCommand;
  return THEME_NAMES.includes(command.theme) ? command : null;
}

function useSlidesRouteStateBridge(location: ReturnType<typeof useLocation>) {
  const lastNavigationCommandRef = useRef<string | null>(null);
  const navigationState = useMemo(
    () => navigationStateFromPath(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    void writeAppState("__url__", urlStateFromLocation(location));
    void writeAppState("navigation", navigationState);
  }, [location, navigationState]);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        if (document.visibilityState !== "visible") return;
        const command = await readNavigateCommand();
        if (!active || !command) return;

        const dedupKey =
          command._writeId ??
          JSON.stringify({
            view: command.view,
            deckId: command.deckId,
            slideId: command.slideId,
          });
        if (lastNavigationCommandRef.current === dedupKey) {
          await deleteAppState("navigate");
          return;
        }
        lastNavigationCommandRef.current = dedupKey;
        await deleteAppState("navigate");

        const path = pathFromNavigationCommand(command);
        if (path && path !== `${location.pathname}${location.search}${location.hash}`) {
          window.history.pushState({}, "", path);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      } catch {
        // Best-effort agent command bridge.
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [location.hash, location.pathname, location.search]);
}

function useAppThemeCommandBridge() {
  const lastThemeCommandRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        if (document.visibilityState !== "visible") return;
        const command = await readAppThemeCommand();
        if (!active || !command) return;

        const dedupKey = command._writeId ?? command.theme;
        if (lastThemeCommandRef.current === dedupKey) {
          await deleteAppState("app-theme-command");
          return;
        }
        lastThemeCommandRef.current = dedupKey;
        await deleteAppState("app-theme-command");
        applyAppTheme(command.theme);
      } catch {
        // Best-effort agent command bridge.
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);
}

function useSelectionContextBridge(location: ReturnType<typeof useLocation>) {
  const navigationState = useMemo(
    () => navigationStateFromPath(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    const publishSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      if (!text) {
        void deleteAppState("pending-selection-context");
        return;
      }

      void writeAppState("pending-selection-context", {
        text: text.slice(0, 4000),
        pathname: location.pathname,
        navigation: navigationState,
        capturedAt: new Date().toISOString(),
      });
    };

    document.addEventListener("selectionchange", publishSelection);
    return () => document.removeEventListener("selectionchange", publishSelection);
  }, [location.pathname, navigationState]);
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
        <div className="slides-agent-surface__app">
          <div className="slides-agent-surface__app-status" aria-label="App mode status">
            <span>Local actions</span>
            <span>No hosted model</span>
          </div>
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
        </div>
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
  const shellBypassed = /^\/p\/\d+\/display$/.test(location.pathname);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("slides-shell-collapsed") === "true",
  );
  const [agentOpen, setAgentOpen] = useState(
    () => localStorage.getItem("agent-native-sidebar-open") === "true",
  );
  const deckScope = useMemo(() => deckScopeFromPath(location.pathname), [location.pathname]);
  const appAgentRuntime = useMemo(() => createSlidesAppAgentRuntime(deckScope), [deckScope]);
  useSlidesRouteStateBridge(location);
  useAppThemeCommandBridge();
  useSelectionContextBridge(location);

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

  if (shellBypassed) return <>{children}</>;

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
