import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Bold,
  ClipboardPaste,
  Heading1,
  Heading2,
  Italic,
  List,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  Globe,
  Grid3X3,
  Group,
  Image as ImageIcon,
  Lock,
  Pill,
  Play,
  Settings,
  Square,
  Trash2,
  Circle,
  Check,
  Diamond,
  Hexagon,
  Maximize2,
  Quote,
  Scissors,
  StretchHorizontal,
  StretchVertical,
  Triangle,
  Ungroup,
  Unlock,
  Redo2,
  Undo2,
} from "lucide-react";
import { nanoid } from "nanoid";
import ReactMarkdown from "react-markdown";
import { useActionMutation, useActionQuery } from "@agent-native/core/client";
import type {
  ApiPresentation,
  ApiSlide,
  ApiSlideBackground,
  ApiSlideTransition,
  Block,
  ManualBlockAnimationPreset,
  ShapeBlock,
  ThemeName,
} from "@/types";
import type { ApiDeckAsset } from "@/types";
import { getErrorMessage } from "@/api/client";
import { C } from "@/design/tokens";
import { getReadableTextColor } from "@/lib/color";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DeckAssetPanel } from "@/components/DeckAssetPanel";
import { HtmlSlideRenderer } from "@/components/HtmlSlideRenderer";
import { SlideBlockInsertPanel } from "@/components/SlideBlockInsertPanel";
import { ChartBlockView } from "@/components/ChartBlockView";
import {
  getTransitionLayerZIndex,
  getTransitionPhaseTiming,
  resolveSlideTransition,
} from "@/lib/slideTransitions";

type DragMode = "move" | "resize-tl" | "resize-tr" | "resize-bl" | "resize-br";

type DragState = {
  mode: DragMode;
  blockId: string;
  startCx: number;
  startCy: number;
  originals: Array<{
    id: string;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  }>;
};

type GuideAxis = "x" | "y";
type ActiveGuide = { axis: GuideAxis; value: number };
type RectPercent = { x: number; y: number; w: number; h: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const SNAP_THRESHOLD = 1;

function gridValues(step: number) {
  const safeStep = clamp(step, 1, 25);
  const values: number[] = [];
  for (let value = 0; value <= 100; value += safeStep) values.push(value);
  if (values[values.length - 1] !== 100) values.push(100);
  return values;
}

function blockRect(block: Block): RectPercent {
  const defaults = BLOCK_DEFAULTS[block.type];
  return {
    x: block.x ?? defaults.x,
    y: block.y ?? defaults.y,
    w: block.w ?? defaults.w,
    h: block.h ?? defaults.h,
  };
}

function rectBounds(rects: RectPercent[]): RectPercent {
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.w));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function guideValues(
  blocks: Block[],
  excludeIds: Set<string>,
  axis: GuideAxis,
  gridStep: number | null = null,
) {
  const values = [0, 50, 100];
  if (gridStep !== null) values.push(...gridValues(gridStep));
  for (const block of blocks) {
    if (excludeIds.has(block.id)) continue;
    const rect = blockRect(block);
    if (axis === "x") values.push(rect.x, rect.x + rect.w / 2, rect.x + rect.w);
    else values.push(rect.y, rect.y + rect.h / 2, rect.y + rect.h);
  }
  return values;
}

function snapDeltaForRect(
  rect: RectPercent,
  targets: number[],
  axis: GuideAxis,
): { delta: number; guide: ActiveGuide | null } {
  const candidates =
    axis === "x"
      ? [rect.x, rect.x + rect.w / 2, rect.x + rect.w]
      : [rect.y, rect.y + rect.h / 2, rect.y + rect.h];
  let best: { distance: number; delta: number; guide: ActiveGuide } | null = null;
  for (const point of candidates) {
    for (const target of targets) {
      const distance = Math.abs(point - target);
      if (distance > SNAP_THRESHOLD) continue;
      if (!best || distance < best.distance) {
        best = { distance, delta: target - point, guide: { axis, value: target } };
      }
    }
  }
  return best ? { delta: best.delta, guide: best.guide } : { delta: 0, guide: null };
}

function snapRect(
  rect: RectPercent,
  allBlocks: Block[],
  excludeIds: Set<string>,
  gridStep: number | null = null,
): { rect: RectPercent; guides: ActiveGuide[] } {
  const xSnap = snapDeltaForRect(rect, guideValues(allBlocks, excludeIds, "x", gridStep), "x");
  const ySnap = snapDeltaForRect(rect, guideValues(allBlocks, excludeIds, "y", gridStep), "y");
  return {
    rect: {
      ...rect,
      x: rect.x + xSnap.delta,
      y: rect.y + ySnap.delta,
    },
    guides: [xSnap.guide, ySnap.guide].filter((guide): guide is ActiveGuide => guide !== null),
  };
}

function resizeRectForDrag(
  original: DragState["originals"][number],
  mode: DragMode,
  dx: number,
  dy: number,
): RectPercent {
  switch (mode) {
    case "resize-br":
      return {
        x: original.origX,
        y: original.origY,
        w: clamp(original.origW + dx, 5, 100 - original.origX),
        h: clamp(original.origH + dy, 5, 100 - original.origY),
      };
    case "resize-bl": {
      const right = original.origX + original.origW;
      const x = clamp(original.origX + dx, 0, right - 5);
      return {
        x,
        y: original.origY,
        w: right - x,
        h: clamp(original.origH + dy, 5, 100 - original.origY),
      };
    }
    case "resize-tr": {
      const bottom = original.origY + original.origH;
      const y = clamp(original.origY + dy, 0, bottom - 5);
      return {
        x: original.origX,
        y,
        w: clamp(original.origW + dx, 5, 100 - original.origX),
        h: bottom - y,
      };
    }
    case "resize-tl": {
      const right = original.origX + original.origW;
      const bottom = original.origY + original.origH;
      const x = clamp(original.origX + dx, 0, right - 5);
      const y = clamp(original.origY + dy, 0, bottom - 5);
      return { x, y, w: right - x, h: bottom - y };
    }
    case "move":
      return {
        x: original.origX + dx,
        y: original.origY + dy,
        w: original.origW,
        h: original.origH,
      };
  }
}

function closestGuide(point: number, targets: number[], axis: GuideAxis): ActiveGuide | null {
  let best: { distance: number; guide: ActiveGuide } | null = null;
  for (const target of targets) {
    const distance = Math.abs(point - target);
    if (distance > SNAP_THRESHOLD) continue;
    if (!best || distance < best.distance) best = { distance, guide: { axis, value: target } };
  }
  return best?.guide ?? null;
}

function snapResizeRect(
  rect: RectPercent,
  mode: DragMode,
  allBlocks: Block[],
  excludeIds: Set<string>,
  gridStep: number | null = null,
): { rect: RectPercent; guides: ActiveGuide[] } {
  const next = { ...rect };
  const guides: ActiveGuide[] = [];
  const xTargets = guideValues(allBlocks, excludeIds, "x", gridStep);
  const yTargets = guideValues(allBlocks, excludeIds, "y", gridStep);
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;

  if (mode === "resize-br" || mode === "resize-tr") {
    const guide = closestGuide(right, xTargets, "x");
    if (guide) {
      next.w = clamp(guide.value - rect.x, 5, 100 - rect.x);
      guides.push(guide);
    }
  }
  if (mode === "resize-bl" || mode === "resize-tl") {
    const guide = closestGuide(rect.x, xTargets, "x");
    if (guide) {
      next.x = clamp(guide.value, 0, right - 5);
      next.w = right - next.x;
      guides.push(guide);
    }
  }
  if (mode === "resize-br" || mode === "resize-bl") {
    const guide = closestGuide(bottom, yTargets, "y");
    if (guide) {
      next.h = clamp(guide.value - rect.y, 5, 100 - rect.y);
      guides.push(guide);
    }
  }
  if (mode === "resize-tr" || mode === "resize-tl") {
    const guide = closestGuide(rect.y, yTargets, "y");
    if (guide) {
      next.y = clamp(guide.value, 0, bottom - 5);
      next.h = bottom - next.y;
      guides.push(guide);
    }
  }

  return { rect: next, guides };
}

const BLOCK_DEFAULTS: Record<Block["type"], { x: number; y: number; w: number; h: number }> = {
  text: { x: 5, y: 5, w: 90, h: 30 },
  image: { x: 10, y: 12, w: 80, h: 70 },
  iframe: { x: 5, y: 5, w: 90, h: 88 },
  shape: { x: 30, y: 30, w: 40, h: 30 },
  line: { x: 20, y: 45, w: 60, h: 10 },
  table: { x: 8, y: 14, w: 84, h: 54 },
  chart: { x: 10, y: 16, w: 80, h: 58 },
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
    case "line":
      return {
        id,
        type,
        color: "#25d366",
        strokeWidth: 3,
        dash: "solid",
        startX: 0,
        startY: 50,
        endX: 100,
        endY: 50,
        endArrow: true,
        ...pos,
      };
    case "table":
      return {
        id,
        type,
        rows: [
          ["Header", "Header", "Header"],
          ["Value", "Value", "Value"],
          ["Value", "Value", "Value"],
        ],
        headerRows: 1,
        fontSize: 14,
        cellPadding: 8,
        borderWidth: 1,
        borderColor: "var(--theme-border)",
        headerBackground: "var(--theme-surface)",
        ...pos,
      };
    case "chart":
      return {
        id,
        type,
        chart: "bar",
        categories: ["A", "B", "C"],
        series: [{ name: "Series", values: [10, 24, 16], color: "#25d366" }],
        showLegend: false,
        showValues: true,
        ...pos,
      };
  }
}

