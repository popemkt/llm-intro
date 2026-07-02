import { useEffect, useState } from "react";
import { motion, LayoutGroup } from "motion/react";
import type { SlideProps } from "@/types";
import { Frame, Pop, EASE } from "./_frame";
import { P, F } from "./branding";

/* Twemoji 👍 / 👎 (1f44d / 1f44e), CC-BY 4.0 — the open stand-in for Apple's
   proprietary emoji art. Embedded verbatim so they render as real glossy thumbs. */
const THUMB_UP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 36 36"><path fill="#FFDB5E" d="M34.956 17.916c0-.503-.12-.975-.321-1.404-1.341-4.326-7.619-4.01-16.549-4.221-1.493-.035-.639-1.798-.115-5.668.341-2.517-1.282-6.382-4.01-6.382-4.498 0-.171 3.548-4.148 12.322-2.125 4.688-6.875 2.062-6.875 6.771v10.719c0 1.833.18 3.595 2.758 3.885C8.195 34.219 7.633 36 11.238 36h18.044c1.838 0 3.333-1.496 3.333-3.334 0-.762-.267-1.456-.698-2.018 1.02-.571 1.72-1.649 1.72-2.899 0-.76-.266-1.454-.696-2.015 1.023-.57 1.725-1.649 1.725-2.901 0-.909-.368-1.733-.961-2.336.757-.611 1.251-1.535 1.251-2.581z"/><path fill="#EE9547" d="M23.02 21.249h8.604c1.17 0 2.268-.626 2.866-1.633.246-.415.109-.952-.307-1.199-.415-.247-.952-.108-1.199.307-.283.479-.806.775-1.361.775h-8.81c-.873 0-1.583-.71-1.583-1.583s.71-1.583 1.583-1.583H28.7c.483 0 .875-.392.875-.875s-.392-.875-.875-.875h-5.888c-1.838 0-3.333 1.495-3.333 3.333 0 1.025.475 1.932 1.205 2.544-.615.605-.998 1.445-.998 2.373 0 1.028.478 1.938 1.212 2.549-.611.604-.99 1.441-.99 2.367 0 1.12.559 2.108 1.409 2.713-.524.589-.852 1.356-.852 2.204 0 1.838 1.495 3.333 3.333 3.333h5.484c1.17 0 2.269-.625 2.867-1.632.247-.415.11-.952-.305-1.199-.416-.245-.953-.11-1.199.305-.285.479-.808.776-1.363.776h-5.484c-.873 0-1.583-.71-1.583-1.583s.71-1.583 1.583-1.583h6.506c1.17 0 2.27-.626 2.867-1.633.247-.416.11-.953-.305-1.199-.419-.251-.954-.11-1.199.305-.289.487-.799.777-1.363.777h-7.063c-.873 0-1.583-.711-1.583-1.584s.71-1.583 1.583-1.583h8.091c1.17 0 2.269-.625 2.867-1.632.247-.415.11-.952-.305-1.199-.417-.246-.953-.11-1.199.305-.289.486-.799.776-1.363.776H23.02c-.873 0-1.583-.71-1.583-1.583s.709-1.584 1.583-1.584z"/></svg>';
const THUMB_DOWN =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 36 36"><path fill="#FFDB5E" d="M34.956 18.084c0 .503-.12.975-.321 1.404-1.341 4.326-7.619 4.01-16.549 4.221-1.493.035-.639 1.798-.115 5.668.341 2.517-1.282 6.382-4.01 6.382-4.498 0-.171-3.548-4.148-12.322-2.125-4.688-6.875-2.062-6.875-6.771V5.948c0-1.833.18-3.595 2.758-3.885C8.195 1.781 7.633 0 11.238 0h18.044c1.838 0 3.333 1.496 3.333 3.334 0 .762-.267 1.456-.698 2.018 1.02.571 1.72 1.649 1.72 2.899 0 .76-.266 1.454-.696 2.015 1.023.57 1.725 1.649 1.725 2.901 0 .909-.368 1.733-.961 2.336.757.611 1.251 1.535 1.251 2.581z"/><path fill="#EE9547" d="M23.02 14.751h8.604c1.17 0 2.268.626 2.866 1.633.246.415.109.952-.307 1.199-.415.247-.952.108-1.199-.307-.283-.479-.806-.775-1.361-.775h-8.81c-.873 0-1.583.71-1.583 1.583s.71 1.583 1.583 1.583H28.7c.483 0 .875.392.875.875s-.392.875-.875.875h-5.888c-1.838 0-3.333-1.495-3.333-3.333 0-1.025.475-1.932 1.205-2.544-.615-.605-.998-1.445-.998-2.373 0-1.028.478-1.938 1.212-2.549-.611-.604-.99-1.441-.99-2.367 0-1.12.559-2.108 1.409-2.713-.524-.589-.852-1.356-.852-2.204 0-1.838 1.495-3.333 3.333-3.333h5.484c1.17 0 2.269.625 2.867 1.632.247.415.11.952-.305 1.199-.416.245-.953.11-1.199-.305-.285-.479-.808-.776-1.363-.776h-5.484c-.873 0-1.583.71-1.583 1.583s.71 1.583 1.583 1.583h6.506c1.17 0 2.27.626 2.867 1.633.247.416.11.953-.305 1.199-.419.251-.954.11-1.199-.305-.289-.487-.799-.777-1.363-.777h-7.063c-.873 0-1.583.711-1.583 1.584s.71 1.583 1.583 1.583h8.091c1.17 0 2.269.625 2.867 1.632.247.415.11.952-.305 1.199-.417.246-.953.11-1.199-.305-.289-.486-.799-.776-1.363-.776H23.02c-.873 0-1.583.71-1.583 1.583s.709 1.584 1.583 1.584z"/></svg>';

