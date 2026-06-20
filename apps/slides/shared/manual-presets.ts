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
  | "dashboard"
  | "decision-matrix"
  | "architecture-map"
  | "callout-stack"
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
    id: "dashboard",
    label: "Dashboard",
    icon: "bar-chart",
    commands: ["dashboard", "scorecard", "kpi-grid"],
    description: "KPI tiles with a chart and action panel.",
  },
  {
    id: "decision-matrix",
    label: "Decision Matrix",
    icon: "split",
    commands: ["decision", "matrix", "decision-matrix"],
    description: "Criteria table plus recommendation callout.",
  },
  {
    id: "architecture-map",
    label: "Architecture",
    icon: "route",
    commands: ["architecture", "system-map", "diagram"],
    description: "Editable system map with boxes and elbow connectors.",
  },
  {
    id: "callout-stack",
    label: "Callouts",
    icon: "quote",
    commands: ["callouts", "stack", "progressive"],
    description: "Stacked callouts for progressive explanation.",
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

function textDisplayName(markdown: string) {
  const firstLine = markdown
    .split("\n")
    .find((line) => line.trim())
    ?.replace(/^#+\s*/, "")
    .replace(/^>\s*/, "")
    .replace(/^[-*]\s*/, "")
    .trim();
  return firstLine || "Text";
}

function textBlock(
  markdown: string,
  rect: Rect,
  createId: () => string,
  extra: Partial<Extract<Block, { type: "text" }>> = {},
): Block {
  return {
    id: createId(),
    type: "text",
    markdown,
    displayName: textDisplayName(markdown),
    ...rect,
    ...extra,
  };
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
    displayName: label,
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
    displayName: extra.endArrow || extra.startArrow ? "Arrow" : "Connector",
    ...rect,
    ...extra,
  };
}

function imageBlock(alt: string, rect: Rect, createId: () => string): Block {
  return { id: createId(), type: "image", url: "", alt, displayName: alt, ...rect };
}

function tableBlock(
  displayName: string,
  rows: string[][],
  rect: Rect,
  createId: () => string,
  extra: Partial<Extract<Block, { type: "table" }>> = {},
): Block {
  return {
    id: createId(),
    type: "table",
    rows,
    displayName,
    headerRows: 1,
    fontSize: 13,
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    cellPadding: 7,
    align: "left",
    ...rect,
    ...extra,
  };
}

function chartBlock(
  displayName: string,
  rect: Rect,
  createId: () => string,
  extra: Partial<Extract<Block, { type: "chart" }>> = {},
): Block {
  return {
    id: createId(),
    type: "chart",
    chart: "bar",
    title: displayName,
    categories: ["Now", "Next", "Later"],
    series: [{ name: "Value", values: [32, 58, 44], color: "#25d366" }],
    displayName,
    showLegend: false,
    showValues: true,
    labelColor: "#ffffff",
    axisColor: "#8aa39b",
    ...rect,
    ...extra,
  };
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

function dashboardPreset(createId: () => string) {
  return [
    textBlock(
      "## Operating dashboard\nCurrent signals and next actions",
      { x: 6, y: 7, w: 54, h: 13 },
      createId,
      {
        fontSize: 22,
      },
    ),
    shapeBlock("North Star", { x: 6, y: 24, w: 25, h: 15 }, createId, {
      color: "#123456",
      labelFontSize: 13,
      textColor: "#ffffff",
    }),
    textBlock("# 72%\nAdoption", { x: 9, y: 27, w: 19, h: 9 }, createId, {
      align: "center",
      fontSize: 20,
    }),
    shapeBlock("Risk", { x: 34, y: 24, w: 25, h: 15 }, createId, {
      color: "#ffd93d",
      labelFontSize: 13,
      textColor: "#0d0f0e",
    }),
    textBlock("# 3\nOpen decisions", { x: 37, y: 27, w: 19, h: 9 }, createId, {
      align: "center",
      color: "#0d0f0e",
      fontSize: 20,
    }),
    chartBlock("Trend", { x: 6, y: 44, w: 52, h: 35 }, createId, {
      categories: ["Q1", "Q2", "Q3", "Q4"],
      series: [{ name: "Progress", values: [18, 32, 51, 72], color: "#4c9fff" }],
    }),
    tableBlock(
      "Action queue",
      [
        ["Action", "Owner", "Status"],
        ["Clarify scope", "PM", "Now"],
        ["Ship prototype", "Eng", "Next"],
        ["Measure usage", "Data", "Later"],
      ],
      { x: 64, y: 22, w: 30, h: 57 },
      createId,
      { headerBackground: "#123456" },
    ),
  ];
}

function decisionMatrixPreset(createId: () => string) {
  return [
    textBlock(
      "## Decision matrix\nCompare options with explicit criteria.",
      { x: 7, y: 8, w: 58, h: 13 },
      createId,
    ),
    tableBlock(
      "Criteria matrix",
      [
        ["Criteria", "Option A", "Option B", "Option C"],
        ["Impact", "High", "Medium", "High"],
        ["Effort", "Medium", "Low", "High"],
        ["Risk", "Low", "Medium", "Medium"],
        ["Verdict", "Pick", "Hold", "Explore"],
      ],
      { x: 7, y: 26, w: 60, h: 48 },
      createId,
      { align: "center", headerBackground: "#123456" },
    ),
    shapeBlock("Recommendation", { x: 72, y: 26, w: 20, h: 9 }, createId, {
      color: "#25d366",
      textColor: "#0d0f0e",
    }),
    textBlock(
      "### Pick Option A\nBest balance of impact, effort, and implementation risk.\n\n- Revisit in 2 weeks\n- Track leading metric",
      { x: 72, y: 40, w: 20, h: 34 },
      createId,
    ),
  ];
}

function architectureMapPreset(createId: () => string) {
  return [
    textBlock(
      "## System map\nEditable boxes and routed connectors.",
      { x: 7, y: 7, w: 58, h: 12 },
      createId,
    ),
    shapeBlock("User", { x: 8, y: 36, w: 18, h: 12 }, createId, { shape: "rect" }),
    lineBlock({ x: 26, y: 40, w: 13, h: 14 }, createId, {
      color: "#8aa39b",
      connector: "elbow",
      endArrow: true,
      endY: 82,
      startY: 22,
    }),
    shapeBlock("App Shell", { x: 39, y: 28, w: 20, h: 12 }, createId, {
      color: "#4c9fff",
      shape: "rect",
    }),
    lineBlock({ x: 59, y: 33, w: 11, h: 2 }, createId, {
      color: "#8aa39b",
      endArrow: true,
    }),
    shapeBlock("Agent API", { x: 70, y: 28, w: 20, h: 12 }, createId, {
      color: "#ffd93d",
      shape: "rect",
      textColor: "#0d0f0e",
    }),
    lineBlock({ x: 49, y: 40, w: 31, h: 18 }, createId, {
      color: "#8aa39b",
      connector: "curve",
      endArrow: true,
      endY: 75,
      startY: 0,
    }),
    shapeBlock("Slide Store", { x: 40, y: 60, w: 20, h: 12 }, createId, {
      color: "#123456",
      shape: "rect",
      textColor: "#ffffff",
    }),
    shapeBlock("Assets", { x: 70, y: 60, w: 20, h: 12 }, createId, {
      color: "#a29bfe",
      shape: "rect",
    }),
  ];
}

function calloutStackPreset(createId: () => string) {
  return [
    textBlock("# Explain the idea in layers", { x: 7, y: 8, w: 58, h: 14 }, createId),
    shapeBlock("1", { x: 9, y: 29, w: 8, h: 8 }, createId, { shape: "circle" }),
    textBlock(
      "### Start simple\nName the mental model in one sentence.",
      { x: 20, y: 27, w: 64, h: 12 },
      createId,
    ),
    lineBlock({ x: 12, y: 37, w: 1, h: 10 }, createId, {
      color: "#8aa39b",
      connector: "straight",
      endY: 100,
      endX: 50,
      startX: 50,
      startY: 0,
    }),
    shapeBlock("2", { x: 9, y: 47, w: 8, h: 8 }, createId, { color: "#4c9fff", shape: "circle" }),
    textBlock(
      "### Add structure\nBreak the concept into parts the audience can track.",
      { x: 20, y: 45, w: 64, h: 12 },
      createId,
    ),
    lineBlock({ x: 12, y: 55, w: 1, h: 10 }, createId, {
      color: "#8aa39b",
      connector: "straight",
      endY: 100,
      endX: 50,
      startX: 50,
      startY: 0,
    }),
    shapeBlock("3", { x: 9, y: 65, w: 8, h: 8 }, createId, {
      color: "#ffd93d",
      shape: "circle",
      textColor: "#0d0f0e",
    }),
    textBlock(
      "### Land the transfer\nShow how the model changes the next decision.",
      { x: 20, y: 63, w: 64, h: 12 },
      createId,
    ),
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
  dashboard: dashboardPreset,
  "decision-matrix": decisionMatrixPreset,
  "architecture-map": architectureMapPreset,
  "callout-stack": calloutStackPreset,
  "section-divider": sectionDividerPreset,
};

export function buildManualPresetBlocks(
  presetId: ManualPresetId,
  createId: () => string = nanoid,
): Block[] {
  return presetBuilders[presetId](createId);
}
