import {
  CLI_REGISTRY,
  commandExists,
  createPtyWebSocketServer,
  isAllowedCommand,
  type PtyServerResult,
} from "@agent-native/core/terminal/server";

export type AgentCliStatus = {
  command: string;
  label: string;
  available: boolean;
};

export type AgentTerminalInfo =
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

export type AgentTerminalBridge = {
  listAvailableClis: () => Promise<AgentCliStatus[]>;
  getTerminalInfo: () => AgentTerminalInfo;
  start: () => Promise<AgentTerminalInfo>;
  close: () => void;
};

const LOCAL_CLI_PREFERENCE = ["codex", "claude", "gemini", "opencode", "builder"];

export function createAgentTerminalBridge(options: { appDir?: string } = {}): AgentTerminalBridge {
  let ptyServer: PtyServerResult | undefined;
  let terminalInfo: AgentTerminalInfo = { available: false };

  async function listAvailableClis() {
    const entries = await Promise.all(
      Object.entries(CLI_REGISTRY).map(async ([command, entry]) => ({
        command,
        label: entry.label,
        available: await commandExists(command),
      })),
    );

    return entries.sort(
      (a, b) => LOCAL_CLI_PREFERENCE.indexOf(a.command) - LOCAL_CLI_PREFERENCE.indexOf(b.command),
    );
  }

  async function resolveCommand() {
    const configuredCommand = process.env.AGENT_CLI_COMMAND;
    if (configuredCommand && isAllowedCommand(configuredCommand)) {
      return configuredCommand;
    }

    const available = await listAvailableClis();
    return (
      LOCAL_CLI_PREFERENCE.find((command) =>
        available.some((cli) => cli.command === command && cli.available),
      ) ?? "codex"
    );
  }

  return {
    listAvailableClis,
    getTerminalInfo: () => terminalInfo,
    start: async () => {
      if (ptyServer) {
        return terminalInfo;
      }

      if (process.env.FRAME_PORT) {
        terminalInfo = { available: false, error: "Terminal disabled inside frame runtime" };
        return terminalInfo;
      }

      const isProd = process.env.NODE_ENV === "production";
      if (isProd && process.env.AGENT_TERMINAL_ENABLED !== "true") {
        terminalInfo = { available: false, error: "Terminal disabled in production" };
        return terminalInfo;
      }

      const command = await resolveCommand();
      const port = process.env.AGENT_TERMINAL_PORT ? Number(process.env.AGENT_TERMINAL_PORT) : 0;

      try {
        ptyServer = await createPtyWebSocketServer({
          appDir: options.appDir ?? process.cwd(),
          command,
          port,
          logPrefix: "[agent-terminal]",
        });
        terminalInfo = { available: true, wsPort: ptyServer.port, command };
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
        terminalInfo = {
          available: false,
          command,
          error:
            code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND"
              ? "node-pty or ws is not installed"
              : "PTY server failed",
        };
      }

      return terminalInfo;
    },
    close: () => {
      ptyServer?.close();
      ptyServer = undefined;
      terminalInfo = { available: false };
    },
  };
}