function makeImageBlockFromAsset(asset: ApiDeckAsset): Block {
  const pos = BLOCK_DEFAULTS.image;
  return {
    id: nanoid(),
    type: "image",
    url: `/api/presentations/${asset.presentation_id}/assets/${asset.id}/content`,
    assetId: asset.id,
    alt: asset.name,
    ...pos,
  };
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

const arrangeButton: React.CSSProperties = {
  height: 30,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  background: C.bg,
  color: C.text,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const disabledArrangeButton: React.CSSProperties = {
  ...arrangeButton,
  cursor: "not-allowed",
  opacity: 0.45,
};

const bubbleButtonBase: React.CSSProperties = {
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

function cssUrl(value: string) {
  return `url("${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
}

function slideBackgroundStyle(background: ApiSlideBackground | null): React.CSSProperties {
  if (!background) return {};
  const imageUrl = background.imageUrl ? cssUrl(background.imageUrl) : undefined;
  const layeredGradient =
    background.imageUrl && background.fill?.includes("gradient(")
      ? `${imageUrl}, ${background.fill}`
      : undefined;
  return {
    background: layeredGradient ? undefined : (background.fill ?? "var(--theme-bg)"),
    backgroundImage: layeredGradient ?? imageUrl,
    backgroundPosition: background.imagePosition,
    backgroundRepeat: background.imageUrl ? "no-repeat" : undefined,
    backgroundSize:
      background.imageFit === "fill" ? "100% 100%" : (background.imageFit ?? undefined),
  };
}

function cloneHistoryValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";
type EditableSlideKind = "db" | "html";
type MarkdownFormat = "bold" | "italic" | "h1" | "h2" | "quote" | "bullets";
type BlockArrangeAction =
  | "align-left"
  | "align-center"
  | "align-right"
  | "align-top"
  | "align-middle"
  | "align-bottom"
  | "fit-width"
  | "fit-height"
  | "fit-slide";

type MultiBlockArrangeAction =
  | "align-left"
  | "align-center"
  | "align-right"
  | "align-top"
  | "align-middle"
  | "align-bottom"
  | "distribute-horizontal"
  | "distribute-vertical"
  | "match-width"
  | "match-height"
  | "match-size";
type BlockClipboard = { blocks: Block[] };
type BlockFormatClipboard = { patch: Partial<Block>; sourceType: Block["type"] };
const BLOCK_ANIMATION_PRESETS: Array<{ label: string; value: ManualBlockAnimationPreset }> = [
  { label: "Fade in", value: "fade-in" },
  { label: "Rise", value: "rise" },
  { label: "Scale in", value: "scale-in" },
  { label: "Slide left", value: "slide-left" },
  { label: "Slide right", value: "slide-right" },
  { label: "Wipe right", value: "wipe-right" },
  { label: "Pulse", value: "pulse" },
];
type SlideHistorySnapshot = {
  background: ApiSlideBackground | null;
  blocks: Block[];
  notes: string;
  title: string;
  transition: ApiSlideTransition | null;
};

type MarkdownFormatResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

function getBlockRect(block: Block) {
  const defaults = BLOCK_DEFAULTS[block.type];
  return {
    x: block.x ?? defaults.x,
    y: block.y ?? defaults.y,
    w: block.w ?? defaults.w,
    h: block.h ?? defaults.h,
  };
}

function arrangeBlock(block: Block, action: BlockArrangeAction): Block {
  const rect = getBlockRect(block);
  const maxX = Math.max(0, 100 - rect.w);
  const maxY = Math.max(0, 100 - rect.h);

  switch (action) {
    case "align-left":
      return { ...block, x: 0 };
    case "align-center":
      return { ...block, x: clamp((100 - rect.w) / 2, 0, maxX) };
    case "align-right":
      return { ...block, x: maxX };
    case "align-top":
      return { ...block, y: 0 };
    case "align-middle":
      return { ...block, y: clamp((100 - rect.h) / 2, 0, maxY) };
    case "align-bottom":
      return { ...block, y: maxY };
    case "fit-width":
      return { ...block, x: 5, w: 90 };
    case "fit-height":
      return { ...block, y: 5, h: 90 };
    case "fit-slide":
      return { ...block, x: 5, y: 5, w: 90, h: 90 };
  }
}

function getSelectionBounds(blocks: Block[]) {
  const rects = blocks.map((block) => ({ id: block.id, ...getBlockRect(block) }));
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.w));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.h));
  return { left, top, right, bottom, width: right - left, height: bottom - top, rects };
}

function arrangeSelectedBlocks(
  blocks: Block[],
  ids: string[],
  action: MultiBlockArrangeAction,
): Block[] {
  const selected = new Set(ids);
  const selectedBlocks = blocks.filter((block) => selected.has(block.id) && !block.locked);
  if (selectedBlocks.length < 2) return blocks;

  const bounds = getSelectionBounds(selectedBlocks);
  const patches = new Map<string, { x?: number; y?: number }>();

  if (action === "distribute-horizontal" || action === "distribute-vertical") {
    if (selectedBlocks.length < 3) return blocks;
    const axis = action === "distribute-horizontal" ? "x" : "y";
    const size = action === "distribute-horizontal" ? "w" : "h";
    const sorted = [...bounds.rects].sort(
      (a, b) => a[axis] + a[size] / 2 - (b[axis] + b[size] / 2),
    );
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const start = first[axis] + first[size] / 2;
    const end = last[axis] + last[size] / 2;
    const step = (end - start) / (sorted.length - 1);
    sorted.forEach((rect, index) => {
      const center = start + step * index;
      const next = clamp(center - rect[size] / 2, 0, 100 - rect[size]);
      patches.set(rect.id, axis === "x" ? { x: next } : { y: next });
    });
    return blocks.map((block) => ({ ...block, ...patches.get(block.id) }) as Block);
  }

  if (action === "match-width" || action === "match-height" || action === "match-size") {
    const reference = selectedBlocks.find((block) => block.id === ids[0]) ?? selectedBlocks[0];
    const referenceRect = getBlockRect(reference);
    return blocks.map((block) => {
      if (!selected.has(block.id) || block.locked) return block;
      const patch = {
        ...(action === "match-width" || action === "match-size" ? { w: referenceRect.w } : {}),
        ...(action === "match-height" || action === "match-size" ? { h: referenceRect.h } : {}),
      };
      return { ...block, ...patch } as Block;
    });
  }

  for (const rect of bounds.rects) {
    switch (action) {
      case "align-left":
        patches.set(rect.id, { x: bounds.left });
        break;
      case "align-center":
        patches.set(rect.id, { x: bounds.left + (bounds.width - rect.w) / 2 });
        break;
      case "align-right":
        patches.set(rect.id, { x: bounds.right - rect.w });
        break;
      case "align-top":
        patches.set(rect.id, { y: bounds.top });
        break;
      case "align-middle":
        patches.set(rect.id, { y: bounds.top + (bounds.height - rect.h) / 2 });
        break;
      case "align-bottom":
        patches.set(rect.id, { y: bounds.bottom - rect.h });
        break;
    }
  }

  return blocks.map((block) => ({ ...block, ...patches.get(block.id) }) as Block);
}

function copyBlockFormat(block: Block): BlockFormatClipboard {
  const common: Partial<Block> = {
    animation: block.animation ? { ...block.animation } : undefined,
    flipX: block.flipX,
    flipY: block.flipY,
    opacity: block.opacity,
    rotation: block.rotation,
    shadow: block.shadow,
  };

  switch (block.type) {
    case "text":
      return {
        sourceType: block.type,
        patch: {
          ...common,
          align: block.align,
          background: block.background,
          color: block.color,
          fontFamily: block.fontFamily,
          fontSize: block.fontSize,
          fontStyle: block.fontStyle,
          fontWeight: block.fontWeight,
          lineHeight: block.lineHeight,
          padding: block.padding,
        } as Partial<Block>,
      };
    case "image":
      return {
        sourceType: block.type,
        patch: {
          ...common,
          borderRadius: block.borderRadius,
          cropH: block.cropH,
          cropW: block.cropW,
          cropX: block.cropX,
          cropY: block.cropY,
          objectFit: block.objectFit,
          objectPosition: block.objectPosition,
        } as Partial<Block>,
      };
    case "iframe":
      return {
        sourceType: block.type,
        patch: common,
      };
    case "shape":
      return {
        sourceType: block.type,
        patch: {
          ...common,
          borderColor: block.borderColor,
          borderWidth: block.borderWidth,
          color: block.color,
          height: block.height,
          labelFontSize: block.labelFontSize,
          labelFontWeight: block.labelFontWeight,
          shape: block.shape,
          textColor: block.textColor,
          width: block.width,
        } as Partial<Block>,
      };
    case "line":
      return {
        sourceType: block.type,
        patch: {
          ...common,
          connector: block.connector,
          color: block.color,
          dash: block.dash,
          endArrow: block.endArrow,
          startArrow: block.startArrow,
          strokeWidth: block.strokeWidth,
        } as Partial<Block>,
      };
    case "table":
      return {
        sourceType: block.type,
        patch: {
          ...common,
          align: block.align,
          background: block.background,
          borderColor: block.borderColor,
          borderWidth: block.borderWidth,
          cellPadding: block.cellPadding,
          color: block.color,
          fontSize: block.fontSize,
          headerBackground: block.headerBackground,
          headerRows: block.headerRows,
        } as Partial<Block>,
      };
    case "chart":
      return {
        sourceType: block.type,
        patch: {
          ...common,
          axisColor: block.axisColor,
          background: block.background,
          labelColor: block.labelColor,
          series: block.series.map((series) => ({ ...series, values: [...series.values] })),
          showLegend: block.showLegend,
          showValues: block.showValues,
        } as Partial<Block>,
      };
  }
}

function applyBlockFormat(block: Block, clipboard: BlockFormatClipboard): Block {
  const common = {
    animation: clipboard.patch.animation,
    flipX: clipboard.patch.flipX,
    flipY: clipboard.patch.flipY,
    opacity: clipboard.patch.opacity,
    rotation: clipboard.patch.rotation,
    shadow: clipboard.patch.shadow,
  };
  if (block.type !== clipboard.sourceType) return { ...block, ...common } as Block;
  return { ...block, ...clipboard.patch } as Block;
}

function blockTransform(block: Block) {
  const parts = [
    block.flipX ? "scaleX(-1)" : null,
    block.flipY ? "scaleY(-1)" : null,
    block.rotation ? `rotate(${block.rotation}deg)` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function getBlockLayerName(block: Block) {
  if (block.displayName?.trim()) return block.displayName.trim();
  if (block.type === "text") return block.markdown.slice(0, 22) || "(empty)";
  if (block.type === "image") return block.alt?.trim() || block.url.slice(0, 22) || "(no url)";
  if (block.type === "iframe") return block.url.slice(0, 22) || "(no url)";
  if (block.type === "line") return `${block.dash ?? "solid"} ${block.color}`;
  if (block.type === "table") {
    const columns = Math.max(0, ...block.rows.map((row) => row.length));
    return `${block.rows.length}x${columns}`;
  }
  if (block.type === "chart")
    return block.title?.trim() || `${block.chart} ${block.categories.length}`;
  return block.label?.trim() || `${block.shape} ${block.color}`;
}

export function SlideEditorPage() {
  const { id: pidStr, sid: sidStr } = useParams<{ id: string; sid: string }>();
  const navigate = useNavigate();
  const pid = Number(pidStr);
  const sid = Number(sidStr);
  const validRoute = Boolean(pidStr && sidStr && !isNaN(pid) && !isNaN(sid));

  const [title, setTitle] = useState("Untitled");
  const [presName, setPresName] = useState("");
  const [slideKind, setSlideKind] = useState<EditableSlideKind>("db");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [html, setHtml] = useState("");
  const [notes, setNotes] = useState("");
  const [transition, setTransition] = useState<ApiSlideTransition | null>(null);
  const [background, setBackground] = useState<ApiSlideBackground | null>(null);
  const [theme, setTheme] = useState<ThemeName>("dark-green");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [blockClipboard, setBlockClipboard] = useState<BlockClipboard | null>(null);
  const [formatClipboard, setFormatClipboard] = useState<BlockFormatClipboard | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [activeGuides, setActiveGuides] = useState<ActiveGuide[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridStep, setGridStep] = useState(5);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragHistorySnapshotRef = useRef<SlideHistorySnapshot | null>(null);
  const pasteOffsetRef = useRef(1);
  const hasLoadedRef = useRef(false);
  const undoStackRef = useRef<SlideHistorySnapshot[]>([]);
  const redoStackRef = useRef<SlideHistorySnapshot[]>([]);
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
    {
      pid: number;
      sid: number;
      title?: string;
      blocks?: unknown[];
      html?: string;
      notes?: string;
      transition?: ApiSlideTransition | null;
      background?: ApiSlideBackground | null;
    }
  >("update-slide", { method: "PUT" });

  // Current values ref (for keyboard handler)
  const blocksRef = useRef(blocks);
  const htmlRef = useRef(html);
  const transitionRef = useRef(transition);
  const backgroundRef = useRef(background);
  const selectedIdsRef = useRef(selectedIds);
  const slideKindRef = useRef(slideKind);
  const titleRef = useRef(title);
  const notesRef = useRef(notes);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  useEffect(() => {
    htmlRef.current = html;
  }, [html]);
  useEffect(() => {
    transitionRef.current = transition;
  }, [transition]);
  useEffect(() => {
    backgroundRef.current = background;
  }, [background]);
  useEffect(() => {
    slideKindRef.current = slideKind;
  }, [slideKind]);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);
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
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
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
    if (slide.kind === "code") {
      setLoadError("Code-backed slides cannot be edited here");
      setLoading(false);
      return;
    }

    setPresName(pres.name);
    setSlideKind(slide.kind);
    setTitle(slide.title);
    setBlocks(slide.blocks);
    setHtml(slide.html);
    setNotes(slide.notes ?? "");
    setTransition(slide.transition);
    setBackground(slide.background);
    setTheme(pres.theme);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
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
      const currentBlocks = blocksRef.current;
      const draggedIds = new Set(drag.originals.map((entry) => entry.id));
      const snapEnabled = !e.altKey;
      const activeGridStep = snapToGrid ? gridStep : null;
      let moveDelta = { x: dx, y: dy };
      let resizeRect: RectPercent | null = null;
      let guides: ActiveGuide[] = [];

      if (snapEnabled && drag.mode === "move") {
        const nextGroupRect = rectBounds(
          drag.originals.map((entry) => ({
            x: entry.origX + dx,
            y: entry.origY + dy,
            w: entry.origW,
            h: entry.origH,
          })),
        );
        const snapped = snapRect(nextGroupRect, currentBlocks, draggedIds, activeGridStep);
        moveDelta = {
          x: dx + (snapped.rect.x - nextGroupRect.x),
          y: dy + (snapped.rect.y - nextGroupRect.y),
        };
        guides = snapped.guides;
      }

      if (snapEnabled && drag.mode !== "move") {
        const original = drag.originals.find((entry) => entry.id === drag.blockId);
        if (original) {
          const rawRect = resizeRectForDrag(original, drag.mode, dx, dy);
          const snapped = snapResizeRect(
            rawRect,
            drag.mode,
            currentBlocks,
            draggedIds,
            activeGridStep,
          );
          resizeRect = snapped.rect;
          guides = snapped.guides;
        }
      }

      setActiveGuides(guides);

      setBlocks((prev) =>
        prev.map((b) => {
          const original = drag.originals.find((entry) => entry.id === b.id);
          if (!original) return b;
          const bw = original.origW;
          const bh = original.origH;
          switch (drag.mode) {
            case "move":
              return {
                ...b,
                x: clamp(original.origX + moveDelta.x, 0, 100 - bw),
                y: clamp(original.origY + moveDelta.y, 0, 100 - bh),
              };
            case "resize-br":
              if (b.id !== drag.blockId) return b;
              if (resizeRect) return { ...b, w: resizeRect.w, h: resizeRect.h };
              return {
                ...b,
                w: Math.max(5, original.origW + dx),
                h: Math.max(5, original.origH + dy),
              };
            case "resize-bl":
              if (b.id !== drag.blockId) return b;
              if (resizeRect) return { ...b, x: resizeRect.x, w: resizeRect.w, h: resizeRect.h };
              return {
                ...b,
                x: clamp(original.origX + dx, 0, original.origX + original.origW - 5),
                w: Math.max(5, original.origW - dx),
                h: Math.max(5, original.origH + dy),
              };
            case "resize-tr":
              if (b.id !== drag.blockId) return b;
              if (resizeRect) return { ...b, y: resizeRect.y, w: resizeRect.w, h: resizeRect.h };
              return {
                ...b,
                y: clamp(original.origY + dy, 0, original.origY + original.origH - 5),
                w: Math.max(5, original.origW + dx),
                h: Math.max(5, original.origH - dy),
              };
            case "resize-tl":
              if (b.id !== drag.blockId) return b;
              if (resizeRect)
                return { ...b, x: resizeRect.x, y: resizeRect.y, w: resizeRect.w, h: resizeRect.h };
              return {
                ...b,
                x: clamp(original.origX + dx, 0, original.origX + original.origW - 5),
                y: clamp(original.origY + dy, 0, original.origY + original.origH - 5),
                w: Math.max(5, original.origW - dx),
                h: Math.max(5, original.origH - dy),
              };
          }
        }),
      );
    };
    const onUp = () => {
      const dragSnapshot = dragHistorySnapshotRef.current;
      const currentSnapshot: SlideHistorySnapshot = {
        background: cloneHistoryValue(backgroundRef.current),
        blocks: cloneHistoryValue(blocksRef.current),
        notes: notesRef.current,
        title: titleRef.current,
        transition: cloneHistoryValue(transitionRef.current),
      };
      if (dragSnapshot && JSON.stringify(dragSnapshot) !== JSON.stringify(currentSnapshot)) {
        const last = undoStackRef.current[undoStackRef.current.length - 1];
        if (!last || JSON.stringify(last) !== JSON.stringify(dragSnapshot)) {
          undoStackRef.current = [...undoStackRef.current.slice(-99), dragSnapshot];
          redoStackRef.current = [];
          setCanUndo(true);
          setCanRedo(false);
        }
      }
      dragHistorySnapshotRef.current = null;
      dragRef.current = null;
      setActiveGuides([]);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gridStep, snapToGrid]);

  // Auto-save: trigger on content/title/notes changes after initial load
  useEffect(() => {
    if (!hasLoadedRef.current || loading) return;
    setSaveStatus("idle");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      setSaveError(null);
      try {
        const content =
          slideKindRef.current === "html"
            ? { html: htmlRef.current }
            : { blocks: blocksRef.current };
        await updateSlide.mutateAsync({
          pid,
          sid,
          title: titleRef.current,
          notes: notesRef.current,
          transition: transitionRef.current,
          background: backgroundRef.current,
          ...content,
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
  }, [background, blocks, html, title, notes, transition, pid, sid, loading]);

  const saveAndExit = useCallback(async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const content =
        slideKindRef.current === "html" ? { html: htmlRef.current } : { blocks: blocksRef.current };
      await updateSlide.mutateAsync({
        pid,
        sid,
        title: titleRef.current,
        notes: notesRef.current,
        transition: transitionRef.current,
        background: backgroundRef.current,
        ...content,
      });
      navigate(`/p/${pid}`);
    } catch (err) {
      setSaveStatus("error");
      setSaveError(getErrorMessage(err));
    }
  }, [pid, sid, navigate, updateSlide]);

  const updateHistoryFlags = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const currentHistorySnapshot = useCallback(
    (): SlideHistorySnapshot => ({
      background: cloneHistoryValue(backgroundRef.current),
      blocks: cloneHistoryValue(blocksRef.current),
      notes: notesRef.current,
      title: titleRef.current,
      transition: cloneHistoryValue(transitionRef.current),
    }),
    [],
  );

  const applyHistorySnapshot = useCallback((snapshot: SlideHistorySnapshot) => {
    const nextBackground = cloneHistoryValue(snapshot.background);
    const nextBlocks = cloneHistoryValue(snapshot.blocks);
    const nextTransition = cloneHistoryValue(snapshot.transition);

    backgroundRef.current = nextBackground;
    blocksRef.current = nextBlocks;
    notesRef.current = snapshot.notes;
    titleRef.current = snapshot.title;
    transitionRef.current = nextTransition;

    setBackground(nextBackground);
    setBlocks(nextBlocks);
    setNotes(snapshot.notes);
    setTitle(snapshot.title);
    setTransition(nextTransition);
    setEditingTextId(null);
  }, []);

  const recordHistory = useCallback(() => {
    if (!hasLoadedRef.current || slideKindRef.current === "html") return;
    const snapshot = currentHistorySnapshot();
    const last = undoStackRef.current[undoStackRef.current.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(snapshot)) return;
    undoStackRef.current = [...undoStackRef.current.slice(-99), snapshot];
    redoStackRef.current = [];
    updateHistoryFlags();
  }, [currentHistorySnapshot, updateHistoryFlags]);

  const undoSlideEdit = useCallback(() => {
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) return;
    redoStackRef.current = [...redoStackRef.current, currentHistorySnapshot()];
    applyHistorySnapshot(snapshot);
    setSelectedId(null);
    setSelectedIds([]);
    updateHistoryFlags();
  }, [applyHistorySnapshot, currentHistorySnapshot, updateHistoryFlags]);

  const redoSlideEdit = useCallback(() => {
    const snapshot = redoStackRef.current.pop();
    if (!snapshot) return;
    undoStackRef.current = [...undoStackRef.current, currentHistorySnapshot()];
    applyHistorySnapshot(snapshot);
    setSelectedId(null);
    setSelectedIds([]);
    updateHistoryFlags();
  }, [applyHistorySnapshot, currentHistorySnapshot, updateHistoryFlags]);

  const updateSlideTitle = useCallback(
    (value: string) => {
      recordHistory();
      titleRef.current = value;
      setTitle(value);
    },
    [recordHistory],
  );

  const updateSlideNotes = useCallback(
    (value: string) => {
      recordHistory();
      notesRef.current = value;
      setNotes(value);
    },
    [recordHistory],
  );

  const updateSlideTransition = useCallback(
    (value: ApiSlideTransition | null) => {
      recordHistory();
      transitionRef.current = value;
      setTransition(value);
    },
    [recordHistory],
  );

  const updateSlideBackground = useCallback(
    (value: ApiSlideBackground | null) => {
      recordHistory();
      backgroundRef.current = value;
      setBackground(value);
    },
    [recordHistory],
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedIds([]);
    setEditingTextId(null);
  }, []);

  const selectOnlyBlock = useCallback((id: string) => {
    const block = blocksRef.current.find((entry) => entry.id === id);
    const groupId = block?.groupId;
    const ids = groupId
      ? blocksRef.current.filter((entry) => entry.groupId === groupId).map((entry) => entry.id)
      : [id];
    setSelectedId(id);
    setSelectedIds(ids);
  }, []);

  const toggleBlockSelection = useCallback((id: string) => {
    setEditingTextId(null);
    const block = blocksRef.current.find((entry) => entry.id === id);
    const idsToToggle = block?.groupId
      ? blocksRef.current
          .filter((entry) => entry.groupId === block.groupId)
          .map((entry) => entry.id)
      : [id];
    setSelectedIds((prev) => {
      const removing = idsToToggle.every((entry) => prev.includes(entry));
      const next = removing
        ? prev.filter((entry) => !idsToToggle.includes(entry))
        : [...prev, ...idsToToggle.filter((entry) => !prev.includes(entry))];
      setSelectedId(next[next.length - 1] ?? null);
      return next;
    });
  }, []);

  const startDrag = (e: React.PointerEvent, block: Block, mode: DragMode = "move") => {
    e.stopPropagation();
    if (mode === "move" && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      toggleBlockSelection(block.id);
      dragRef.current = null;
      setActiveGuides([]);
      return;
    }
    const groupedIds = block.groupId
      ? blocksRef.current
          .filter((entry) => entry.groupId === block.groupId)
          .map((entry) => entry.id)
      : [block.id];
    const selectedSet =
      mode === "move" &&
      selectedIdsRef.current.includes(block.id) &&
      selectedIdsRef.current.length > 1
        ? selectedIdsRef.current
        : groupedIds;
    setSelectedId(block.id);
    setSelectedIds(selectedSet);
    if (block.locked) {
      dragRef.current = null;
      setActiveGuides([]);
      return;
    }
    const originals = blocksRef.current
      .filter((entry) => selectedSet.includes(entry.id) && !entry.locked)
      .map((entry) => ({
        id: entry.id,
        origX: entry.x ?? BLOCK_DEFAULTS[entry.type].x,
        origY: entry.y ?? BLOCK_DEFAULTS[entry.type].y,
        origW: entry.w ?? BLOCK_DEFAULTS[entry.type].w,
        origH: entry.h ?? BLOCK_DEFAULTS[entry.type].h,
      }));
    dragHistorySnapshotRef.current = originals.length > 0 ? currentHistorySnapshot() : null;
    dragRef.current = {
      mode,
      blockId: block.id,
      startCx: e.clientX,
      startCy: e.clientY,
      originals,
    };
    setActiveGuides([]);
  };

  const addBlock = useCallback(
    (type: Block["type"]) => {
      recordHistory();
      const b = makeBlock(type);
      setBlocks((prev) => [...prev, b]);
      setSelectedId(b.id);
      setSelectedIds([b.id]);
    },
    [recordHistory],
  );

  const addBlocks = useCallback(
    (nextBlocks: Block[]) => {
      recordHistory();
      setBlocks((prev) => [...prev, ...nextBlocks]);
      setSelectedId(nextBlocks[0]?.id ?? null);
      setSelectedIds(nextBlocks.map((block) => block.id));
    },
    [recordHistory],
  );

  const insertAssetBlock = useCallback(
    (asset: ApiDeckAsset) => {
      recordHistory();
      const block = makeImageBlockFromAsset(asset);
      setBlocks((prev) => [...prev, block]);
      setSelectedId(block.id);
      setSelectedIds([block.id]);
      setEditingTextId(null);
    },
    [recordHistory],
  );

  const deleteBlock = useCallback(
    (id: string) => {
      const block = blocksRef.current.find((entry) => entry.id === id);
      const idsToDelete = new Set(
        block?.groupId
          ? blocksRef.current
              .filter((entry) => entry.groupId === block.groupId)
              .filter((entry) => !entry.locked)
              .map((entry) => entry.id)
          : block && !block.locked
            ? [id]
            : [],
      );
      if (idsToDelete.size === 0) return;
      recordHistory();
      setBlocks((prev) => prev.filter((b) => !idsToDelete.has(b.id)));
      setSelectedId((s) => (s && idsToDelete.has(s) ? null : s));
      setSelectedIds((ids) => ids.filter((entry) => !idsToDelete.has(entry)));
      setEditingTextId((s) => (s && idsToDelete.has(s) ? null : s));
    },
    [recordHistory],
  );

  const deleteSelectedBlocks = useCallback(
    (ids: string[]) => {
      const selected = new Set(ids);
      const lockedIds = new Set(
        blocksRef.current
          .filter((block) => selected.has(block.id) && block.locked)
          .map((block) => block.id),
      );
      if (ids.some((id) => !lockedIds.has(id))) recordHistory();
      setBlocks((prev) => prev.filter((block) => !selected.has(block.id) || block.locked));
      if (lockedIds.size > 0) {
        const remaining = ids.filter((id) => lockedIds.has(id));
        setSelectedIds(remaining);
        setSelectedId(remaining[remaining.length - 1] ?? null);
      } else {
        clearSelection();
      }
    },
    [clearSelection, recordHistory],
  );

  const updateBlock = useCallback(
    <K extends Block>(id: string, patch: Partial<K>) => {
      recordHistory();
      setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
    },
    [recordHistory],
  );

  const copySelectedBlockFormat = useCallback((block: Block) => {
    setFormatClipboard(copyBlockFormat(block));
  }, []);

  const pasteSelectedBlockFormat = useCallback(
    (id: string) => {
      if (!formatClipboard) return;
      recordHistory();
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === id && !block.locked && formatClipboard
            ? applyBlockFormat(block, formatClipboard)
            : block,
        ),
      );
    },
    [formatClipboard, recordHistory],
  );

  const arrangeSelectedBlock = useCallback(
    (action: BlockArrangeAction) => {
      recordHistory();
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === selectedId && !block.locked ? arrangeBlock(block, action) : block,
        ),
      );
    },
    [recordHistory, selectedId],
  );

  const arrangeSelectedGroup = useCallback(
    (action: MultiBlockArrangeAction, ids: string[]) => {
      recordHistory();
      setBlocks((prev) => arrangeSelectedBlocks(prev, ids, action));
    },
    [recordHistory],
  );

  const groupSelectedBlocks = useCallback(
    (ids: string[]) => {
      if (ids.length < 2) return;
      recordHistory();
      const nextGroupId = `group-${nanoid(8)}`;
      setBlocks((prev) =>
        prev.map((block) =>
          ids.includes(block.id)
            ? ({ ...block, groupId: nextGroupId, groupName: "Group" } as Block)
            : block,
        ),
      );
    },
    [recordHistory],
  );

  const ungroupSelectedBlocks = useCallback(
    (ids: string[]) => {
      recordHistory();
      const selected = new Set(ids);
      setBlocks((prev) =>
        prev.map((block) =>
          selected.has(block.id)
            ? ({ ...block, groupId: undefined, groupName: undefined } as Block)
            : block,
        ),
      );
    },
    [recordHistory],
  );

  const duplicateBlocks = useCallback(
    (ids: string[]) => {
      const selected = new Set(ids);
      const groupIdCopies = new Map<string, string>();
      const copies = blocksRef.current
        .filter((block) => selected.has(block.id) && !block.locked)
        .map((source) => {
          const nextGroupId = source.groupId
            ? (groupIdCopies.get(source.groupId) ?? `group-${nanoid(8)}`)
            : undefined;
          if (source.groupId && nextGroupId) groupIdCopies.set(source.groupId, nextGroupId);
          return {
            sourceId: source.id,
            copy: {
              ...source,
              id: nanoid(),
              locked: undefined,
              groupId: nextGroupId,
              x: clamp((source.x ?? BLOCK_DEFAULTS[source.type].x) + 3, 0, 100 - (source.w ?? 20)),
              y: clamp((source.y ?? BLOCK_DEFAULTS[source.type].y) + 3, 0, 100 - (source.h ?? 20)),
            } as Block,
          };
        });
      if (copies.length === 0) return;
      recordHistory();
      const copiesBySource = new Map(copies.map((entry) => [entry.sourceId, entry.copy]));
      setBlocks((prev) => {
        const next: Block[] = [];
        for (const block of prev) {
          next.push(block);
          const copy = copiesBySource.get(block.id);
          if (copy) next.push(copy);
        }
        return next;
      });
      const nextIds = copies.map((entry) => entry.copy.id);
      setSelectedIds(nextIds);
      setSelectedId(nextIds[nextIds.length - 1] ?? null);
      setEditingTextId(null);
    },
    [recordHistory],
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      duplicateBlocks([id]);
    },
    [duplicateBlocks],
  );

  const copyBlocksToClipboard = useCallback((ids: string[]) => {
    const selected = new Set(ids);
    const copied = blocksRef.current.filter((block) => selected.has(block.id));
    if (copied.length === 0) return;
    setBlockClipboard({ blocks: cloneHistoryValue(copied) });
    pasteOffsetRef.current = 1;
  }, []);

  const pasteBlocksFromClipboard = useCallback(() => {
    const sourceBlocks = blockClipboard?.blocks ?? [];
    if (sourceBlocks.length === 0) return;
    const offset = pasteOffsetRef.current * 3;
    const groupIdCopies = new Map<string, string>();
    const pasted = sourceBlocks.map((source) => {
      const defaults = BLOCK_DEFAULTS[source.type];
      const w = source.w ?? defaults.w;
      const h = source.h ?? defaults.h;
      const nextGroupId = source.groupId
        ? (groupIdCopies.get(source.groupId) ?? `group-${nanoid(8)}`)
        : undefined;
      if (source.groupId && nextGroupId) groupIdCopies.set(source.groupId, nextGroupId);
      return {
        ...source,
        id: nanoid(),
        locked: undefined,
        groupId: nextGroupId,
        x: clamp((source.x ?? defaults.x) + offset, 0, 100 - w),
        y: clamp((source.y ?? defaults.y) + offset, 0, 100 - h),
      } as Block;
    });
    recordHistory();
    pasteOffsetRef.current += 1;
    setBlocks((prev) => [...prev, ...pasted]);
    setSelectedIds(pasted.map((block) => block.id));
    setSelectedId(pasted[pasted.length - 1]?.id ?? null);
    setEditingTextId(null);
  }, [blockClipboard, recordHistory]);

  const cutBlocksToClipboard = useCallback(
    (ids: string[]) => {
      const selected = new Set(ids);
      const cut = blocksRef.current.filter((block) => selected.has(block.id) && !block.locked);
      if (cut.length === 0) return;
      setBlockClipboard({ blocks: cloneHistoryValue(cut) });
      pasteOffsetRef.current = 1;
      recordHistory();
      setBlocks((prev) => prev.filter((block) => !selected.has(block.id) || block.locked));
      setSelectedIds((prev) => prev.filter((id) => !cut.some((block) => block.id === id)));
      setSelectedId(null);
      setEditingTextId(null);
    },
    [recordHistory],
  );

  const nudgeBlocks = useCallback(
    (ids: string[], dx: number, dy: number) => {
      recordHistory();
      const selected = new Set(ids);
      setBlocks((prev) =>
        prev.map((block) => {
          if (!selected.has(block.id)) return block;
          if (block.locked) return block;
          const defaults = BLOCK_DEFAULTS[block.type];
          const w = block.w ?? defaults.w;
          const h = block.h ?? defaults.h;
          return {
            ...block,
            x: clamp((block.x ?? defaults.x) + dx, 0, 100 - w),
            y: clamp((block.y ?? defaults.y) + dy, 0, 100 - h),
          };
        }),
      );
    },
    [recordHistory],
  );

  const moveBlockLayer = useCallback(
    (id: string, direction: "forward" | "back") => {
      recordHistory();
      setBlocks((prev) => {
        const index = prev.findIndex((block) => block.id === id);
        if (index < 0) return prev;
        if (prev[index]?.locked) return prev;
        const nextIndex = direction === "forward" ? index + 1 : index - 1;
        if (nextIndex < 0 || nextIndex >= prev.length) return prev;
        const next = [...prev];
        [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
        return next;
      });
    },
    [recordHistory],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const editingField = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void saveAndExit();
        return;
      }
      if (!editingField && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redoSlideEdit();
        else undoSlideEdit();
        return;
      }
      if (!editingField && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redoSlideEdit();
        return;
      }
      if (editingField) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
        if (selectedIdsRef.current.length > 0) {
          e.preventDefault();
          copyBlocksToClipboard(selectedIdsRef.current);
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "x") {
        if (selectedIdsRef.current.length > 0) {
          e.preventDefault();
          cutBlocksToClipboard(selectedIdsRef.current);
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
        if (blockClipboard) {
          e.preventDefault();
          pasteBlocksFromClipboard();
        }
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIdsRef.current.length > 0) {
        e.preventDefault();
        deleteSelectedBlocks(selectedIdsRef.current);
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "d" &&
        selectedIdsRef.current.length
      ) {
        e.preventDefault();
        duplicateBlocks(selectedIdsRef.current);
        return;
      }
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) &&
        selectedIdsRef.current.length
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        nudgeBlocks(selectedIdsRef.current, dx, dy);
        return;
      }
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    clearSelection,
    blockClipboard,
    copyBlocksToClipboard,
    cutBlocksToClipboard,
    deleteSelectedBlocks,
    duplicateBlocks,
    nudgeBlocks,
    pasteBlocksFromClipboard,
    redoSlideEdit,
    saveAndExit,
    undoSlideEdit,
  ]);

  const selectedBlock =
    selectedIds.length === 1 ? (blocks.find((b) => b.id === selectedIds[0]) ?? null) : null;

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
          onChange={(e) => updateSlideTitle(e.target.value)}
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
            type="button"
            onClick={undoSlideEdit}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            style={{
              ...arrangeButton,
              width: 34,
              height: 32,
              cursor: canUndo ? "pointer" : "not-allowed",
              opacity: canUndo ? 1 : 0.45,
            }}
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            onClick={redoSlideEdit}
            disabled={!canRedo}
            title="Redo (⇧⌘Z)"
            style={{
              ...arrangeButton,
              width: 34,
              height: 32,
              cursor: canRedo ? "pointer" : "not-allowed",
              opacity: canRedo ? 1 : 0.45,
            }}
          >
            <Redo2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => copyBlocksToClipboard(selectedIds)}
            disabled={selectedIds.length === 0}
            title="Copy blocks (⌘C)"
            style={{
              ...arrangeButton,
              width: 34,
              height: 32,
              cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
              opacity: selectedIds.length > 0 ? 1 : 0.45,
            }}
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            onClick={() => cutBlocksToClipboard(selectedIds)}
            disabled={selectedIds.length === 0}
            title="Cut blocks (⌘X)"
            style={{
              ...arrangeButton,
              width: 34,
              height: 32,
              cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
              opacity: selectedIds.length > 0 ? 1 : 0.45,
            }}
          >
            <Scissors size={14} />
          </button>
          <button
            type="button"
            onClick={pasteBlocksFromClipboard}
            disabled={!blockClipboard}
            title="Paste blocks (⌘V)"
            style={{
              ...arrangeButton,
              width: 34,
              height: 32,
              cursor: blockClipboard ? "pointer" : "not-allowed",
              opacity: blockClipboard ? 1 : 0.45,
            }}
          >
            <ClipboardPaste size={14} />
          </button>
          <button
            type="button"
            onClick={() => setSnapToGrid((value) => !value)}
            title={snapToGrid ? "Disable grid snap" : "Enable grid snap"}
            style={{
              ...arrangeButton,
              width: 34,
              height: 32,
              color: snapToGrid ? C.accent : C.textDim,
              background: snapToGrid ? C.accentSubtle : C.bg,
            }}
          >
            <Grid3X3 size={14} />
          </button>
          <input
            type="number"
            min={1}
            max={25}
            step={1}
            value={gridStep}
            disabled={!snapToGrid}
            onChange={(e) => {
              const next = Number(e.target.value);
              setGridStep(clamp(Number.isFinite(next) ? next : 5, 1, 25));
            }}
            title="Grid step (%)"
            style={{
              ...inp,
              width: 48,
              height: 32,
              padding: "4px 6px",
              opacity: snapToGrid ? 1 : 0.45,
            }}
          />
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

      {slideKind === "html" ? (
        <HtmlSlideSourceEditor
          html={html}
          notes={notes}
          transition={transition}
          title={title}
          onHtml={setHtml}
          onNotes={setNotes}
          onTransition={setTransition}
        />
      ) : (
        <>
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
              onClick={clearSelection}
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
                  ...slideBackgroundStyle(background),
                  overflow: "hidden",
                  boxShadow: "0 8px 48px rgba(0,0,0,0.7)",
                }}
              >
                {snapToGrid && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      backgroundImage:
                        "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
                      backgroundSize: `${gridStep}% ${gridStep}%`,
                    }}
                  />
                )}

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

                {activeGuides.map((guide, index) => (
                  <div
                    key={`${guide.axis}-${guide.value}-${index}`}
                    style={{
                      position: "absolute",
                      pointerEvents: "none",
                      zIndex: 30,
                      background: "var(--theme-accent, #25d366)",
                      boxShadow: "0 0 0 1px rgba(13,15,14,0.45)",
                      opacity: 0.85,
                      ...(guide.axis === "x"
                        ? {
                            left: `${guide.value}%`,
                            top: 0,
                            width: 1,
                            height: "100%",
                          }
                        : {
                            left: 0,
                            top: `${guide.value}%`,
                            width: "100%",
                            height: 1,
                          }),
                    }}
                  />
                ))}

                {blocks.map((block) => {
                  const isSelected = selectedIds.includes(block.id);
                  if (block.hidden && !isSelected) return null;
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
                        if (block.type !== "text" || block.locked) return;
                        e.stopPropagation();
                        selectOnlyBlock(block.id);
                        setEditingTextId(block.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (e.shiftKey || e.metaKey || e.ctrlKey) toggleBlockSelection(block.id);
                        else selectOnlyBlock(block.id);
                      }}
                      style={{
                        position: "absolute",
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${w}%`,
                        height: `${h}%`,
                        cursor: "move",
                        transform: blockTransform(block),
                        opacity: block.hidden ? 0.22 : block.opacity,
                        boxShadow: block.shadow,
                        outline: isSelected
                          ? block.hidden
                            ? "2px dotted var(--theme-accent, #25d366)"
                            : block.locked
                              ? "2px dashed #f6c85f"
                              : "2px solid var(--theme-accent, #25d366)"
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
                            hidden={Boolean(block.hidden)}
                            locked={Boolean(block.locked)}
                            onEditText={() => {
                              if (!block.locked) setEditingTextId(block.id);
                            }}
                            onDuplicate={() => duplicateBlock(block.id)}
                            onBringForward={() => moveBlockLayer(block.id, "forward")}
                            onSendBack={() => moveBlockLayer(block.id, "back")}
                            onDelete={() => deleteBlock(block.id)}
                            onToggleLocked={() =>
                              updateBlock(block.id, { locked: !block.locked } as Partial<Block>)
                            }
                            onToggleHidden={() =>
                              updateBlock(block.id, { hidden: !block.hidden } as Partial<Block>)
                            }
                            editing={isInlineEditing}
                          />
                          {/* Resize handles */}
                          {!block.locked &&
                            (["tl", "tr", "bl", "br"] as const).map((handle) => (
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
                                    handle === "tl" || handle === "br"
                                      ? "nwse-resize"
                                      : "nesw-resize",
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
              <DeckAssetPanel enabled={validRoute} pid={pid} onInsertAsset={insertAssetBlock} />

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
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
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
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button
                          type="button"
                          title="Copy format"
                          onClick={() => copySelectedBlockFormat(selectedBlock)}
                          style={{
                            ...arrangeButton,
                            width: 28,
                            height: 28,
                            color:
                              formatClipboard?.sourceType === selectedBlock.type
                                ? C.accent
                                : C.textDim,
                          }}
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          type="button"
                          title="Paste format"
                          onClick={() => pasteSelectedBlockFormat(selectedBlock.id)}
                          disabled={!formatClipboard || selectedBlock.locked}
                          style={{
                            ...arrangeButton,
                            width: 28,
                            height: 28,
                            cursor:
                              !formatClipboard || selectedBlock.locked ? "not-allowed" : "pointer",
                            opacity: !formatClipboard || selectedBlock.locked ? 0.45 : 1,
                          }}
                        >
                          <ClipboardPaste size={12} />
                        </button>
                        <button
                          onClick={() => deleteBlock(selectedBlock.id)}
                          disabled={selectedBlock.locked}
                          style={{
                            color: "#ff6b6b",
                            background: "none",
                            border: "none",
                            cursor: selectedBlock.locked ? "not-allowed" : "pointer",
                            padding: 4,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            opacity: selectedBlock.locked ? 0.45 : 1,
                          }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>

                    {/* Arrange */}
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
                        Arrange
                      </div>
                      <div
                        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}
                      >
                        <button
                          type="button"
                          aria-label="Align left"
                          title="Align left"
                          onClick={() => arrangeSelectedBlock("align-left")}
                          disabled={selectedBlock.locked}
                          style={selectedBlock.locked ? disabledArrangeButton : arrangeButton}
                        >
                          <AlignHorizontalJustifyStart size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Align center"
                          title="Align center"
                          onClick={() => arrangeSelectedBlock("align-center")}
                          disabled={selectedBlock.locked}
                          style={selectedBlock.locked ? disabledArrangeButton : arrangeButton}
                        >
                          <AlignHorizontalJustifyCenter size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Align right"
                          title="Align right"
                          onClick={() => arrangeSelectedBlock("align-right")}
                          disabled={selectedBlock.locked}
                          style={selectedBlock.locked ? disabledArrangeButton : arrangeButton}
                        >
                          <AlignHorizontalJustifyEnd size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Align top"
                          title="Align top"
                          onClick={() => arrangeSelectedBlock("align-top")}
                          disabled={selectedBlock.locked}
                          style={selectedBlock.locked ? disabledArrangeButton : arrangeButton}
                        >
                          <AlignVerticalJustifyStart size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Align middle"
                          title="Align middle"
                          onClick={() => arrangeSelectedBlock("align-middle")}
                          disabled={selectedBlock.locked}
                          style={selectedBlock.locked ? disabledArrangeButton : arrangeButton}
                        >
                          <AlignVerticalJustifyCenter size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Align bottom"
                          title="Align bottom"
                          onClick={() => arrangeSelectedBlock("align-bottom")}
                          disabled={selectedBlock.locked}
                          style={selectedBlock.locked ? disabledArrangeButton : arrangeButton}
                        >
                          <AlignVerticalJustifyEnd size={14} />
                        </button>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: 6,
                          marginTop: 6,
                        }}
                      >
                        <button
                          type="button"
                          aria-label="Fit width"
                          title="Fit width"
                          onClick={() => arrangeSelectedBlock("fit-width")}
                          disabled={selectedBlock.locked}
                          style={selectedBlock.locked ? disabledArrangeButton : arrangeButton}
                        >
                          <StretchHorizontal size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Fit height"
                          title="Fit height"
                          onClick={() => arrangeSelectedBlock("fit-height")}
                          disabled={selectedBlock.locked}
                          style={selectedBlock.locked ? disabledArrangeButton : arrangeButton}
                        >
                          <StretchVertical size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Fit slide"
                          title="Fit slide"
                          onClick={() => arrangeSelectedBlock("fit-slide")}
                          disabled={selectedBlock.locked}
                          style={selectedBlock.locked ? disabledArrangeButton : arrangeButton}
                        >
                          <Maximize2 size={14} />
                        </button>
                      </div>
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
                          <label
                            key={k}
                            style={{ display: "flex", flexDirection: "column", gap: 3 }}
                          >
                            <span
                              style={{
                                fontSize: 9,
                                color: C.muted,
                                fontFamily: "JetBrains Mono, monospace",
                              }}
                            >
                              {k === "x"
                                ? "Left"
                                : k === "y"
                                  ? "Top"
                                  : k === "w"
                                    ? "Width"
                                    : "Height"}
                            </span>
                            <input
                              type="number"
                              value={
                                Math.round(
                                  (selectedBlock[k] ?? BLOCK_DEFAULTS[selectedBlock.type][k]) * 10,
                                ) / 10
                              }
                              onChange={(e) =>
                                !selectedBlock.locked &&
                                updateBlock(selectedBlock.id, { [k]: Number(e.target.value) })
                              }
                              disabled={selectedBlock.locked}
                              min={0}
                              max={100}
                              step={0.5}
                              style={{
                                ...inp,
                                padding: "4px 8px",
                                opacity: selectedBlock.locked ? 0.55 : 1,
                                cursor: selectedBlock.locked ? "not-allowed" : "text",
                              }}
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <CommonAppearanceEditor
                      block={selectedBlock}
                      onUpdate={(patch) => updateBlock(selectedBlock.id, patch)}
                    />
                    <BlockAnimationEditor
                      block={selectedBlock}
                      onUpdate={(patch) => updateBlock(selectedBlock.id, patch)}
                    />
                    <BlockLinkEditor
                      block={selectedBlock}
                      onUpdate={(patch) => updateBlock(selectedBlock.id, patch)}
                    />

                    {/* Type-specific fields */}
                    {selectedBlock.type === "text" && (
                      <>
                        <TextBlockPropertyEditor
                          block={selectedBlock}
                          onUpdate={(markdown) => updateBlock(selectedBlock.id, { markdown })}
                        />
                        <TextAppearanceEditor
                          block={selectedBlock}
                          onUpdate={(patch) => updateBlock(selectedBlock.id, patch)}
                        />
                      </>
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
                        <ImageAppearanceEditor
                          block={selectedBlock}
                          onUpdate={(patch) => updateBlock(selectedBlock.id, patch)}
                        />
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

                    {selectedBlock.type === "line" && (
                      <LinePropEditor
                        block={selectedBlock}
                        onUpdate={(p) => updateBlock(selectedBlock.id, p)}
                      />
                    )}

                    {selectedBlock.type === "table" && (
                      <TablePropEditor
                        block={selectedBlock}
                        onUpdate={(p) => updateBlock(selectedBlock.id, p)}
                      />
                    )}

                    {selectedBlock.type === "chart" && (
                      <ChartPropEditor
                        block={selectedBlock}
                        onUpdate={(p) => updateBlock(selectedBlock.id, p)}
                      />
                    )}
                  </>
                ) : selectedIds.length > 1 ? (
                  <MultiSelectionPanel
                    count={selectedIds.length}
                    onArrange={(action) => arrangeSelectedGroup(action, selectedIds)}
                    onDelete={() => deleteSelectedBlocks(selectedIds)}
                    onDuplicate={() => duplicateBlocks(selectedIds)}
                    onGroup={() => groupSelectedBlocks(selectedIds)}
                    onUngroup={() => ungroupSelectedBlocks(selectedIds)}
                  />
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

                <SlideBackgroundEditor
                  background={background}
                  onBackground={updateSlideBackground}
                />

                <SlideTransitionEditor
                  transition={transition}
                  onTransition={updateSlideTransition}
                />

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
                    onChange={(e) => updateSlideNotes(e.target.value)}
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
                      onClick={(event) => {
                        if (event.shiftKey || event.metaKey || event.ctrlKey)
                          toggleBlockSelection(b.id);
                        else selectOnlyBlock(b.id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "5px 8px",
                        borderRadius: 7,
                        cursor: "pointer",
                        marginBottom: 2,
                        background: selectedIds.includes(b.id) ? C.accentSubtle : "transparent",
                        border: `1px solid ${selectedIds.includes(b.id) ? C.border : "transparent"}`,
                        opacity: b.hidden ? 0.62 : 1,
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
                        {b.groupId ? " · grp" : ""}
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
                        {getBlockLayerName(b)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateBlock(b.id, { hidden: !b.hidden } as Partial<Block>);
                        }}
                        title={b.hidden ? "Show block" : "Hide block"}
                        style={{
                          color: b.hidden ? C.muted : C.textDim,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 2,
                          display: "flex",
                          flexShrink: 0,
                        }}
                      >
                        {b.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
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
        </>
      )}
    </div>
  );
}

// ─── Canvas block content (WYSIWYG preview) ─────────────────────────────────

const TRANSITION_PRESETS = [
  { value: "default", label: "Default slide" },
  { value: "slide", label: "Slide" },
  { value: "fade", label: "Fade" },
  { value: "scale", label: "Scale" },
  { value: "cover", label: "Cover" },
  { value: "reveal", label: "Reveal" },
  { value: "wipe", label: "Wipe" },
  { value: "flip", label: "Flip" },
  { value: "none", label: "None" },
  { value: "custom", label: "Custom" },
] as const;

const DEFAULT_CUSTOM_ENTER = [
  { opacity: 0, transform: "translate3d(0, 18px, 0) scale(0.98)", filter: "blur(8px)" },
  { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", filter: "blur(0)" },
];

const DEFAULT_CUSTOM_EXIT = [
  { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", filter: "blur(0)" },
  { opacity: 0, transform: "translate3d(0, -18px, 0) scale(1.02)", filter: "blur(8px)" },
];

const CUSTOM_TRANSITION_TEMPLATES = [
  {
    value: "rise-blur",
    label: "Rise blur",
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    enter: DEFAULT_CUSTOM_ENTER,
    exit: DEFAULT_CUSTOM_EXIT,
  },
  {
    value: "zoom-blur",
    label: "Zoom blur",
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    enter: [
      { opacity: 0, transform: "scale(0.86)", filter: "blur(14px)" },
      { opacity: 1, transform: "scale(1)", filter: "blur(0)" },
    ],
    exit: [
      { opacity: 1, transform: "scale(1)", filter: "blur(0)" },
      { opacity: 0, transform: "scale(1.08)", filter: "blur(14px)" },
    ],
  },
  {
    value: "depth-flip",
    label: "Depth flip",
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    enter: [
      { opacity: 0, transform: "perspective(1400px) rotateX(28deg) translate3d(0, 36px, -80px)" },
      { opacity: 1, transform: "perspective(1400px) rotateX(0deg) translate3d(0, 0, 0)" },
    ],
    exit: [
      { opacity: 1, transform: "perspective(1400px) rotateX(0deg) translate3d(0, 0, 0)" },
      { opacity: 0, transform: "perspective(1400px) rotateX(-24deg) translate3d(0, -32px, -80px)" },
    ],
  },
  {
    value: "diagonal-wipe",
    label: "Diagonal wipe",
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    enter: [
      { opacity: 1, clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)" },
      { opacity: 1, clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" },
    ],
    exit: [
      { opacity: 1, clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" },
      { opacity: 1, clipPath: "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)" },
    ],
  },
] as const;

function makePresetTransition(name: string, duration: number): ApiSlideTransition | null {
  if (name === "default") return null;
  if (name === "custom") return makeCustomTransition(duration);
  return {
    engine: "waapi",
    name,
    duration: Math.max(0, Math.min(5000, Math.round(duration))),
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  };
}

function makeCustomTransition(duration: number): ApiSlideTransition {
  return makeCustomTransitionFromTemplate("rise-blur", duration);
}

function makeCustomTransitionFromTemplate(
  value: (typeof CUSTOM_TRANSITION_TEMPLATES)[number]["value"],
  duration: number,
): ApiSlideTransition {
  const template =
    CUSTOM_TRANSITION_TEMPLATES.find((candidate) => candidate.value === value) ??
    CUSTOM_TRANSITION_TEMPLATES[0];

  return {
    engine: "waapi",
    name: "custom",
    duration: Math.max(0, Math.min(5000, Math.round(duration))),
    easing: template.easing,
    enter: { keyframes: template.enter.map((frame) => ({ ...frame })) },
    exit: { keyframes: template.exit.map((frame) => ({ ...frame })) },
  };
}

function updateTransitionPatch(
  transition: ApiSlideTransition | null,
  patch: Partial<ApiSlideTransition>,
) {
  const base = transition ?? makeCustomTransition(350);
  return { ...base, ...patch };
}

function SlideBackgroundEditor({
  background,
  onBackground,
}: {
  background: ApiSlideBackground | null;
  onBackground: (background: ApiSlideBackground | null) => void;
}) {
  const update = (patch: Partial<ApiSlideBackground>) => {
    const next = background ? { ...background, ...patch } : patch;
    const clean: ApiSlideBackground = {};
    if (next.fill?.trim()) clean.fill = next.fill;
    if (next.imageUrl?.trim()) {
      clean.imageUrl = next.imageUrl;
      clean.imageFit = next.imageFit ?? "cover";
      if (next.imagePosition?.trim()) clean.imagePosition = next.imagePosition;
    }
    onBackground(Object.keys(clean).length > 0 ? clean : null);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            color: C.textDim,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Background
        </span>
        <button
          type="button"
          onClick={() => onBackground(null)}
          disabled={!background}
          style={{
            background: "none",
            border: "none",
            color: background ? C.textDim : C.muted,
            cursor: background ? "pointer" : "not-allowed",
            fontSize: 11,
            padding: 2,
          }}
        >
          Clear
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          value={background?.fill ?? ""}
          onChange={(event) => update({ fill: event.target.value })}
          placeholder="#0d0f0e or linear-gradient(...)"
          style={inp}
        />
        <input
          value={background?.imageUrl ?? ""}
          onChange={(event) => update({ imageUrl: event.target.value })}
          placeholder="Image URL or data URL"
          style={inp}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <select
            value={background?.imageFit ?? "cover"}
            onChange={(event) =>
              update({ imageFit: event.target.value as ApiSlideBackground["imageFit"] })
            }
            style={inp}
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </select>
          <input
            value={background?.imagePosition ?? ""}
            onChange={(event) => update({ imagePosition: event.target.value })}
            placeholder="center"
            style={inp}
          />
        </div>
      </div>
    </div>
  );
}

function SlideTransitionEditor({
  transition,
  onTransition,
}: {
  transition: ApiSlideTransition | null;
  onTransition: (transition: ApiSlideTransition | null) => void;
}) {
  const selectedName = transition?.name ?? "default";
  const duration = transition?.duration ?? 350;
  const isCustom = Boolean(transition && selectedName === "custom");
  const customTransition = isCustom ? transition : null;

  return (
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
        Transition
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 92px", gap: 8 }}>
        <select
          value={selectedName}
          onChange={(event) => onTransition(makePresetTransition(event.target.value, duration))}
          style={inp}
        >
          {TRANSITION_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={5000}
          step={50}
          value={duration}
          disabled={selectedName === "default"}
          onChange={(event) => {
            const nextDuration = Number(event.target.value);
            if (!Number.isFinite(nextDuration)) return;
            onTransition(makePresetTransition(selectedName, nextDuration));
          }}
          style={{ ...inp, opacity: selectedName === "default" ? 0.55 : 1 }}
          aria-label="Transition duration"
        />
      </div>
      {transition && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <select
            value={transition.engine ?? "waapi"}
            onChange={(event) =>
              onTransition(
                updateTransitionPatch(transition, {
                  engine: event.target.value as ApiSlideTransition["engine"],
                }),
              )
            }
            style={inp}
            aria-label="Transition engine"
          >
            <option value="waapi">WAAPI</option>
            <option value="css">CSS</option>
            <option value="motion">Motion</option>
            <option value="three">Three</option>
            <option value="custom">Custom</option>
          </select>
          <input
            value={transition.easing ?? ""}
            onChange={(event) =>
              onTransition(updateTransitionPatch(transition, { easing: event.target.value }))
            }
            placeholder="Easing"
            style={inp}
            aria-label="Transition easing"
          />
        </div>
      )}
      <TransitionPreview transition={transition} />
      {customTransition && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <CustomTransitionTemplatePicker
            duration={duration}
            onTransition={(nextTransition) => onTransition(nextTransition)}
          />
          <TransitionKeyframeEditor
            label="Enter keyframes"
            phase={customTransition.enter ?? { keyframes: DEFAULT_CUSTOM_ENTER }}
            onPhase={(enter) => onTransition(updateTransitionPatch(customTransition, { enter }))}
          />
          <TransitionKeyframeEditor
            label="Exit keyframes"
            phase={customTransition.exit ?? { keyframes: DEFAULT_CUSTOM_EXIT }}
            onPhase={(exit) => onTransition(updateTransitionPatch(customTransition, { exit }))}
          />
        </div>
      )}
    </div>
  );
}

function TransitionPreview({ transition }: { transition: ApiSlideTransition | null }) {
  const previewIncomingRef = useRef<HTMLDivElement>(null);
  const previewOutgoingRef = useRef<HTMLDivElement>(null);
  const previewResolved = resolveSlideTransition(transition ?? undefined, 1);

  const previewTransition = useCallback(() => {
    const incoming = previewIncomingRef.current;
    const outgoing = previewOutgoingRef.current;
    if (!incoming || !outgoing || typeof incoming.animate !== "function") return;
    const resolved = resolveSlideTransition(transition ?? undefined, 1);
    incoming.getAnimations().forEach((animation) => animation.cancel());
    outgoing.getAnimations().forEach((animation) => animation.cancel());
    Object.assign(incoming.style, {
      clipPath: "none",
      filter: "none",
      opacity: "1",
      transform: "none",
    });
    Object.assign(outgoing.style, {
      clipPath: "none",
      filter: "none",
      opacity: "1",
      transform: "none",
    });
    outgoing.animate(
      resolved.exit.keyframes as Keyframe[],
      getTransitionPhaseTiming(resolved, resolved.exit),
    );
    incoming.animate(
      resolved.enter.keyframes as Keyframe[],
      getTransitionPhaseTiming(resolved, resolved.enter),
    );
  }, [transition]);

  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        marginTop: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, rgba(37,211,102,0.12), rgba(255,255,255,0.05))",
          height: 92,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          ref={previewOutgoingRef}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.textDim,
            display: "grid",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            inset: 12,
            placeItems: "center",
            position: "absolute",
            zIndex: getTransitionLayerZIndex(previewResolved, "exit"),
          }}
        >
          A
        </div>
        <div
          ref={previewIncomingRef}
          style={{
            background: C.accent,
            borderRadius: 6,
            color: C.bg,
            display: "grid",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            fontWeight: 800,
            inset: 12,
            placeItems: "center",
            position: "absolute",
            zIndex: getTransitionLayerZIndex(previewResolved, "enter"),
          }}
        >
          B
        </div>
      </div>
      <button
        type="button"
        onClick={previewTransition}
        style={{
          ...arrangeButton,
          border: "none",
          borderRadius: 0,
          borderTop: `1px solid ${C.border}`,
          justifyContent: "center",
          padding: "8px 10px",
          width: "100%",
        }}
      >
        <Play size={13} /> Preview
      </button>
    </div>
  );
}

function CustomTransitionTemplatePicker({
  duration,
  onTransition,
}: {
  duration: number;
  onTransition: (transition: ApiSlideTransition) => void;
}) {
  return (
    <select
      defaultValue=""
      onChange={(event) => {
        const value = event.target.value as (typeof CUSTOM_TRANSITION_TEMPLATES)[number]["value"];
        if (!value) return;
        onTransition(makeCustomTransitionFromTemplate(value, duration));
        event.target.value = "";
      }}
      style={inp}
      aria-label="Apply custom transition template"
    >
      <option value="">Apply template...</option>
      {CUSTOM_TRANSITION_TEMPLATES.map((template) => (
        <option key={template.value} value={template.value}>
          {template.label}
        </option>
      ))}
    </select>
  );
}

function parseKeyframesText(value: string) {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Expected a non-empty JSON array.");
  }
  if (parsed.some((frame) => !frame || typeof frame !== "object" || Array.isArray(frame))) {
    throw new Error("Each keyframe must be a JSON object.");
  }
  return parsed as NonNullable<ApiSlideTransition["enter"]>["keyframes"];
}

function TransitionKeyframeEditor({
  label,
  onPhase,
  phase,
}: {
  label: string;
  onPhase: (phase: NonNullable<ApiSlideTransition["enter"]>) => void;
  phase: NonNullable<ApiSlideTransition["enter"]>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => JSON.stringify(phase.keyframes, null, 2));

  useEffect(() => {
    setDraft(JSON.stringify(phase.keyframes, null, 2));
  }, [phase.keyframes]);

  return (
    <div>
      <div style={inspectorLabel}>{label}</div>
      <textarea
        value={draft}
        spellCheck={false}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        onBlur={() => {
          try {
            onPhase({ ...phase, keyframes: parseKeyframesText(draft) });
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid keyframe JSON.");
          }
        }}
        rows={5}
        style={{
          ...inp,
          resize: "vertical",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          lineHeight: 1.45,
        }}
      />
      {error && <div style={{ color: "#ff8a8a", fontSize: 10, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function HtmlSlideSourceEditor({
  html,
  notes,
  transition,
  onHtml,
  onNotes,
  onTransition,
  title,
}: {
  html: string;
  notes: string;
  transition: ApiSlideTransition | null;
  onHtml: (html: string) => void;
  onNotes: (notes: string) => void;
  onTransition: (transition: ApiSlideTransition | null) => void;
  title: string;
}) {
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
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
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "calc((100vh - 140px) * 16 / 9)",
            aspectRatio: "16 / 9",
            overflow: "hidden",
            boxShadow: "0 8px 48px rgba(0,0,0,0.7)",
            background: C.bg,
          }}
        >
          <HtmlSlideRenderer html={html} title={title || "HTML slide preview"} />
        </div>
      </div>
      <div
        style={{
          width: 420,
          borderLeft: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          background: C.surface,
          flexShrink: 0,
        }}
      >
        <div style={{ padding: 16, borderBottom: `1px solid ${C.border}` }}>
          <div
            style={{
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
              color: C.muted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            HTML Source
          </div>
          <textarea
            value={html}
            onChange={(event) => onHtml(event.target.value)}
            spellCheck={false}
            style={{
              ...inp,
              height: 430,
              resize: "vertical",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              lineHeight: 1.5,
              whiteSpace: "pre",
              overflowWrap: "normal",
              overflowX: "auto",
            }}
          />
        </div>
        <div style={{ padding: 16, borderBottom: `1px solid ${C.border}` }}>
          <SlideTransitionEditor transition={transition} onTransition={onTransition} />
        </div>
        <div style={{ padding: 16 }}>
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
            onChange={(event) => onNotes(event.target.value)}
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
    </div>
  );
}

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

const inspectorLabel: React.CSSProperties = {
  fontSize: 9,
  color: C.textDim,
  marginBottom: 4,
  fontFamily: "JetBrains Mono, monospace",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const multiAlignItems = [
  {
    action: "align-left" as const,
    title: "Align left",
    icon: <AlignHorizontalJustifyStart size={13} />,
  },
  {
    action: "align-center" as const,
    title: "Align center",
    icon: <AlignHorizontalJustifyCenter size={13} />,
  },
  {
    action: "align-right" as const,
    title: "Align right",
    icon: <AlignHorizontalJustifyEnd size={13} />,
  },
  {
    action: "align-top" as const,
    title: "Align top",
    icon: <AlignVerticalJustifyStart size={13} />,
  },
  {
    action: "align-middle" as const,
    title: "Align middle",
    icon: <AlignVerticalJustifyCenter size={13} />,
  },
  {
    action: "align-bottom" as const,
    title: "Align bottom",
    icon: <AlignVerticalJustifyEnd size={13} />,
  },
];

const multiDistributeItems = [
  {
    action: "distribute-horizontal" as const,
    title: "Distribute horizontally",
    icon: <StretchHorizontal size={13} />,
  },
  {
    action: "distribute-vertical" as const,
    title: "Distribute vertically",
    icon: <StretchVertical size={13} />,
  },
];

const multiMatchItems = [
  {
    action: "match-width" as const,
    title: "Match width",
    icon: <StretchHorizontal size={13} />,
  },
  {
    action: "match-height" as const,
    title: "Match height",
    icon: <StretchVertical size={13} />,
  },
  {
    action: "match-size" as const,
    title: "Match size",
    icon: <Maximize2 size={13} />,
  },
];

function MultiSelectionPanel({
  count,
  onArrange,
  onDelete,
  onDuplicate,
  onGroup,
  onUngroup,
}: {
  count: number;
  onArrange: (action: MultiBlockArrangeAction) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onGroup: () => void;
  onUngroup: () => void;
}) {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 12,
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontFamily: "JetBrains Mono, monospace",
          color: C.muted,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {count} selected
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <button type="button" title="Duplicate" onClick={onDuplicate} style={arrangeButton}>
          <Copy size={13} />
        </button>
        <button
          type="button"
          title="Delete"
          onClick={onDelete}
          style={{ ...arrangeButton, color: "#ff8a8a" }}
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <button type="button" title="Group" onClick={onGroup} style={arrangeButton}>
          <Group size={13} />
        </button>
        <button type="button" title="Ungroup" onClick={onUngroup} style={arrangeButton}>
          <Ungroup size={13} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {multiAlignItems.map((item) => (
          <button
            key={item.action}
            type="button"
            title={item.title}
            onClick={() => onArrange(item.action)}
            style={arrangeButton}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {multiDistributeItems.map((item) => (
          <button
            key={item.action}
            type="button"
            title={item.title}
            onClick={() => onArrange(item.action)}
            style={arrangeButton}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {multiMatchItems.map((item) => (
          <button
            key={item.action}
            type="button"
            title={item.title}
            onClick={() => onArrange(item.action)}
            style={arrangeButton}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

function InspectorField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div>
      <div style={inspectorLabel}>{label}</div>
      {children}
    </div>
  );
}

function ColorInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string | undefined) => void;
  value: string | undefined;
}) {
  return (
    <InspectorField label={label}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || undefined)}
          placeholder="theme"
          style={inp}
        />
        <input
          aria-label={label}
          type="color"
          value={value && value.startsWith("#") ? value : "#ffffff"}
          onChange={(event) => onChange(event.target.value)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            padding: 0,
            cursor: "pointer",
            background: "none",
            flexShrink: 0,
          }}
        />
      </div>
    </InspectorField>
  );
}

function NumberInput({
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number | undefined) => void;
  step?: number;
  value: number | undefined;
}) {
  return (
    <InspectorField label={label}>
      <input
        type="number"
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value === "" ? undefined : Number(event.target.value))
        }
        min={min}
        max={max}
        step={step}
        style={inp}
      />
    </InspectorField>
  );
}

function CommonAppearanceEditor({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
}) {
  const shadowPresets = [
    { label: "None", value: undefined },
    { label: "Soft", value: "0 10px 28px rgba(0,0,0,0.28)" },
    { label: "Lift", value: "0 18px 42px rgba(0,0,0,0.38)" },
    { label: "Glow", value: "0 0 28px rgba(37,211,102,0.35)" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <InspectorField label="Name">
        <input
          value={block.displayName ?? ""}
          onChange={(event) =>
            onUpdate({
              displayName: event.target.value.trim() ? event.target.value : undefined,
            } as Partial<Block>)
          }
          placeholder="Layer name"
          style={inp}
        />
      </InspectorField>
      <CommonStateControls block={block} onUpdate={onUpdate} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <NumberInput
          label="Rotate"
          min={-360}
          max={360}
          value={block.rotation}
          onChange={(rotation) => !block.locked && onUpdate({ rotation } as Partial<Block>)}
        />
        <NumberInput
          label="Opacity"
          min={0}
          max={1}
          step={0.05}
          value={block.opacity}
          onChange={(opacity) => !block.locked && onUpdate({ opacity } as Partial<Block>)}
        />
      </div>
      <BlockFlipControls block={block} onUpdate={onUpdate} />
      <InspectorField label="Shadow">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
          {shadowPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => !block.locked && onUpdate({ shadow: preset.value } as Partial<Block>)}
              disabled={block.locked}
              style={{
                ...arrangeButton,
                height: 26,
                fontSize: 10,
                background: block.shadow === preset.value ? C.accentSubtle : C.bg,
                color: block.shadow === preset.value ? C.accent : C.textDim,
                opacity: block.locked ? 0.45 : 1,
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <input
          value={block.shadow ?? ""}
          onChange={(event) =>
            !block.locked &&
            onUpdate({
              shadow: event.target.value.trim() ? event.target.value : undefined,
            } as Partial<Block>)
          }
          disabled={block.locked}
          placeholder="0 12px 32px rgba(0,0,0,.35)"
          style={{ ...inp, marginTop: 6, opacity: block.locked ? 0.45 : 1 }}
        />
      </InspectorField>
    </div>
  );
}

function CommonStateControls({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      <button
        type="button"
        aria-label={block.locked ? "Unlock block" : "Lock block"}
        title={block.locked ? "Unlock block" : "Lock block"}
        onClick={() => onUpdate({ locked: !block.locked } as Partial<Block>)}
        style={{
          ...arrangeButton,
          background: block.locked ? C.accentSubtle : C.bg,
          color: block.locked ? "#f6c85f" : C.text,
        }}
      >
        {block.locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>
      <button
        type="button"
        aria-label={block.hidden ? "Show block" : "Hide block"}
        title={block.hidden ? "Show block" : "Hide block"}
        onClick={() => onUpdate({ hidden: !block.hidden } as Partial<Block>)}
        style={{
          ...arrangeButton,
          background: block.hidden ? C.accentSubtle : C.bg,
          color: block.hidden ? C.accent : C.text,
        }}
      >
        {block.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

function BlockFlipControls({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      <button
        type="button"
        aria-label={block.flipX ? "Remove horizontal flip" : "Flip horizontally"}
        title={block.flipX ? "Remove horizontal flip" : "Flip horizontally"}
        onClick={() => !block.locked && onUpdate({ flipX: !block.flipX } as Partial<Block>)}
        disabled={block.locked}
        style={{
          ...arrangeButton,
          background: block.flipX ? C.accentSubtle : C.bg,
          color: block.flipX ? C.accent : C.text,
          opacity: block.locked ? 0.45 : 1,
        }}
      >
        <FlipHorizontal size={13} />
      </button>
      <button
        type="button"
        aria-label={block.flipY ? "Remove vertical flip" : "Flip vertically"}
        title={block.flipY ? "Remove vertical flip" : "Flip vertically"}
        onClick={() => !block.locked && onUpdate({ flipY: !block.flipY } as Partial<Block>)}
        disabled={block.locked}
        style={{
          ...arrangeButton,
          background: block.flipY ? C.accentSubtle : C.bg,
          color: block.flipY ? C.accent : C.text,
          opacity: block.locked ? 0.45 : 1,
        }}
      >
        <FlipVertical size={13} />
      </button>
    </div>
  );
}

function BlockAnimationEditor({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
}) {
  const animation = block.animation;
  const disabled = Boolean(block.locked);
  const updateAnimation = (patch: Partial<NonNullable<Block["animation"]>>) => {
    if (disabled) return;
    onUpdate({
      animation: {
        duration: animation?.duration ?? 480,
        preset: animation?.preset ?? "fade-in",
        ...animation,
        ...patch,
      },
    } as Partial<Block>);
  };

  return (
    <InspectorField label="Animation">
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
        <select
          value={animation?.preset ?? ""}
          onChange={(event) => {
            const preset = event.target.value as ManualBlockAnimationPreset;
            if (!preset) onUpdate({ animation: undefined } as Partial<Block>);
            else updateAnimation({ preset });
          }}
          disabled={disabled}
          style={{ ...inp, opacity: disabled ? 0.45 : 1 }}
        >
          <option value="">None</option>
          {BLOCK_ANIMATION_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          title="Clear animation"
          onClick={() => !disabled && onUpdate({ animation: undefined } as Partial<Block>)}
          disabled={disabled || !animation}
          style={{
            ...arrangeButton,
            width: 32,
            opacity: disabled || !animation ? 0.45 : 1,
          }}
        >
          x
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gap: 6,
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          marginTop: 6,
          opacity: animation ? 1 : 0.45,
        }}
      >
        <NumberInput
          label="Duration"
          min={0}
          max={10000}
          value={animation?.duration}
          onChange={(duration) => updateAnimation({ duration })}
        />
        <NumberInput
          label="Delay"
          min={0}
          max={10000}
          value={animation?.delay}
          onChange={(delay) => updateAnimation({ delay })}
        />
        <NumberInput
          label="Repeat"
          min={1}
          max={20}
          value={animation?.iterationCount}
          onChange={(iterationCount) => updateAnimation({ iterationCount })}
        />
        <InspectorField label="Easing">
          <input
            value={animation?.easing ?? ""}
            onChange={(event) =>
              updateAnimation({
                easing: event.target.value.trim() ? event.target.value : undefined,
              })
            }
            disabled={disabled || !animation}
            placeholder="ease-out"
            style={{ ...inp, opacity: disabled || !animation ? 0.45 : 1 }}
          />
        </InspectorField>
      </div>
    </InspectorField>
  );
}

function BlockLinkEditor({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
}) {
  const disabled = Boolean(block.locked);
  const updateLink = (patch: Partial<Block>) => {
    if (disabled) return;
    onUpdate({
      linkTarget: block.linkTarget ?? "_blank",
      ...patch,
    } as Partial<Block>);
  };

  return (
    <InspectorField label="Link">
      <div style={{ display: "grid", gap: 6 }}>
        <input
          value={block.linkUrl ?? ""}
          onChange={(event) => {
            const linkUrl = event.target.value.trim() ? event.target.value : undefined;
            updateLink(
              linkUrl
                ? ({ linkTarget: block.linkTarget ?? "_blank", linkUrl } as Partial<Block>)
                : ({
                    linkTarget: undefined,
                    linkTitle: undefined,
                    linkUrl: undefined,
                  } as Partial<Block>),
            );
          }}
          disabled={disabled}
          placeholder="https://example.com"
          style={{ ...inp, opacity: disabled ? 0.45 : 1 }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
          <select
            value={block.linkTarget ?? "_blank"}
            onChange={(event) =>
              updateLink({ linkTarget: event.target.value as Block["linkTarget"] })
            }
            disabled={disabled || !block.linkUrl}
            style={{ ...inp, opacity: disabled || !block.linkUrl ? 0.45 : 1 }}
          >
            <option value="_blank">New tab</option>
            <option value="_self">Same tab</option>
          </select>
          <button
            type="button"
            title="Clear link"
            onClick={() =>
              !disabled &&
              onUpdate({
                linkTarget: undefined,
                linkTitle: undefined,
                linkUrl: undefined,
              } as Partial<Block>)
            }
            disabled={disabled || !block.linkUrl}
            style={{
              ...arrangeButton,
              width: 32,
              opacity: disabled || !block.linkUrl ? 0.45 : 1,
            }}
          >
            x
          </button>
        </div>
        <input
          value={block.linkTitle ?? ""}
          onChange={(event) =>
            updateLink({
              linkTitle: event.target.value.trim() ? event.target.value : undefined,
            } as Partial<Block>)
          }
          disabled={disabled || !block.linkUrl}
          placeholder="Accessible link title"
          style={{ ...inp, opacity: disabled || !block.linkUrl ? 0.45 : 1 }}
        />
      </div>
    </InspectorField>
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

function TextAppearanceEditor({
  block,
  onUpdate,
}: {
  block: Extract<Block, { type: "text" }>;
  onUpdate: (patch: Partial<Extract<Block, { type: "text" }>>) => void;
}) {
  const alignButton = (align: "left" | "center" | "right", icon: React.ReactNode) => (
    <button
      key={align}
      type="button"
      aria-label={`Align ${align}`}
      title={`Align ${align}`}
      onClick={() => onUpdate({ align })}
      style={{
        ...arrangeButton,
        background: block.align === align ? C.accentSubtle : C.bg,
        color: block.align === align ? C.accent : C.text,
      }}
    >
      {icon}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <NumberInput
          label="Font size"
          min={8}
          max={180}
          value={block.fontSize}
          onChange={(fontSize) => onUpdate({ fontSize })}
        />
        <NumberInput
          label="Padding"
          min={0}
          max={80}
          value={block.padding}
          onChange={(padding) => onUpdate({ padding })}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <NumberInput
          label="Weight"
          min={100}
          max={900}
          value={block.fontWeight}
          onChange={(fontWeight) => onUpdate({ fontWeight })}
        />
        <NumberInput
          label="Line height"
          min={0.8}
          max={3}
          value={block.lineHeight}
          onChange={(lineHeight) => onUpdate({ lineHeight })}
        />
      </div>
      <InspectorField label="Font family">
        <select
          value={block.fontFamily ?? ""}
          onChange={(event) => onUpdate({ fontFamily: event.target.value || undefined })}
          style={inp}
        >
          <option value="">Theme default</option>
          <option value="Inter, system-ui, sans-serif">Inter</option>
          <option value="Georgia, serif">Georgia</option>
          <option value='"JetBrains Mono", monospace'>JetBrains Mono</option>
          <option value='"Times New Roman", serif'>Times New Roman</option>
          <option value="Arial, Helvetica, sans-serif">Arial</option>
        </select>
      </InspectorField>
      <TextStyleButtons block={block} onUpdate={onUpdate} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {alignButton("left", <AlignLeft size={14} />)}
        {alignButton("center", <AlignCenter size={14} />)}
        {alignButton("right", <AlignRight size={14} />)}
      </div>
      <ColorInput
        label="Text color"
        value={block.color}
        onChange={(color) => onUpdate({ color })}
      />
      <ColorInput
        label="Background"
        value={block.background}
        onChange={(background) => onUpdate({ background })}
      />
    </div>
  );
}

function TextStyleButtons({
  block,
  onUpdate,
}: {
  block: Extract<Block, { type: "text" }>;
  onUpdate: (patch: Partial<Extract<Block, { type: "text" }>>) => void;
}) {
  const isBold = Boolean(block.fontWeight && block.fontWeight >= 700);
  const isItalic = block.fontStyle === "italic";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
      <button
        type="button"
        aria-label="Toggle bold text"
        title="Toggle bold text"
        onClick={() => onUpdate({ fontWeight: isBold ? undefined : 700 })}
        style={{
          ...arrangeButton,
          background: isBold ? C.accentSubtle : C.bg,
          color: isBold ? C.accent : C.text,
        }}
      >
        <Bold size={14} />
      </button>
      <button
        type="button"
        aria-label="Toggle italic text"
        title="Toggle italic text"
        onClick={() => onUpdate({ fontStyle: isItalic ? undefined : "italic" })}
        style={{
          ...arrangeButton,
          background: isItalic ? C.accentSubtle : C.bg,
          color: isItalic ? C.accent : C.text,
        }}
      >
        <Italic size={14} />
      </button>
    </div>
  );
}

function ImageAppearanceEditor({
  block,
  onUpdate,
}: {
  block: Extract<Block, { type: "image" }>;
  onUpdate: (patch: Partial<Extract<Block, { type: "image" }>>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <InspectorField label="Fit">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {(["contain", "cover", "fill"] as const).map((objectFit) => (
            <button
              key={objectFit}
              type="button"
              onClick={() => onUpdate({ objectFit })}
              style={{
                ...arrangeButton,
                fontSize: 10,
                background: (block.objectFit ?? "contain") === objectFit ? C.accentSubtle : C.bg,
                color: (block.objectFit ?? "contain") === objectFit ? C.accent : C.text,
              }}
            >
              {objectFit}
            </button>
          ))}
        </div>
      </InspectorField>
      <NumberInput
        label="Radius"
        min={0}
        max={120}
        value={block.borderRadius}
        onChange={(borderRadius) => onUpdate({ borderRadius })}
      />
      <InspectorField label="Position">
        <input
          value={block.objectPosition ?? ""}
          onChange={(event) => onUpdate({ objectPosition: event.target.value || undefined })}
          placeholder="center center"
          style={inp}
        />
      </InspectorField>
      <InspectorField label="Crop %">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
          <NumberInput
            label="X"
            min={0}
            max={100}
            value={block.cropX}
            onChange={(cropX) => onUpdate({ cropX })}
          />
          <NumberInput
            label="Y"
            min={0}
            max={100}
            value={block.cropY}
            onChange={(cropY) => onUpdate({ cropY })}
          />
          <NumberInput
            label="W"
            min={1}
            max={100}
            value={block.cropW}
            onChange={(cropW) => onUpdate({ cropW })}
          />
          <NumberInput
            label="H"
            min={1}
            max={100}
            value={block.cropH}
            onChange={(cropH) => onUpdate({ cropH })}
          />
        </div>
        <button
          type="button"
          onClick={() =>
            onUpdate({
              cropH: undefined,
              cropW: undefined,
              cropX: undefined,
              cropY: undefined,
            })
          }
          style={{ ...arrangeButton, height: 26, marginTop: 6, fontSize: 10 }}
        >
          Reset crop
        </button>
      </InspectorField>
    </div>
  );
}

function BlockBubbleMenu({
  canEditText,
  editing,
  hidden,
  locked,
  onBringForward,
  onDelete,
  onDuplicate,
  onEditText,
  onSendBack,
  onToggleLocked,
  onToggleHidden,
}: {
  canEditText: boolean;
  editing: boolean;
  hidden: boolean;
  locked: boolean;
  onBringForward: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEditText: () => void;
  onSendBack: () => void;
  onToggleLocked: () => void;
  onToggleHidden: () => void;
}) {
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
          disabled={locked}
          title={editing ? "Editing text" : "Edit text"}
          style={{
            ...bubbleButtonBase,
            color: editing ? C.accent : C.textDim,
            background: editing ? C.accentSubtle : C.surface,
            cursor: locked ? "not-allowed" : "pointer",
            opacity: locked ? 0.45 : 1,
          }}
        >
          {editing ? <Check size={13} /> : <Edit3 size={13} />}
        </button>
      )}
      <button type="button" onClick={onDuplicate} title="Duplicate block" style={bubbleButtonBase}>
        <Copy size={13} />
      </button>
      <button
        type="button"
        onClick={onBringForward}
        disabled={locked}
        title="Bring forward"
        style={{
          ...bubbleButtonBase,
          cursor: locked ? "not-allowed" : "pointer",
          opacity: locked ? 0.45 : 1,
        }}
      >
        <ArrowUp size={13} />
      </button>
      <button
        type="button"
        onClick={onSendBack}
        disabled={locked}
        title="Send backward"
        style={{
          ...bubbleButtonBase,
          cursor: locked ? "not-allowed" : "pointer",
          opacity: locked ? 0.45 : 1,
        }}
      >
        <ArrowDown size={13} />
      </button>
      <button
        type="button"
        onClick={onToggleLocked}
        title={locked ? "Unlock block" : "Lock block"}
        style={{
          ...bubbleButtonBase,
          color: locked ? "#f6c85f" : C.textDim,
          background: locked ? C.accentSubtle : C.surface,
        }}
      >
        {locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>
      <BlockVisibilityBubbleButton hidden={hidden} onToggleHidden={onToggleHidden} />
      <button
        type="button"
        onClick={onDelete}
        disabled={locked}
        title="Delete block"
        style={{
          ...bubbleButtonBase,
          color: "#ff8a8a",
          cursor: locked ? "not-allowed" : "pointer",
          opacity: locked ? 0.45 : 1,
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function BlockVisibilityBubbleButton({
  hidden,
  onToggleHidden,
}: {
  hidden: boolean;
  onToggleHidden: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggleHidden}
      title={hidden ? "Show block" : "Hide block"}
      style={{
        ...bubbleButtonBase,
        color: hidden ? C.accent : C.textDim,
        background: hidden ? C.accentSubtle : C.surface,
      }}
    >
      {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
    </button>
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
      return <CanvasTextBlock block={block} />;

    case "image":
      return <CanvasImageBlock block={block} />;

    case "iframe":
      return <CanvasIframeBlock block={block} />;

    case "shape":
      return <CanvasShapeBlock block={block} />;

    case "line":
      return <CanvasLineBlock block={block} />;

    case "table":
      return <CanvasTableBlock block={block} />;

    case "chart":
      return <ChartBlockView block={block} />;
  }
}

function CanvasTextBlock({ block }: { block: Extract<Block, { type: "text" }> }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
        fontSize: "clamp(0.6rem, 0.9vw, 0.85rem)",
        fontFamily: block.fontFamily,
        fontWeight: block.fontWeight,
        fontStyle: block.fontStyle,
        lineHeight: block.lineHeight ?? 1.55,
        color: block.color ?? "var(--theme-text)",
        background: block.background,
        textAlign: block.align,
        padding: block.padding ?? "6px 10px",
      }}
      className="prose-block"
    >
      {block.markdown ? (
        <ReactMarkdown>{block.markdown}</ReactMarkdown>
      ) : (
        <span style={{ opacity: 0.25, fontFamily: "JetBrains Mono, monospace", fontSize: "0.7em" }}>
          empty text
        </span>
      )}
    </div>
  );
}

function CanvasImageBlock({ block }: { block: Extract<Block, { type: "image" }> }) {
  const crop = getEditorImageCrop(block);
  return block.url ? (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: block.borderRadius,
        overflow: crop ? "hidden" : undefined,
      }}
    >
      <img
        src={block.url}
        alt={block.alt ?? ""}
        style={{
          width: "100%",
          height: "100%",
          objectFit: block.objectFit ?? "contain",
          objectPosition: block.objectPosition,
          borderRadius: crop ? undefined : block.borderRadius,
          display: "block",
          ...crop,
        }}
      />
    </div>
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
}

function getEditorImageCrop(block: Extract<Block, { type: "image" }>): React.CSSProperties | null {
  if (
    block.cropX === undefined &&
    block.cropY === undefined &&
    block.cropW === undefined &&
    block.cropH === undefined
  ) {
    return null;
  }
  const cropW = Math.max(1, Math.min(100, block.cropW ?? 100));
  const cropH = Math.max(1, Math.min(100, block.cropH ?? 100));
  const cropX = Math.max(0, Math.min(100 - cropW, block.cropX ?? 0));
  const cropY = Math.max(0, Math.min(100 - cropH, block.cropY ?? 0));
  return {
    height: `${10000 / cropH}%`,
    left: `${(-cropX * 100) / cropW}%`,
    objectFit: "fill",
    position: "relative",
    top: `${(-cropY * 100) / cropH}%`,
    width: `${10000 / cropW}%`,
  };
}

function CanvasIframeBlock({ block }: { block: Extract<Block, { type: "iframe" }> }) {
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
}

function CanvasShapeBlock({ block }: { block: Extract<Block, { type: "shape" }> }) {
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
      {isRoundedShape(block.shape) ? (
        <CanvasRoundedShape block={block} />
      ) : (
        <CanvasSvgShape block={block} />
      )}
    </div>
  );
}

function isRoundedShape(shape: ShapeBlock["shape"]) {
  return shape === "rect" || shape === "pill" || shape === "circle";
}

function CanvasRoundedShape({ block }: { block: Extract<Block, { type: "shape" }> }) {
  const radius = block.shape === "circle" ? "50%" : block.shape === "pill" ? 9999 : 8;
  const isCircle = block.shape === "circle";
  return (
    <div
      style={{
        alignItems: "center",
        background: block.color,
        border:
          block.borderWidth && block.borderWidth > 0
            ? `${block.borderWidth}px solid ${block.borderColor ?? "var(--theme-border)"}`
            : undefined,
        borderRadius: radius,
        boxShadow: `0 2px 12px ${block.color}44`,
        display: "flex",
        height: block.height ?? (isCircle ? "70%" : "100%"),
        justifyContent: "center",
        width: block.width ?? (isCircle ? "70%" : "100%"),
      }}
    >
      {block.label && (
        <span
          style={{
            color: block.textColor ?? getReadableTextColor(block.color),
            fontFamily: "Inter, sans-serif",
            fontSize: block.labelFontSize ?? 13,
            fontWeight: block.labelFontWeight ?? 700,
          }}
        >
          {block.label}
        </span>
      )}
    </div>
  );
}

function CanvasSvgShape({ block }: { block: Extract<Block, { type: "shape" }> }) {
  const strokeWidth = block.borderWidth ?? 0;
  return (
    <svg
      aria-label={block.label || `${block.shape} shape`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        display: "block",
        filter: `drop-shadow(0 2px 8px ${block.color}44)`,
        height: block.height ?? "100%",
        overflow: "visible",
        width: block.width ?? "100%",
      }}
    >
      <polygon
        points={shapePolygonPoints(block.shape)}
        fill={block.color}
        stroke={strokeWidth > 0 ? (block.borderColor ?? "var(--theme-border)") : undefined}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {block.label && (
        <text
          x="50"
          y="52"
          dominantBaseline="middle"
          textAnchor="middle"
          fill={block.textColor ?? getReadableTextColor(block.color)}
          fontFamily="Inter, sans-serif"
          fontSize={block.labelFontSize ?? 13}
          fontWeight={block.labelFontWeight ?? 700}
        >
          {block.label}
        </text>
      )}
    </svg>
  );
}

function shapePolygonPoints(shape: ShapeBlock["shape"]) {
  switch (shape) {
    case "arrow-right":
      return "0,20 64,20 64,6 100,50 64,94 64,80 0,80";
    case "diamond":
      return "50,0 100,50 50,100 0,50";
    case "hexagon":
      return "24,0 76,0 100,50 76,100 24,100 0,50";
    case "parallelogram":
      return "18,0 100,0 82,100 0,100";
    case "triangle":
      return "50,0 100,100 0,100";
    default:
      return "0,0 100,0 100,100 0,100";
  }
}

function CanvasLineBlock({ block }: { block: Extract<Block, { type: "line" }> }) {
  const markerId = `editor-line-arrow-${block.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const strokeWidth = block.strokeWidth ?? 3;
  const dashArray = block.dash === "dash" ? "10 8" : block.dash === "dot" ? "2 7" : undefined;
  const pathD = lineConnectorPath(block);
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
    >
      {(block.startArrow || block.endArrow) && (
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto-start-reverse"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill={block.color} />
          </marker>
        </defs>
      )}
      {pathD ? (
        <path
          d={pathD}
          fill="none"
          stroke={block.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashArray}
          vectorEffect="non-scaling-stroke"
          markerStart={block.startArrow ? `url(#${markerId})` : undefined}
          markerEnd={block.endArrow ? `url(#${markerId})` : undefined}
        />
      ) : (
        <line
          x1={block.startX ?? 0}
          y1={block.startY ?? 50}
          x2={block.endX ?? 100}
          y2={block.endY ?? 50}
          stroke={block.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          vectorEffect="non-scaling-stroke"
          markerStart={block.startArrow ? `url(#${markerId})` : undefined}
          markerEnd={block.endArrow ? `url(#${markerId})` : undefined}
        />
      )}
    </svg>
  );
}

function lineConnectorPath(block: Extract<Block, { type: "line" }>) {
  const startX = block.startX ?? 0;
  const startY = block.startY ?? 50;
  const endX = block.endX ?? 100;
  const endY = block.endY ?? 50;
  const midX = (startX + endX) / 2;
  if (block.connector === "curve") {
    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  }
  if (block.connector === "elbow") {
    return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
  }
  return null;
}

function CanvasTableBlock({ block }: { block: Extract<Block, { type: "table" }> }) {
  const borderWidth = block.borderWidth ?? 1;
  const border = `${borderWidth}px solid ${block.borderColor ?? "var(--theme-border)"}`;
  const headerRows = block.headerRows ?? 1;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: block.background,
        color: block.color ?? "var(--theme-text)",
        fontSize: block.fontSize ?? 13,
        boxSizing: "border-box",
      }}
    >
      <table
        style={{
          width: "100%",
          height: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => {
                const isHeader = rowIndex < headerRows;
                const Cell = isHeader ? "th" : "td";
                return (
                  <Cell
                    key={cellIndex}
                    style={{
                      border: borderWidth > 0 ? border : undefined,
                      padding: block.cellPadding ?? 8,
                      textAlign: block.align ?? "left",
                      background: isHeader
                        ? (block.headerBackground ?? "var(--theme-surface)")
                        : undefined,
                      fontWeight: isHeader ? 700 : 500,
                      verticalAlign: "middle",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {cell}
                  </Cell>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Shape property editor ────────────────────────────────────────────────────

function ShapePropEditor({
  block,
  onUpdate,
}: {
  block: ShapeBlock;
  onUpdate: (p: Partial<ShapeBlock>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <ShapeTypeControls block={block} onUpdate={onUpdate} />
      <ShapeFillControls block={block} onUpdate={onUpdate} />
      <ShapeLabelControls block={block} onUpdate={onUpdate} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <NumberInput
          label="Border"
          min={0}
          max={24}
          value={block.borderWidth}
          onChange={(borderWidth) => onUpdate({ borderWidth })}
        />
        <ColorInput
          label="Border color"
          value={block.borderColor}
          onChange={(borderColor) => onUpdate({ borderColor })}
        />
      </div>
      <ColorInput
        label="Text color"
        value={block.textColor}
        onChange={(textColor) => onUpdate({ textColor })}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <NumberInput
          label="Label size"
          min={8}
          max={96}
          value={block.labelFontSize}
          onChange={(labelFontSize) => onUpdate({ labelFontSize })}
        />
        <NumberInput
          label="Label weight"
          min={100}
          max={900}
          value={block.labelFontWeight}
          onChange={(labelFontWeight) => onUpdate({ labelFontWeight })}
        />
      </div>
    </div>
  );
}

function ShapeTypeControls({
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
  const shapeOptions: Array<{ value: ShapeBlock["shape"]; icon: React.ReactNode; label: string }> =
    [
      { value: "rect", icon: <Square size={12} />, label: "Rect" },
      { value: "pill", icon: <Pill size={12} />, label: "Pill" },
      { value: "circle", icon: <Circle size={12} />, label: "Circle" },
      { value: "triangle", icon: <Triangle size={12} />, label: "Tri" },
      { value: "diamond", icon: <Diamond size={12} />, label: "Dia" },
      { value: "parallelogram", icon: <Square size={12} />, label: "Para" },
      { value: "hexagon", icon: <Hexagon size={12} />, label: "Hex" },
      { value: "arrow-right", icon: <ArrowRight size={12} />, label: "Arrow" },
    ];

  return (
    <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
      {shapeOptions.map(({ value, icon, label }) => (
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
  );
}

function ShapeFillControls({
  block,
  onUpdate,
}: {
  block: ShapeBlock;
  onUpdate: (p: Partial<ShapeBlock>) => void;
}) {
  return (
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
  );
}

function ShapeLabelControls({
  block,
  onUpdate,
}: {
  block: ShapeBlock;
  onUpdate: (p: Partial<ShapeBlock>) => void;
}) {
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
        Label
      </div>
      <input
        value={block.label ?? ""}
        onChange={(e) => onUpdate({ label: e.target.value })}
        placeholder="Label text"
        style={inp}
      />
    </div>
  );
}

// ─── Line property editor ─────────────────────────────────────────────────────

function LineOptionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...arrangeButton,
        background: active ? C.accentSubtle : C.bg,
        color: active ? C.accent : C.text,
      }}
    >
      {label}
    </button>
  );
}

function LinePropEditor({
  block,
  onUpdate,
}: {
  block: Extract<Block, { type: "line" }>;
  onUpdate: (p: Partial<Extract<Block, { type: "line" }>>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <ColorInput
        label="Stroke color"
        value={block.color}
        onChange={(color) => color && onUpdate({ color })}
      />
      <NumberInput
        label="Stroke"
        min={1}
        max={32}
        value={block.strokeWidth}
        onChange={(strokeWidth) => onUpdate({ strokeWidth })}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {(["straight", "elbow", "curve"] as const).map((connector) => (
          <LineOptionButton
            key={connector}
            active={(block.connector ?? "straight") === connector}
            label={connector[0].toUpperCase() + connector.slice(1)}
            onClick={() => onUpdate({ connector })}
          />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {(["solid", "dash", "dot"] as const).map((dash) => (
          <LineOptionButton
            key={dash}
            active={(block.dash ?? "solid") === dash}
            label={dash[0].toUpperCase() + dash.slice(1)}
            onClick={() => onUpdate({ dash })}
          />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <button
          type="button"
          onClick={() => onUpdate({ startArrow: !block.startArrow })}
          style={{
            ...arrangeButton,
            background: block.startArrow ? C.accentSubtle : C.bg,
            color: block.startArrow ? C.accent : C.text,
          }}
        >
          Start
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ endArrow: !block.endArrow })}
          style={{
            ...arrangeButton,
            background: block.endArrow ? C.accentSubtle : C.bg,
            color: block.endArrow ? C.accent : C.text,
          }}
        >
          End
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <NumberInput
          label="Start X"
          min={0}
          max={100}
          value={block.startX}
          onChange={(startX) => onUpdate({ startX })}
        />
        <NumberInput
          label="Start Y"
          min={0}
          max={100}
          value={block.startY}
          onChange={(startY) => onUpdate({ startY })}
        />
        <NumberInput
          label="End X"
          min={0}
          max={100}
          value={block.endX}
          onChange={(endX) => onUpdate({ endX })}
        />
        <NumberInput
          label="End Y"
          min={0}
          max={100}
          value={block.endY}
          onChange={(endY) => onUpdate({ endY })}
        />
      </div>
    </div>
  );
}

// ─── Table property editor ────────────────────────────────────────────────────

function rowsToTsv(rows: string[][]) {
  return rows.map((row) => row.join("\t")).join("\n");
}

function tsvToRows(value: string) {
  const rows = value
    .split("\n")
    .map((row) => row.split("\t").map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
  return rows.length > 0 ? rows : [[""]];
}

function TablePropEditor({
  block,
  onUpdate,
}: {
  block: Extract<Block, { type: "table" }>;
  onUpdate: (p: Partial<Extract<Block, { type: "table" }>>) => void;
}) {
  const alignButton = (align: "left" | "center" | "right", icon: React.ReactNode) => (
    <button
      key={align}
      type="button"
      aria-label={`Align ${align}`}
      title={`Align ${align}`}
      onClick={() => onUpdate({ align })}
      style={{
        ...arrangeButton,
        background: block.align === align ? C.accentSubtle : C.bg,
        color: block.align === align ? C.accent : C.text,
      }}
    >
      {icon}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <InspectorField label="Rows">
        <textarea
          value={rowsToTsv(block.rows)}
          onChange={(event) => onUpdate({ rows: tsvToRows(event.target.value) })}
          rows={6}
          spellCheck={false}
          style={{
            ...inp,
            resize: "vertical",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            lineHeight: 1.5,
          }}
        />
      </InspectorField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <NumberInput
          label="Header rows"
          min={0}
          max={5}
          value={block.headerRows}
          onChange={(headerRows) => onUpdate({ headerRows })}
        />
        <NumberInput
          label="Font size"
          min={8}
          max={80}
          value={block.fontSize}
          onChange={(fontSize) => onUpdate({ fontSize })}
        />
        <NumberInput
          label="Padding"
          min={0}
          max={40}
          value={block.cellPadding}
          onChange={(cellPadding) => onUpdate({ cellPadding })}
        />
        <NumberInput
          label="Border"
          min={0}
          max={12}
          value={block.borderWidth}
          onChange={(borderWidth) => onUpdate({ borderWidth })}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {alignButton("left", <AlignLeft size={13} />)}
        {alignButton("center", <AlignCenter size={13} />)}
        {alignButton("right", <AlignRight size={13} />)}
      </div>
      <ColorInput
        label="Text color"
        value={block.color}
        onChange={(color) => onUpdate({ color })}
      />
      <ColorInput
        label="Background"
        value={block.background}
        onChange={(background) => onUpdate({ background })}
      />
      <ColorInput
        label="Header background"
        value={block.headerBackground}
        onChange={(headerBackground) => onUpdate({ headerBackground })}
      />
      <ColorInput
        label="Border color"
        value={block.borderColor}
        onChange={(borderColor) => onUpdate({ borderColor })}
      />
    </div>
  );
}

// ─── Chart property editor ────────────────────────────────────────────────────

function chartToTsv(block: Extract<Block, { type: "chart" }>) {
  const header = ["Category", ...block.series.map((series) => series.name)];
  const rows = block.categories.map((category, categoryIndex) => [
    category,
    ...block.series.map((series) => String(series.values[categoryIndex] ?? 0)),
  ]);
  return [header, ...rows].map((row) => row.join("\t")).join("\n");
}

function tsvToChartData(value: string, previous: Extract<Block, { type: "chart" }>) {
  const rows = value
    .split("\n")
    .map((row) => row.split("\t").map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
  if (rows.length < 2) return { categories: previous.categories, series: previous.series };
  const header = rows[0]!;
  const seriesNames = header.slice(1).map((name, index) => name || `Series ${index + 1}`);
  const categories = rows.slice(1).map((row, index) => row[0] || `Item ${index + 1}`);
  const series = seriesNames.map((name, seriesIndex) => ({
    name,
    values: rows.slice(1).map((row) => Number(row[seriesIndex + 1] ?? 0) || 0),
    color: previous.series[seriesIndex]?.color,
  }));
  return { categories, series };
}

function ChartPropEditor({
  block,
  onUpdate,
}: {
  block: Extract<Block, { type: "chart" }>;
  onUpdate: (p: Partial<Extract<Block, { type: "chart" }>>) => void;
}) {
  const chartButton = (chart: Extract<Block, { type: "chart" }>["chart"], label: string) => (
    <button
      key={chart}
      type="button"
      onClick={() => onUpdate({ chart })}
      style={{
        ...arrangeButton,
        background: block.chart === chart ? C.accentSubtle : C.bg,
        color: block.chart === chart ? C.accent : C.text,
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <InspectorField label="Title">
        <input
          value={block.title ?? ""}
          onChange={(event) => onUpdate({ title: event.target.value || undefined })}
          placeholder="Chart title"
          style={inp}
        />
      </InspectorField>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {chartButton("bar", "Bar")}
        {chartButton("line", "Line")}
        {chartButton("pie", "Pie")}
      </div>
      <InspectorField label="Data">
        <textarea
          value={chartToTsv(block)}
          onChange={(event) => onUpdate(tsvToChartData(event.target.value, block))}
          rows={6}
          spellCheck={false}
          style={{
            ...inp,
            resize: "vertical",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            lineHeight: 1.5,
          }}
        />
      </InspectorField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <button
          type="button"
          onClick={() => onUpdate({ showLegend: !block.showLegend })}
          style={{
            ...arrangeButton,
            background: block.showLegend ? C.accentSubtle : C.bg,
            color: block.showLegend ? C.accent : C.text,
          }}
        >
          Legend
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ showValues: !block.showValues })}
          style={{
            ...arrangeButton,
            background: block.showValues ? C.accentSubtle : C.bg,
            color: block.showValues ? C.accent : C.text,
          }}
        >
          Values
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {block.series.slice(0, 4).map((series, index) => (
          <ColorInput
            key={index}
            label={series.name}
            value={series.color}
            onChange={(color) =>
              onUpdate({
                series: block.series.map((entry, entryIndex) =>
                  entryIndex === index ? { ...entry, color } : entry,
                ),
              })
            }
          />
        ))}
      </div>
      <ColorInput
        label="Label color"
        value={block.labelColor}
        onChange={(labelColor) => onUpdate({ labelColor })}
      />
      <ColorInput
        label="Axis color"
        value={block.axisColor}
        onChange={(axisColor) => onUpdate({ axisColor })}
      />
      <ColorInput
        label="Background"
        value={block.background}
        onChange={(background) => onUpdate({ background })}
      />
    </div>
  );
}
