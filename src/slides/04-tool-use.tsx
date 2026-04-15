import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { SlideProps } from '@/types'
import { FlowNode } from '@/design/FlowNode'
import { FlowArrow, ArrowDefs } from '@/design/FlowArrow'
import { T } from '@/design/tokens'

// ── lanes ───────────────────────────────────────────────────────────────────
type LaneKey = 'prompt' | 'thinking' | 'tool' | 'output'
type ChipKind = 'prompt' | 'thinking' | 'tool' | 'result' | 'output'

const LANES: LaneKey[] = ['prompt', 'thinking', 'tool', 'output']
const LANE_LABEL: Record<LaneKey, string> = {
  prompt:   'user prompt',
  thinking: 'thinking',
  tool:     'tool',
  output:   'output',
}

// Pixel sizes inside the 1000×562.5 logical canvas (SlideShell is scale-only)
const LANE_ROW_H = 28
const CHIP_GAP   = 6

function colorFor(kind: ChipKind): string {
  if (kind === 'prompt')   return T.accent
  if (kind === 'thinking') return '#a78bfa'  // soft purple
  if (kind === 'tool')     return T.highlight
  if (kind === 'result')   return '#eab308'
  return T.accent // 'output'
}

const wFor = (s: string) => Math.max(28, s.length * 5.2 + 14)

// ── timeline ────────────────────────────────────────────────────────────────
interface TimelineChip {
  text: string
  w: number
  lane: LaneKey
  kind: ChipKind
  fliesBack?: boolean
}

function mk(text: string, lane: LaneKey, kind: ChipKind, extra?: Partial<TimelineChip>): TimelineChip {
  return { text, w: wFor(text), lane, kind, ...extra }
}

const TIMELINE: TimelineChip[] = [
  // ── Cycle 1 (Hanoi) ─────────────────────────────────
  mk('Weather in Hanoi?',  'prompt',   'prompt'),
  mk('need',               'thinking', 'thinking'),
  mk('weather',            'thinking', 'thinking'),
  mk('data',               'thinking', 'thinking'),
  mk('<weather_tool>',    'tool',     'tool'),
  mk('Hanoi',              'tool',     'tool'),
  mk('</weather_tool>',   'tool',     'tool'),
  mk('32°C',               'tool',     'result', { fliesBack: true }),
  mk('got',                'thinking', 'thinking'),
  mk('it',                 'thinking', 'thinking'),
  mk('Hanoi',              'output',   'output'),
  mk('is',                 'output',   'output'),
  mk('32°C',               'output',   'output'),

  // ── Cycle 2 (HCM) ──────────────────────────────────
  mk('Weather in HCM?',    'prompt',   'prompt'),
  mk('again',              'thinking', 'thinking'),
  mk('<weather_tool>',    'tool',     'tool'),
  mk('Ho_Chi_Minh',        'tool',     'tool'),
  mk('</weather_tool>',   'tool',     'tool'),
  mk('35°C',               'tool',     'result', { fliesBack: true }),
  mk('ready',              'thinking', 'thinking'),
  mk('HCM',                'output',   'output'),
  mk('is',                 'output',   'output'),
  mk('35°C',               'output',   'output'),
]


// Cycle boundaries
const CYCLE1_LAST = 12
const CYCLE2_FIRST = 13

const MAX_STEP = TIMELINE.length + 1

// ── SVG flow diagram (lower half) ───────────────────────────────────────────
const DIAG_W = 800
const DIAG_H = 260
const nodes = {
  user:   { x: 20,  y: 85,  w: 110, h: 48 },
  llm:    { x: 180, y: 85,  w: 110, h: 48 },
  output: { x: 340, y: 85,  w: 110, h: 48 },
  match:  { x: 500, y: 85,  w: 120, h: 48 },
  tool:   { x: 500, y: 200, w: 120, h: 48 },
  result: { x: 180, y: 200, w: 110, h: 48 },
}
type N = typeof nodes[keyof typeof nodes]
const cxN = (n: N) => n.x + n.w / 2
const cyN = (n: N) => n.y + n.h / 2
const crN = (n: N) => n.x + n.w
const clN = (n: N) => n.x
const cbN = (n: N) => n.y + n.h
const ctN = (n: N) => n.y

const BLOCK_DELAY = 0.3

