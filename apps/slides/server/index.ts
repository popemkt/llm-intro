import { fileURLToPath } from "url";
import { buildDefaultRuntime } from "./runtime.js";

export const { app, db, agentTerminalBridge } = buildDefaultRuntime();

const PORT = Number(process.env.PORT ?? 3001);
const isDirectExecution = process.argv[1] === fileURLToPath(import.meta.url);

// Only listen when run directly (not when imported by tests)
if (isDirectExecution) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });

  void agentTerminalBridge.start().then((info) => {
    if (info.available) {
      console.log(`Agent terminal ready for ${info.command} on ws://localhost:${info.wsPort}/ws`);
    }
  });

  process.once("SIGINT", () => agentTerminalBridge.close());
  process.once("SIGTERM", () => agentTerminalBridge.close());
}
