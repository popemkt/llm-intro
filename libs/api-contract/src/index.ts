export type ThemeName = "dark-green" | "dark-blue" | "light" | "neon" | "warm" | "ocean";

export const THEME_NAMES: ThemeName[] = [
  "dark-green",
  "dark-blue",
  "light",
  "neon",
  "warm",
  "ocean",
];

export const THEME_META: Record<ThemeName, { label: string; desc: string }> = {
  "dark-green": { label: "Dark Green", desc: "Terminal signal green" },
  "dark-blue": { label: "Dark Blue", desc: "Midnight cool blue" },
  light: { label: "Light", desc: "Clean minimal light" },
  neon: { label: "Neon", desc: "Vivid neon magenta" },
  warm: { label: "Warm", desc: "Amber candlelight dark" },
  ocean: { label: "Ocean", desc: "Deep teal seabed" },
};

type BlockPos = {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
  opacity?: number;
};

export type TextBlock = {
  id: string;
  type: "text";
  markdown: string;
  fontSize?: number;
  color?: string;
  background?: string;
  align?: "left" | "center" | "right";
  padding?: number;
} & BlockPos;
export type ImageBlock = {
  id: string;
  type: "image";
  url: string;
  alt?: string;
  objectFit?: "contain" | "cover" | "fill";
  borderRadius?: number;
} & BlockPos;
export type IframeBlock = { id: string; type: "iframe"; url: string; height?: number } & BlockPos;
export type ShapeBlock = {
  id: string;
  type: "shape";
  shape: "rect" | "pill" | "circle";
  color: string;
  label?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  width?: string;
  height?: string;
} & BlockPos;

export type Block = TextBlock | ImageBlock | IframeBlock | ShapeBlock;

export type SlideTransitionEngine = "waapi" | "css" | "motion" | "three" | "custom";
export type SlideTransitionPreset = "slide" | "fade" | "scale" | "none";

export type SlideTransitionKeyframe = Record<string, string | number | boolean | null>;

export interface SlideTransitionPhase {
  keyframes: SlideTransitionKeyframe[];
  duration?: number;
  easing?: string;
  delay?: number;
}

export interface ApiSlideTransition {
  engine?: SlideTransitionEngine;
  name?: SlideTransitionPreset | string;
  duration: number;
  easing?: string;
  enter?: SlideTransitionPhase;
  exit?: SlideTransitionPhase;
  params?: Record<string, unknown>;
}

export interface ApiPresentation {
  id: number;
  name: string;
  theme: ThemeName;
  created_at: string;
  updated_at: string;
}

export interface ApiSlide {
  id: number;
  presentation_id: number;
  position: number;
  group_id: number | null;
  kind: "code" | "db" | "html";
  code_id: string | null;
  title: string;
  blocks: Block[];
  html: string;
  notes: string;
  transition: ApiSlideTransition | null;
  created_at: string;
  updated_at: string;
}

export interface ApiSlideGroup {
  id: number;
  presentation_id: number;
  title: string;
  position: number;
  collapsed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiDeckSnapshot {
  id: number;
  presentation_id: number;
  label: string;
  deck_name: string;
  slide_count: number;
  group_count: number;
  created_at: string;
}

export interface ApiDeckSnapshotDetail extends ApiDeckSnapshot {
  payload: {
    deck: ApiPresentation;
    slides: ApiSlide[];
    groups: ApiSlideGroup[];
  };
}

export interface ApiDeckSnapshotRestoreResult {
  snapshot: ApiDeckSnapshot;
  deck: ApiPresentation;
  slides: ApiSlide[];
  groups: ApiSlideGroup[];
}

export type DeckAssetKind = "svg" | "image" | "video" | "audio" | "other";

export interface ApiDeckAsset {
  id: number;
  presentation_id: number;
  name: string;
  kind: DeckAssetKind;
  mime_type: string;
  content: string;
  source_url: string | null;
  source_name: string | null;
  license: string | null;
  usage: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ApiLogoAssetCandidate {
  id: string;
  title: string;
  category: string[];
  svgUrl: string;
  brandUrl: string | null;
  source: "svgl";
  variants: Array<{ name: string; svgUrl: string }>;
}

export interface LayoutInput {
  ungrouped: number[];
  groups: Array<{ id: number; slideIds: number[] }>;
}
