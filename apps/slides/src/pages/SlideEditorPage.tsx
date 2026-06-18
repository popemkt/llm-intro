import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  Copy,
  Edit3,
  Globe,
  Image as ImageIcon,
  Pill,
  Settings,
  Square,
  Trash2,
  Circle,
  Check,
  Quote,
} from "lucide-react";
import { nanoid } from "nanoid";
import ReactMarkdown from "react-markdown";
import { useActionMutation, useActionQuery } from "@agent-native/core/client";
import type { ApiPresentation, ApiSlide, Block, ShapeBlock, ThemeName } from "@/types";
import { getErrorMessage } from "@/api/client";
import { C } from "@/design/tokens";
import { getReadableTextColor } from "@/lib/color";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SlideBlockInsertPanel } from "@/components/SlideBlockInsertPanel";

type DragMode = "move" | "resize-tl" | "resize-tr" | "resize-bl" | "resize-br";

type DragState = {
  mode: DragMode;
  blockId: string;
  startCx: number;
  startCy: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const BLOCK_DEFAULTS: Record<Block["type"], { x: number; y: number; w: number; h: number }> = {
  text: { x: 5, y: 5, w: 90, h: 30 },
  image: { x: 10, y: 12, w: 80, h: 70 },
  iframe: { x: 5, y: 5, w: 90, h: 88 },
  shape: { x: 30, y: 30, w: 40, h: 30 },
};

function makeBlock(type: Block["type"]): Block {
  const id = nanoid();
  const pos = BLOCK_DEFAULTS[type];
  switch (type) {
    case "text":
      return { id, type, markdown: "", ...pos };
    case "image":
      return { id, type, url: "", alt: "", ...pos };
    case "iframe":
      return { id, type, url: "", ...pos };
    case "shape":
      return { id, type, shape: "rect", color: "#25d366", label: "", ...pos };
  }
}

const SHAPE_COLORS = [
  "#25d366",
  "#4c9fff",
  "#ff6b6b",
  "#ffd93d",
  "#a29bfe",
  "#fd79a8",
  "#00cec9",
  "#e17055",
  "#6c5ce7",
  "#ffffff",
  "#2d3436",
  "#0d0f0e",
];

const inp: React.CSSProperties = {
  width: "100%",
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 12,
  color: C.text,
  fontFamily: "Inter, sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

type SaveStatus = "idle" | "saving" | "saved" | "error";
type MarkdownFormat = "bold" | "italic" | "h1" | "h2" | "quote" | "bullets";

type MarkdownFormatResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export function SlideEditorPage() {
  const { id: pidStr, sid: sidStr } = useParams<{ id: string; sid: string }>();
  const navigate = useNavigate();
  const pid = Number(pidStr);
  const sid = Number(sidStr);
  const validRoute = Boolean(pidStr && sidStr && !isNaN(pid) && !isNaN(sid));

  const [title, setTitle] = useState("Untitled");
  const [presName, setPresName] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [notes, setNotes] = useState("");
  const [theme, setTheme] = useState<ThemeName>("dark-green");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const hasLoadedRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const presentationQuery = useActionQuery<ApiPresentation>(
    "get-deck",
    { id: pid },
    { enabled: validRoute },
  );
  const slidesQuery = useActionQuery<ApiSlide[]>("list-slides", { pid }, { enabled: validRoute });
  const updateSlide = useActionMutation<
    ApiSlide,
    { pid: number; sid: number; title?: string; blocks?: unknown[]; notes?: string }
  >("update-slide", { method: "PUT" });

  // Current values ref (for keyboard handler)
  const blocksRef = useRef(blocks);
  const titleRef = useRef(title);
  const notesRef = useRef(notes);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    setSaveStatus("idle");
    hasLoadedRef.current = false;
  }, [pid, sid]);

  useEffect(() => {
    if (!validRoute) {
      setLoadError("Invalid slide route");
      setLoading(false);
      return;
    }
    if (hasLoadedRef.current) return;
    if (presentationQuery.error) {
      setLoadError(getErrorMessage(presentationQuery.error));
      setLoading(false);
      return;
    }
    if (slidesQuery.error) {
      setLoadError(getErrorMessage(slidesQuery.error));
      setLoading(false);
      return;
    }
    if (presentationQuery.isLoading || slidesQuery.isLoading) return;

    const pres = presentationQuery.data;
    const slides = slidesQuery.data as ApiSlide[] | undefined;
    if (!pres || !slides) return;

    const slide = slides.find((s) => s.id === sid);
    if (!slide) {
      setLoadError("Slide not found");
      setLoading(false);
      return;
    }
    if (slide.kind !== "db") {
      setLoadError("Only custom slides can be edited here");
      setLoading(false);
      return;
    }

    setPresName(pres.name);
    setTitle(slide.title);
    setBlocks(slide.blocks);
    setNotes(slide.notes ?? "");
    setTheme(pres.theme);
    hasLoadedRef.current = true;
    setLoading(false);
  }, [
    pid,
    sid,
    validRoute,
    presentationQuery.data,
    presentationQuery.error,
    presentationQuery.isLoading,
    slidesQuery.data,
    slidesQuery.error,
    slidesQuery.isLoading,
  ]);

  // Global pointer handlers (ref-based — no re-render on drag)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = ((e.clientX - drag.startCx) / rect.width) * 100;
      const dy = ((e.clientY - drag.startCy) / rect.height) * 100;

      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== drag.blockId) return b;
          const bw = b.w ?? 80;
          const bh = b.h ?? 20;
          switch (drag.mode) {
            case "move":
              return {
                ...b,
                x: clamp(drag.origX + dx, 0, 100 - bw),
                y: clamp(drag.origY + dy, 0, 100 - bh),
              };
            case "resize-br":
              return { ...b, w: Math.max(5, drag.origW + dx), h: Math.max(5, drag.origH + dy) };
            case "resize-bl":
              return {
                ...b,
                x: clamp(drag.origX + dx, 0, drag.origX + drag.origW - 5),
                w: Math.max(5, drag.origW - dx),
                h: Math.max(5, drag.origH + dy),
              };
            case "resize-tr":
              return {
                ...b,
                y: clamp(drag.origY + dy, 0, drag.origY + drag.origH - 5),
                w: Math.max(5, drag.origW + dx),
                h: Math.max(5, drag.origH - dy),
              };
            case "resize-tl":
              return {
                ...b,
                x: clamp(drag.origX + dx, 0, drag.origX + drag.origW - 5),
                y: clamp(drag.origY + dy, 0, drag.origY + drag.origH - 5),
                w: Math.max(5, drag.origW - dx),
                h: Math.max(5, drag.origH - dy),
              };
          }
        }),
      );
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  // Auto-save: trigger on blocks/title/notes changes after initial load
  useEffect(() => {
    if (!hasLoadedRef.current || loading) return;
    setSaveStatus("idle");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      setSaveError(null);
      try {
        await updateSlide.mutateAsync({
          pid,
          sid,
          title: titleRef.current,
          blocks: blocksRef.current,
          notes: notesRef.current,
        });
        setSaveStatus("saved");
        if (savedStatusTimerRef.current) clearTimeout(savedStatusTimerRef.current);
        savedStatusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        setSaveStatus("error");
        setSaveError(getErrorMessage(err));
      }
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, title, notes, pid, sid, loading]);

  const saveAndExit = useCallback(async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus("saving");
    setSaveError(null);
    try {
      await updateSlide.mutateAsync({
        pid,
        sid,
        title: titleRef.current,
        blocks: blocksRef.current,
        notes: notesRef.current,
      });
      navigate(`/p/${pid}`);
    } catch (err) {
      setSaveStatus("error");
      setSaveError(getErrorMessage(err));
    }
  }, [pid, sid, navigate, updateSlide]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+S — save and exit
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void saveAndExit();
        return;
      }
      // Delete/Backspace — delete selected block (not when editing text inputs)
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        setBlocks((prev) => prev.filter((b) => b.id !== selectedId));
        setSelectedId(null);
      }
      // Escape — deselect
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveAndExit, selectedId]);

  const startDrag = (e: React.PointerEvent, block: Block, mode: DragMode = "move") => {
    e.stopPropagation();
    setSelectedId(block.id);
    dragRef.current = {
      mode,
      blockId: block.id,
      startCx: e.clientX,
      startCy: e.clientY,
      origX: block.x ?? 5,
      origY: block.y ?? 5,
      origW: block.w ?? 80,
      origH: block.h ?? 20,
    };
  };

  const addBlock = useCallback((type: Block["type"]) => {
    const b = makeBlock(type);
    setBlocks((prev) => [...prev, b]);
    setSelectedId(b.id);
  }, []);

  const addBlocks = useCallback((nextBlocks: Block[]) => {
    setBlocks((prev) => [...prev, ...nextBlocks]);
    setSelectedId(nextBlocks[0]?.id ?? null);
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId((s) => (s === id ? null : s));
    setEditingTextId((s) => (s === id ? null : s));
  }, []);

  const updateBlock = useCallback(<K extends Block>(id: string, patch: Partial<K>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  }, []);

  const duplicateBlock = useCallback((id: string) => {
    const source = blocksRef.current.find((block) => block.id === id);
    if (!source) return;
    const copy: Block = {
      ...source,
      id: nanoid(),
      x: clamp((source.x ?? BLOCK_DEFAULTS[source.type].x) + 3, 0, 100 - (source.w ?? 20)),
      y: clamp((source.y ?? BLOCK_DEFAULTS[source.type].y) + 3, 0, 100 - (source.h ?? 20)),
    };
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === id);
      if (index < 0) return [...prev, copy];
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
    setSelectedId(copy.id);
    setEditingTextId(null);
  }, []);

  const moveBlockLayer = useCallback((id: string, direction: "forward" | "back") => {
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === id);
      if (index < 0) return prev;
      const nextIndex = direction === "forward" ? index + 1 : index - 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }, []);

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  const saveStatusLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Error"
          : null;

  const saveStatusColor =
    saveStatus === "saving"
      ? C.textDim
      : saveStatus === "saved"
        ? C.accent
        : saveStatus === "error"
          ? "#ff8a8a"
          : undefined;

  if (loading)
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.bg,
          color: C.textDim,
          fontSize: 13,
        }}
      >
        Loading…
      </div>
    );

  if (loadError)
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: C.bg,
          color: C.text,
        }}
      >
        <div style={{ fontSize: 14 }}>{loadError}</div>
        <button
          onClick={() => navigate(`/p/${pid}`)}
          style={{
            background: "none",
            border: "none",
            color: C.textDim,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Back to deck
        </button>
      </div>
    );

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: C.bg,
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 52,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 20px",
          flexShrink: 0,
          background: C.surface,
        }}
      >
        <Breadcrumb
          segments={[
            { label: "Home", to: "/" },
            { label: presName || "Deck", to: `/p/${pid}` },
            { label: title },
          ]}
        />
        <div style={{ width: 1, height: 20, background: C.border }} />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            ...inp,
            flex: 1,
            maxWidth: 320,
            fontWeight: 600,
            fontSize: 14,
            border: "none",
            background: "transparent",
            padding: "4px 8px",
          }}
          placeholder="Slide title"
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {/* Auto-save status */}
          {saveStatusLabel && (
            <span
              style={{
                fontSize: 11,
                color: saveStatusColor,
                fontFamily: "JetBrains Mono, monospace",
                transition: "color 0.2s",
              }}
            >
              {saveStatusLabel}
            </span>
          )}
          <button
            onClick={() => navigate(`/p/${pid}/settings`)}
            style={{
              color: C.textDim,
              background: "none",
              border: `1px solid ${C.border}`,
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Settings size={13} /> Theme
          </button>
          <button
            onClick={saveAndExit}
            disabled={saveStatus === "saving"}
            title="Save and exit (⌘S)"
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              cursor: saveStatus === "saving" ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 700,
              background: C.accent,
              border: "none",
              color: C.bg,
              opacity: saveStatus === "saving" ? 0.6 : 1,
            }}
          >
            {saveStatus === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {saveError && (
        <div
          style={{
            padding: "8px 20px",
            background: C.surface,
            borderBottom: `1px solid ${C.border}`,
            color: "#ff8a8a",
            fontSize: 12,
          }}
        >
          {saveError}
        </div>
      )}

      {/* Canvas + right panel */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Canvas area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#070908",
            padding: 28,
            overflow: "hidden",
          }}
          onClick={() => setSelectedId(null)}
        >
          <div
            ref={canvasRef}
            data-theme={theme}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "calc((100vh - 140px) * 16 / 9)",
              aspectRatio: "16 / 9",
              background: "var(--theme-bg)",
              overflow: "hidden",
              boxShadow: "0 8px 48px rgba(0,0,0,0.7)",
            }}
          >
            {blocks.length === 0 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.18,
                  fontSize: 12,
                  color: "var(--theme-text)",
                  fontFamily: "JetBrains Mono, monospace",
                  pointerEvents: "none",
                }}
              >
                add blocks using the panel →
              </div>
            )}

            {blocks.map((block) => {
              const isSelected = selectedId === block.id;
              const isInlineEditing = editingTextId === block.id && block.type === "text";
              const x = block.x ?? 5;
              const y = block.y ?? 5;
              const w = block.w ?? 80;
              const h = block.h ?? 30;
              return (
                <div
                  key={block.id}
                  onPointerDown={(e) => startDrag(e, block, "move")}
                  onDoubleClick={(e) => {
                    if (block.type !== "text") return;
                    e.stopPropagation();
                    setSelectedId(block.id);
                    setEditingTextId(block.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(block.id);
                  }}
                  style={{
                    position: "absolute",
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${w}%`,
                    height: `${h}%`,
                    cursor: "move",
                    outline: isSelected
                      ? "2px solid var(--theme-accent, #25d366)"
                      : "1px dashed transparent",
                    outlineOffset: 1,
                    overflow: isSelected ? "visible" : "hidden",
                    userSelect: "none",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      overflow: "hidden",
                      boxSizing: "border-box",
                    }}
                  >
                    {isInlineEditing ? (
                      <InlineTextBlockEditor
                        block={block}
                        onChange={(markdown) => updateBlock(block.id, { markdown })}
                        onDone={() => setEditingTextId(null)}
                      />
                    ) : (
                      <CanvasBlockContent block={block} />
                    )}
                  </div>

                  {isSelected && (
                    <>
                      <BlockBubbleMenu
                        canEditText={block.type === "text"}
                        onEditText={() => setEditingTextId(block.id)}
                        onDuplicate={() => duplicateBlock(block.id)}
                        onBringForward={() => moveBlockLayer(block.id, "forward")}
                        onSendBack={() => moveBlockLayer(block.id, "back")}
                        onDelete={() => deleteBlock(block.id)}
                        editing={isInlineEditing}
                      />
                      {/* Resize handles */}
                      {(["tl", "tr", "bl", "br"] as const).map((handle) => (
                        <div
                          key={handle}
                          onPointerDown={(e) => startDrag(e, block, `resize-${handle}`)}
                          style={{
                            position: "absolute",
                            width: 9,
                            height: 9,
                            background: "var(--theme-accent, #25d366)",
                            border: "2px solid var(--theme-bg, #0d0f0e)",
                            borderRadius: 2,
                            cursor:
                              handle === "tl" || handle === "br" ? "nwse-resize" : "nesw-resize",
                            zIndex: 10,
                            ...(handle === "tl" ? { top: -5, left: -5 } : {}),
                            ...(handle === "tr" ? { top: -5, right: -5 } : {}),
                            ...(handle === "bl" ? { bottom: -5, left: -5 } : {}),
                            ...(handle === "br" ? { bottom: -5, right: -5 } : {}),
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div
          style={{
            width: 272,
            borderLeft: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            background: C.surface,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <SlideBlockInsertPanel onAddBlock={addBlock} onAddBlocks={addBlocks} />

          {/* Selected block properties */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {selectedBlock ? (
              <>
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: "JetBrains Mono, monospace",
                      color: C.muted,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {selectedBlock.type}
                  </span>
                  <button
                    onClick={() => deleteBlock(selectedBlock.id)}
                    style={{
                      color: "#ff6b6b",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                    }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>

                {/* Position & size */}
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: C.textDim,
                      marginBottom: 6,
                      fontFamily: "JetBrains Mono, monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Position &amp; Size (%)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {(["x", "y", "w", "h"] as const).map((k) => (
                      <label key={k} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span
                          style={{
                            fontSize: 9,
                            color: C.muted,
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {k === "x" ? "Left" : k === "y" ? "Top" : k === "w" ? "Width" : "Height"}
                        </span>
                        <input
                          type="number"
                          value={
                            Math.round(
                              (selectedBlock[k] ?? BLOCK_DEFAULTS[selectedBlock.type][k]) * 10,
                            ) / 10
                          }
                          onChange={(e) =>
                            updateBlock(selectedBlock.id, { [k]: Number(e.target.value) })
                          }
                          min={0}
                          max={100}
                          step={0.5}
                          style={{ ...inp, padding: "4px 8px" }}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Type-specific fields */}
                {selectedBlock.type === "text" && (
                  <TextBlockPropertyEditor
                    block={selectedBlock}
                    onUpdate={(markdown) => updateBlock(selectedBlock.id, { markdown })}
                  />
                )}

                {selectedBlock.type === "image" && (
                  <>
                    <div>
                      <div
                        style={{
                          fontSize: 9,
                          color: C.textDim,
                          marginBottom: 4,
                          fontFamily: "JetBrains Mono, monospace",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        URL
                      </div>
                      <input
                        value={selectedBlock.url}
                        onChange={(e) => updateBlock(selectedBlock.id, { url: e.target.value })}
                        placeholder="https://…"
                        style={inp}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 9,
                          color: C.textDim,
                          marginBottom: 4,
                          fontFamily: "JetBrains Mono, monospace",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Alt text
                      </div>
                      <input
                        value={selectedBlock.alt ?? ""}
                        onChange={(e) => updateBlock(selectedBlock.id, { alt: e.target.value })}
                        placeholder="Description"
                        style={inp}
                      />
                    </div>
                  </>
                )}

                {selectedBlock.type === "iframe" && (
                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        color: C.textDim,
                        marginBottom: 4,
                        fontFamily: "JetBrains Mono, monospace",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      URL
                    </div>
                    <input
                      value={selectedBlock.url}
                      onChange={(e) => updateBlock(selectedBlock.id, { url: e.target.value })}
                      placeholder="https://…"
                      style={inp}
                    />
                  </div>
                )}

                {selectedBlock.type === "shape" && (
                  <ShapePropEditor
                    block={selectedBlock}
                    onUpdate={(p) => updateBlock(selectedBlock.id, p)}
                  />
                )}
              </>
            ) : (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  fontSize: 11,
                  color: C.muted,
                  fontFamily: "JetBrains Mono, monospace",
                  lineHeight: 1.6,
                }}
              >
                click a block
                <br />
                to select &amp; edit
                <br />
                <br />
                <span style={{ fontSize: 10, opacity: 0.6 }}>
                  Del · delete selected
                  <br />
                  ⌘S · save &amp; exit
                </span>
              </div>
            )}

            <div>
              <div
                style={{
                  fontSize: 9,
                  color: C.textDim,
                  marginBottom: 4,
                  fontFamily: "JetBrains Mono, monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Speaker Notes
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Private presenter notes for this slide..."
                rows={5}
                style={{
                  ...inp,
                  resize: "vertical",
                  fontFamily: "Inter, sans-serif",
                  lineHeight: 1.5,
                }}
              />
            </div>
          </div>

          {/* Layers list */}
          {blocks.length > 0 && (
            <div
              style={{
                borderTop: `1px solid ${C.border}`,
                padding: "10px 16px",
                maxHeight: 190,
                overflowY: "auto",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontFamily: "JetBrains Mono, monospace",
                  color: C.muted,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Layers ({blocks.length})
              </div>
              {[...blocks].reverse().map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 8px",
                    borderRadius: 7,
                    cursor: "pointer",
                    marginBottom: 2,
                    background: selectedId === b.id ? C.accentSubtle : "transparent",
                    border: `1px solid ${selectedId === b.id ? C.border : "transparent"}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      color: C.accent,
                      fontFamily: "JetBrains Mono, monospace",
                      minWidth: 32,
                      textTransform: "uppercase",
                    }}
                  >
                    {b.type}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: C.textDim,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b.type === "text"
                      ? b.markdown.slice(0, 22) || "(empty)"
                      : b.type === "image"
                        ? b.url.slice(0, 22) || "(no url)"
                        : b.type === "iframe"
                          ? b.url.slice(0, 22) || "(no url)"
                          : `${b.shape} ${b.color}`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBlock(b.id);
                    }}
                    style={{
                      color: C.muted,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 2,
                      display: "flex",
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Canvas block content (WYSIWYG preview) ─────────────────────────────────

function applyMarkdownFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: MarkdownFormat,
): MarkdownFormatResult {
  const selected = value.slice(selectionStart, selectionEnd);
  const fallback = format === "bullets" ? "List item" : "text";

  if (format === "bold" || format === "italic") {
    const mark = format === "bold" ? "**" : "_";
    const text = selected || fallback;
    const next = `${value.slice(0, selectionStart)}${mark}${text}${mark}${value.slice(selectionEnd)}`;
    return {
      value: next,
      selectionStart: selectionStart + mark.length,
      selectionEnd: selectionStart + mark.length + text.length,
    };
  }

  const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const lineEndIndex = value.indexOf("\n", selectionEnd);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const lineValue = value.slice(lineStart, lineEnd) || fallback;
  const prefix =
    format === "h1" ? "# " : format === "h2" ? "## " : format === "quote" ? "> " : "- ";
  const formatted = lineValue
    .split("\n")
    .map((line) => {
      const cleaned = line.replace(/^\s*(#{1,6}\s+|>\s+|[-*]\s+)/, "");
      return `${prefix}${cleaned || fallback}`;
    })
    .join("\n");
  const next = `${value.slice(0, lineStart)}${formatted}${value.slice(lineEnd)}`;
  return {
    value: next,
    selectionStart: lineStart,
    selectionEnd: lineStart + formatted.length,
  };
}

function MarkdownFormatToolbar({
  onChange,
  textareaRef,
  value,
}: {
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
}) {
  const buttonStyle: React.CSSProperties = {
    width: 25,
    height: 25,
    borderRadius: 6,
    border: `1px solid ${C.border}`,
    background: C.bg,
    color: C.textDim,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  };

  const applyFormat = (format: MarkdownFormat) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const result = applyMarkdownFormat(
      value,
      textarea.selectionStart,
      textarea.selectionEnd,
      format,
    );
    onChange(result.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  return (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
    >
      {[
        { format: "h1" as const, label: "Heading 1", icon: <Heading1 size={13} /> },
        { format: "h2" as const, label: "Heading 2", icon: <Heading2 size={13} /> },
        { format: "bold" as const, label: "Bold", icon: <Bold size={13} /> },
        { format: "italic" as const, label: "Italic", icon: <Italic size={13} /> },
        { format: "quote" as const, label: "Quote", icon: <Quote size={13} /> },
        { format: "bullets" as const, label: "Bullets", icon: <List size={13} /> },
      ].map(({ format, icon, label }) => (
        <button
          key={format}
          type="button"
          title={label}
          onMouseDown={(event) => {
            event.preventDefault();
            applyFormat(format);
          }}
          style={buttonStyle}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

function TextBlockPropertyEditor({
  block,
  onUpdate,
}: {
  block: Extract<Block, { type: "text" }>;
  onUpdate: (markdown: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div>
      <div
        style={{
          fontSize: 9,
          color: C.textDim,
          marginBottom: 4,
          fontFamily: "JetBrains Mono, monospace",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Markdown
      </div>
      <div style={{ marginBottom: 6 }}>
        <MarkdownFormatToolbar
          textareaRef={textareaRef}
          value={block.markdown}
          onChange={onUpdate}
        />
      </div>
      <textarea
        ref={textareaRef}
        value={block.markdown}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder="Markdown content..."
        rows={7}
        style={{
          ...inp,
          resize: "vertical",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
        }}
      />
    </div>
  );
}

function BlockBubbleMenu({
  canEditText,
  editing,
  onBringForward,
  onDelete,
  onDuplicate,
  onEditText,
  onSendBack,
}: {
  canEditText: boolean;
  editing: boolean;
  onBringForward: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEditText: () => void;
  onSendBack: () => void;
}) {
  const button: React.CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: 6,
    border: `1px solid ${C.border}`,
    background: C.surface,
    color: C.textDim,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  };

  return (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      style={{
        position: "absolute",
        top: -36,
        right: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: 4,
        borderRadius: 8,
        background: "rgba(13, 15, 14, 0.92)",
        border: `1px solid ${C.border}`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      {canEditText && (
        <button
          type="button"
          onClick={onEditText}
          title={editing ? "Editing text" : "Edit text"}
          style={{
            ...button,
            color: editing ? C.accent : C.textDim,
            background: editing ? C.accentSubtle : C.surface,
          }}
        >
          {editing ? <Check size={13} /> : <Edit3 size={13} />}
        </button>
      )}
      <button type="button" onClick={onDuplicate} title="Duplicate block" style={button}>
        <Copy size={13} />
      </button>
      <button type="button" onClick={onBringForward} title="Bring forward" style={button}>
        <ArrowUp size={13} />
      </button>
      <button type="button" onClick={onSendBack} title="Send backward" style={button}>
        <ArrowDown size={13} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Delete block"
        style={{ ...button, color: "#ff8a8a" }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function InlineTextBlockEditor({
  block,
  onChange,
  onDone,
}: {
  block: Extract<Block, { type: "text" }>;
  onChange: (markdown: string) => void;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        background: "rgba(13, 15, 14, 0.62)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "5px 6px",
          background: "rgba(13, 15, 14, 0.72)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <MarkdownFormatToolbar textareaRef={inputRef} value={block.markdown} onChange={onChange} />
      </div>
      <textarea
        ref={inputRef}
        value={block.markdown}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onDone}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            onDone();
          }
        }}
        placeholder="Type markdown..."
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          resize: "none",
          boxSizing: "border-box",
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--theme-text)",
          padding: "6px 10px",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "clamp(0.58rem, 0.82vw, 0.78rem)",
          lineHeight: 1.5,
        }}
      />
    </div>
  );
}

function CanvasBlockContent({ block }: { block: Block }) {
  switch (block.type) {
    case "text":
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            padding: "6px 10px",
            overflow: "hidden",
            boxSizing: "border-box",
            fontSize: "clamp(0.6rem, 0.9vw, 0.85rem)",
            lineHeight: 1.55,
            color: "var(--theme-text)",
          }}
          className="prose-block"
        >
          {block.markdown ? (
            <ReactMarkdown>{block.markdown}</ReactMarkdown>
          ) : (
            <span
              style={{ opacity: 0.25, fontFamily: "JetBrains Mono, monospace", fontSize: "0.7em" }}
            >
              empty text
            </span>
          )}
        </div>
      );

    case "image":
      return block.url ? (
        <img
          src={block.url}
          alt={block.alt ?? ""}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: "var(--theme-text-dim)",
            fontSize: 11,
            opacity: 0.5,
          }}
        >
          <ImageIcon size={14} /> no image
        </div>
      );

    case "iframe":
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            background: "var(--theme-surface)",
            border: "1px solid var(--theme-border)",
            color: "var(--theme-text-dim)",
            fontSize: 11,
          }}
        >
          <Globe size={16} style={{ opacity: 0.5 }} />
          <span
            style={{
              maxWidth: "80%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              opacity: 0.6,
            }}
          >
            {block.url || "(no URL)"}
          </span>
        </div>
      );

    case "shape": {
      const radius = block.shape === "circle" ? "50%" : block.shape === "pill" ? 9999 : 8;
      const isCircle = block.shape === "circle";
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: block.color,
              borderRadius: radius,
              width: block.width ?? (isCircle ? "70%" : "100%"),
              height: block.height ?? (isCircle ? "70%" : "100%"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 2px 12px ${block.color}44`,
            }}
          >
            {block.label && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: getReadableTextColor(block.color),
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {block.label}
              </span>
            )}
          </div>
        </div>
      );
    }
  }
}

// ─── Shape property editor ────────────────────────────────────────────────────

function ShapePropEditor({
  block,
  onUpdate,
}: {
  block: ShapeBlock;
  onUpdate: (p: Partial<ShapeBlock>) => void;
}) {
  const btnInp: React.CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "5px 0",
    borderRadius: 7,
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {[
          { value: "rect" as const, icon: <Square size={12} />, label: "Rect" },
          { value: "pill" as const, icon: <Pill size={12} />, label: "Pill" },
          { value: "circle" as const, icon: <Circle size={12} />, label: "Circle" },
        ].map(({ value, icon, label }) => (
          <button
            key={value}
            onClick={() => onUpdate({ shape: value })}
            style={{
              ...btnInp,
              border: `1.5px solid ${block.shape === value ? C.accent : C.border}`,
              background: block.shape === value ? C.accentSubtle : C.bg,
              color: block.shape === value ? C.accent : C.textDim,
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      <div>
        <div
          style={{
            fontSize: 9,
            color: C.textDim,
            marginBottom: 6,
            fontFamily: "JetBrains Mono, monospace",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Color
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {SHAPE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onUpdate({ color: c })}
              title={c}
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                background: c,
                cursor: "pointer",
                padding: 0,
                border: block.color === c ? `2.5px solid ${C.highlight}` : `1px solid ${C.border}`,
              }}
            />
          ))}
          <input
            type="color"
            value={block.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              border: `1px solid ${C.border}`,
              padding: 0,
              cursor: "pointer",
              background: "none",
            }}
          />
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 9,
            color: C.textDim,
            marginBottom: 4,
            fontFamily: "JetBrains Mono, monospace",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Label
        </div>
        <input
          value={block.label ?? ""}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Label text"
          style={inp}
        />
      </div>
    </div>
  );
}
