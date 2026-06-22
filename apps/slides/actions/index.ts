import type { createPresentationsService } from "../server/services/presentations.js";
import type { createSlidesService } from "../server/services/slides.js";
import type { createGroupsService } from "../server/services/groups.js";
import { createDeckActions } from "./decks.js";
import { createSlideActions } from "./slides.js";
import { createGroupActions } from "./groups.js";
import { createAppContextActions } from "./app-context.js";
import { createDeckOutlineAction } from "./deck-outline.js";
import { createDeckPromptActions } from "./deck-prompt.js";
import { createDeckJsonActions } from "./deck-json.js";
import { createDeckMarkdownActions } from "./deck-markdown.js";
import { createActiveDeckContextAction } from "./active-deck-context.js";
import { createThemeDesignActions } from "./theme-design.js";
import { createSnapshotActions } from "./snapshots.js";
import { createLocalHarnessActions } from "./local-harness.js";
import { createAssetActions } from "./assets.js";
import { createSlideFeedbackActions } from "./slide-feedback.js";
import { createExtensionActions } from "./extensions.js";
import type { ExtensionsRepository } from "../server/repositories/extensions.js";
import type { createSnapshotsService } from "../server/services/snapshots.js";
import type { createAssetsService } from "../server/services/assets.js";
import type { createSlideFeedbackService } from "../server/services/slide-feedback.js";
import type { LocalDeckModelProvider } from "../server/local-model-provider.js";

type PresentationsService = ReturnType<typeof createPresentationsService>;
type SlidesService = ReturnType<typeof createSlidesService>;
type GroupsService = ReturnType<typeof createGroupsService>;
type SnapshotsService = ReturnType<typeof createSnapshotsService>;
type AssetsService = ReturnType<typeof createAssetsService>;
type SlideFeedbackService = ReturnType<typeof createSlideFeedbackService>;

export function createSlideDeckActions(services: {
  presentationsService: PresentationsService;
  slidesService: SlidesService;
  groupsService: GroupsService;
  snapshotsService: SnapshotsService;
  assetsService: AssetsService;
  feedbackService: SlideFeedbackService;
  extensionsRepo: ExtensionsRepository;
  localModelProvider?: LocalDeckModelProvider;
}) {
  return {
    ...createExtensionActions(services.extensionsRepo),
    ...createAppContextActions(),
    ...createThemeDesignActions(services.presentationsService),
    "get-active-deck-context": createActiveDeckContextAction(services),
    ...createDeckActions(services.presentationsService),
    ...createSlideActions(services.slidesService),
    "create-deck-from-outline": createDeckOutlineAction(
      services.presentationsService,
      services.slidesService,
    ),
    ...createDeckPromptActions(
      services.presentationsService,
      services.slidesService,
      services.localModelProvider,
    ),
    ...createDeckJsonActions(services),
    ...createDeckMarkdownActions(services),
    ...createLocalHarnessActions(),
    ...createGroupActions(services.groupsService),
    ...createSnapshotActions(services.snapshotsService),
    ...createAssetActions(services.assetsService),
    ...createSlideFeedbackActions(services.feedbackService),
  };
}

export type SlideDeckActions = ReturnType<typeof createSlideDeckActions>;
