import { nanoid } from "nanoid";
import type { Block } from "@llm-intro/api-contract";

type Rect = { h: number; w: number; x: number; y: number };

export type ManualPresetId =
  | "title"
  | "bullets"
  | "quote"
  | "metric"
  | "two-column"
  | "comparison"
  | "timeline"
  | "image-left"
  | "process"
  | "section-divider";

export type ManualPresetIcon =
  | "bar-chart"
  | "columns"
  | "image"
  | "list"
  | "quote"
  | "route"
  | "split"
  | "timeline"
  | "type";

export type ManualPresetMeta = {
  commands: string[];
  description: string;
  icon: ManualPresetIcon;
  id: ManualPresetId;
  label: string;
};

export const MANUAL_PRESET_META: ManualPresetMeta[] = [
  {
    id: "title",
    label: "Title",
    icon: "type",
    commands: ["title", "hero"],
    description: "Title and supporting subtitle.",
  },
  {
    id: "bullets",
    label: "Bullets",
    icon: "list",
    commands: ["bullets", "list"],
    description: "Section heading with three bullets.",
  },
  {
    id: "quote",
    label: "Quote",
    icon: "quote",
    commands: ["quote"],
    description: "Large quotation with attribution.",
  },
  {
    id: "metric",
    label: "Metric",
    icon: "bar-chart",
    commands: ["metric", "kpi"],
    description: "Large number with label and badge.",
  },
  {
    id: "two-column",
    label: "Two Column",
    icon: "columns",
    commands: ["two-column", "columns"],
    description: "Two balanced text columns.",
  },
  {
    id: "comparison",
    label: "Compare",
    icon: "split",
    commands: ["comparison", "compare"],
    description: "Before/after or option A/B comparison.",
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: "timeline",
    commands: ["timeline"],
    description: "Three-step horizontal timeline.",
  },
  {
    id: "image-left",
    label: "Image Left",
    icon: "image",
    commands: ["image-left", "media"],
    description: "Image placeholder with copy on the right.",
  },
  {
    id: "process",
    label: "Process",
    icon: "route",
    commands: ["process", "flow"],
    description: "Three connected process stages.",
  },
  {
    id: "section-divider",
    label: "Section",
    icon: "type",
    commands: ["section", "divider", "section-divider"],
    description: "Bold section divider with eyebrow.",
  },
];

export const MANUAL_PRESET_IDS = MANUAL_PRESET_META.map((preset) => preset.id) as [
  ManualPresetId,
  ...ManualPresetId[],
];

function textBlock(
  markdown: string,
  rect: Rect,
  createId: () => string,
  extra: Partial<Extract<Block, { type: "text" }>> = {},
): Block {
  return { id: createId(), type: "text", markdown, ...rect, ...extra };
}

function shapeBlock(
  label: string,
  rect: Rect,
  createId: () => string,
  extra: Partial<Extract<Block, { type: "shape" }>> = {},
): Block {
  return {
    id: createId(),
    type: "shape",
    shape: "pill",
    color: "#25d366",
    label,
    ...rect,
    ...extra,
  };
}

function lineBlock(
  rect: Rect,
  createId: () => string,
  extra: Partial<Extract<Block, { type: "line" }>> = {},
): Block {
  return {
    id: createId(),
    type: "line",
    color: "#25d366",
    strokeWidth: 3,
    startX: 0,
    startY: 50,
    endX: 100,
    endY: 50,
    ...rect,
    ...extra,
  };
}

function imageBlock(alt: string, rect: Rect, createId: () => string): Block {
  return { id: createId(), type: "image", url: "", alt, ...rect };
}

export function getManualPresetMeta(id: string) {
  return MANUAL_PRESET_META.find((preset) => preset.id === id);
}

type PresetBuilder = (createId: () => string) => Block[];

function titlePreset(createId: () => string) {
  return [
    textBlock(
      "# New slide title\nA concise supporting line.",
      { x: 8, y: 12, w: 84, h: 30 },
      createId,
    ),
  ];
}

function bulletsPreset(createId: () => string) {
  return [
    textBlock(
      "## Key points\n- First point\n- Second point\n- Third point",
      {
        x: 10,
        y: 16,
        w: 78,
        h: 52,
      },
      createId,
    ),
  ];
}

function quotePreset(createId: () => string) {
  return [
    textBlock(
      "> Add a memorable quote here.\n\n-- Attribution",
      { x: 12, y: 24, w: 76, h: 36 },
      createId,
    ),
  ];
}

