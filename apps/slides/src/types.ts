import type { ComponentType } from "react";
import type { Block, ThemeName } from "@llm-intro/api-contract";

export type {
  ApiPresentation,
  ApiDeckSnapshot,
  ApiDeckSnapshotDetail,
  ApiDeckSnapshotRestoreResult,
  ApiSlide,
  ApiSlideGroup,
  Block,
  LayoutInput,
  ShapeBlock,
  ThemeName,
} from "@llm-intro/api-contract";
export { THEME_NAMES, THEME_META } from "@llm-intro/api-contract";

export interface SlideProps {
  isActive: boolean;
}

// Discriminated union used by OverviewGrid + PresentationView
export type UnifiedSlide =
  | {
      kind: "code";
      id: number;
      groupId: number | null;
      title: string;
      notes: string;
      component: ComponentType<SlideProps>;
    }
  | {
      kind: "db";
      id: number;
      groupId: number | null;
      title: string;
      notes: string;
      blocks: Block[];
      theme: ThemeName;
    };
