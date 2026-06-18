import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useActionMutation, useActionQuery } from "@agent-native/core/client";
import { OverviewGrid, type NormalSlideQuickLayout } from "@/components/OverviewGrid";
import { PresentationView } from "@/components/PresentationView";
import { FullscreenView } from "@/components/FullscreenView";
import { codeSlideRegistry } from "@/slides/registry";
import { getErrorMessage } from "@/api/client";
import type { UnifiedSlide, ApiSlide, ApiSlideGroup, ApiPresentation, LayoutInput } from "@/types";

function toUnified(slide: ApiSlide, theme: ApiPresentation["theme"]): UnifiedSlide {
  const groupId = slide.group_id ?? null;
  if (slide.kind === "code") {
    const component = codeSlideRegistry[slide.code_id ?? ""];
    if (!component) {
      console.warn(`Unknown code_id: ${slide.code_id}`);
      return { kind: "db", id: slide.id, groupId, title: slide.title, blocks: [], theme };
    }
    return { kind: "code", id: slide.id, groupId, title: slide.title, component };
  }
  return { kind: "db", id: slide.id, groupId, title: slide.title, blocks: slide.blocks, theme };
}

const normalSlideTitles: Record<NormalSlideQuickLayout, string> = {
  title: "Title slide",
  bullets: "Key points",
  "two-column": "Compare ideas",
  quote: "Quote",
  metrics: "Metrics",
};

