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
};

export type TextBlock = { id: string; type: "text"; markdown: string } & BlockPos;
export type ImageBlock = { id: string; type: "image"; url: string; alt?: string } & BlockPos;
export type IframeBlock = { id: string; type: "iframe"; url: string; height?: number } & BlockPos;
export type ShapeBlock = {
  id: string;
  type: "shape";
  shape: "rect" | "pill" | "circle";
  color: string;
  label?: string;
  width?: string;
  height?: string;
} & BlockPos;

export type Block = TextBlock | ImageBlock | IframeBlock | ShapeBlock;

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
  kind: "code" | "db";
  code_id: string | null;
  title: string;
  blocks: Block[];
  notes: string;
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

export interface LayoutInput {
  ungrouped: number[];
  groups: Array<{ id: number; slideIds: number[] }>;
}
