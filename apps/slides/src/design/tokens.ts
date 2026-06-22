/**
 * Design tokens — the single source of truth for the app-shell visual language.
 *
 * T — hardcoded hex values for code-backed slides (intentionally static, never
 *     themed) and for inline SVG / canvas that can't read CSS variables.
 * C — CSS variable references for app-shell UI (responds to the active app theme).
 *
 * radius / space / font / shadow / ring — scales shared by every shell surface
 *     so spacing, corners, type, and elevation stay consistent. These mirror the
 *     CSS custom properties declared in index.css (:root); keep them in sync.
 */
export const C = {
  bg: "var(--color-bg)",
  surface: "var(--color-surface)",
  border: "var(--color-border)",
  muted: "var(--color-muted)",
  text: "var(--color-text)",
  textDim: "var(--color-text-dim)",
  accent: "var(--color-accent)",
  accentDim: "var(--color-accent-dim)",
  highlight: "var(--color-highlight)",
  accentSubtle: "color-mix(in srgb, var(--color-accent) 9%, transparent)",
} as const;

/** JS colour constants — use these for inline SVG styles and canvas */
export const T = {
  bg: "#0d0f0e",
  surface: "#141a17",
  border: "#1f2d27",
  muted: "#3a4d42",
  text: "#e8f0eb",
  textDim: "#7a9985",
  accent: "#25d366",
  accentDim: "#1a9448",
  highlight: "#00ffa3",
} as const;

/** Corner radii. sm = controls/inputs, md = buttons, lg = cards, xl = panels. */
export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  pill: 9999,
} as const;

/** 4px base spacing scale. */
export const space = {
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

/** Typography scale — families, sizes, and weights. */
export const font = {
  sans: "Inter, system-ui, sans-serif",
  mono: "JetBrains Mono, Fira Code, monospace",
  size: {
    micro: 10,
    xs: 11,
    sm: 12,
    md: 13,
    lg: 14,
    xl: 16,
    "2xl": 20,
  },
  weight: {
    regular: 500,
    medium: 600,
    semibold: 700,
    bold: 800,
  },
} as const;

/** Elevation. card = resting surface, pop = floating panels/menus. */
export const shadow = {
  card: "0 1px 2px rgba(0,0,0,0.25)",
  pop: "0 20px 60px rgba(0,0,0,0.45)",
} as const;

/** Inset focus/active outlines drawn with the accent. */
export const ring = {
  accent: "inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 35%, transparent)",
  border: `inset 0 0 0 1px ${C.border}`,
} as const;
