import { motion } from "motion/react";
import { P, F } from "./branding";
import { BurstLines } from "./_frame";

/**
 * Shared tower diagram for 1a (history) and 1b (today). Same viewBox so the deck
 * match-cuts between them via the fade slide transition (no layoutId — a
 * layout-tracked element replays on canvas rescale; see slide 01/02 comments).
 * The tower itself stays identical across the cut; "today" layers changes ON TOP
 * in stages (guard processes → fuse the two validators into one that slides LEFT
 * to point at the probabilistic nature), nothing is abruptly removed.
 *
 * Geometry note: viewBox has a NEGATIVE left margin so a "NATURE" gutter
 * (deterministic / probabilistic) lives to the left of the layer labels without
 * disturbing any of the tower coordinates. Both variants share it so the morph
 * stays stable.
 */

const X0 = 210;
const X1 = 452;
const NODE_CX = (X0 + X1) / 2; // 331
const NODE_W = 148;
const CHIP_X = X1 + 22; // 474
const CHIP_W = 126;
const T = 0.45;

// left margin: where the fused validator settles
const GUT_BOX_X = -120; // fused-validator box, left edge
const GUT_BOX_W = 112; // -> right edge at -8
const CHAR_X = X0 - 14; // per-hop characteristic label, right-anchored
const CHAR_TARGET_X = 150; // connector aim point on the probabilistic labels

export const LEVELS = [
  { y: 44, label: "Intent" },
  { y: 110, label: "Natural language specifications" },
  { y: 176, label: "High-level code" },
  { y: 242, label: "Assembly" },
  { y: 308, label: "Machine code" },
  { y: 374, label: "Hardware" },
];

type Kind = "proven" | "ai";
type Hop = {
  id: string;
  top: number;
  human: string;
  machine: string;
  validator: string;
  autoEra: number;
  kind: Kind;
  guard?: { label: string; color: string };
};

export const HOPS: Hop[] = [
  {
    id: "h5",
    top: 0,
    human: "human analyst",
    machine: "agent + intent holder",
    validator: "product owner",
    autoEra: 4,
    kind: "ai",
    guard: { label: "elicitation", color: P.intent },
  },
  {
    id: "h4",
    top: 1,
    human: "human programmer",
    machine: "agent (LLM)",
    validator: "code reviewer",
    autoEra: 4,
    kind: "ai",
    guard: { label: "code ⇄ spec binding", color: P.rose },
  },
  {
    id: "h3",
    top: 2,
    human: "hand-written asm",
    machine: "compiler",
    validator: "desk-checker",
    autoEra: 3,
    kind: "proven",
  },
  {
    id: "h2",
    top: 3,
    human: "hand-assembled",
    machine: "assembler",
    validator: "proofreader",
    autoEra: 2,
    kind: "proven",
  },
  {
    id: "h1",
    top: 4,
    human: "human operator",
    machine: "CPU fetch–exec",
    validator: "second operator",
    autoEra: 1,
    kind: "proven",
  },
];

export function hopStatus(hop: Hop, era: number): "human" | "proven" | "ai" {
  if (era < hop.autoEra) return "human";
  return hop.kind === "ai" ? "ai" : "proven";
}

/** spokes spread along a whole floor line, firing up & down (shaped to the floor). */
function floorBurst(y: number) {
  const N = 5;
  const out: { x: number; y: number; a: number }[] = [];
  for (let k = 0; k < N; k++) {
    const x = X0 + ((k + 0.5) / N) * (X1 - X0);
    out.push({ x, y, a: -Math.PI / 2 });
    out.push({ x, y, a: Math.PI / 2 });
  }
  return out;
}

const cyOf = (top: number) => (LEVELS[top].y + LEVELS[top + 1].y) / 2;
const cy5 = cyOf(0); // 77  — top hop
const cy4 = cyOf(1); // 143 — second hop
const TOP2_MID = (cy5 + cy4) / 2; // 110

/** squiggly water line around y=0 spanning [x0,x1]; startUp flips the phase. */
function wavyPath(x0: number, x1: number, startUp: boolean, amp = 3.6, wl = 22) {
  let d = `M ${x0} 0`;
  let up = startUp;
  for (let x = x0; x < x1; x += wl) {
    const nx = Math.min(x + wl, x1);
    d += ` Q ${(x + nx) / 2} ${up ? -amp : amp} ${nx} 0`;
    up = !up;
  }
  return d;
}

function ColHead({
  x,
  label,
  anchor = "middle",
}: {
  x: number;
  label: string;
  anchor?: "middle" | "start" | "end";
}) {
  return (
    <text
      x={x}
      y={20}
      textAnchor={anchor}
      fontFamily={F.mono}
      fontSize={8.5}
      letterSpacing={1.5}
      fill={P.textDim}
    >
      {label}
    </text>
  );
}

