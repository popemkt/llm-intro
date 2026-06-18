import { Router } from "express";

export function createFrameworkCoreRouter() {
  const router = Router();

  router.get("/ping", (_req, res) => {
    res.json({ ok: true });
  });

  router.get("/poll", (_req, res) => {
    res.json({ version: 0, events: [] });
  });

  router.get("/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ version: 0, events: [] })}\n\n`);

    const heartbeat = setInterval(() => {
      res.write(": keepalive\n\n");
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      res.end();
    });
  });

  router.get("/demo/status", (_req, res) => {
    res.json({ enabled: false, forced: false });
  });

  return router;
}
