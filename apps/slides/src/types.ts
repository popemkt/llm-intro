import type { ComponentType } from "react";
import type {
  ApiSlideBackground,
  ApiSlideTransition,
  Block,
  ThemeName,
} from "@llm-intro/api-contract";

export type {
  ApiPresentation,
  ApiDeckSnapshot,
  ApiDeckSnapshotDetail,
  ApiDeckSnapshotRestoreResult,
  ApiSlide,
  ApiSlideGroup,
  ApiDeckAsset,
  ApiLogoAssetCandidate,
  ApiSlideBackground,
  ApiSlideTransition,
  Block,
  DeckAssetKind,
  LayoutInput,
  ManualBlockAnimationPreset,
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
      transition: ApiSlideTransition | null;
      component: ComponentType<SlideProps>;
    }
  | {
      kind: "db";
      id: number;
      groupId: number | null;
      title: string;
      notes: string;
      transition: ApiSlideTransition | null;
      blocks: Block[];
      theme: ThemeName;
      background: ApiSlideBackground | null;
    }
  | {
      kind: "html";
      id: number;
      groupId: number | null;
      title: string;
      notes: string;
      transition: ApiSlideTransition | null;
      html: string;
    };