function Thumb({ up, size = 44 }: { up: boolean; size?: number }) {
  return (
    <span
      style={{ display: "inline-flex", width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: up ? THUMB_UP : THUMB_DOWN }}
    />
  );
}

const GLYPHS = ["0x91c7", "0x2e08", "0xbb3d", "0x7a15", "0x06da", "0x4af2"];

// shared 5-col grid: intent · → · keyword · → · result. Same template on the
// header and every row so the keyword column lines up across rows.
const COLS = "1fr 26px auto 26px 1fr";

/** the keyword — survives the fade and flies to the translator column.
 *  No box (a box reads cheap): just bold, colored text. */
function Keyword({ id, text, color }: { id: string; text: string; color: string }) {
  // same size on both sides → the shared-layout morph only moves it, never snaps scale
  return (
    <motion.span
      layoutId={id}
      layout
      transition={{ layout: { duration: 1.05, ease: EASE } }}
      style={{ color, fontWeight: 800, fontFamily: F.display, fontSize: 30, whiteSpace: "nowrap" }}
    >
      {text}
    </motion.span>
  );
}

const ROWS = [
  {
    id: "kw-ai",
    num: "90%",
    numColor: P.rose,
    kw: "AI",
    color: P.agent,
    up: false,
    tag: "random — never the same twice",
  },
  {
    id: "kw-comp",
    num: "100%",
    numColor: P.agent,
    kw: "a compiler",
    color: P.textMid,
    up: true,
    tag: "deterministic — same every time",
  },
];

const Arrow = ({ show, delay }: { show: boolean; delay: number }) => (
  <motion.span
    animate={{ opacity: show ? 1 : 0 }}
    transition={{ duration: 0.45, delay: show ? delay : 0 }}
    style={{ color: P.textDim, fontSize: 18 }}
  >
    →
  </motion.span>
);

