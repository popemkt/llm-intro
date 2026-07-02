import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  brand,
  P,
  F,
  cycleBackdrop,
  getBackdrop,
  getBackdropName,
  subscribeBackdrop,
} from "./branding";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Paints a single backdrop recipe (no state). */
function BackdropFill({ b }: { b: ReturnType<typeof getBackdrop> }) {
  if (b.kind === "solid") {
    return <div style={{ position: "absolute", inset: 0, background: b.color }} />;
  }

  if (b.kind === "image") {
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <img src={b.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: b.overlay }} />
      </div>
    );
  }

  // mesh: base fill + soft radial glows + faint grid
  const glows = b.glows
    .map((g) => `radial-gradient(circle at ${g.x} ${g.y}, ${g.color}, transparent ${g.size})`)
    .join(", ");
  return (
    <div style={{ position: "absolute", inset: 0, background: b.base, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: glows }} />
      {b.grid && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(${b.grid} 1px, transparent 1px), linear-gradient(90deg, ${b.grid} 1px, transparent 1px)`,
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, #000 55%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 50% 45%, #000 55%, transparent 100%)",
          }}
        />
      )}
    </div>
  );
}

/**
 * Swappable deck background. Reads the live backdrop preset from `branding`
 * so a rebrand never touches a slide, and can switch mid-presentation:
 * press `b` for the next preset, `B` (shift) for the previous. A brief name
 * flash confirms the change. Renders behind all slide content (fill).
 */
export function Backdrop() {
  const b = useSyncExternalStore(subscribeBackdrop, getBackdrop, getBackdrop);
  const name = useSyncExternalStore(subscribeBackdrop, getBackdropName, getBackdropName);
  const [touched, setTouched] = useState(false); // suppress the flash on first load

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ignore while typing in an input/textarea/contenteditable
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "b") {
        setTouched(true);
        cycleBackdrop(1);
      } else if (e.key === "B") {
        setTouched(true);
        cycleBackdrop(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* cross-fade between presets so the swap is smooth, not a hard cut */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ position: "absolute", inset: 0 }}
        >
          <BackdropFill b={b} />
        </motion.div>
      </AnimatePresence>

      {/* name flash — confirms the live switch, then fades out */}
      <AnimatePresence>
        {touched && (
          <motion.div
            key={`flash-${name}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: [0, 1, 1, 0], y: 0 }}
            transition={{ duration: 1.6, ease: EASE, times: [0, 0.12, 0.7, 1] }}
            style={{
              position: "absolute",
              left: 16,
              bottom: 14,
              fontFamily: F.mono,
              fontSize: 11,
              letterSpacing: 1,
              color: P.textDim,
              pointerEvents: "none",
            }}
          >
            bg · {name}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The brand mark — company logo if provided, else a built-in monogram. */
export function Mark({ size = 22, color = P.textMid }: { size?: number; color?: string }) {
  if (brand.logo?.svg) {
    return (
      <span
        style={{ display: "inline-flex", width: size, height: size, color }}
        dangerouslySetInnerHTML={{ __html: brand.logo.svg }}
      />
    );
  }
  if (brand.logo?.src) {
    return <img src={brand.logo.src} alt="" style={{ height: size, width: "auto" }} />;
  }
  // built-in monogram: a small "crossing" glyph — two membranes + a watcher dot
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <line
        x1="8"
        y1="3"
        x2="8"
        y2="21"
        stroke={P.intent}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="3"
        x2="16"
        y2="21"
        stroke={P.validator}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
        stroke={P.agent}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
      <circle cx="20" cy="5" r="2" fill={P.validator} />
    </svg>
  );
}

/**
 * Shared chrome for harness code-backed slides. Fills the fixed 1000×562.5
 * logical canvas (SlideShell scales it). Header + footer animate in on
 * activation; the body fills the remaining space.
 */
