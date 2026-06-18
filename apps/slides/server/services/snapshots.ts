import { AppError } from "../errors.js";
import type { createPresentationsService } from "./presentations.js";
import type { createSlidesService } from "./slides.js";
import type { createGroupsService } from "./groups.js";
import type { createSnapshotsRepository } from "../repositories/snapshots.js";

type PresentationsService = ReturnType<typeof createPresentationsService>;
type SlidesService = ReturnType<typeof createSlidesService>;
type GroupsService = ReturnType<typeof createGroupsService>;
type SnapshotsRepository = ReturnType<typeof createSnapshotsRepository>;

function defaultSnapshotLabel() {
  return `Snapshot ${new Date().toISOString()}`;
}

export function createSnapshotsService(
  presentationsService: PresentationsService,
  slidesService: SlidesService,
  groupsService: GroupsService,
  snapshotsRepo: SnapshotsRepository,
) {
  return {
    list(presentationId: number) {
      presentationsService.get(presentationId);
      return snapshotsRepo.listByPresentationId(presentationId);
    },

    get(presentationId: number, snapshotId: number) {
      presentationsService.get(presentationId);
      const snapshot = snapshotsRepo.getById(presentationId, snapshotId);
      if (!snapshot) throw new AppError(404, "snapshot not found");
      return snapshot;
    },

    create(presentationId: number, input: { label?: string } = {}) {
      const deck = presentationsService.get(presentationId);
      const slides = slidesService.list(presentationId);
      const groups = groupsService.list(presentationId);
      const label = input.label?.trim() || defaultSnapshotLabel();

      return snapshotsRepo.create(presentationId, {
        label,
        deckName: deck.name,
        slideCount: slides.length,
        groupCount: groups.length,
        payload: { deck, slides, groups },
      });
    },
  };
}