function metricPreset(createId: () => string) {
  return [
    textBlock("# 42%\nMetric label", { x: 12, y: 18, w: 28, h: 28 }, createId),
    shapeBlock("Signal", { x: 48, y: 22, w: 34, h: 16 }, createId),
  ];
}

function twoColumnPreset(createId: () => string) {
  return [
    textBlock("## Left idea\n- Detail one\n- Detail two", { x: 8, y: 16, w: 38, h: 56 }, createId),
    textBlock(
      "## Right idea\n- Detail one\n- Detail two",
      { x: 54, y: 16, w: 38, h: 56 },
      createId,
    ),
  ];
}

function comparisonPreset(createId: () => string) {
  return [
    shapeBlock("Option A", { x: 8, y: 14, w: 38, h: 10 }, createId),
    shapeBlock("Option B", { x: 54, y: 14, w: 38, h: 10 }, createId, { color: "#4c9fff" }),
    textBlock(
      "### Current\n- Constraint\n- Tradeoff\n- Risk",
      { x: 10, y: 30, w: 34, h: 44 },
      createId,
    ),
    textBlock(
      "### Target\n- Capability\n- Upside\n- Decision",
      { x: 56, y: 30, w: 34, h: 44 },
      createId,
    ),
  ];
}

function timelinePreset(createId: () => string) {
  return [
    lineBlock({ x: 18, y: 42, w: 27, h: 2 }, createId),
    lineBlock({ x: 55, y: 42, w: 27, h: 2 }, createId),
    shapeBlock("1", { x: 10, y: 38, w: 10, h: 10 }, createId, { shape: "circle" }),
    shapeBlock("2", { x: 45, y: 38, w: 10, h: 10 }, createId, { shape: "circle" }),
    shapeBlock("3", { x: 80, y: 38, w: 10, h: 10 }, createId, { shape: "circle" }),
    textBlock("### Start\nSet context", { x: 6, y: 54, w: 20, h: 20 }, createId, {
      align: "center",
    }),
    textBlock("### Build\nMake progress", { x: 40, y: 54, w: 20, h: 20 }, createId, {
      align: "center",
    }),
    textBlock("### Finish\nLand the result", { x: 74, y: 54, w: 20, h: 20 }, createId, {
      align: "center",
    }),
  ];
}

function imageLeftPreset(createId: () => string) {
  return [
    imageBlock("Image placeholder", { x: 8, y: 14, w: 38, h: 64 }, createId),
    textBlock(
      "## Visual story\nUse the image to anchor the point.\n\n- Why it matters\n- What to notice",
      { x: 54, y: 18, w: 36, h: 50 },
      createId,
    ),
  ];
}

function processPreset(createId: () => string) {
  return [
    shapeBlock("Input", { x: 8, y: 36, w: 22, h: 12 }, createId),
    lineBlock({ x: 30, y: 41, w: 9, h: 2 }, createId, {
      color: "#8aa39b",
      endArrow: true,
    }),
    shapeBlock("Transform", { x: 39, y: 36, w: 22, h: 12 }, createId, { color: "#4c9fff" }),
    lineBlock({ x: 61, y: 41, w: 9, h: 2 }, createId, {
      color: "#8aa39b",
      endArrow: true,
    }),
    shapeBlock("Output", { x: 70, y: 36, w: 22, h: 12 }, createId, { color: "#ffd93d" }),
    textBlock("### Input\nRaw material", { x: 8, y: 54, w: 22, h: 22 }, createId, {
      align: "center",
    }),
    textBlock("### Transform\nAgent or system work", { x: 39, y: 54, w: 22, h: 22 }, createId, {
      align: "center",
    }),
    textBlock("### Output\nUseful artifact", { x: 70, y: 54, w: 22, h: 22 }, createId, {
      align: "center",
    }),
  ];
}

function sectionDividerPreset(createId: () => string) {
  return [
    shapeBlock("Next", { x: 8, y: 14, w: 16, h: 8 }, createId),
    textBlock(
      "# Section title\nShort transition statement.",
      { x: 8, y: 32, w: 76, h: 28 },
      createId,
    ),
  ];
}

const presetBuilders: Record<ManualPresetId, PresetBuilder> = {
  title: titlePreset,
  bullets: bulletsPreset,
  quote: quotePreset,
  metric: metricPreset,
  "two-column": twoColumnPreset,
  comparison: comparisonPreset,
  timeline: timelinePreset,
  "image-left": imageLeftPreset,
  process: processPreset,
  "section-divider": sectionDividerPreset,
};

export function buildManualPresetBlocks(
  presetId: ManualPresetId,
  createId: () => string = nanoid,
): Block[] {
  return presetBuilders[presetId](createId);
}
