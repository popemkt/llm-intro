interface PresenterSyncState {
  activeIndex: number;
  slideCount: number;
  updatedAt: number;
}

export function getPresenterSyncKey(presentationId: number) {
  return `llm-intro:presenter-sync:${presentationId}`;
}

function normalizeIndex(index: number, slideCount: number) {
  if (!Number.isFinite(index)) return 0;
  if (slideCount <= 0) return 0;
  return Math.max(0, Math.min(Math.floor(index), slideCount - 1));
}

export function readPresenterSyncState(
  presentationId: number,
  fallbackSlideCount = 0,
): PresenterSyncState | null {
  try {
    const raw = window.localStorage.getItem(getPresenterSyncKey(presentationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PresenterSyncState>;
    const slideCount =
      typeof parsed.slideCount === "number" && parsed.slideCount >= 0
        ? parsed.slideCount
        : fallbackSlideCount;
    return {
      activeIndex: normalizeIndex(Number(parsed.activeIndex), slideCount),
      slideCount,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export function writePresenterSyncState(
  presentationId: number,
  activeIndex: number,
  slideCount: number,
) {
  const state: PresenterSyncState = {
    activeIndex: normalizeIndex(activeIndex, slideCount),
    slideCount,
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(getPresenterSyncKey(presentationId), JSON.stringify(state));
}
