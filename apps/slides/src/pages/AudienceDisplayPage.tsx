import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useActionQuery } from "@agent-native/core/client";
import { FullscreenView } from "@/components/FullscreenView";
import { toUnifiedSlide } from "@/lib/presentationSlides";
import {
  getPresenterSyncKey,
  readPresenterSyncState,
  writePresenterSyncState,
} from "@/lib/presenterSync";
import type { ApiPresentation, ApiSlide, UnifiedSlide } from "@/types";

export function AudienceDisplayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pid = Number(id);
  const validPid = Boolean(id && !isNaN(pid));
  const [activeIndex, setActiveIndex] = useState(0);
  const [slides, setSlides] = useState<UnifiedSlide[]>([]);

  const presentationQuery = useActionQuery<ApiPresentation>(
    "get-deck",
    { id: pid },
    { enabled: validPid },
  );
  const slidesQuery = useActionQuery<ApiSlide[]>("list-slides", { pid }, { enabled: validPid });

  useEffect(() => {
    const presentation = presentationQuery.data;
    const apiSlides = slidesQuery.data as ApiSlide[] | undefined;
    if (!presentation || !apiSlides) return;
    setSlides(apiSlides.map((slide) => toUnifiedSlide(slide, presentation.theme)));
    const synced = readPresenterSyncState(presentation.id, apiSlides.length);
    setActiveIndex(synced?.activeIndex ?? 0);
  }, [presentationQuery.data, slidesQuery.data]);

  useEffect(() => {
    if (!validPid) return;
    const key = getPresenterSyncKey(pid);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      const synced = readPresenterSyncState(pid, slides.length);
      if (synced) setActiveIndex(synced.activeIndex);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [pid, slides.length, validPid]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(slides.length - 1, 0)));
  }, [slides.length]);

  const handleLocalNavigate = useCallback(
    (index: number) => {
      setActiveIndex(index);
      if (validPid) writePresenterSyncState(pid, index, slides.length);
    },
    [pid, slides.length, validPid],
  );

  const loading = validPid && (presentationQuery.isLoading || slidesQuery.isLoading);
  const queryError = presentationQuery.error ?? slidesQuery.error;
  const error = !validPid ? "Invalid ID" : queryError ? "Presentation not found" : null;

  if (loading) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
        }}
      >
        Loading display...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <FullscreenView
      slides={slides}
      activeIndex={activeIndex}
      onNavigate={handleLocalNavigate}
      onExit={() => navigate(`/p/${pid}`)}
      allowKeyboardNavigation={false}
      requestFullscreen={false}
    />
  );
}
