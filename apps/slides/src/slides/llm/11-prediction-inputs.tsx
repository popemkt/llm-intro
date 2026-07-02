import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, useAnimationControls } from "motion/react";
import {
  Clock,
  DollarSign,
  X,
  ArrowLeftRight,
  Shuffle,
  CloudRain,
  Sun,
  Waves,
  Cpu,
  Sparkles,
  GraduationCap,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";

/* ──────────────────────────────────────────────────────────────────────────
 * Bridge slide: word-predictor → context window.
 *
 * Colour grammar inherited from 02-linear-regression — applied to TEXT:
 *   • green  (T.accent) = the CONTEXT (your input / lever)
 *   • yellow (#eab308)  = the MODEL, and the predicted word it emits
 *   • probability is produced by BOTH → bars fill green→yellow.
 *
 * One rectangle: CONTEXT + MODEL (equal panels) combine into one PROBABILITY
 * row. The model alone doesn't own the output.
 *
 * Interactions:
 *   • swap context → free; only the FIRST sentence re-streams L→R, the second
 *     sentence stays put, the predicted word just swaps.
 *   • pick a model radio, then press SWAP → costs (−⏱ then −$, sequential);
 *     reshapes the bars.
 *   • press TRAIN → never allowed: shake + sequential −$ −$ −$.
 * ────────────────────────────────────────────────────────────────────────── */

const Y = "#eab308"; // model colour (matches linear-regression)
const TIME = "#60a5fa"; // time meter
const MONEY = "#fbbf24"; // money meter

// resource costs per action (out of 100)
const SWAP_COST = { time: 16, money: 12 };
const TRAIN_COST = { time: 8, money: 28 };
const MAX_TRAIN = 4; // accuracy bumps cap out

interface Candidate {
  tok: string;
  pct: number;
}

const FIXED = "So I'll grab my"; // second sentence; final word is the prediction

interface Preset {
  id: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  context: string;
  base: Candidate[]; // "true" ranking; models reshape it
}
const PRESETS: Preset[] = [
  {
    id: "rain",
    icon: CloudRain,
    iconColor: "#60a5fa",
    context: "Looks like rain today.",
    base: [
      { tok: "umbrella", pct: 60 },
      { tok: "coat", pct: 18 },
      { tok: "jacket", pct: 13 },
      { tok: "keys", pct: 9 },
    ],
  },
  {
    id: "hot",
    icon: Sun,
    iconColor: "#fb923c",
    context: "It's blazing hot out.",
    base: [
      { tok: "sunglasses", pct: 55 },
      { tok: "hat", pct: 22 },
      { tok: "water", pct: 14 },
      { tok: "keys", pct: 9 },
    ],
  },
  {
    id: "beach",
    icon: Waves,
    iconColor: "#22d3ee",
    context: "We're off to the beach.",
    base: [
      { tok: "towel", pct: 52 },
      { tok: "sunscreen", pct: 26 },
      { tok: "hat", pct: 13 },
      { tok: "keys", pct: 9 },
    ],
  },
];

interface Model {
  id: string;
  name: string;
  size: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  temp: number; // <1 sharpen, >1 flatten
}
const MODELS: Model[] = [
  { id: "gpt2", name: "GPT-2", size: "124M", icon: Cpu, temp: 2.6 },
  { id: "llama", name: "Llama-8B", size: "8B", icon: Cpu, temp: 1.0 },
  { id: "claude", name: "Claude", size: "frontier", icon: Sparkles, temp: 0.55 },
];

/** Reshape a base distribution by a model's temperature (power transform). */
function shape(base: Candidate[], temp: number): Candidate[] {
  const w = base.map((c) => Math.pow(c.pct, 1 / temp));
  const sum = w.reduce((a, b) => a + b, 0);
  const out = base.map((c, i) => ({ tok: c.tok, pct: Math.round((w[i] / sum) * 100) }));
  out[0].pct += 100 - out.reduce((a, c) => a + c.pct, 0); // fix rounding on the top bar
  return out;
}

// Keep content in a centred, square-ish column (canvas is ~562 tall);
// the full 1000px width is reserved for content that genuinely needs it.
const COL = 600;

interface Pop {
  key: number;
  icon: React.ReactNode;
  color: string;
  delay: number;
}

function LaneLabel({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontFamily: "JetBrains Mono, monospace",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color,
      }}
    >
      {text}
    </span>
  );
}

