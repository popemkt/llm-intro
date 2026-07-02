import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { SlideProps } from "@/types";
import { Frame, EASE } from "./_frame";
import { P, F } from "./branding";

/* the four hand-labor roles that died */
const DEAD = [
  { who: "the analyst", tag: "need → intent" },
  { who: "the spec reviewer", tag: "draft → sign-off" },
  { who: "the programmer", tag: "intent → code" },
  { who: "the code reviewer", tag: "spec → code" },
];

type Trait = { kind: "wk" | "st"; h: string; lever: string };
type Actor = { id: string; who: string; tag: string; color: string; traits: Trait[] };

/* the three who replaced them — quirks + the lever that tames each */
const ACTORS: Actor[] = [
  {
    id: "agent",
    who: "AGENT",
    tag: "does · crosses both hops",
    color: P.agent,
    traits: [
      {
        kind: "wk",
        h: "stateless — blank every run",
        lever: "memory: specs, learnings, CHANGELOG",
      },
      {
        kind: "wk",
        h: "no built-in verdict — can't feel wrong",
        lever: "programmatic sensors: tests, drift, lint",
      },
      {
        kind: "st",
        h: "fully programmable — inputs, tools, loop",
        lever: "sandboxes, fixed entrypoints, MCP",
      },
      {
        kind: "wk",
        h: "stochastic — same input, different output",
        lever: "keep the validator; wrap each hop in discipline",
      },
      { kind: "st", h: "cheap & parallel — no fatigue", lever: "exhaustive drafts, broad review" },
    ],
  },
  {
    id: "intent",
    who: "INTENT HOLDER",
    tag: "wants · never crosses",
    color: P.intent,
    traits: [
      {
        kind: "wk",
        h: "holds tacit intent — can't fully state it",
        lever: "exhaustive interviewing; recommend + veto",
      },
      {
        kind: "st",
        h: "living reference — confirms 'that's what I meant'",
        lever: "sign-off = verdict; a spec makes it transferable",
      },
      { kind: "wk", h: "drifts — the want changes", lever: "a durable record freezes intent" },
      {
        kind: "wk",
        h: "scarce attention — won't read everything",
        lever: "keep the work legible & small",
      },
    ],
  },
  {
    id: "validator",
    who: "VALIDATOR",
    tag: "checks · contingent",
    color: P.validator,
    traits: [
      {
        kind: "wk",
        h: "judges output — fluent, confident, wrong",
        lever: "adversarial checks, not trust",
      },
      { kind: "wk", h: "expensive — burns attention", lever: "legible work + tests (pre-paid)" },
      {
        kind: "st",
        h: "transferable — any spec-reader can do it",
        lever: "the record moves the verdict off one head",
      },
    ],
  },
];

function DeadRole({ who, tag, i, show }: { who: string; tag: string; i: number; show: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={show ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: i * 0.3, duration: 0.4, ease: EASE }}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        padding: "3px 0",
      }}
    >
      <span style={{ fontFamily: F.body, fontSize: 15, fontWeight: 600, color: P.textMid }}>
        {who}
      </span>
      <span style={{ fontFamily: F.mono, fontSize: 10.5, color: P.textDim }}>{tag}</span>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={show ? { scaleX: 1 } : {}}
        transition={{ delay: i * 0.3 + 0.5, duration: 0.45, ease: EASE }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "52%",
          height: 2,
          background: P.proven,
          opacity: 0.7,
          transformOrigin: "left",
        }}
      />
    </motion.div>
  );
}

function ActorCard({
  actor,
  open,
  onToggle,
  show,
  delay,
}: {
  actor: Actor;
  open: boolean;
  onToggle: () => void;
  show: boolean;
  delay: number;
}) {
  const [lever, setLever] = useState<number | null>(null);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={show ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5, ease: EASE }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{
        borderLeft: `3px solid ${actor.color}`,
        background: open ? `${actor.color}10` : "rgba(255,255,255,0.02)",
        border: `1px solid ${actor.color}40`,
        borderLeftWidth: 3,
        borderRadius: 10,
        padding: "9px 13px",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            fontFamily: F.display,
            fontSize: 16,
            fontWeight: 800,
            color: actor.color,
            letterSpacing: 0.3,
          }}
        >
          {actor.who}
        </span>
        <span style={{ fontFamily: F.mono, fontSize: 10, color: P.textDim }}>{actor.tag}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ marginLeft: "auto", color: P.textDim, display: "flex" }}
        >
          <ChevronDown size={15} />
        </motion.span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 8 }}>
              {actor.traits.map((t, i) => {
                const isOpen = lever === i;
                const badge = t.kind === "wk" ? P.rose : P.agent;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.07, duration: 0.3 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLever(isOpen ? null : i);
                    }}
                    style={{ padding: "3px 0" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: badge,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontFamily: F.body, fontSize: 12, color: P.text }}>{t.h}</span>
                    </div>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: EASE }}
                          style={{ overflow: "hidden" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              paddingLeft: 14,
                              paddingTop: 3,
                            }}
                          >
                            <span style={{ color: actor.color, fontSize: 12 }}>↳</span>
                            <span
                              style={{
                                fontFamily: F.body,
                                fontSize: 11.5,
                                fontStyle: "italic",
                                color: P.agent,
                              }}
                            >
                              {t.lever}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Cast({ isActive }: SlideProps) {
  const [step, setStep] = useState(0); // 0 title · 1 dead listed · 2 new actors
  const [open, setOpen] = useState<string>("agent");
  const MAX = 2;

  return (
    <Frame
      isActive={isActive}
      eyebrow="2 · the cast"
      title="Who died, who took over"
      accent={P.validator}
    >
      <div
        onClick={() => setStep((s) => Math.min(MAX, s + 1))}
        style={{
          height: "100%",
          display: "grid",
          gridTemplateColumns: "0.8fr 1.2fr",
          gap: 28,
          alignContent: "start",
          cursor: step < MAX ? "pointer" : "default",
        }}
      >
        {/* dead column */}
        <div>
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 10.5,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: P.proven,
              marginBottom: 10,
            }}
          >
            ✗ the old hand-labor
          </div>
          <AnimatePresence>
            {step >= 1 &&
              DEAD.map((d, i) => (
                <DeadRole key={d.who} who={d.who} tag={d.tag} i={i} show={step >= 1} />
              ))}
          </AnimatePresence>
        </div>

        {/* alive column */}
        <div>
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 10.5,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: P.validator,
              marginBottom: 10,
            }}
          >
            ✓ the three who replaced them
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {step >= 2 &&
              ACTORS.map((a, i) => (
                <ActorCard
                  key={a.id}
                  actor={a}
                  open={open === a.id}
                  onToggle={() => setOpen(open === a.id ? "" : a.id)}
                  show={step >= 2}
                  delay={i * 0.18}
                />
              ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}
