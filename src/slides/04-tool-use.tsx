import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { SlideProps } from '@/types'
import { FlowNode } from '@/design/FlowNode'
import { FlowArrow, ArrowDefs } from '@/design/FlowArrow'
import { T } from '@/design/tokens'

const W = 800
const H = 420

// ── node positions ──────────────────────────────────────────────────────────
const nodes = {
  user:   { x: 20,  y: 185, w: 110, h: 48 },
  llm:    { x: 180, y: 185, w: 110, h: 48 },
  output: { x: 340, y: 185, w: 110, h: 48 },
  match:  { x: 500, y: 185, w: 120, h: 48 },
  tool:   { x: 500, y: 305, w: 120, h: 48 },
  result: { x: 180, y: 305, w: 110, h: 48 },
}

type N = typeof nodes[keyof typeof nodes]
const cxN = (n: N) => n.x + n.w / 2
const cyN = (n: N) => n.y + n.h / 2
const crN = (n: N) => n.x + n.w
const clN = (n: N) => n.x
const cbN = (n: N) => n.y + n.h
const ctN = (n: N) => n.y

// ── prompts ─────────────────────────────────────────────────────────────────
const PROMPTS = [
  "What's the weather in Hanoi?",
  "What's the weather in HCM city?",
]

// ── belt tokens (flat, cumulative across both cycles) ───────────────────────
interface BeltToken { text: string; w: number; kind: 'token' | 'tool' | 'result' }

const ALL_BELT: BeltToken[] = [
  // Cycle 0
  { text: 'The',     w: 34, kind: 'token' },
  { text: 'weather', w: 52, kind: 'token' },
  { text: 'in',      w: 22, kind: 'token' },
  { text: '<tool>',  w: 48, kind: 'tool' },
  { text: '32°C',    w: 36, kind: 'result' },
  // Cycle 1
  { text: 'Let',     w: 26, kind: 'token' },
  { text: 'me',      w: 24, kind: 'token' },
  { text: 'check',   w: 40, kind: 'token' },
  { text: '<tool>',  w: 48, kind: 'tool' },
  { text: '35°C',    w: 36, kind: 'result' },
]

// Pre-compute belt X positions
const BELT_Y = 88
const CHIP_H = 20
const CHIP_GAP = 5
const BELT_START = clN(nodes.output) - 10

const beltPos: { x: number; w: number }[] = []
let _bx = BELT_START
for (const t of ALL_BELT) { beltPos.push({ x: _bx, w: t.w }); _bx += t.w + CHIP_GAP }

// ── step map (flat counter, cumulative) ─────────────────────────────────────
//
// Cycle 0 — build infrastructure:
//   0  User + prompt 1
//   1  Arrow→LLM, LLM
//   2  Arrow→Output, Output
//   3‥6  tokens 0‥3 (The, weather, in, <tool>)
//   7  Arrow→Match
//   8  Arrow→Tool Executor
//   9  Arrow→Result + result token (32°C) appended
//  10  Loop-back
//
// Cycle 1 — second prompt, everything stays:
//  11  Prompt 2 appended, arrows User→LLM→Output re-fire
//  12‥15  tokens 5‥8 (Let, me, check, <tool>)
//  16  Arrows cascade through + result token (35°C) + loop-back

const C0_LLM = 1
const C0_OUTPUT = 2
const C0_FIRST_TOKEN = 3
const C0_LAST_TOKEN  = 6   // 4 tokens
const C0_MATCH  = 7
const C0_TOOL   = 8
const C0_RESULT = 9
const C0_LOOP   = 10

const C1_START       = 11
const C1_FIRST_TOKEN = 12
const C1_LAST_TOKEN  = 15  // 4 tokens
const C1_FLOW        = 16

const MAX_STEP = C1_FLOW
const BLOCK_DELAY = 0.4

// Map step → how many belt tokens visible
function beltCountAt(s: number): number {
  if (s < C0_FIRST_TOKEN) return 0
  if (s <= C0_LAST_TOKEN) return s - C0_FIRST_TOKEN + 1          // 1‥4
  if (s < C0_RESULT) return 4
  if (s < C1_FIRST_TOKEN) return 5                                // +result
  if (s <= C1_LAST_TOKEN) return 5 + (s - C1_FIRST_TOKEN + 1)    // 6‥9
  return ALL_BELT.length                                          // 10
}

