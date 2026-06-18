import Database from "better-sqlite3";
import { bootstrapDatabase } from "../db.js";
import { buildRuntime } from "../runtime.js";

export function createTestContext(options: { seedSystemPresentation?: boolean } = {}) {
  const db = new Database(":memory:");
  bootstrapDatabase(db, options);
  return {
    db,
    ...buildRuntime(db),
  };
}