// ── component ───────────────────────────────────────────────────────────────
export default function ToolUse({ isActive }: SlideProps) {
  const { user, llm, output, match, tool, result } = nodes
  const [step, setStep] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ x: number; scrollLeft: number } | null>(null)
  const draggedRef = useRef(false)

  useEffect(() => { if (!isActive) setStep(0) }, [isActive])
  const advance = () => setStep(s => Math.min(s + 1, MAX_STEP))

  // Click-and-drag horizontal scrolling for the context window. The slide's
  // root still advances on click, so we swallow the click if the pointer
  // actually moved (i.e., the user was dragging, not clicking).
  const onScrollPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return
    dragStart.current = { x: e.clientX, scrollLeft: scrollRef.current.scrollLeft }
    draggedRef.current = false
    scrollRef.current.setPointerCapture(e.pointerId)
  }
  const onScrollPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current || !dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    if (Math.abs(dx) > 3) draggedRef.current = true
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx
  }
  const onScrollPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrollRef.current && scrollRef.current.hasPointerCapture(e.pointerId)) {
      scrollRef.current.releasePointerCapture(e.pointerId)
    }
    dragStart.current = null
  }
  const onScrollClickCapture = (e: React.MouseEvent) => {
    // If this click was the end of a drag, don't let it bubble up to the
    // root's onClick (which would advance the step).
    if (draggedRef.current) {
      e.stopPropagation()
      e.preventDefault()
      draggedRef.current = false
    }
  }

  const visibleCount = Math.min(step, TIMELINE.length)
  const showInsight  = step > TIMELINE.length
  const lastChip = visibleCount > 0 ? TIMELINE[visibleCount - 1] : null

  // Auto-scroll the scroll container to the right whenever a new chip is
  // revealed. Smooth scroll handles the "push-left" animation for the user,
  // and the container still scrolls horizontally by mouse wheel / drag so
  // you can rewind through older chips. Scrollbar is hidden via CSS so it
  // never steals layout space.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: el.scrollWidth - el.clientWidth, behavior: 'smooth' })
  }, [visibleCount])

  const inCycle2 = visibleCount > CYCLE1_LAST + 1
  const cycleKey = inCycle2 ? 1 : 0

  // Which flow-diagram nodes should light up for the latest chip
  const active = new Set<string>()
  if (lastChip) {
    switch (lastChip.kind) {
      case 'prompt':   active.add('user'); break
      case 'thinking': active.add('llm');  break
      case 'tool':     active.add('llm'); active.add('output'); break
      case 'result':   active.add('match'); active.add('tool'); active.add('result'); break
      case 'output':   active.add('llm'); active.add('output'); break
    }
  }

  // Most recent result chip (for the flying animation + ⑥ result label)
  let lastResultIdx = -1
  for (let i = visibleCount - 1; i >= 0; i--) {
    if (TIMELINE[i].kind === 'result') { lastResultIdx = i; break }
  }
  const showFlyingResult = lastChip?.fliesBack && visibleCount - 1 === lastResultIdx
  const currentResultText = lastResultIdx >= 0 ? TIMELINE[lastResultIdx].text : ''

  const flyFrom = { x: cxN(result), y: cyN(result) }
  const flyTo   = { x: cxN(llm),    y: cyN(llm) }
  const flyMid  = { x: (flyFrom.x + flyTo.x) / 2, y: Math.min(flyFrom.y, flyTo.y) - 70 }

  // Prompt pills docked on the User node. Order: pill1 (top) / pill2 /
  // "① prompt" label / User.
  const PROMPTS = [TIMELINE[0].text, TIMELINE[CYCLE2_FIRST].text]
  const pw0 = wFor(PROMPTS[0])
  const pw1 = wFor(PROMPTS[1])
  const pillTop0 = ctN(user) - 56
  const pillTop1 = ctN(user) - 32
  const labelY   = ctN(user) - 10

  // Flow arrow visibility
  const anyOf = (kinds: ChipKind[]) =>
    TIMELINE.slice(0, visibleCount).some(c => kinds.includes(c.kind))
  const showLLMArrow    = visibleCount >= 1
  const showOutputArrow = anyOf(['thinking', 'tool', 'result', 'output'])
  const showMatchArrow  = anyOf(['tool', 'result', 'output'])
  const showToolArrow   = anyOf(['tool', 'result', 'output'])
  const showResultArrow = anyOf(['result', 'output'])
  const showLoopback    = anyOf(['result', 'output'])

  return (
    <div
      onClick={advance}
      style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: T.bg, padding: '20px 24px',
        boxSizing: 'border-box',
        cursor: 'pointer', userSelect: 'none',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 8 }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>
          Claude = LLM + <span style={{ color: T.accent }}>tool use</span> = Agent
        </span>
      </motion.div>

      {/* ═══════ Context window ═══════ */}
      <div
        style={{
          border: `1px dashed ${T.border}`,
          borderRadius: 10,
          background: `${T.surface}30`,
          padding: '10px 0 12px 0',
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: '0 14px 8px 14px',
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: T.textDim,
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          Context window — 4 lanes, one shared timeline
        </div>

        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* Fixed lane-label column */}
          <div
            style={{
              flexShrink: 0,
              width: 90,
              paddingLeft: 14,
              display: 'flex', flexDirection: 'column',
              borderRight: `1px solid ${T.border}`,
            }}
          >
            {LANES.map(k => (
              <div
                key={`lbl-${k}`}
                style={{
                  height: LANE_ROW_H,
                  display: 'flex', alignItems: 'center',
                  fontSize: 9.5,
                  color: T.textDim,
                  fontFamily: 'JetBrains Mono, monospace',
                  whiteSpace: 'nowrap',
                }}
              >
                {LANE_LABEL[k]}
              </div>
            ))}
          </div>

          {/* CSS grid gives each chip its own auto-sized column so text
              never overlaps. The scroll container is overflow-x auto, but
              the scrollbar is hidden so it doesn't steal layout space —
              you can still scroll horizontally via wheel/drag to rewind. */}
          <style>{`.assembly-scroll::-webkit-scrollbar{display:none}`}</style>
          <div
            ref={scrollRef}
            className="assembly-scroll"
            onPointerDown={onScrollPointerDown}
            onPointerMove={onScrollPointerMove}
            onPointerUp={onScrollPointerUp}
            onPointerCancel={onScrollPointerUp}
            onClickCapture={onScrollClickCapture}
            style={{
              flex: 1,
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollBehavior: 'smooth',
              scrollbarWidth: 'none',
              cursor: 'grab',
              touchAction: 'pan-x',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 'max-content',
                minWidth: '100%',
                height: LANE_ROW_H * LANES.length,
              }}
            >
              {/* Dashed horizontal guide line for each lane */}
              {LANES.map((k, idx) => {
                const y = idx * LANE_ROW_H + (LANE_ROW_H / 2)
                return (
                  <div
                    key={`guide-${k}`}
                    style={{
                      position: 'absolute',
                      left: 0, right: 0,
                      top: y,
                      height: 0,
                      borderTop: `1px dashed ${T.border}`,
                      opacity: 0.55,
                      pointerEvents: 'none',
                    }}
                  />
                )
              })}
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: `repeat(${LANES.length}, ${LANE_ROW_H}px)`,
                  gridAutoColumns: 'max-content',
                  gridAutoFlow: 'column',
                  columnGap: CHIP_GAP,
                  padding: '0 14px',
                  height: '100%',
                }}
              >
                {TIMELINE.slice(0, visibleCount).map((it, i) => {
                  const col = colorFor(it.kind)
                  return (
                    <motion.div
                      key={`chip-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.12 }}
                      style={{
                        gridRow: LANES.indexOf(it.lane) + 1,
                        gridColumn: i + 1,
                        alignSelf: 'center',
                        height: 22,
                        padding: '0 9px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        borderRadius: 4,
                        background: T.surface,
                        border: `1.5px ${it.kind === 'thinking' ? 'dashed' : 'solid'} ${col}`,
                        color: col,
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        fontStyle: it.kind === 'thinking' ? 'italic' : 'normal',
                      }}
                    >
                      {it.text}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Flow diagram ═══════ */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <svg viewBox={`0 0 ${DIAG_W} ${DIAG_H}`} style={{ width: '100%', maxWidth: DIAG_W, overflow: 'visible' }}>
          <ArrowDefs id="arr" color={T.muted} />
          <ArrowDefs id="arr-accent" color={T.accent} />

          {/* ═══ User block ═══ */}
          <FlowNode {...user} label="User" delay={0} isActive={isActive}
            highlight={active.has('user')} />

          {/* Prompt pill 1 (topmost) */}
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <rect
              x={cxN(user) - pw0 / 2} y={pillTop0 - 10}
              width={pw0} height={20} rx={5}
              fill={T.surface} stroke={T.accent} strokeWidth={1.5}
            />
            <text
              x={cxN(user)} y={pillTop0}
              textAnchor="middle" dominantBaseline="middle"
              fill={T.accent} fontSize={8}
              fontFamily="JetBrains Mono, monospace" fontWeight={500}
            >
              {PROMPTS[0]}
            </text>
          </motion.g>

          {/* Prompt pill 2 — cycle 2 */}
          {inCycle2 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <rect
                x={cxN(user) - pw1 / 2} y={pillTop1 - 10}
                width={pw1} height={20} rx={5}
                fill={T.surface} stroke={T.accent} strokeWidth={1.5}
              />
              <text
                x={cxN(user)} y={pillTop1}
                textAnchor="middle" dominantBaseline="middle"
                fill={T.accent} fontSize={8}
                fontFamily="JetBrains Mono, monospace" fontWeight={500}
              >
                {PROMPTS[1]}
              </text>
            </motion.g>
          )}

          {/* "① prompt" label BELOW pills, above User node */}
          <motion.text
            x={cxN(user)} y={labelY}
            textAnchor="middle" fill={T.textDim} fontSize={9} fontFamily="Inter, sans-serif"
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            ① prompt
          </motion.text>

          {/* ═══ Arrow User→LLM + LLM ═══ */}
          {showLLMArrow && (
            <>
              <FlowArrow
                key={`a-user-llm-${cycleKey}`}
                d={`M${crN(user)} ${cyN(user)} L${clN(llm)} ${cyN(llm)}`}
                delay={0} isActive markerEnd="url(#arr)"
              />
              <FlowNode {...llm} label="LLM" delay={BLOCK_DELAY} isActive accent
                highlight={active.has('llm')}
              />
              <motion.text
                x={cxN(llm)} y={ctN(llm) - 14}
                textAnchor="middle" fill={T.textDim} fontSize={9} fontFamily="Inter, sans-serif"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: BLOCK_DELAY, duration: 0.3 }}
              >
                ② thinks
              </motion.text>
            </>
          )}

          {/* ═══ Arrow LLM→Output ═══ */}
          {showOutputArrow && (
            <>
              <FlowArrow
                key={`a-llm-out-${cycleKey}`}
                d={`M${crN(llm)} ${cyN(llm)} L${clN(output)} ${cyN(output)}`}
                delay={0} isActive markerEnd="url(#arr)"
              />
              <motion.g
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: BLOCK_DELAY, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: `${cxN(output)}px ${cyN(output)}px` }}
              >
                <rect
                  x={output.x} y={output.y} width={output.w} height={output.h} rx={8}
                  fill={T.surface}
                  stroke={active.has('output') ? T.highlight : T.border}
                  strokeWidth={active.has('output') ? 2 : 1}
                />
                <text
                  x={cxN(output)} y={output.y + 14}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={T.text} fontSize={11} fontFamily="Inter, sans-serif" fontWeight={600}
                >
                  Output
                </text>
                <rect x={output.x + 12} y={output.y + 25} width={output.w - 24} height={18} rx={4}
                  fill={T.bg} stroke={T.border} strokeWidth={0.5} />
                {/* The Output box is the LLM's token factory — it streams
                    thinking, tool-call, and user-visible output tokens
                    alike. (Result tokens come from the executor, not here.) */}
                {lastChip && (lastChip.kind === 'thinking' || lastChip.kind === 'tool' || lastChip.kind === 'output') && (
                  <motion.text
                    key={`disp-${visibleCount}`}
                    x={cxN(output)} y={output.y + 34}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={colorFor(lastChip.kind)}
                    fontSize={9} fontFamily="JetBrains Mono, monospace" fontWeight={600}
                    fontStyle={lastChip.kind === 'thinking' ? 'italic' : 'normal'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {lastChip.text}
                  </motion.text>
                )}
              </motion.g>
            </>
          )}

          {/* ═══ Arrow Output→Match ═══ */}
          {showMatchArrow && (
            <>
              <FlowArrow
                key={`a-out-match-${cycleKey}`}
                d={`M${crN(output)} ${cyN(output)} L${clN(match)} ${cyN(match)}`}
                delay={0} isActive accent markerEnd="url(#arr-accent)"
              />
              <FlowNode {...match} label="Pattern Match" delay={BLOCK_DELAY} isActive
                highlight={active.has('match')}
              />
              <motion.text
                x={cxN(match)} y={ctN(match) - 14}
                textAnchor="middle" fill={T.textDim} fontSize={9} fontFamily="Inter, sans-serif"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: BLOCK_DELAY, duration: 0.3 }}
              >
                ④ parse
              </motion.text>
            </>
          )}

          {/* ═══ Arrow Match→Tool ═══ */}
          {showToolArrow && (
            <>
              <FlowArrow
                key={`a-match-tool-${cycleKey}`}
                d={`M${cxN(match)} ${cbN(match)} L${cxN(tool)} ${ctN(tool)}`}
                delay={0} isActive accent markerEnd="url(#arr-accent)"
              />
              <FlowNode {...tool} label="Tool Executor" delay={BLOCK_DELAY} isActive accent
                highlight={active.has('tool')}
              />
              <motion.text
                x={cxN(tool)} y={cbN(tool) + 18}
                textAnchor="middle" fill={T.textDim} fontSize={9} fontFamily="Inter, sans-serif"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: BLOCK_DELAY, duration: 0.3 }}
              >
                ⑤ execute
              </motion.text>
            </>
          )}

          {/* ═══ Arrow Tool→Result ═══ */}
          {showResultArrow && (
            <>
              <FlowArrow
                key={`a-tool-result-${cycleKey}`}
                d={`M${clN(tool)} ${cyN(tool)} L${crN(result)} ${cyN(result)}`}
                delay={0} isActive markerEnd="url(#arr)"
              />
              <FlowNode {...result} label="Result" delay={BLOCK_DELAY} isActive highlight />
              <motion.text
                key={`rtxt-${cycleKey}`}
                x={cxN(result)} y={cbN(result) + 18}
                textAnchor="middle" fill={T.textDim} fontSize={9} fontFamily="Inter, sans-serif"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: BLOCK_DELAY, duration: 0.3 }}
              >
                ⑥ {currentResultText || '…'}
              </motion.text>
            </>
          )}

          {/* ═══ Loop-back ═══ */}
          {showLoopback && (
            <>
              <FlowArrow
                key={`a-loop-${cycleKey}`}
                d={`M${cxN(result)} ${ctN(result)} C${cxN(result)} ${ctN(result) - 50} ${cxN(llm)} ${ctN(llm) + 90} ${cxN(llm)} ${cbN(llm)}`}
                delay={0}
                isActive accent dashed markerEnd="url(#arr-accent)"
              />
              <motion.text
                key={`loop-lbl-${cycleKey}`}
                x={(cxN(result) + cxN(llm)) / 2} y={cyN(result) - 30}
                textAnchor="middle" fill={T.accent} fontSize={9}
                fontFamily="Inter, sans-serif" fontWeight={600}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                ⑦ feed back
              </motion.text>
            </>
          )}

          {/* Flying result chip — re-fires each time a 'result' kind lands */}
          {showFlyingResult && (
            <motion.g
              key={`fly-${visibleCount}`}
              initial={{ x: flyFrom.x, y: flyFrom.y, opacity: 0 }}
              animate={{
                x: [flyFrom.x, flyMid.x, flyTo.x],
                y: [flyFrom.y, flyMid.y, flyTo.y],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 1.1,
                times: [0, 0.5, 1],
                ease: [0.5, 0, 0.5, 1],
              }}
            >
              <rect
                x={-22} y={-10} width={44} height={20} rx={4}
                fill={T.surface} stroke="#eab308" strokeWidth={1.5}
              />
              <text
                x={0} y={0}
                textAnchor="middle" dominantBaseline="middle"
                fill="#eab308" fontSize={9}
                fontFamily="JetBrains Mono, monospace" fontWeight={600}
              >
                {currentResultText}
              </text>
            </motion.g>
          )}
        </svg>
      </div>

      {/* Bottom insight */}
      <AnimatePresence>
        {showInsight && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ textAlign: 'center', color: T.textDim, fontSize: 11,
                     fontFamily: 'Inter, sans-serif', marginTop: 4, marginBottom: 0 }}
          >
            Prompt, thinking, tool call, result, output — every token flows onto
            one shared timeline inside the <strong style={{ color: T.text }}>context window</strong>.
            Each new token is generated by reading the whole thing back.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
