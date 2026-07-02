import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { SlideProps } from "@/types";
import { Frame, EASE } from "./_frame";
import { P, F } from "./branding";
import { Tower } from "./_tower";

const STAGES = [
  "The same tower, today.",
  "Top two hops: probabilistic. Lower three: proven.",
  "Each probabilistic hop gets a guard.",
  "Two validators → one, holding probability down.",
];

export default function TowerToday({ isActive }: SlideProps) {
  const [stage, setStage] = useState(0);
  const max = STAGES.length - 1;

  return (
    <Frame
      isActive={isActive}
      eyebrow="The same tower, today"
      title="Where the problem lives"
      accent={P.rose}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div
          onClick={(ev) => {
            ev.stopPropagation();
            setStage((s) => Math.min(max, s + 1));
          }}
          style={{
            flex: 1,
            minHeight: 0,
            position: "relative",
            cursor: stage < max ? "pointer" : "default",
          }}
        >
          {/* the tower — stages layer on top.
              Continuity from slide 1a is a PLAIN-TRANSFORM glide (no layoutId/
              layout): in 1a the tower sits right of the 248px rail; here it's
              centered/full, so on enter it starts shifted-right + a touch smaller
              and settles into place while the deck's fade crossfades the chrome.
              Plain transform runs once on mount/navigation and — unlike a
              layout-tracked element — never re-fires on canvas rescale. */}
          <motion.div
            initial={{ x: 56, scale: 0.93 }}
            animate={{ x: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{ width: "100%", height: "100%", transformOrigin: "center center" }}
          >
            <Tower variant="today" era={4} stage={stage} />
          </motion.div>

          {/* hint before first advance */}
          <AnimatePresence>
            {stage === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.7 }}
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 4,
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: F.mono,
                  fontSize: 11,
                  color: P.textMid,
                  border: `1px solid ${P.border}`,
                  borderRadius: 999,
                  padding: "5px 14px",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: P.rose }} />
                click to dig in — where does the harness live?
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* caption + progress */}
        <div
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 16, marginTop: 6 }}
        >
          <div style={{ position: "relative", flex: 1, minHeight: 30 }}>
            <AnimatePresence mode="wait">
              <motion.p
                key={stage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: EASE }}
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: stage >= max ? P.textBright : P.text,
                }}
              >
                {STAGES[stage]}
              </motion.p>
            </AnimatePresence>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            {STAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setStage(i)}
                aria-label={`stage ${i + 1}`}
                style={{
                  width: i === stage ? 11 : 8,
                  height: i === stage ? 11 : 8,
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  background: i <= stage ? P.validator : "rgba(148,163,184,0.35)",
                  transition: "all 0.2s",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}
