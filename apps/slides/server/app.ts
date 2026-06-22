import express from "express";
import cors from "cors";
import { AppError } from "./errors.js";
import { createPresentationsRouter } from "./routes/presentations.js";
import { createSlidesRouter } from "./routes/slides.js";
import { createGroupsRouter } from "./routes/groups.js";
import { createSlideFeedbackRouter } from "./routes/slide-feedback.js";
import { createExportHandler } from "./routes/export.js";
import { createApplicationStateRouter } from "./routes/application-state.js";
import { createExtensionsRouter } from "./routes/extensions.js";
import { createExtensionSlotsRouter } from "./routes/extension-slots.js";
import { createFrameworkCoreRouter } from "./routes/framework-core.js";
import { createAppAgentRuntimeRouter } from "./routes/app-agent-runtime.js";
import { createPromptDeckStreamRouter } from "./routes/prompt-deck-stream.js";
import {
  createAgentNativeActionsRouter,
  createAgentNativeDiscoveryRouter,
} from "./routes/agent-native-actions.js";
import type { SlideDeckActions } from "../actions/index.js";
import type { ExtensionsRepository } from "./repositories/extensions.js";
import type { createPresentationsService } from "./services/presentations.js";
import type { createSlidesService } from "./services/slides.js";
import type { createGroupsService } from "./services/groups.js";
import type { createAssetsService } from "./services/assets.js";
import type { createSlideFeedbackService } from "./services/slide-feedback.js";
import type { AgentTerminalBridge } from "./agent-terminal.js";
import type { LocalDeckModelProvider } from "./local-model-provider.js";

type PresentationsService = ReturnType<typeof createPresentationsService>;
type SlidesService = ReturnType<typeof createSlidesService>;
type GroupsService = ReturnType<typeof createGroupsService>;
type AssetsService = ReturnType<typeof createAssetsService>;
type SlideFeedbackService = ReturnType<typeof createSlideFeedbackService>;

export function createApp(services: {
  presentationsService: PresentationsService;
  slidesService: SlidesService;
  groupsService: GroupsService;
  assetsService: AssetsService;
  feedbackService: SlideFeedbackService;
  actions: SlideDeckActions;
  extensionsRepo: ExtensionsRepository;
  agentTerminalBridge?: AgentTerminalBridge;
  localModelProvider?: LocalDeckModelProvider;
}) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/_agent-native", createAgentNativeDiscoveryRouter(services.actions));
  app.use("/_agent-native/app-agent", createAppAgentRuntimeRouter(services.actions));
  app.use("/_agent-native/prompt-deck-stream", createPromptDeckStreamRouter(services.actions));
  app.use(
    "/_agent-native",
    createFrameworkCoreRouter({
      actions: services.actions,
      terminalBridge: services.agentTerminalBridge,
      localModelProvider: services.localModelProvider,
    }),
  );
  app.use("/_agent-native/application-state", createApplicationStateRouter());
  app.use("/_agent-native/extensions", createExtensionsRouter(services.extensionsRepo));
  app.use("/_agent-native/slots", createExtensionSlotsRouter(services.extensionsRepo));
  app.use("/_agent-native/actions", createAgentNativeActionsRouter(services.actions));
  const exportHandler = createExportHandler(
    services.presentationsService,
    services.slidesService,
    services.groupsService,
    services.assetsService,
  );
  app.post("/_agent-native/export/presentations/:pid", exportHandler);
  app.post("/api/presentations/:pid/export", exportHandler);
  app.use("/api/presentations", createPresentationsRouter(services.presentationsService));
  app.get("/api/presentations/:pid/assets/:assetId/content", (req, res, next) => {
    try {
      const asset = services.assetsService.get(Number(req.params.pid), Number(req.params.assetId));
      res.setHeader("Content-Type", asset.mime_type);
      res.setHeader("Cache-Control", "private, max-age=300");
      res.send(asset.content);
    } catch (err) {
      next(err);
    }
  });
  app.use("/api/presentations/:pid/slides", createSlidesRouter(services.slidesService));
  app.use(
    "/api/presentations/:pid/slide-feedback",
    createSlideFeedbackRouter(services.feedbackService),
  );
  app.use("/api/presentations/:pid/groups", createGroupsRouter(services.groupsService));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof AppError) {
        res.status(err.status).json({ error: err.message });
        return;
      }

      console.error(err);
      res.status(500).json({ error: "internal server error" });
    },
  );

  return app;
}