export function Frame({
  children,
  isActive,
  eyebrow,
  title,
  accent = P.validator,
  footer = true,
  pad = "44px 56px 40px",
}: {
  children: React.ReactNode;
  isActive: boolean;
  eyebrow?: string;
  title?: React.ReactNode;
  accent?: string;
  footer?: boolean;
  pad?: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        color: P.text,
        fontFamily: F.body,
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Backdrop />
      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: pad,
          boxSizing: "border-box",
        }}
      >
        {(eyebrow || title) && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: EASE }}
            style={{ flexShrink: 0 }}
          >
            {eyebrow && (
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 12,
                  color: accent,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 9,
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <span style={{ width: 22, height: 1.5, background: accent, opacity: 0.7 }} />
                {eyebrow}
              </div>
            )}
            {title && (
              <h1
                style={{
                  fontFamily: F.display,
                  fontSize: 31,
                  fontWeight: 700,
                  letterSpacing: -0.4,
                  margin: 0,
                  lineHeight: 1.12,
                  color: P.textBright,
                }}
              >
                {title}
              </h1>
            )}
          </motion.div>
        )}

        <div style={{ flex: 1, minHeight: 0, marginTop: title ? 20 : 0, position: "relative" }}>
          {children}
        </div>

        {footer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{
              flexShrink: 0,
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: F.mono,
              fontSize: 10.5,
              letterSpacing: 0.6,
              color: P.textDim,
            }}
          >
            <Mark size={15} />
            <span style={{ color: P.textMid }}>{brand.wordmark}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/**
 * The "poof" effect — a one-shot particle burst + shock ring, centered on its
 * parent. Plays on mount (render it the moment a thing appears). pointer-events
 * off so it never eats clicks.
 *
 * TODO(standardize): `Pop` below is meant to become the deck-wide way to reveal
 * ANY element (icon, chip, card) with a little poof. Migrate ad-hoc reveals onto
 * it so motion stays consistent across slides.
 */
/**
 * Starburst spark-dashes in a ring around (0,0). Each spoke is a fixed-length
 * dash that SLIDES outward along its ray — a moving window cut from a full-ray
 * line via stroke-dasharray + animated stroke-dashoffset. Both ends travel; the
 * dash slides in from the center and off the rim, leaving nothing behind (no
 * grow-from-center, no lingering dot). Drop inside any `<svg>`/`<g>`.
 *
 * Shaping to an object: pass `pts` = points sampled along the object's outline
 * (each {x, y, a} with `a` the outward-normal angle). Spokes then emit from the
 * silhouette instead of a circle. With no `pts`, it falls back to a radius-`size`
 * circle of `count` evenly-spaced spokes.
 */
export function BurstLines({
  color = "#ffd23f",
  size = 26,
  count = 9,
  delay = 0,
  sw = 2.2,
  reach = 0.7,
  pts,
}: {
  color?: string;
  size?: number;
  count?: number;
  delay?: number;
  sw?: number;
  reach?: number;
  pts?: { x: number; y: number; a: number }[];
}) {
  const spokes =
    pts ??
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + 0.2;
      return { x: Math.cos(a) * size, y: Math.sin(a) * size, a };
    });

  return (
    <>
      {spokes.map((s, i) => {
        const len = size * reach; // how far the spark travels outward
        const L = len * 0.45; // dash length
        const x2 = s.x + Math.cos(s.a) * len;
        const y2 = s.y + Math.sin(s.a) * len;
        return (
          <motion.line
            key={i}
            x1={s.x}
            y1={s.y}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${L} ${len + L + 40}`}
            initial={{ strokeDashoffset: L }}
            animate={{ strokeDashoffset: -(len + L) }}
            transition={{ duration: 0.55, ease: "easeOut", delay: delay + i * 0.02 }}
          />
        );
      })}
    </>
  );
}

export function Poof({
  color = "#ffd23f",
  size = 34,
  count = 9,
}: {
  color?: string;
  size?: number;
  count?: number;
}) {
  const ext = size * 2; // roomy enough for the ring + outward spark travel
  return (
    <svg
      viewBox={`${-ext} ${-ext} ${ext * 2} ${ext * 2}`}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: ext * 2,
        height: ext * 2,
        transform: "translate(-50%, -50%)",
        overflow: "visible",
        pointerEvents: "none",
        zIndex: 2,
      }}
      aria-hidden
    >
      <BurstLines color={color} size={size} count={count} />
    </svg>
  );
}

/** Reveal any element with a springy pop + a poof behind it. Mount = play. */
export function Pop({
  children,
  color,
  poof = true,
  size,
  delay = 0,
}: {
  children: React.ReactNode;
  color?: string;
  poof?: boolean;
  size?: number;
  delay?: number;
}) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {poof && <Poof color={color} size={size} />}
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 18, delay }}
        style={{ display: "inline-flex" }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** Small inline legend chip used to key the three actors. */
export function ActorKey({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
      <span style={{ fontSize: 11.5, color: P.textMid }}>{label}</span>
    </span>
  );
}

export { EASE };
