/**
 * Harness-deck branding — the single swap point for company identity.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  TO REBRAND THIS DECK FOR YOUR COMPANY, EDIT ONLY THIS FILE.         │
 * │  Every harness slide reads its colours, fonts, backdrop and logo     │
 * │  from `brand` below. Nothing else needs to change.                   │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * The palette intentionally keeps three *semantic* accents fixed in meaning
 * even if you recolour them: `agent`, `intent`, `judge`. The whole deck's
 * argument hangs on telling those three actors apart, so keep them visually
 * distinct from each other after any rebrand.
 */

/** A backdrop recipe. Swap `kind` to drop in a company image or flat fill. */
export type Backdrop =
  | {
      kind: "mesh";
      base: string;
      glows: Array<{ x: string; y: string; color: string; size: string }>;
      grid: string | null;
    }
  | { kind: "image"; src: string; overlay: string }
  | { kind: "solid"; color: string };

/**
 * Named backdrop presets — switch live during a talk (press `b` next / `B`
 * prev; see `Backdrop` in `_frame.tsx`). First entry is the default.
 * TODO(branding): for a company background image add
 *   { name: "Brand", bg: { kind: "image", src: yourImport, overlay: "rgba(13,17,23,0.78)" } }
 * The overlay keeps text legible over busy art. Keep it dark for this deck.
 */
export const BACKDROPS: Array<{ name: string; bg: Backdrop }> = [
  { name: "Black", bg: { kind: "solid", color: "#000000" } },
  {
    name: "Ink", // deep near-black, faint colored glows keep it alive
    bg: {
      kind: "mesh",
      base: "#050507",
      glows: [
        { x: "12%", y: "18%", color: "rgba(52,211,153,0.07)", size: "44%" }, // agent
        { x: "88%", y: "26%", color: "rgba(251,146,60,0.06)", size: "42%" }, // judge
        { x: "62%", y: "92%", color: "rgba(167,139,250,0.05)", size: "48%" }, // spec
      ],
      grid: "rgba(148,163,184,0.035)",
    },
  },
  {
    name: "Slate", // the original lighter graphite, with a faint grid
    bg: {
      kind: "mesh",
      base: "#0d1117",
      glows: [
        { x: "12%", y: "18%", color: "rgba(52,211,153,0.10)", size: "42%" },
        { x: "88%", y: "26%", color: "rgba(251,146,60,0.08)", size: "40%" },
        { x: "62%", y: "92%", color: "rgba(167,139,250,0.07)", size: "46%" },
      ],
      grid: "rgba(148,163,184,0.05)",
    },
  },
  { name: "Void", bg: { kind: "solid", color: "#0a0a0f" } },
];

/**
 * Tiny reactive store so the backdrop can change mid-presentation without
 * threading state through every slide. `Backdrop` subscribes via
 * `useSyncExternalStore`. `getBackdrop` returns a stable object per index
 * (same reference until a cycle), which keeps the store snapshot stable.
 */
let bdIndex = 0;
const bdListeners = new Set<() => void>();
export function getBackdrop(): Backdrop {
  return BACKDROPS[bdIndex].bg;
}
export function getBackdropName(): string {
  return BACKDROPS[bdIndex].name;
}
export function cycleBackdrop(dir: 1 | -1 = 1): void {
  bdIndex = (bdIndex + dir + BACKDROPS.length) % BACKDROPS.length;
  bdListeners.forEach((f) => f());
}
export function subscribeBackdrop(fn: () => void): () => void {
  bdListeners.add(fn);
  return () => bdListeners.delete(fn);
}

/** Back-compat default (= first preset). */
export const backdrop: Backdrop = BACKDROPS[0].bg;

export const brand = {
  // ── IDENTITY ──────────────────────────────────────────────────────────
  /** Shown as the deck wordmark / running footer. TODO: your company name. */
  wordmark: "The Harness Model",
  /** Small kicker under the wordmark on the title slide. */
  tagline: "harness engineering · field notes",

  /**
   * Logo. TODO(branding): paste your company logo here as an inline SVG
   * string (preferred — scales crisply, inherits currentColor) or set
   * `src` to an imported asset. `null` renders a built-in monogram mark.
   */
  logo: null as { svg?: string; src?: string } | null,

  // ── TYPOGRAPHY ────────────────────────────────────────────────────────
  /**
   * TODO(branding): swap these for your brand fonts. If you add a webfont,
   * register it in apps/slides/index.html / index.css first, then name it
   * here. Defaults lean on the system stack already loaded by the app.
   */
  font: {
    display: '"Inter Display", Inter, system-ui, sans-serif', // big headlines / numerals
    body: "Inter, system-ui, sans-serif",
    mono: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
  },

  // ── PALETTE ───────────────────────────────────────────────────────────
  palette: {
    // canvas + ink
    bg: "#0d1117",
    surface: "rgba(255,255,255,0.022)",
    surfaceSolid: "#0f141b",
    border: "rgba(148,163,184,0.16)",
    text: "#cbd5e1",
    textBright: "#f1f5f9",
    textMid: "#94a3b8",
    textDim: "#64748b",

    // three actors — keep mutually distinct after a rebrand
    agent: "#34d399", // the LLM — generation, crosses both probabilistic hops
    intent: "#fbbf24", // the human want — elicitation, never crosses
    validator: "#fb923c", // the watcher — validation/verdict; contingent on the agent being unproven

    // artifacts / phenomena of the world model
    spec: "#a78bfa", // specification / record
    code: "#60a5fa", // code / runtime / observation / evidence
    behavior: "#2dd4bf", // exhibited behavior
    rose: "#fb7185", // the risky code↔spec binding membrane

    // the settled, proven, lower-tower / neutral-framing past
    proven: "#8ea0b5",
    // a warm note for the once-human translators of history
    human: "#d9a066",
  },

  // ── BACKDROP ──────────────────────────────────────────────────────────
  // Defined above as a `Backdrop`-typed value so every variant stays valid.
  backdrop,
} as const;

export type Brand = typeof brand;

/** Convenience alias so slides can write `P.agent` instead of `brand.palette.agent`. */
export const P = brand.palette;
export const F = brand.font;
