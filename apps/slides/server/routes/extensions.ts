import { Router } from "express";
import type { ExtensionsRepository } from "../repositories/extensions.js";
import { renderExtensionHostHtml } from "../extension-host.js";

// Implements the HTTP contract the stock @agent-native extension client
// components call (ExtensionsSidebarSection, ExtensionsListPage, ExtensionViewer,
// EmbeddedExtension). CRUD + visibility + a per-extension key/value store are
// backed locally; the SQL sandbox and secret proxy are intentionally not
// available on this local single-user server and respond 501.
export function createExtensionsRouter(extensions: ExtensionsRepository) {
  const router = Router();

  router.get("/", (req, res) => {
    const includeGloballyHidden = req.query.includeGloballyHidden === "true";
    res.json(extensions.list({ includeGloballyHidden }));
  });

  router.post("/", (req, res) => {
    const body = (req.body ?? {}) as {
      name?: unknown;
      description?: unknown;
      content?: unknown;
      icon?: unknown;
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    res.status(201).json(
      extensions.create({
        name,
        description: typeof body.description === "string" ? body.description : undefined,
        content: typeof body.content === "string" ? body.content : undefined,
        icon: typeof body.icon === "string" ? body.icon : undefined,
      }),
    );
  });

  // Per-extension key/value store — declared before "/:id" so "data" is not
  // captured as an extension id.
  router.get("/data/:extensionId/:collection", (req, res) => {
    res.json(extensions.listData(req.params.extensionId, req.params.collection));
  });

  router.put("/data/:extensionId/:collection/:itemId", (req, res) => {
    res.json(
      extensions.putData(
        req.params.extensionId,
        req.params.collection,
        req.params.itemId,
        (req.body ?? {}).data ?? req.body,
      ),
    );
  });

  router.delete("/data/:extensionId/:collection/:itemId", (req, res) => {
    extensions.deleteData(req.params.extensionId, req.params.collection, req.params.itemId);
    res.json({ ok: true });
  });

  // SQL sandbox + outbound proxy are not wired on the local server.
  for (const path of ["/sql/exec", "/sql/query", "/proxy"]) {
    router.all(path, (_req, res) => {
      res.status(501).json({ error: "Extension SQL/proxy is not available on the local server" });
    });
  }

  // Sandboxed iframe host page — renders the extension's content with the
  // framework's postMessage bridge. Loaded by ExtensionViewer / EmbeddedExtension.
  router.get("/:id/render", async (req, res, next) => {
    try {
      const extension = extensions.get(req.params.id);
      if (!extension) {
        res.status(404).type("text/plain").send("Extension not found");
        return;
      }
      const html = await renderExtensionHostHtml({
        content: extension.content,
        extensionId: extension.id,
        isDark: req.query.dark === "true",
      });
      res.type("html").send(html);
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", (req, res) => {
    const extension = extensions.get(req.params.id);
    if (!extension) {
      res.status(404).json({ error: "extension not found" });
      return;
    }
    res.json(extension);
  });

  router.put("/:id", (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch: { name?: string; description?: string; icon?: string; content?: string } = {};
    for (const key of ["name", "description", "icon", "content"] as const) {
      if (typeof body[key] === "string") patch[key] = body[key] as string;
    }
    const updated = extensions.update(req.params.id, patch);
    if (!updated) {
      res.status(404).json({ error: "extension not found" });
      return;
    }
    res.json(updated);
  });

  router.delete("/:id", (req, res) => {
    extensions.delete(req.params.id);
    res.json({ ok: true });
  });

  router.post("/:id/global-hide", (req, res) => {
    res.json(extensions.setGloballyHidden(req.params.id, true) ?? { ok: true });
  });

  router.post("/:id/global-unhide", (req, res) => {
    res.json(extensions.setGloballyHidden(req.params.id, false) ?? { ok: true });
  });

  // "Remove from my list" — single-user, so hide globally.
  router.post("/:id/hide", (req, res) => {
    res.json(extensions.setGloballyHidden(req.params.id, true) ?? { ok: true });
  });

  // History/restore and any other per-extension action are no-ops locally.
  router.post("/:id/:action", (_req, res) => {
    res.json({ ok: true });
  });

  return router;
}
