import { Router } from "express";
import type { ExtensionsRepository } from "../repositories/extensions.js";

// Slot system for extensions: a named UI mount point an app drops via
// <ExtensionSlot id="..."/>. Users install extensions into a slot; the
// framework client fetches installs/available and posts installs here.
export function createExtensionSlotsRouter(extensions: ExtensionsRepository) {
  const router = Router();

  router.get("/:slotId/installs", (req, res) => {
    res.json(extensions.listSlotInstalls(req.params.slotId));
  });

  router.get("/:slotId/available", (req, res) => {
    res.json(extensions.listSlotCandidates(req.params.slotId));
  });

  router.post("/:slotId/install", (req, res) => {
    const extensionId = (req.body ?? {}).extensionId;
    if (typeof extensionId !== "string" || !extensionId) {
      res.status(400).json({ error: "extensionId is required" });
      return;
    }
    res.json(extensions.installSlot(extensionId, req.params.slotId) ?? { ok: true });
  });

  router.post("/:slotId/uninstall", (req, res) => {
    const extensionId = (req.body ?? {}).extensionId;
    if (typeof extensionId !== "string" || !extensionId) {
      res.status(400).json({ error: "extensionId is required" });
      return;
    }
    res.json({ ok: extensions.uninstallSlot(extensionId, req.params.slotId) });
  });

  // Declare/undeclare that an extension can render in a slot.
  router.post("/extension/:extensionId", (req, res) => {
    const slotId = (req.body ?? {}).slotId;
    if (typeof slotId !== "string" || !slotId) {
      res.status(400).json({ error: "slotId is required" });
      return;
    }
    extensions.addSlotTarget(req.params.extensionId, slotId, (req.body ?? {}).config);
    res.json({ ok: true });
  });

  router.delete("/extension/:extensionId/:slotId", (req, res) => {
    res.json({ ok: extensions.removeSlotTarget(req.params.extensionId, req.params.slotId) });
  });

  return router;
}
