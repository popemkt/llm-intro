import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { Server } from "node:http";
import type { IPty } from "node-pty";
import { WebSocketServer, WebSocket } from "ws";
import { CLI_REGISTRY, commandExists, isAllowedCommand } from "@agent-native/core/terminal/server";

export type LocalPtyServerResult = {
  server: Server;
  port: number;
  close: () => void;
};

type LocalPtyServerOptions = {
  appDir?: string;
  command?: string;
  port?: number;
  logPrefix?: string;
};

const shellMetacharacters = /[;&|`$(){}\n\r<>]/;

function splitFlags(flags: string) {
  return flags
    .split(/\s+/)
    .map((flag) => flag.trim())
    .filter(Boolean);
}

function killProcessTree(pid: number) {
  if (os.platform() === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  spawnSync("pkill", ["-TERM", "-P", String(pid)], { stdio: "ignore" });
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Process may already be gone.
  }
}

function sendStatus(ws: WebSocket, status: string, message: string) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "setup-status", status, message }));
  }
}

async function resolveSpawn(command: string, extraFlags: string) {
  const flags = extraFlags ? splitFlags(extraFlags) : [];
  if (await commandExists(command)) return { file: command, args: flags };

  const registry = CLI_REGISTRY[command];
  if (!registry?.installPackage) return null;
  return { file: "npx", args: ["--yes", registry.installPackage, ...flags] };
}

export async function createLocalPtyWebSocketServer(
  options: LocalPtyServerOptions = {},
): Promise<LocalPtyServerResult> {
  const {
    appDir = process.cwd(),
    command: defaultCommand = "codex",
    port = 0,
    logPrefix = "[agent-terminal]",
  } = options;
  const pty = await import("node-pty");
  const resolvedAppDir = path.resolve(appDir);
  const server = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.writeHead(req.method === "OPTIONS" ? 204 : 404);
    res.end();
  });
  const wss = new WebSocketServer({ noServer: true });
  const activePtys = new Set<IPty>();

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (url.pathname !== "/ws") {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const command = url.searchParams.get("command") || defaultCommand;
    const extraFlags = url.searchParams.get("flags") || "";

    if (!isAllowedCommand(command)) {
      sendStatus(ws, "not-found", `"${command}" is not a recognized CLI.`);
      ws.close();
      return;
    }
    if (extraFlags && shellMetacharacters.test(extraFlags)) {
      sendStatus(ws, "failed", "Invalid flags: shell metacharacters are not allowed.");
      ws.close();
      return;
    }

    const spawnTarget = await resolveSpawn(command, extraFlags);
    if (!spawnTarget) {
      sendStatus(ws, "not-found", `"${command}" not found on PATH.`);
      ws.close();
      return;
    }

    const registry = CLI_REGISTRY[command];
    const env: Record<string, string> = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
      TERM: "xterm-256color",
    };
    for (const key of registry?.stripEnv ?? []) delete env[key];

    let ptyProcess: IPty;
    try {
      console.log(`${logPrefix} Spawning PTY directly: ${spawnTarget.file}`);
      ptyProcess = pty.spawn(spawnTarget.file, spawnTarget.args, {
        name: "xterm-256color",
        cols: 120,
        rows: 40,
        cwd: resolvedAppDir,
        env,
      });
    } catch (error) {
      console.error(`${logPrefix} Failed to spawn PTY:`, error);
      sendStatus(ws, "failed", `Failed to spawn ${command}.`);
      ws.close();
      return;
    }

    activePtys.add(ptyProcess);
    ptyProcess.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });
    ptyProcess.onExit(({ exitCode }) => {
      console.log(`${logPrefix} PTY exited with code ${exitCode}`);
      activePtys.delete(ptyProcess);
      if (ws.readyState === WebSocket.OPEN) ws.close();
    });
    ws.on("message", (data) => {
      const value = typeof data === "string" ? data : data.toString();
      try {
        const message = JSON.parse(value) as { type?: string; cols?: unknown; rows?: unknown };
        if (message.type === "resize") {
          const cols = Math.max(1, Math.trunc(Number(message.cols)));
          const rows = Math.max(1, Math.trunc(Number(message.rows)));
          if (Number.isFinite(cols) && Number.isFinite(rows)) ptyProcess.resize(cols, rows);
          return;
        }
      } catch {
        // Plain terminal input.
      }
      ptyProcess.write(value);
    });
    ws.on("close", () => {
      activePtys.delete(ptyProcess);
      killProcessTree(ptyProcess.pid);
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      resolve({
        server,
        port: actualPort,
        close: () => {
          for (const active of activePtys) killProcessTree(active.pid);
          activePtys.clear();
          wss.close();
          server.close();
        },
      });
    });
  });
}