// Index of the token currently shown in the Output display (-1 = none)
function displayIdxAt(s: number): number {
  if (s >= C0_FIRST_TOKEN && s <= C0_LAST_TOKEN) return s - C0_FIRST_TOKEN
  if (s === C0_RESULT) return 4
  if (s >= C1_FIRST_TOKEN && s <= C1_LAST_TOKEN) return 5 + (s - C1_FIRST_TOKEN)
  if (s === C1_FLOW) return ALL_BELT.length - 1
  return -1
}

function tokenColor(t: BeltToken): string {
  if (t.kind === 'tool')   return T.highlight
  if (t.kind === 'result') return '#eab308' // yellow for tool results
  return T.accent
}

// ── component ───────────────────────────────────────────────────────────────
export default function ToolUse({ isActive }: SlideProps) {
  const { user, llm, output, match, tool, result } = nodes
  const [step, setStep] = useState(0)

  useEffect(() => { if (!isActive) setStep(0) }, [isActive])
  const advance = () => setStep(s => Math.min(s + 1, MAX_STEP))

  const beltCount  = beltCountAt(step)
  const displayIdx = displayIdxAt(step)
  const inCycle2   = step >= C1_START

  // Prompt chip widths
  const pw0 = PROMPTS[0].length * 4.4 + 14
  const pw1 = PROMPTS[1].length * 4.4 + 14
  const promptY0 = ctN(user) - 30
  const promptY1 = ctN(user) - 8

  return (
    <div
      onClick={advance}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
               background: T.bg, padding: '24px 32px', boxSizing: 'border-box',
               cursor: 'pointer', userSelect: 'none' }}
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 8 }}
      >
        <span style={{ fontSize: 'clamp(1rem, 2.2vw, 1.4rem)', fontWeight: 800, color: T.text }}>
          Claude = LLM + <span style={{ color: T.accent }}>tool use</span> = Agent
        </span>
      </motion.div>

      {/* SVG diagram */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, overflow: 'visible' }}>
          <ArrowDefs id="arr" color={T.muted} />
          <ArrowDefs id="arr-accent" color={T.accent} />

          {/* ═══ User block ═══ */}
          <FlowNode {...user} label="User" delay={0} isActive={isActive} />
          <motion.text
            x={cxN(user)} y={ctN(user) - 48}
            textAnchor="middle" fill={T.textDim} fontSize={9} fontFamily="Inter, sans-serif"
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            ① prompt
          </motion.text>

          {/* Prompt 1 chip (always visible) */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <rect
              x={cxN(user) - pw0 / 2} y={promptY0 - CHIP_H / 2}
              width={pw0} height={CHIP_H} rx={5}
              fill={T.surface} stroke={T.accent} strokeWidth={1.5}
            />
            <text
              x={cxN(user)} y={promptY0}
              textAnchor="middle" dominantBaseline="middle"
              fill={T.accent} fontSize={8}
              fontFamily="JetBrains Mono, monospace" fontWeight={500}
            >
              {PROMPTS[0]}
            </text>
          </motion.g>

          {/* Prompt 2 chip (appears at cycle 2) */}
          {inCycle2 && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <rect
                x={cxN(user) - pw1 / 2} y={promptY1 - CHIP_H / 2}
                width={pw1} height={CHIP_H} rx={5}
                fill={T.surface} stroke={T.accent} strokeWidth={1.5}
              />
              <text
                x={cxN(user)} y={promptY1}
                textAnchor="middle" dominantBaseline="middle"
                fill={T.accent} fontSize={8}
                fontFamily="JetBrains Mono, monospace" fontWeight={500}
              >
                {PROMPTS[1]}
              </text>
            </motion.g>
          )}

          {/* ═══ Arrow User→LLM + LLM block ═══ */}
          {step >= C0_LLM && (
            <>
              <FlowArrow
                key={`a-user-llm-${inCycle2 ? 1 : 0}`}
                d={`M${crN(user)} ${cyN(user)} L${clN(llm)} ${cyN(llm)}`}
                delay={0} isActive markerEnd="url(#arr)"
              />
              <FlowNode {...llm} label="LLM" delay={step === C0_LLM ? BLOCK_DELAY : 0} isActive accent />
              <motion.text
                x={cxN(llm)} y={ctN(llm) - 14}
                textAnchor="middle" fill={T.textDim} fontSize={9} fontFamily="Inter, sans-serif"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: step === C0_LLM ? BLOCK_DELAY : 0, duration: 0.3 }}
              >
                ② thinks
              </motion.text>
            </>
          )}

          {/* ═══ Arrow LLM→Output + Output block (factory) ═══ */}
          {step >= C0_OUTPUT && (
            <>
              <FlowArrow
                key={`a-llm-out-${inCycle2 ? 1 : 0}`}
                d={`M${crN(llm)} ${cyN(llm)} L${clN(output)} ${cyN(output)}`}
                delay={0} isActive markerEnd="url(#arr)"
              />

              {/* Output block with inner display screen */}
              <motion.g
                initial={step === C0_OUTPUT ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: step === C0_OUTPUT ? BLOCK_DELAY : 0, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: `${cxN(output)}px ${cyN(output)}px` }}
              >
                <rect x={output.x} y={output.y} width={output.w} height={output.h} rx={8}
                  fill={T.surface} stroke={T.border} strokeWidth={1} />
                <text
                  x={cxN(output)} y={output.y + 14}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={T.text} fontSize={11} fontFamily="Inter, sans-serif" fontWeight={600}
                >
                  Output
                </text>

                {/* Inner display screen */}
                <rect x={output.x + 12} y={output.y + 25} width={output.w - 24} height={18} rx={4}
                  fill={T.bg} stroke={T.border} strokeWidth={0.5} />

                {displayIdx >= 0 && (
                  <motion.text
                    key={`disp-${displayIdx}`}
                    x={cxN(output)} y={output.y + 34}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={tokenColor(ALL_BELT[displayIdx])}
                    fontSize={9} fontFamily="JetBrains Mono, monospace" fontWeight={600}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {ALL_BELT[displayIdx].text}
                  </motion.text>
                )}
              </motion.g>
            </>
          )}

          {/* ═══ Token conveyor belt (above blocks, cumulative) ═══ */}
          {beltCount > 0 && (
            <motion.text
              x={BELT_START} y={BELT_Y - CHIP_H / 2 - 6}
              textAnchor="start" fill={T.textDim} fontSize={9} fontFamily="Inter, sans-serif"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              ③ output tokens
            </motion.text>
          )}

          {ALL_BELT.slice(0, beltCount).map((tok, i) => {
            const { x, w } = beltPos[i]
            const col = tokenColor(tok)
            return (
              <motion.g
                key={`belt-${i}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ transformOrigin: `${x + w / 2}px ${BELT_Y}px` }}
              >
                <rect
                  x={x} y={BELT_Y - CHIP_H / 2} width={w} height={CHIP_H} rx={4}
                  fill={T.surface} stroke={col} strokeWidth={1.5}
                />
                <text
                  x={x + w / 2} y={BELT_Y}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={col}
                  fontSize={8} fontFamily="JetBrains Mono, monospace" fontWeight={500}
                >
                  {tok.text}
                </text>
                {tok.kind === 'tool' && (
                  <rect
                    x={x - 2} y={BELT_Y - CHIP_H / 2 - 2} width={w + 4} height={CHIP_H + 4} rx={6}
                    fill="none" stroke={T.highlight} strokeWidth={0.5} opacity={0.4}
                  />
                )}
              </motion.g>
            )
          })}

          {/* ═══ Arrow Output→Pattern Match ═══ */}
          {(step >= C0_MATCH || step >= C1_FLOW) && (
            <>
              <FlowArrow
                key={`a-out-match-${step >= C1_FLOW ? 1 : 0}`}
                d={`M${crN(output)} ${cyN(output)} L${clN(match)} ${cyN(match)}`}
                delay={0} isActive accent markerEnd="url(#arr-accent)"
              />
              <FlowNode {...match} label="Pattern Match" delay={step === C0_MATCH ? BLOCK_DELAY : 0} isActive />
              <motion.text
                x={cxN(match)} y={ctN(match) - 14}
                textAnchor="middle" fill={T.textDim} fontSize={9} fontFamily="Inter, sans-serif"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: step === C0_MATCH ? BLOCK_DELAY : 0, duration: 0.3 }}
              >
                ④ parse
              </motion.text>
            </>
          )}

          {/* ═══ Arrow Match→Tool Executor ═══ */}
          {(step >= C0_TOOL || step >= C1_FLOW) && (
            <>
              <FlowArrow
                key={`a-match-tool-${step >= C1_FLOW ? 1 : 0}`}
                d={`M${cxN(match)} ${cbN(match)} L${cxN(tool)} ${ctN(tool)}`}
                delay={step === C1_FLOW ? 0.4 : 0} isActive accent markerEnd="url(#arr-accent)"
              />
              <FlowNode {...tool} label="Tool Executor" delay={step === C0_TOOL ? BLOCK_DELAY : 0} isActive accent />
              <motion.text
                x={cxN(tool)} y={cbN(tool) + 18}
                textAnchor="middle" fill={T.textDim} fontSize={9} fontFamily="Inter, sans-serif"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: step === C0_TOOL ? BLOCK_DELAY : 0, duration: 0.3 }}
              >
                ⑤ execute
              </motion.text>
            </>
          )}

          {/* ═══ Arrow Tool→Result ═══ */}
          {(step >= C0_RESULT || step >= C1_FLOW) && (
            <>
              <FlowArrow
                key={`a-tool-result-${step >= C1_FLOW ? 1 : 0}`}
                d={`M${clN(tool)} ${cyN(tool)} L${crN(result)} ${cyN(result)}`}
                delay={step === C1_FLOW ? 0.8 : 0} isActive markerEnd="url(#arr)"
              />
              <FlowNode {...result} label="Result" delay={step === C0_RESULT ? BLOCK_DELAY : 0} isActive highlight />
              <motion.text
                x={cxN(result)} y={cbN(result) + 18}
                textAnchor="middle" fill={T.textDim} fontSize={9} fontFamily="Inter, sans-serif"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: step === C0_RESULT ? BLOCK_DELAY : 0, duration: 0.3 }}
              >
                ⑥ result → LLM
              </motion.text>
            </>
          )}

          {/* ═══ Loop-back arrow ═══ */}
          {(step >= C0_LOOP || step >= C1_FLOW) && (
            <>
              <FlowArrow
                key={`a-loop-${step >= C1_FLOW ? 1 : 0}`}
                d={`M${cxN(result)} ${ctN(result)} C${cxN(result)} ${ctN(result) - 50} ${cxN(llm)} ${ctN(llm) + 90} ${cxN(llm)} ${cbN(llm)}`}
                delay={step === C1_FLOW ? 1.2 : 0}
                isActive accent dashed markerEnd="url(#arr-accent)"
              />
              <motion.text
                key={`loop-label-${step >= C1_FLOW ? 1 : 0}`}
                x={(cxN(result) + cxN(llm)) / 2} y={cyN(result) - 30}
                textAnchor="middle" fill={T.accent} fontSize={9}
                fontFamily="Inter, sans-serif" fontWeight={600}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: step === C1_FLOW ? 1.4 : 0.5, duration: 0.4 }}
              >
                loop
              </motion.text>
            </>
          )}
        </svg>
      </div>

      {/* Bottom insight */}
      <AnimatePresence>
        {step >= C0_LOOP && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: step === C0_LOOP ? 0.6 : 0, duration: 0.4 }}
            style={{ textAlign: 'center', color: T.textDim, fontSize: 11,
                     fontFamily: 'Inter, sans-serif', marginTop: 4 }}
          >
            Tool use = pattern matching on LLM output → run code on client → feed result back
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
