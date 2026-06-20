export type ManualBlockStylePresetId =
  | "accent-card"
  | "soft-note"
  | "outline-callout"
  | "code-panel"
  | "media-frame";

export type ManualBlockStylePreset = {
  id: ManualBlockStylePresetId;
  label: string;
  description: string;
  patch: Record<string, unknown>;
};

export const MANUAL_BLOCK_STYLE_PRESETS = [
  {
    id: "accent-card",
    label: "Accent card",
    description: "Strong filled card with light text and a soft shadow.",
    patch: {
      background: "#1d4ed8",
      borderColor: "#1e40af",
      borderWidth: 1,
      color: "#ffffff",
      opacity: 1,
      radius: 12,
      shadow: "0 18px 45px rgba(29, 78, 216, 0.28)",
    },
  },
  {
    id: "soft-note",
    label: "Soft note",
    description: "Warm note treatment for explanatory text blocks.",
    patch: {
      background: "#fff7ed",
      borderColor: "#fed7aa",
      borderWidth: 1,
      color: "#7c2d12",
      opacity: 1,
      radius: 10,
      shadow: "0 10px 30px rgba(124, 45, 18, 0.12)",
    },
  },
  {
    id: "outline-callout",
    label: "Outline callout",
    description: "Clean bordered callout with transparent fill.",
    patch: {
      background: "transparent",
      borderColor: "#0f172a",
      borderWidth: 2,
      color: "#0f172a",
      opacity: 1,
      radius: 8,
      shadow: "",
    },
  },
  {
    id: "code-panel",
    label: "Code panel",
    description: "Dark technical panel for code, console, or system examples.",
    patch: {
      background: "#111827",
      borderColor: "#374151",
      borderWidth: 1,
      color: "#e5e7eb",
      fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
      opacity: 1,
      radius: 8,
      shadow: "0 16px 36px rgba(17, 24, 39, 0.22)",
    },
  },
  {
    id: "media-frame",
    label: "Media frame",
    description: "Neutral frame for images, embeds, charts, and tables.",
    patch: {
      background: "#ffffff",
      borderColor: "#d1d5db",
      borderWidth: 1,
      color: "#111827",
      objectFit: "cover",
      opacity: 1,
      radius: 10,
      shadow: "0 14px 38px rgba(15, 23, 42, 0.14)",
    },
  },
] as const satisfies readonly ManualBlockStylePreset[];

export const MANUAL_BLOCK_STYLE_PRESET_IDS = MANUAL_BLOCK_STYLE_PRESETS.map(
  (preset) => preset.id,
) as [ManualBlockStylePresetId, ...ManualBlockStylePresetId[]];

export function getManualBlockStylePreset(
  presetId: ManualBlockStylePresetId,
): ManualBlockStylePreset {
  return (
    MANUAL_BLOCK_STYLE_PRESETS.find((preset) => preset.id === presetId) ??
    MANUAL_BLOCK_STYLE_PRESETS[0]
  );
}
