import type Database from "better-sqlite3";
import { createApp } from "./app.js";
import { bootstrapDatabase, openDatabase } from "./db.js";
import { createPresentationsRepository } from "./repositories/presentations.js";
import { createSlidesRepository } from "./repositories/slides.js";
import { createGroupsRepository } from "./repositories/groups.js";
import { createSnapshotsRepository } from "./repositories/snapshots.js";
import { createAssetsRepository } from "./repositories/assets.js";
import { createPresentationsService } from "./services/presentations.js";
import { createSlidesService } from "./services/slides.js";
import { createGroupsService } from "./services/groups.js";
import { createSnapshotsService } from "./services/snapshots.js";
import { createAssetsService } from "./services/assets.js";
import { createSlideDeckActions } from "../actions/index.js";
import { createAgentTerminalBridge } from "./agent-terminal.js";
import {
  createLocalDeckModelProvider,
  type LocalDeckModelProvider,
} from "./local-model-provider.js";

export function buildRuntime(
  db: Database.Database,
  options: { localModelProvider?: LocalDeckModelProvider } = {},
) {
  const presentationsRepo = createPresentationsRepository(db);
  const slidesRepo = createSlidesRepository(db);
  const groupsRepo = createGroupsRepository(db);
  const snapshotsRepo = createSnapshotsRepository(db);
  const assetsRepo = createAssetsRepository(db);
  const presentationsService = createPresentationsService(presentationsRepo);
  const slidesService = createSlidesService(presentationsRepo, slidesRepo);
  const groupsService = createGroupsService(presentationsRepo, groupsRepo);
  const snapshotsService = createSnapshotsService(
    presentationsService,
    slidesService,
    groupsService,
    snapshotsRepo,
  );
  const assetsService = createAssetsService(presentationsRepo, assetsRepo);
  const localModelProvider = options.localModelProvider ?? createLocalDeckModelProvider();
  const actions = createSlideDeckActions({
    presentationsService,
    slidesService,
    groupsService,
    snapshotsService,
    assetsService,
    localModelProvider,
  });
  const agentTerminalBridge = createAgentTerminalBridge({ appDir: process.cwd() });

  return {
    app: createApp({
      presentationsService,
      slidesService,
      groupsService,
      assetsService,
      actions,
      agentTerminalBridge,
      localModelProvider,
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
