import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SlideProps } from "@/types";
import { Frame, EASE } from "./_frame";
import { P, F } from "./branding";
import { Tower } from "./_tower";

// short prose — one beat each (people read one thing at a time)
const ERAS = [
  {
    year: "pre-1945",
    label: "All by hand",
    note: "Every layer crossed by a human — and watched by another.",
  },
  { year: "~1949", label: "The machine", note: "The CPU becomes proven. Its watcher retires." },
  {
    year: "~1952",
    label: "The assembler",
    note: "Proven, repeatable. Another watcher goes quiet.",
  },
  { year: "1957", label: "The compiler", note: "A mis-compile is a bug, not a coin-flip." },
  {
    year: "2023 →",
    label: "The agent",
    note: "AI takes the top two — but unproven. The watcher stays.",
  },
];

/* one integrated control: ‹ track-with-dots › */
function Scrubber({
  era,
  setEra,
  n,
  accent,
}: {
  era: number;
  setEra: (n: number) => void;
  n: number;
  accent: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pick = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setEra(Math.max(0, Math.min(n - 1, Math.round(((clientX - r.left) / r.width) * (n - 1)))));
  };
  const Arrow = ({ dir }: { dir: -1 | 1 }) => {
    const disabled = dir === -1 ? era === 0 : era === n - 1;
    const Icon = dir === -1 ? ChevronLeft : ChevronRight;
    return (
      <button
        onClick={() => setEra(Math.max(0, Math.min(n - 1, era + dir)))}
        disabled={disabled}
        aria-label={dir === -1 ? "previous era" : "next era"}
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          background: "none",
          border: "none",
          padding: 0,
          color: P.agent,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.25 : 1,
          transition: "opacity 0.15s",
        }}
      >
        <Icon size={20} strokeWidth={2.5} />
      </button>
    );
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Arrow dir={-1} />
      <div
        ref={trackRef}
        onPointerDown={(ev) => {
          dragging.current = true;
          (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
          pick(ev.clientX);
        }}
        onPointerMove={(ev) => dragging.current && pick(ev.clientX)}
        onPointerUp={() => (dragging.current = false)}
        style={{
          position: "relative",
          flex: 1,
          height: 22,
          cursor: "pointer",
          touchAction: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 0,
            right: 0,
            height: 3,
            borderRadius: 2,
            background: "rgba(148,163,184,0.25)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 0,
            width: `${(era / (n - 1)) * 100}%`,
            height: 3,
            borderRadius: 2,
            background: accent,
            transition: "width 0.25s ease, background 0.3s",
          }}
        />
        {Array.from({ length: n }).map((_, i) => (
          <span
            key={i}
            onPointerDown={(ev) => {
              ev.stopPropagation();
              setEra(i);
            }}
            style={{
              position: "absolute",
              top: "50%",
              left: `${(i / (n - 1)) * 100}%`,
              transform: "translate(-50%, -50%)",
              width: i === era ? 13 : 9,
              height: i === era ? 13 : 9,
              borderRadius: "50%",
              background: i <= era ? accent : "rgba(148,163,184,0.4)",
              boxShadow: i === era ? `0 0 0 3px ${P.bg}, 0 0 0 4px ${accent}` : "none",
              transition: "all 0.2s ease",
            }}
          />
        ))}
      </div>
      <Arrow dir={1} />
    </div>
  );
}