export function PresentationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pid = Number(id);

  const [mode, setMode] = useState<"overview" | "presentation" | "fullscreen">("overview");
  const [activeIndex, setActiveIndex] = useState(0);
  const [slides, setSlides] = useState<UnifiedSlide[]>([]);
  const [groups, setGroups] = useState<ApiSlideGroup[]>([]);
  const [presentation, setPresentation] = useState<ApiPresentation | null>(null);
  const [notice, setNotice] = useState<{ msg: string; type: "error" | "success" } | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validPid = Boolean(id && !isNaN(pid));

  const presentationQuery = useActionQuery<ApiPresentation>(
    "get-deck",
    { id: pid },
    { enabled: validPid },
  );
  const slidesQuery = useActionQuery<ApiSlide[]>("list-slides", { pid }, { enabled: validPid });
  const groupsQuery = useActionQuery<ApiSlideGroup[]>(
    "list-groups",
    { pid },
    { enabled: validPid },
  );

  const createSlide = useActionMutation<ApiSlide, { pid: number; title?: string }>("create-slide");
  const createNormalSlide = useActionMutation<
    ApiSlide,
    { pid: number; layout: NormalSlideQuickLayout; title?: string }
  >("create-normal-slide");
  const updateSlide = useActionMutation<
    ApiSlide,
    { pid: number; sid: number; title?: string; blocks?: unknown[] }
  >("update-slide", { method: "PUT" });
  const deleteSlide = useActionMutation<null, { pid: number; sid: number }>("delete-slide", {
    method: "DELETE",
  });
  const updateLayout = useActionMutation<ApiSlide[], { pid: number } & LayoutInput>(
    "update-deck-layout",
    { method: "PUT" },
  );
  const createGroup = useActionMutation<ApiSlideGroup, { pid: number; title?: string }>(
    "create-group",
  );
  const updateGroup = useActionMutation<
    ApiSlideGroup,
    { pid: number; gid: number; title?: string; collapsed?: boolean }
  >("update-group", { method: "PUT" });
  const deleteGroup = useActionMutation<null, { pid: number; gid: number }>("delete-group", {
    method: "DELETE",
  });

  const hydrateSlides = useCallback((apiSlides: ApiSlide[], pres: ApiPresentation) => {
    setSlides(apiSlides.map((slide) => toUnified(slide, pres.theme)));
  }, []);

  useEffect(() => {
    const pres = presentationQuery.data;
    const apiSlides = slidesQuery.data;
    const apiGroups = groupsQuery.data;
    if (!pres || !apiSlides || !apiGroups) return;
    setPresentation(pres);
    setGroups(apiGroups);
    hydrateSlides(apiSlides, pres);
  }, [groupsQuery.data, hydrateSlides, presentationQuery.data, slidesQuery.data]);

  // Keyboard handler for regular presentation mode only
  // (fullscreen mode handles its own keys)
  useEffect(() => {
    if (mode !== "presentation") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Escape") setMode("overview");
      else if (e.key === "f" || e.key === "F") setMode("fullscreen");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, slides.length]);

  useEffect(() => {
    if (slides.length === 0) {
      setActiveIndex(0);
      if (mode !== "overview") setMode("overview");
      return;
    }
    setActiveIndex((index) => Math.min(index, slides.length - 1));
  }, [mode, slides.length]);

  const showNotice = useCallback((msg: string, type: "error" | "success" = "error") => {
    setNotice({ msg, type });
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), type === "success" ? 2500 : 5000);
  }, []);

  const handleAddSlide = useCallback(async () => {
    if (!presentation) return;
    try {
      const slide = await createSlide.mutateAsync({ pid: presentation.id });
      setSlides((prev) => [...prev, toUnified(slide, presentation.theme)]);
    } catch (err) {
      showNotice(getErrorMessage(err));
    }
  }, [createSlide, presentation, showNotice]);

  const handleAddNormalSlide = useCallback(
    async (layout: NormalSlideQuickLayout) => {
      if (!presentation) return;
      try {
        const slide = await createNormalSlide.mutateAsync({
          pid: presentation.id,
          layout,
          title: normalSlideTitles[layout],
        });
        setSlides((prev) => [...prev, toUnified(slide, presentation.theme)]);
      } catch (err) {
        showNotice(getErrorMessage(err));
      }
    },
    [createNormalSlide, presentation, showNotice],
  );

  const handleLayoutChange = useCallback(
    async (layout: LayoutInput) => {
      if (!presentation) return;
      const previousSlides = slides;
      const previousGroups = groups;
      // Optimistic: rebuild slides in new layout order with updated groupId
      const map = new Map(slides.map((slide) => [slide.id, slide]));
      const nextOrdered: UnifiedSlide[] = [];
      for (const id of layout.ungrouped) {
        const s = map.get(id);
        if (s) nextOrdered.push({ ...s, groupId: null } as UnifiedSlide);
      }
      for (const group of layout.groups) {
        for (const id of group.slideIds) {
          const s = map.get(id);
          if (s) nextOrdered.push({ ...s, groupId: group.id } as UnifiedSlide);
        }
      }
      setSlides(nextOrdered);
      // Optimistic: reorder groups state to match layout's group order
      const groupMap = new Map(groups.map((g) => [g.id, g]));
      const nextGroups = layout.groups
        .map((g) => groupMap.get(g.id))
        .filter((g): g is (typeof groups)[number] => !!g);
      setGroups(nextGroups);

      try {
        const [updatedSlides, updatedGroups] = await Promise.all([
          updateLayout.mutateAsync({ pid: presentation.id, ...layout }),
          groupsQuery.refetch(),
        ]);
        setGroups(updatedGroups.data ?? previousGroups);
        hydrateSlides(updatedSlides, presentation);
      } catch (err) {
        setSlides(previousSlides);
        setGroups(previousGroups);
        showNotice(getErrorMessage(err));
      }
    },
    [groupsQuery, hydrateSlides, presentation, slides, groups, showNotice, updateLayout],
  );

  const handleAddSlideToGroup = useCallback(
    async (groupId: number) => {
      if (!presentation) return;
      try {
        const slide = await createSlide.mutateAsync({ pid: presentation.id });
        // New slide is created in ungrouped; move it into the target group.
        const unified = toUnified(slide, presentation.theme);
        const nextSlides = [...slides, unified];
        setSlides(nextSlides);
        const layout: LayoutInput = {
          ungrouped: nextSlides
            .filter((s) => s.groupId == null && s.id !== slide.id)
            .map((s) => s.id),
          groups: groups.map((g) => ({
            id: g.id,
            slideIds: [
              ...nextSlides.filter((s) => s.groupId === g.id && s.id !== slide.id).map((s) => s.id),
              ...(g.id === groupId ? [slide.id] : []),
            ],
          })),
        };
        const updated = await updateLayout.mutateAsync({ pid: presentation.id, ...layout });
        hydrateSlides(updated, presentation);
      } catch (err) {
        showNotice(getErrorMessage(err));
      }
    },
    [createSlide, presentation, slides, groups, hydrateSlides, showNotice, updateLayout],
  );

  const handleCreateGroup = useCallback(async () => {
    if (!presentation) return;
    try {
      const group = await createGroup.mutateAsync({ pid: presentation.id, title: "New group" });
      setGroups((prev) => [...prev, group]);
    } catch (err) {
      showNotice(getErrorMessage(err));
    }
  }, [createGroup, presentation, showNotice]);

  const handleUpdateGroup = useCallback(
    async (gid: number, patch: { title?: string; collapsed?: boolean }) => {
      if (!presentation) return;
      const previousGroups = groups;
      setGroups((prev) => prev.map((g) => (g.id === gid ? { ...g, ...patch } : g)));
      try {
        const updated = await updateGroup.mutateAsync({ pid: presentation.id, gid, ...patch });
        setGroups((prev) => prev.map((g) => (g.id === gid ? updated : g)));
      } catch (err) {
        setGroups(previousGroups);
        showNotice(getErrorMessage(err));
      }
    },
    [presentation, groups, showNotice, updateGroup],
  );

  const handleDeleteGroup = useCallback(
    async (gid: number) => {
      if (!presentation) return;
      if (!confirm("Delete this group? Its slides will move to ungrouped.")) return;
      try {
        await deleteGroup.mutateAsync({ pid: presentation.id, gid });
        setGroups((prev) => prev.filter((g) => g.id !== gid));
        // Slides had group_id set to null server-side; refetch to sync.
        const refreshed = await slidesQuery.refetch();
        if (refreshed.data) hydrateSlides(refreshed.data, presentation);
      } catch (err) {
        showNotice(getErrorMessage(err));
      }
    },
    [deleteGroup, hydrateSlides, presentation, showNotice, slidesQuery],
  );

  const handleEditSlide = useCallback(
    (slideId: number) => {
      navigate(`/p/${pid}/edit/${slideId}`);
    },
    [navigate, pid],
  );

  const handleDeleteSlide = useCallback(
    async (slideId: number, options?: { confirm?: boolean }) => {
      if (!presentation) return;
      if (options?.confirm !== false && !confirm("Delete this slide?")) return;
      try {
        await deleteSlide.mutateAsync({ pid: presentation.id, sid: slideId });
        setSlides((prev) => prev.filter((slide) => slide.id !== slideId));
      } catch (err) {
        showNotice(getErrorMessage(err));
      }
    },
    [deleteSlide, presentation, showNotice],
  );

  const handleRenameSlide = useCallback(
    async (slideId: number, newTitle: string) => {
      if (!presentation) return;
      try {
        const updatedSlide = await updateSlide.mutateAsync({
          pid: presentation.id,
          sid: slideId,
          title: newTitle,
        });
        setSlides((prev) =>
          prev.map((slide) =>
            slide.id === slideId ? toUnified(updatedSlide, presentation.theme) : slide,
          ),
        );
      } catch (err) {
        showNotice(getErrorMessage(err));
      }
    },
    [presentation, showNotice, updateSlide],
  );

  const loading =
    validPid && (presentationQuery.isLoading || slidesQuery.isLoading || groupsQuery.isLoading);
  const queryError = presentationQuery.error ?? slidesQuery.error ?? groupsQuery.error;
  const error = !validPid ? "Invalid ID" : queryError ? "Presentation not found" : null;

  if (loading)
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0f0e",
          color: "#7a9985",
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
        }}
      >
        Loading…
      </div>
    );

  if (error || !presentation)
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0f0e",
          color: "#e8f0eb",
          fontFamily: "Inter, sans-serif",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 14 }}>{error ?? "Not found"}</div>
        <button
          onClick={() => navigate("/")}
          style={{
            fontSize: 12,
            color: "#7a9985",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          ← Back
        </button>
      </div>
    );

  return (
    <div style={{ height: "100vh", overflow: "hidden" }}>
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.msg}
            initial={{ opacity: 0, y: -8, x: 8 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -8, x: 8 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "fixed",
              top: 16,
              right: 16,
              zIndex: 100,
              maxWidth: 320,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(20, 26, 23, 0.97)",
              border: `1px solid ${notice.type === "error" ? "#ff6b6b55" : "var(--color-accent)"}`,
              color: notice.type === "error" ? "#ff9b9b" : "var(--color-accent)",
              fontSize: 12,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,0,0,.5)",
            }}
            onClick={() => setNotice(null)}
          >
            {notice.msg}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {mode === "overview" ? (
          <OverviewGrid
            key="overview"
            slides={slides}
            groups={groups}
            presentationId={presentation.id}
            presentationTheme={presentation.theme}
            title={presentation.name}
            onSelectSlide={(i) => {
              setActiveIndex(i);
              setMode("presentation");
            }}
            onAddSlide={handleAddSlide}
            onAddNormalSlide={handleAddNormalSlide}
            onAddSlideToGroup={handleAddSlideToGroup}
            onLayoutChange={handleLayoutChange}
            onCreateGroup={handleCreateGroup}
            onUpdateGroup={handleUpdateGroup}
            onDeleteGroup={handleDeleteGroup}
            onEditSlide={handleEditSlide}
            onDeleteSlide={handleDeleteSlide}
            onRenameSlide={handleRenameSlide}
            onOpenSettings={() => navigate(`/p/${presentation.id}/settings`)}
          />
        ) : mode === "presentation" ? (
          <PresentationView
            key="presentation"
            slides={slides}
            activeIndex={activeIndex}
            onExit={() => setMode("overview")}
            onNavigate={setActiveIndex}
            onGoHome={() => navigate("/")}
            onEnterFullscreen={() => setMode("fullscreen")}
          />
        ) : (
          <FullscreenView
            key="fullscreen"
            slides={slides}
            activeIndex={activeIndex}
            onNavigate={setActiveIndex}
            onExit={() => setMode("overview")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