export default function PredictionInputs({ isActive }: SlideProps) {
  const [sel, setSel] = useState(0);
  const [activeModel, setActiveModel] = useState(1); // drives the bars (Llama default)
  const [pendingModel, setPendingModel] = useState(1); // radio selection
  const [revealed, setRevealed] = useState(0); // first-sentence tokens streamed
  const [pops, setPops] = useState<Pop[]>([]);
  const [time, setTime] = useState(100); // resource meters
  const [money, setMoney] = useState(100);
  const [trainLvl, setTrainLvl] = useState(0); // accuracy bumps from training
  const popId = useRef(0);
  const shakeCtrls = useAnimationControls();

  const preset = PRESETS[sel];
  // training sharpens (lowers effective temperature) → top probability rises a little
  const temp = MODELS[activeModel].temp * Math.pow(0.82, trainLvl);
  const dist = useMemo(() => shape(preset.base, temp), [preset, temp]);
  const predicted = dist[0].tok;
  const armed = pendingModel !== activeModel;
  const canSwap = armed && time >= SWAP_COST.time && money >= SWAP_COST.money;
  const canTrain = trainLvl < MAX_TRAIN && time >= TRAIN_COST.time && money >= TRAIN_COST.money;

  const ctxTokens = preset.context.split(" ");
  const n1 = ctxTokens.length;

  // stream ONLY the first sentence, on context swap / activation
  useEffect(() => {
    if (!isActive) {
      setRevealed(0);
      setSel(0);
      setActiveModel(1);
      setPendingModel(1);
      setPops([]);
      setTime(100);
      setMoney(100);
      setTrainLvl(0);
      return;
    }
    setRevealed(0);
    const id = setInterval(() => {
      setRevealed((r) => {
        if (r >= n1) {
          clearInterval(id);
          return r;
        }
        return r + 1;
      });
    }, 70);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, isActive]);

  const pushPops = (items: Omit<Pop, "key">[]) =>
    setPops((p) => [...p, ...items.map((it) => ({ ...it, key: ++popId.current }))]);
  const removePop = (key: number) => setPops((p) => p.filter((x) => x.key !== key));

  const shake = () => shakeCtrls.start({ x: [0, -7, 7, -5, 5, 0], transition: { duration: 0.4 } });

  const doSwap = () => {
    if (!armed) return;
    if (!canSwap) return shake(); // out of budget
    setActiveModel(pendingModel);
    setTime((t) => Math.max(0, t - SWAP_COST.time));
    setMoney((m) => Math.max(0, m - SWAP_COST.money));
    pushPops([
      { icon: <Clock size={15} />, color: TIME, delay: 0 },
      { icon: <DollarSign size={15} />, color: MONEY, delay: 0.3 },
    ]);
  };
  const doTrain = () => {
    if (!canTrain) return shake(); // too expensive / maxed out
    setTrainLvl((l) => Math.min(MAX_TRAIN, l + 1));
    setTime((t) => Math.max(0, t - TRAIN_COST.time));
    setMoney((m) => Math.max(0, m - TRAIN_COST.money));
    pushPops([
      { icon: <DollarSign size={15} />, color: MONEY, delay: 0 },
      { icon: <DollarSign size={15} />, color: MONEY, delay: 0.18 },
      { icon: <TrendingUp size={15} />, color: T.accent, delay: 0.42 }, // +accuracy
    ]);
  };

  const showCursor = revealed < n1;

  const innerCard: React.CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    padding: "11px 14px 12px",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: T.bg,
        color: T.text,
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "22px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", maxWidth: COL, display: "flex", flexDirection: "column" }}>
        {/* ── Title ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{ textAlign: "center", marginBottom: 12 }}
        >
          <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-0.4px" }}>
            You steer the <span style={{ color: T.accent }}>next word</span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: T.textDim,
              fontFamily: "JetBrains Mono, monospace",
              marginTop: 4,
            }}
          >
            only 2 axes steerable: <span style={{ color: T.accent }}>context</span>,{" "}
            <span style={{ color: Y }}>model</span>
          </div>
        </motion.div>

        {/* ── Content (no extra bounding frame) ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* top row: equal CONTEXT + MODEL */}
          <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
            {/* CONTEXT (green) */}
            <div style={{ flex: "1 1 0", minWidth: 0, display: "flex" }}>
              <div
                style={{
                  ...innerCard,
                  border: `1px solid ${T.accent}40`,
                  background: `${T.accent}08`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                  <LaneLabel text="context" color={T.accent} />
                  <span style={{ fontSize: 9, color: T.textDim }}>your lever · free</span>
                </div>

                {/* swappable marker + colored chips */}
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      color: T.accent,
                      fontSize: 9,
                      fontFamily: "JetBrains Mono, monospace",
                      fontWeight: 700,
                    }}
                  >
                    <Shuffle size={11} color={T.accent} /> swap
                  </span>
                  {PRESETS.map((p, i) => {
                    const on = i === sel;
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSel(i)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "4px 11px",
                          borderRadius: 999,
                          cursor: "pointer",
                          fontSize: 11,
                          fontFamily: "JetBrains Mono, monospace",
                          border: on ? `1.5px solid ${p.iconColor}` : `1.5px dashed ${T.muted}`,
                          background: on ? `${p.iconColor}1e` : "rgba(255,255,255,0.03)",
                          color: on ? p.iconColor : T.textDim,
                          transition: "all 0.2s",
                        }}
                      >
                        <Icon size={12} color={p.iconColor} />
                        {p.id}
                      </button>
                    );
                  })}
                </div>

                {/* sentences */}
                <div
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 16,
                    lineHeight: 1.7,
                    marginTop: "auto",
                  }}
                >
                  {/* row 1 — streams L→R, green */}
                  <div style={{ color: T.accent, fontWeight: 700, minHeight: 27 }}>
                    {ctxTokens.map((t, i) => (i < revealed ? `${t} ` : "")).join("")}
                    {showCursor && <Caret />}
                  </div>
                  {/* row 2 — fixed; only predicted word swaps */}
                  <div style={{ color: T.textDim, minHeight: 27 }}>
                    {FIXED}{" "}
                    <span style={{ position: "relative", display: "inline-block" }}>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={predicted}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.22 }}
                          style={{
                            display: "inline-block",
                            color: Y,
                            fontWeight: 800,
                            borderBottom: `2px solid ${Y}`,
                            paddingBottom: 1,
                          }}
                        >
                          {predicted}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    <span style={{ color: T.textDim }}>.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MODEL (yellow) — outer entrance, inner shake */}
            <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", position: "relative" }}>
              <motion.div
                animate={shakeCtrls}
                style={{
                  ...innerCard,
                  width: "100%",
                  border: `1px solid ${Y}44`,
                  background: `${Y}0a`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <LaneLabel text="model" color={Y} />
                  <span style={{ fontSize: 9, color: T.textDim }}>pick one, then swap</span>
                  <button
                    onClick={() => {
                      setTime(100);
                      setMoney(100);
                      setTrainLvl(0);
                    }}
                    title="refill budget"
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      color: T.muted,
                    }}
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>

                {/* radios */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {MODELS.map((m, i) => {
                    const sel2 = i === pendingModel;
                    const live = i === activeModel;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setPendingModel(i)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "5px 9px",
                          borderRadius: 8,
                          cursor: "pointer",
                          border: sel2 ? `1.5px solid ${Y}` : `1.5px solid ${T.border}`,
                          background: sel2 ? `${Y}1c` : "rgba(255,255,255,0.02)",
                          transition: "all 0.2s",
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            flexShrink: 0,
                            border: `2px solid ${sel2 ? Y : T.muted}`,
                            background: sel2 ? Y : "transparent",
                          }}
                        />
                        <Icon size={13} color={sel2 ? Y : T.textDim} />
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: "JetBrains Mono, monospace",
                            fontWeight: sel2 ? 700 : 500,
                            color: sel2 ? T.text : T.textDim,
                          }}
                        >
                          {m.name}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            fontFamily: "JetBrains Mono, monospace",
                            color: T.muted,
                          }}
                        >
                          {m.size}
                        </span>
                        {live && (
                          <span
                            style={{
                              marginLeft: "auto",
                              fontSize: 8,
                              fontFamily: "JetBrains Mono, monospace",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              color: Y,
                              border: `1px solid ${Y}66`,
                              borderRadius: 4,
                              padding: "1px 5px",
                            }}
                          >
                            LIVE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* resource meters */}
                <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 11 }}>
                  <Meter icon={<Clock size={11} color={TIME} />} value={time} color={TIME} />
                  <Meter
                    icon={<DollarSign size={11} color={MONEY} />}
                    value={money}
                    color={MONEY}
                  />
                </div>

                {/* swap / train */}
                <div style={{ display: "flex", gap: 8, paddingTop: 9 }}>
                  <button
                    onClick={doSwap}
                    disabled={!armed}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "7px 8px",
                      borderRadius: 8,
                      cursor: canSwap ? "pointer" : "default",
                      border: `1.5px solid ${canSwap ? Y : T.border}`,
                      background: canSwap ? `${Y}1e` : "rgba(255,255,255,0.02)",
                      opacity: canSwap ? 1 : 0.5,
                      transition: "all 0.2s",
                    }}
                  >
                    <ArrowLeftRight size={13} color={canSwap ? Y : T.textDim} />
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "JetBrains Mono, monospace",
                        fontWeight: 700,
                        color: canSwap ? Y : T.textDim,
                      }}
                    >
                      swap
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        color: canSwap ? Y : T.muted,
                      }}
                    >
                      <Clock size={10} />
                      <DollarSign size={10} />
                    </span>
                  </button>

                  <button
                    onClick={doTrain}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "7px 8px",
                      borderRadius: 8,
                      cursor: canTrain ? "pointer" : "default",
                      border: `1.5px solid ${canTrain ? MONEY : T.border}`,
                      background: canTrain ? `${MONEY}18` : "rgba(255,255,255,0.02)",
                      opacity: canTrain ? 1 : 0.5,
                      transition: "all 0.2s",
                    }}
                  >
                    <GraduationCap size={13} color={canTrain ? MONEY : T.textDim} />
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "JetBrains Mono, monospace",
                        fontWeight: 700,
                        color: canTrain ? MONEY : T.textDim,
                      }}
                    >
                      {trainLvl >= MAX_TRAIN ? "maxed" : "train"}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        color: canTrain ? MONEY : T.muted,
                      }}
                    >
                      <DollarSign size={10} />
                      <DollarSign size={10} />
                    </span>
                  </button>
                </div>

                {/* sequential cost pop-ups */}
                <AnimatePresence>
                  {pops.map((p) => (
                    <motion.div
                      key={p.key}
                      initial={{ opacity: 0, y: 0, scale: 0.7 }}
                      animate={{ opacity: 1, y: -34, scale: 1 }}
                      exit={{ opacity: 0, y: -48 }}
                      transition={{ delay: p.delay, duration: 0.65 }}
                      onAnimationComplete={() => removePop(p.key)}
                      style={{
                        position: "absolute",
                        bottom: 42,
                        right: 24,
                        color: p.color,
                        fontFamily: "JetBrains Mono, monospace",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        pointerEvents: "none",
                      }}
                    >
                      − {p.icon}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>

          {/* combine connector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span style={{ color: T.accent, fontSize: 13 }}>↓</span>
            <LaneLabel text="combine → probability" color={T.textDim} />
            <span style={{ color: Y, fontSize: 13 }}>↓</span>
          </div>

          {/* PROBABILITY (full width) */}
          <div
            style={{
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: "rgba(255,255,255,0.02)",
              padding: "11px 16px 13px",
            }}
          >
            <div style={{ marginBottom: 9 }}>
              <LaneLabel text="next-word probability" color={T.textDim} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {dist.map((c, i) => {
                const isTop = i === 0;
                return (
                  <div key={c.tok} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 96,
                        flexShrink: 0,
                        textAlign: "right",
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 13,
                        fontWeight: isTop ? 700 : 500,
                        color: isTop ? Y : T.textDim,
                      }}
                    >
                      {c.tok}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 12,
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.05)",
                        overflow: "hidden",
                      }}
                    >
                      <motion.div
                        key={`${preset.id}-${activeModel}-${c.tok}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${c.pct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
                        style={{
                          height: "100%",
                          borderRadius: 6,
                          background: `linear-gradient(90deg, ${T.accent}, ${Y})`,
                          opacity: isTop ? 0.95 : 0.4,
                          boxShadow: isTop ? `0 0 10px ${T.accent}44` : "none",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        width: 32,
                        flexShrink: 0,
                        textAlign: "right",
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 11,
                        fontWeight: isTop ? 700 : 500,
                        color: isTop ? Y : T.textDim,
                      }}
                    >
                      {c.pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* resource meter (time / money) */
function Meter({ icon, value, color }: { icon: React.ReactNode; value: number; color: string }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 5 }}>
      {icon}
      <div
        style={{
          flex: 1,
          height: 7,
          borderRadius: 4,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <motion.div
          animate={{ width: `${value}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
          style={{
            height: "100%",
            borderRadius: 4,
            background: color,
            opacity: value > 0 ? 0.9 : 0,
          }}
        />
      </div>
    </div>
  );
}

/* blinking caret for the token stream */
function Caret() {
  return (
    <motion.span
      animate={{ opacity: [1, 0.1, 1] }}
      transition={{ repeat: Infinity, duration: 0.9 }}
      style={{ color: T.accent, fontWeight: 700 }}
    >
      ▌
    </motion.span>
  );
}