export default function Title({ isActive }: SlideProps) {
  const [step, setStep] = useState(0);
  const MAX = 7;
  // transition phases: 0 sentences · 1 fade others · 2 move words · 3 reveal rest
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (step < 7) {
      setPhase(0);
      return;
    }
    setPhase(1); // fade everything except the two words
    const t1 = setTimeout(() => setPhase(2), 650); // then flow the words into place
    const t2 = setTimeout(() => setPhase(3), 650 + 1250); // after the morph settles, reveal the rest
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step]);

  const [rng, setRng] = useState(GLYPHS[0]);
  useEffect(() => {
    if (phase < 3 || !isActive) return;
    const id = setInterval(() => setRng(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]), 1000);
    return () => clearInterval(id);
  }, [phase, isActive]);

  const visText = [step >= 1, step >= 3];
  const visIcon = [step >= 2, step >= 4];
  const grid = phase >= 2;
  const reveal = phase >= 3; // the non-word elements

  return (
    <Frame isActive={isActive} accent={P.agent} pad="0 64px">
      <div
        onClick={(e) => {
          e.stopPropagation();
          setStep((s) => Math.min(MAX, s + 1));
        }}
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          cursor: step < MAX ? "pointer" : "default",
        }}
      >
        {/* ONE persistent tree — the keyword nodes NEVER unmount, so the
            sentence→grid move is a single `layout` glide. No AnimatePresence
            tree-swap (a fresh keyword mounting in a new tree was what teleported
            the word). Each row flips inline-prose → shared 5-col grid; prose
            fades out, the keyword glides to the translator column, then the grid
            scaffolding fades in around it. Children are keyed so React keeps the
            same keyword node across the layout change. */}
        <LayoutGroup>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              alignItems: "center",
              width: "100%",
              maxWidth: 620,
            }}
          >
            {/* header — over the translator column only; appears with the grid */}
            <div
              style={{ display: "grid", gridTemplateColumns: COLS, columnGap: 16, width: "100%" }}
            >
              <span />
              <span />
              <motion.div
                animate={{ opacity: reveal ? 1 : 0 }}
                transition={{ duration: 0.5, delay: reveal ? 0.45 : 0 }}
                style={{
                  fontFamily: F.mono,
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: P.textDim,
                  textAlign: "center",
                }}
              >
                translator
              </motion.div>
              <span />
              <span />
            </div>

            {ROWS.map((r, i) => {
              const base = 0.1 + i * 0.5; // grid extras: row 2 after row 1 settles
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={visText[i] ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  style={{
                    display: grid ? "grid" : "flex",
                    gridTemplateColumns: grid ? COLS : undefined,
                    alignItems: grid ? "center" : "baseline",
                    justifyContent: grid ? undefined : "center",
                    columnGap: 16,
                    gap: grid ? undefined : 8,
                    flexWrap: "wrap",
                    width: grid ? "100%" : "auto",
                    minHeight: 70,
                    fontFamily: F.display,
                    fontSize: 33,
                    fontWeight: 700,
                    letterSpacing: -0.5,
                    lineHeight: 1.12,
                    color: P.textBright,
                  }}
                >
                  {/* col 1 — prose lead OR "intent" */}
                  {grid ? (
                    <motion.span
                      key="lead"
                      animate={{ opacity: reveal ? 1 : 0 }}
                      transition={{ duration: 0.45, delay: reveal ? base : 0 }}
                      style={{
                        fontFamily: F.mono,
                        fontSize: 15,
                        color: P.textMid,
                        justifySelf: "end",
                      }}
                    >
                      intent
                    </motion.span>
                  ) : (
                    <motion.span
                      key="lead"
                      animate={{ opacity: phase >= 1 ? 0 : 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <span style={{ color: r.numColor, fontWeight: 800 }}>{r.num}</span> of my code
                      is written by{" "}
                    </motion.span>
                  )}

                  {/* col 2 — left arrow (grid only) */}
                  {grid && <Arrow key="al" show={reveal} delay={base + 0.1} />}

                  {/* col 3 — the keyword: persistent node, glides via `layout` */}
                  <span
                    key="kw"
                    style={{ justifySelf: grid ? "center" : undefined, display: "inline-flex" }}
                  >
                    <Keyword id={r.id} text={r.kw} color={r.color} />
                  </span>

                  {/* col 4 — right arrow (grid) OR sentence period */}
                  {grid ? (
                    <Arrow key="ar" show={reveal} delay={base + 0.25} />
                  ) : (
                    <motion.span
                      key="ar"
                      animate={{ opacity: phase >= 1 ? 0 : 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      .
                    </motion.span>
                  )}

                  {/* col 5 — result (grid) OR thumb (sentence) */}
                  {grid ? (
                    <motion.div
                      key="end"
                      animate={{ opacity: reveal ? 1 : 0 }}
                      transition={{ duration: 0.45, delay: reveal ? base + 0.35 : 0 }}
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <span
                        style={{
                          fontFamily: F.mono,
                          fontSize: 15,
                          fontWeight: 700,
                          color: P.textBright,
                        }}
                      >
                        {r.up ? "0x4af2" : rng}
                      </span>
                      <span style={{ fontFamily: F.body, fontSize: 13, color: r.color }}>
                        {r.tag}
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="end"
                      animate={{ opacity: phase >= 1 ? 0 : 1, scale: phase >= 1 ? 0.8 : 1 }}
                      transition={{ duration: 0.45 }}
                      style={{
                        width: 50,
                        height: 50,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {visIcon[i] && (
                        <Pop size={40}>
                          <Thumb up={r.up} />
                        </Pop>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}

            {/* Why? → the difference? — sentence phase only */}
            {!grid && (
              <motion.div
                animate={{ opacity: phase >= 1 ? 0 : 1 }}
                transition={{ duration: 0.5 }}
                style={{
                  height: 56,
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {step >= 5 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 20 }}
                    style={{
                      fontFamily: F.display,
                      fontSize: 44,
                      fontWeight: 800,
                      color: P.textBright,
                      letterSpacing: -1,
                    }}
                  >
                    Why
                    {step >= 6 && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        style={{ color: P.agent }}
                      >
                        {" "}
                        the difference
                      </motion.span>
                    )}
                    ?
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </LayoutGroup>
      </div>
    </Frame>
  );
}