function TranslatorNode({
  cy,
  status,
  human,
  machine,
  showTrace,
}: {
  cy: number;
  status: "human" | "proven" | "ai";
  human: string;
  machine: string;
  showTrace: boolean;
}) {
  const isHuman = status === "human";
  const accent = status === "ai" ? P.agent : status === "proven" ? P.proven : P.human;
  const fill =
    status === "ai"
      ? "rgba(52,211,153,0.10)"
      : status === "proven"
        ? "rgba(142,160,181,0.07)"
        : "rgba(217,160,102,0.08)";
  return (
    <g transform={`translate(${NODE_CX} ${cy})`}>
      <rect
        x={-NODE_W / 2}
        y={-13}
        width={NODE_W}
        height={26}
        rx={7}
        fill={fill}
        stroke={accent}
        strokeOpacity={0.55}
        style={{ transition: `fill ${T}s, stroke ${T}s` }}
      />
      <text
        x={0}
        y={4}
        textAnchor="middle"
        fontFamily={F.body}
        fontSize={12}
        fontWeight={600}
        fill={accent}
        style={{ transition: `fill ${T}s` }}
      >
        {isHuman ? human : machine}
      </text>
      {showTrace && (
        <text
          x={0}
          y={-19}
          textAnchor="middle"
          fontFamily={F.body}
          fontSize={7.5}
          fill={P.human}
          opacity={isHuman ? 0 : 0.45}
          style={{ transition: `opacity ${T}s` }}
        >
          once · {human}
        </text>
      )}
    </g>
  );
}

