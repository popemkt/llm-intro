import type Database from "better-sqlite3";
import { createApp } from "./app.js";
import { bootstrapDatabase, openDatabase } from "./db.js";
import { createPresentationsRepository } from "./repositories/presentations.js";
import { createSlidesRepository } from "./repositories/slides.js";
import { createGroupsRepository } from "./repositories/groups.js";
import { createPresentationsService } from "./services/presentations.js";
import { createSlidesService } from "./services/slides.js";
import { createGroupsService } from "./services/groups.js";
import { createSlideDeckActions } from "../actions/index.js";
import { createAgentTerminalBridge } from "./agent-terminal.js";

export function buildRuntime(db: Database.Database) {
  const presentationsRepo = createPresentationsRepository(db);
  const slidesRepo = createSlidesRepository(db);
  const groupsRepo = createGroupsRepository(db);
  const presentationsService = createPresentationsService(presentationsRepo);
  const slidesService = createSlidesService(presentationsRepo, slidesRepo);
  const groupsService = createGroupsService(presentationsRepo, groupsRepo);
  const actions = createSlideDeckActions({ presentationsService, slidesService, groupsService });
  const agentTerminalBridge = createAgentTerminalBridge({ appDir: process.cwd() });

  return {
    app: createApp({
      presentationsService,
      slidesService,
      groupsService,
      actions,
      agentTerminalBridge,
    }),
    agentTerminalBridge,
  };
}

export function buildDefaultRuntime() {
  const db = openDatabase();
  bootstrapDatabase(db);

  return {
    db,
    ...buildRuntime(db),
  };
}
