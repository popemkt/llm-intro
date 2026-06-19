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
import type { createSnapshotsService } from "../server/services/snapshots.js";
import type { LocalDeckModelProvider } from "../server/local-model-provider.js";

type PresentationsService = ReturnType<typeof createPresentationsService>;
type SlidesService = ReturnType<typeof createSlidesService>;
type GroupsService = ReturnType<typeof createGroupsService>;
type SnapshotsService = ReturnType<typeof createSnapshotsService>;

export function createSlideDeckActions(services: {
  presentationsService: PresentationsService;
  slidesService: SlidesService;
  groupsService: GroupsService;
  snapshotsService: SnapshotsService;
  localModelProvider?: LocalDeckModelProvider;
}) {
  return {
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
  };
}

export type SlideDeckActions = ReturnType<typeof createSlideDeckActions>;