export default function TowerHistory({ isActive }: SlideProps) {
  // Plain local state. The earlier replay bug was the tower wrapper's `layoutId`
  // re-projecting on canvas rescale (bottom-bar autohide) — NOT a remount — so no
  // cross-remount persistence is needed now that the layoutId is gone. Resize
  // never touches this; only real navigation remounts, which SHOULD replay the
  // build when you re-enter the slide.
  const [revealed, setRevealed] = useState(false);
  const [building, setBuilding] = useState(false); // drives the floor-by-floor build
  const [era, setEra] = useState(0);
  const e = ERAS[era];
  const aiActive = era >= 4;

  // floors finish at ~0.35 + 5*0.22 + 0.55 ≈ 2.0s; reveal the rail just after
  const RAIL_DELAY = 1.9;

  // stop "entrance" after the build window so later re-renders don't re-fire it
  useEffect(() => {
    if (!building) return;
    const t = setTimeout(() => setBuilding(false), 2800);
    return () => clearTimeout(t);
  }, [building]);

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    setBuilding(true); // floors build every time the slide is revealed
  };

  return (
    <Frame isActive={isActive} accent={P.human} footer pad="44px 56px 40px">
      <div
        onClick={reveal}
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          cursor: revealed ? "default" : "pointer",
        }}
      >
        {/* title — starts centered, flies to the top on first click.
            Pure transform (y/scale), NOT `layout` → immune to canvas-rescale /
            remount reprojection that was replaying the animation. */}
        <motion.div
          animate={{ y: revealed ? 0 : 200, scale: revealed ? 1 : 1.42 }}
          transition={{ duration: 0.85, ease: EASE }}
          style={{ transformOrigin: "left center", flexShrink: 0 }}
        >
          <h1
            style={{
              fontFamily: F.display,
              fontSize: 31,
              fontWeight: 800,
              color: P.textBright,
              margin: 0,
              letterSpacing: -0.6,
              lineHeight: 1.1,
            }}
          >
            The tower of abstraction
          </h1>
          <AnimatePresence>
            {!revealed && (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.6 }}
                style={{ marginTop: 14, fontFamily: F.mono, fontSize: 12, color: P.textDim }}
              >
                every translator was once human
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* revealed body — floors build slowly, then the rail fades in */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              key="body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                marginTop: 16,
              }}
            >
              <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 24 }}>
                {/* left rail — appears after the tower has built */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: RAIL_DELAY, ease: EASE }}
                  style={{ width: 248, flexShrink: 0, display: "flex", flexDirection: "column" }}
                >
                  <span
                    style={{ fontFamily: F.mono, fontSize: 13, color: P.human, letterSpacing: 1 }}
                  >
                    {e.year}
                  </span>
                  <div
                    style={{
                      fontFamily: F.display,
                      fontSize: 25,
                      fontWeight: 800,
                      color: P.textBright,
                      letterSpacing: -0.5,
                      marginTop: 2,
                    }}
                  >
                    {e.label}
                  </div>
                  <div style={{ position: "relative", minHeight: 56, marginTop: 12 }}>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={era}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        style={{ fontSize: 14, lineHeight: 1.55, color: P.text, margin: 0 }}
                      >
                        {e.note}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <div style={{ marginTop: "auto" }}>
                    <Scrubber
                      era={era}
                      setEra={setEra}
                      n={ERAS.length}
                      accent={aiActive ? P.validator : P.agent}
                    />
                  </div>
                </motion.div>

                {/* the tower — builds floor by floor (one-shot `entrance`).
                    NO layoutId/layout here: any layout-tracked element re-projects
                    when SlideShell's `transform: scale()` changes (e.g. the preview
                    bottom bar autohiding), which replayed the whole intro. A plain
                    div never re-animates on resize. */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Tower variant="history" era={era} entrance={building} />
                </div>
              </div>

              {/* payoff — short, only at the agent era */}
              <div style={{ flexShrink: 0, height: 30, marginTop: 4 }}>
                <AnimatePresence>
                  {aiActive && (
                    <motion.div
                      key="payoff"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      style={{
                        textAlign: "center",
                        fontSize: 13,
                        color: P.textMid,
                        borderTop: `1px solid ${P.border}`,
                        paddingTop: 7,
                      }}
                    >
                      A proven translator retires its watcher. An{" "}
                      <b style={{ color: P.agent }}>unproven</b> one can&apos;t —{" "}
                      <b style={{ color: P.validator }}>that&apos;s harness engineering.</b>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Frame>
  );
}
