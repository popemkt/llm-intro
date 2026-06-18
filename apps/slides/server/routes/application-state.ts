import { Router } from "express";
import {
  deleteApplicationState,
  hasApplicationState,
  isSafeApplicationStateKey,
  readApplicationState,
  writeApplicationState,
} from "../application-state-store.js";

export function createApplicationStateRouter() {
  const router = Router();

  router.get("/:key", (req, res) => {
    const { key } = req.params;
    if (!isSafeApplicationStateKey(key)) {
      res.status(400).json({ error: "invalid state key" });
      return;
    }

    if (!hasApplicationState(key)) {
      res.status(204).send();
      return;
    }

    res.json(readApplicationState(key));
  });

  router.put("/:key", (req, res) => {
    const { key } = req.params;
    if (!isSafeApplicationStateKey(key)) {
      res.status(400).json({ error: "invalid state key" });
      return;
    }

    writeApplicationState(key, req.body);
    res.json({ ok: true });
  });

  router.delete("/:key", (req, res) => {
    const { key } = req.params;
    if (!isSafeApplicationStateKey(key)) {
      res.status(400).json({ error: "invalid state key" });
      return;
    }

    deleteApplicationState(key);
    res.json({ ok: true });
  });

  return router;
}