function ValidatorChip({
  cy,
  status,
  name,
}: {
  cy: number;
  status: "human" | "proven" | "ai";
  name: string;
}) {
  const map = {
    human: { stroke: P.textDim, fill: "transparent", text: P.textMid },
    proven: { stroke: "transparent", fill: "rgba(142,160,181,0.07)", text: P.proven },
    ai: { stroke: P.validator, fill: "rgba(251,146,60,0.10)", text: P.validator },
  }[status];
  return (
    <g
      transform={`translate(${CHIP_X} ${cy})`}
      style={{ transition: `opacity ${T}s`, opacity: status === "proven" ? 0.7 : 1 }}
    >
      <rect
        x={0}
        y={-11}
        width={CHIP_W}
        height={22}
        rx={6}
        fill={map.fill}
        stroke={map.stroke}
        strokeOpacity={0.6}
        style={{ transition: `fill ${T}s, stroke ${T}s` }}
      />
      {status === "ai" && <circle cx={11} cy={0} r={3} fill={P.validator} />}
      {status === "proven" && (
        <path
          d="M 7 0 l 3 3 l 5 -6"
          fill="none"
          stroke={P.proven}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <text
        x={status === "human" ? 10 : 20}
        y={3}
        fontFamily={F.body}
        fontSize={9}
        fill={map.text}
        style={{ transition: `fill ${T}s` }}
      >
        {name}
      </text>
    </g>
  );
}

/** the deterministic / probabilistic nature of a hop — drawn BETWEEN the layers,
 *  in the left margin at the hop's midline. */
function charOf(status: "human" | "proven" | "ai") {
  if (status === "ai") return { t: "probabilistic", c: P.agent };
  if (status === "proven") return { t: "deterministic", c: P.proven };
  return { t: "by hand", c: P.human };
}

export function Tower({
  variant,
  era,
  entrance = false,
  stage = 0,
}: {
  variant: "history" | "today";
  era: number;
  entrance?: boolean;
  stage?: number; // today reveal: 0 identical · 1 nature · 2 guards · 3 fuse validators
}) {
  const today = variant === "today";
  const e = today ? 4 : era;
  const aiActive = e >= 4;
  const FRONTIER_Y = [LEVELS[5].y, LEVELS[4].y, LEVELS[3].y, LEVELS[2].y, LEVELS[2].y];
  const frontierY = FRONTIER_Y[e];
  const charVisible = today ? stage >= 1 : true;

  return (
    <svg viewBox="-128 0 770 440" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <ColHead x={X0 - 14} label="LAYER" anchor="end" />
      <ColHead x={NODE_CX} label="TRANSLATOR" />
      <ColHead x={CHIP_X + CHIP_W / 2} label="VALIDATOR" />

      <rect
        x={X0 - 6}
        y={frontierY}
        width={X1 - X0 + 12}
        height={LEVELS[5].y - frontierY}
        fill="rgba(142,160,181,0.05)"
        style={{ transition: `y ${T}s ease, height ${T}s ease` }}
      />
      <rect
        x={X0 - 6}
        y={LEVELS[0].y}
        width={X1 - X0 + 12}
        height={LEVELS[2].y - LEVELS[0].y}
        fill="rgba(52,211,153,0.05)"
        opacity={aiActive ? 1 : 0}
        style={{ transition: `opacity ${T}s` }}
      />

      {/* levels — floor-by-floor on entrance */}
      {LEVELS.map((lv, i) => {
        const content = (
          <>
            <line
              x1={X0}
              y1={lv.y}
              x2={X1}
              y2={lv.y}
              stroke={P.text}
              strokeOpacity={0.45}
              strokeWidth={1.4}
            />
            <text
              x={X0 - 14}
              y={lv.y + 3.5}
              textAnchor="end"
              fontFamily={F.body}
              fontSize={10}
              fill={P.textBright}
              fontWeight={600}
            >
              {lv.label}
            </text>
          </>
        );
        // floors build slowly, one by one (bottom → top), each with a poof along
        // the whole floor. Always a motion.g (no element-type swap → no remount
        // replay); initial={false} when not entering so it just sits there.
        const d = 0.35 + (LEVELS.length - 1 - i) * 0.22;
        return (
          <motion.g
            key={lv.label}
            initial={entrance ? { opacity: 0, x: -14 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={
              entrance ? { duration: 0.55, delay: d, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }
            }
          >
            {content}
            {entrance && (
              <BurstLines
                pts={floorBurst(lv.y)}
                color="#ffd23f"
                size={10}
                reach={1.1}
                sw={1.4}
                delay={d + 0.15}
              />
            )}
          </motion.g>
        );
      })}

      {/* proven frontier — a STANDING blue "water" line (undulates in place, no
          drift). Only in history; removed in the today tower. */}
      {!today && (
        <g
          transform={`translate(0 ${frontierY})`}
          style={{ transition: `transform ${T}s ease`, opacity: e === 0 ? 0 : 1 }}
        >
          <motion.path
            d={wavyPath(X0 - 6, CHIP_X + CHIP_W, true)}
            animate={{
              d: [
                wavyPath(X0 - 6, CHIP_X + CHIP_W, true),
                wavyPath(X0 - 6, CHIP_X + CHIP_W, false),
                wavyPath(X0 - 6, CHIP_X + CHIP_W, true),
              ],
            }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            fill="none"
            stroke={P.code}
            strokeWidth={1.8}
            strokeLinecap="round"
            opacity={0.85}
          />
        </g>
      )}

      {/* hops: translators + (history) per-hop validators */}
      {HOPS.map((hop) => {
        const status = hopStatus(hop, e);
        const cy = cyOf(hop.top);
        const topAi = today && hop.kind === "ai";
        const ch = charOf(status);
        return (
          <g key={hop.id}>
            {/* nature of the hop — between the layers, left margin */}
            <text
              x={CHAR_X}
              y={cy + 3}
              textAnchor="end"
              fontFamily={F.mono}
              fontSize={8}
              fontStyle="italic"
              fill={ch.c}
              opacity={charVisible ? 0.95 : 0}
              style={{ transition: `opacity ${T}s` }}
            >
              {ch.t}
            </text>
            {!topAi && (
              <line
                x1={NODE_CX + NODE_W / 2}
                y1={cy}
                x2={CHIP_X}
                y2={cy}
                stroke={P.textDim}
                strokeOpacity={0.4}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            )}
            <TranslatorNode
              cy={cy}
              status={status}
              human={hop.human}
              machine={hop.machine}
              showTrace={false}
            />
            {!topAi && <ValidatorChip cy={cy} status={status} name={hop.validator} />}
          </g>
        );
      })}

      {today && <TodayLayers stage={stage} />}
    </svg>
  );
}

/* All "today" stage annotations, layered on top of the identical tower. */
function TodayLayers({ stage }: { stage: number }) {
  const fused = stage >= 3;
  const boxCX = GUT_BOX_X + GUT_BOX_W / 2; // -64 (final, left)
  const RIGHT_CX = CHIP_X + CHIP_W / 2; // 537 (merge point, right)
  const slideX = RIGHT_CX - boxCX; // how far right the box starts before sliding left

  return (
    <>
      {/* stage 2: the two guard processes, sitting INSIDE the tower under each top translator */}
      {HOPS.filter((h) => h.guard).map((h) => {
        const cy = cyOf(h.top);
        return (
          <g
            key={`guard-${h.id}`}
            style={{ transition: "opacity 0.4s" }}
            opacity={stage >= 2 ? 1 : 0}
          >
            <rect
              x={NODE_CX - 64}
              y={cy + 15}
              width={128}
              height={17}
              rx={8.5}
              fill={`${h.guard!.color}1f`}
              stroke={h.guard!.color}
              strokeOpacity={0.7}
            />
            <text
              x={NODE_CX}
              y={cy + 26.5}
              textAnchor="middle"
              fontFamily={F.body}
              fontSize={8.5}
              fontWeight={600}
              fill={h.guard!.color}
            >
              {h.guard!.label}
            </text>
            {stage >= 2 && (
              <g transform={`translate(${NODE_CX} ${cy + 23.5})`}>
                <BurstLines color={h.guard!.color} size={13} count={7} sw={1.4} />
              </g>
            )}
          </g>
        );
      })}

      {/* the two top validators — present from stage 0; at stage 3 they converge
          to one point (merge in place, on the right) while fading. */}
      {[
        { cy: cy5, name: "product owner" },
        { cy: cy4, name: "code reviewer" },
      ].map((v, i) => (
        <motion.g
          key={`tv-${i}`}
          animate={{ y: fused ? TOP2_MID - v.cy : 0, opacity: fused ? 0 : 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <line
            x1={NODE_CX + NODE_W / 2}
            y1={v.cy}
            x2={CHIP_X}
            y2={v.cy}
            stroke={P.textDim}
            strokeOpacity={0.4}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <g transform={`translate(${CHIP_X} ${v.cy})`}>
            <rect
              x={0}
              y={-11}
              width={CHIP_W}
              height={22}
              rx={6}
              fill="rgba(251,146,60,0.10)"
              stroke={P.validator}
              strokeOpacity={0.6}
            />
            <circle cx={11} cy={0} r={3} fill={P.validator} />
            <text x={20} y={3} fontFamily={F.body} fontSize={9} fill={P.validator}>
              {v.name}
            </text>
          </g>
        </motion.g>
      ))}

      {/* the fused validator BOX — appears at the merge point (right), holds a
          beat, then slides LEFT. (Children drawn at the final-left coords; the
          group translates +slideX → 0.) */}
      <motion.g
        initial={false}
        animate={
          fused
            ? { opacity: [0, 1, 1, 1], x: [slideX, slideX, 0, 0], scale: [0.85, 1, 1, 1] }
            : { opacity: 0, x: slideX, scale: 0.85 }
        }
        transition={
          fused
            ? { duration: 1.7, times: [0, 0.28, 0.78, 1], ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.3 }
        }
        style={{ transformOrigin: `${boxCX}px ${TOP2_MID}px` }}
      >
        <rect
          x={GUT_BOX_X}
          y={TOP2_MID - 17}
          width={GUT_BOX_W}
          height={34}
          rx={8}
          fill="rgba(251,146,60,0.14)"
          stroke={P.validator}
          strokeOpacity={0.75}
        />
        <circle cx={GUT_BOX_X + 16} cy={TOP2_MID} r={3.5} fill={P.validator} />
        <text
          x={boxCX + 8}
          y={TOP2_MID + 3.5}
          textAnchor="middle"
          fontFamily={F.body}
          fontSize={10}
          fontWeight={700}
          fill={P.validator}
        >
          one validator
        </text>
      </motion.g>

      {/* connectors — fade in only AFTER the box has settled on the left, so it
          visibly takes control of the two probabilistic characteristics. */}
      <motion.g
        animate={fused ? { opacity: 1 } : { opacity: 0 }}
        transition={fused ? { duration: 0.4, delay: 1.25 } : { duration: 0.2 }}
      >
        <line
          x1={GUT_BOX_X + GUT_BOX_W}
          y1={TOP2_MID}
          x2={CHAR_TARGET_X}
          y2={cy5}
          stroke={P.validator}
          strokeOpacity={0.6}
          strokeWidth={1.2}
        />
        <line
          x1={GUT_BOX_X + GUT_BOX_W}
          y1={TOP2_MID}
          x2={CHAR_TARGET_X}
          y2={cy4}
          stroke={P.validator}
          strokeOpacity={0.6}
          strokeWidth={1.2}
        />
        <circle cx={CHAR_TARGET_X} cy={cy5} r={2.6} fill={P.validator} />
        <circle cx={CHAR_TARGET_X} cy={cy4} r={2.6} fill={P.validator} />
      </motion.g>

      {/* poof when the fused validator settles on the left */}
      {fused && (
        <g transform={`translate(${boxCX} ${TOP2_MID})`}>
          <BurstLines color={P.validator} size={20} count={8} sw={1.8} delay={1.2} />
        </g>
      )}
    </>
  );
}

export { X0, X1, CHIP_X, CHIP_W, NODE_CX };
