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
  mk('<thinking>',         'thinking', 'thinking'),
  mk('need',               'thinking', 'thinking'),
  mk('weather',            'thinking', 'thinking'),
  mk('data',               'thinking', 'thinking'),
  mk('</thinking>',        'thinking', 'thinking'),
  mk('<weather_tool>',     'tool',     'tool'),
  mk('Hanoi',              'tool',     'tool'),
  mk('</weather_tool>',    'tool',     'tool'),
  mk('32°C',               'tool',     'result', { fliesBack: true }),
  mk('<thinking>',         'thinking', 'thinking'),
  mk('got',                'thinking', 'thinking'),
  mk('it',                 'thinking', 'thinking'),
  mk('</thinking>',        'thinking', 'thinking'),
  mk('Hanoi',              'output',   'output'),
  mk('is',                 'output',   'output'),
  mk('32°C',               'output',   'output'),

  // ── Cycle 2 (HCM) ──────────────────────────────────
  mk('Weather in HCM?',    'prompt',   'prompt'),
  mk('<thinking>',         'thinking', 'thinking'),
  mk('again',              'thinking', 'thinking'),
  mk('</thinking>',        'thinking', 'thinking'),
  mk('<weather_tool>',     'tool',     'tool'),
  mk('Ho_Chi_Minh',        'tool',     'tool'),
  mk('</weather_tool>',    'tool',     'tool'),
  mk('35°C',               'tool',     'result', { fliesBack: true }),
  mk('<thinking>',         'thinking', 'thinking'),
  mk('ready',              'thinking', 'thinking'),
  mk('</thinking>',        'thinking', 'thinking'),
  mk('HCM',                'output',   'output'),
  mk('is',                 'output',   'output'),
  mk('35°C',               'output',   'output'),
]


// Cycle boundaries — index of the last chip in each cycle (inclusive).
// Cycle N starts at PROMPT_INDICES[N], ends at PROMPT_INDICES[N+1] - 1.
const PROMPT_INDICES = TIMELINE
  .map((c, i) => (c.kind === 'prompt' ? i : -1))
  .filter(i => i >= 0)

const MAX_STEP = TIMELINE.length

// ── chat window ─────────────────────────────────────────────────────────────
// Filter the visible timeline down to user prompts + assistant output so
// the right-side panel shows a conventional chat transcript. When the
// current turn hasn't started emitting visible output yet we replace the
// empty assistant bubble with a color-coded status line (thinking / tool /
// result) so the user sees what the agent is doing behind the scenes.
type ChatMsg = { role: 'user' | 'assistant'; text: string }
type StatusKind = 'thinking' | 'tool' | 'result'
type ChatStatus = { kind: StatusKind; label: string }

function deriveChat(visibleCount: number): { messages: ChatMsg[]; status: ChatStatus | null } {
  const messages: ChatMsg[] = []
  let buf = ''
  for (let i = 0; i < visibleCount; i++) {
    const c = TIMELINE[i]
    if (c.kind === 'prompt') {
      if (buf) { messages.push({ role: 'assistant', text: buf.trim() }); buf = '' }
      messages.push({ role: 'user', text: c.text })
    } else if (c.kind === 'output') {
      buf += (buf ? ' ' : '') + c.text
    }
  }
  if (buf) messages.push({ role: 'assistant', text: buf.trim() })

  // Status is only shown while the current turn hasn't emitted any
  // user-visible output yet. Once output starts, the assistant bubble
  // takes over.
  let status: ChatStatus | null = null
  if (visibleCount > 0) {
    let lastPromptIdx = -1
    for (let i = visibleCount - 1; i >= 0; i--) {
      if (TIMELINE[i].kind === 'prompt') { lastPromptIdx = i; break }
    }
    if (lastPromptIdx >= 0) {
      let hasOutput = false
      for (let i = lastPromptIdx + 1; i < visibleCount; i++) {
        if (TIMELINE[i].kind === 'output') { hasOutput = true; break }
      }
      if (!hasOutput) {
        const last = TIMELINE[visibleCount - 1]
        if (last.kind === 'thinking') status = { kind: 'thinking', label: 'thinking…' }
        else if (last.kind === 'tool') status = { kind: 'tool', label: 'calling weather tool…' }
        else if (last.kind === 'result') status = { kind: 'result', label: 'reading tool result…' }
      }
    }
  }
  return { messages, status }
}

const STATUS_COLOR: Record<StatusKind, string> = {
  thinking: '#a78bfa',
  tool:     '#25d366',
  result:   '#eab308',
}

function ChatWindow({ visibleCount }: { visibleCount: number }) {
  const { messages, status } = deriveChat(visibleCount)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Auto-scroll to the newest message/status whenever the chat grows.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, status?.kind, status?.label])

  return (
    <div
      style={{
        width: 220,
        height: 168,
        flexShrink: 0,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        background: `${T.surface}40`,
        padding: '10px 12px 12px',
        display: 'flex', flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: T.textDim,
          fontFamily: 'JetBrains Mono, monospace',
          marginBottom: 8,
        }}
      >
        Chat
      </div>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          gap: 6,
          overflowY: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`.chat-scroll::-webkit-scrollbar{display:none}`}</style>
        {messages.length === 0 && !status && (
          <div style={{ fontSize: 10, color: T.muted, fontStyle: 'italic' }}>
            (empty)
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div
            key={`msg-${i}-${m.role}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              padding: '5px 8px',
              borderRadius: 8,
              background: m.role === 'user' ? `${T.accent}1c` : T.surface,
              border: `1px solid ${m.role === 'user' ? `${T.accent}66` : T.border}`,
              color: m.role === 'user' ? T.accent : T.text,
              fontSize: 10,
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.35,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            {m.text}
          </motion.div>
        ))}
        <AnimatePresence mode="wait" initial={false}>
          {status && (
            <motion.div
              key={`status-${status.kind}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              // Instant exit so the status doesn't linger while the
              // incoming assistant bubble fades in below it — any overlap
              // shows up as a layout shift.
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={{ duration: 0.15 }}
              style={{
                alignSelf: 'flex-start',
                maxWidth: '90%',
                padding: '5px 9px',
                borderRadius: 8,
                background: `${STATUS_COLOR[status.kind]}14`,
                border: `1px dashed ${STATUS_COLOR[status.kind]}88`,
                color: STATUS_COLOR[status.kind],
                fontSize: 9.5,
                fontFamily: 'JetBrains Mono, monospace',
                fontStyle: 'italic',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <motion.span
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: STATUS_COLOR[status.kind],
                  display: 'inline-block',
                }}
              />
              {status.label}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

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
  // Context window lags a beat behind `step` so the flow diagram (node
  // highlights, arrow re-fires, flying result, output display) gets to
  // play first, then the chip lands in the lane.
  const [ctxStep, setCtxStep] = useState(0)
  // When the closing tool-call tag arrives, the pattern matcher runs:
  // output → arrow → match → arrow → tool. `wave` staggers that chain
  // so it reads as a pulse travelling through the diagram instead of
  // everything lighting up at once.
  const [wave, setWave] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ x: number; scrollLeft: number } | null>(null)
  const draggedRef = useRef(false)

  useEffect(() => { if (!isActive) { setStep(0); setCtxStep(0); setWave(0) } }, [isActive])
  const advance = () => setStep(s => Math.min(s + 1, MAX_STEP))

  // Context window delay: longer delay for result chips (the flying arc
  // takes ~1.1s) so the result hits the context after it visually lands
  // in the LLM.
  useEffect(() => {
    const lastIdx = step - 1
    const last = lastIdx >= 0 && lastIdx < TIMELINE.length ? TIMELINE[lastIdx] : null
    const delay = last?.kind === 'result' ? 2200 : 380
    const t = setTimeout(() => setCtxStep(step), delay)
    return () => clearTimeout(t)
  }, [step])

  // Pattern-match wave: when the closing tool-call tag becomes the last
  // chip, advance through stages 1/2/3 so output→arrow→match→arrow lights
  // up in sequence. Any other chip resets the wave so the diagram goes
  // back to dim between bursts.
  useEffect(() => {
    const lastIdx = step - 1
    const last = lastIdx >= 0 && lastIdx < TIMELINE.length ? TIMELINE[lastIdx] : null
    if (last?.kind === 'tool' && last.text.startsWith('</')) {
      setWave(1)
      const t1 = setTimeout(() => setWave(2), 550)
      const t2 = setTimeout(() => setWave(3), 1100)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    if (last?.kind === 'result') {
      setWave(0)
      const t1 = setTimeout(() => setWave(1), 500)
      const t2 = setTimeout(() => setWave(2), 1050)
      const t3 = setTimeout(() => setWave(3), 1600)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }
    setWave(0)
  }, [step])

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

  // `visibleCount` drives the flow diagram (immediate). `ctxVisibleCount`
  // drives the context window + chat (delayed). The lastChip for the
  // diagram always reflects the most recent step so the diagram can
  // highlight + animate right away.
  const visibleCount = Math.min(step, TIMELINE.length)
  const ctxVisibleCount = Math.min(ctxStep, TIMELINE.length)
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
  }, [ctxVisibleCount])

  // Which cycle are we currently in? 0 = first prompt, 1 = second.
  // Used to decide how many prompt pills are docked on the User node.
  // Arrows are NOT keyed on this — they persist across cycles so their
  // draw-in animation only plays once, and only `hot` toggles thereafter.
  const cycleIdx = Math.max(
    0,
    PROMPT_INDICES.reduce((acc, p, i) => (visibleCount > p ? i : acc), 0),
  )

  // Which flow-diagram nodes & arrows should light up for the latest chip.
  // Only one thing is "running" at a time — everything else stays dim.
  const activeNodes  = new Set<string>()
  const activeArrows = new Set<string>()
  if (lastChip) {
    switch (lastChip.kind) {
      case 'prompt':
        activeNodes.add('user')
        activeArrows.add('user-llm')
        break
      case 'thinking':
        activeNodes.add('llm')
        activeNodes.add('output')
        activeArrows.add('llm-output')
        break
      case 'tool':
        activeNodes.add('llm')
        if (lastChip.text.startsWith('</')) {
          // Closing tag: pattern matcher runs. `wave` moves a single
          // pulse along output → output-match arrow → match → match-tool
          // arrow, with only one hop lit per stage so the eye follows it.
          if (wave === 0) { activeNodes.add('output'); activeArrows.add('llm-output') }
          if (wave === 1) activeArrows.add('output-match')
          if (wave === 2) activeNodes.add('match')
          if (wave === 3) activeArrows.add('match-tool')
        } else {
          activeNodes.add('output')
          activeArrows.add('llm-output')
        }
        break
      case 'result':
        // Second travelling pulse: executor → arrow → result box → loopback.
        // Same `wave` state, just driven by the 'result' kind in the effect.
        if (wave === 0) activeNodes.add('tool')
        if (wave === 1) activeArrows.add('tool-result')
        if (wave === 2) activeNodes.add('result')
        if (wave === 3) activeArrows.add('loopback')
        break
      case 'output':
        activeNodes.add('llm')
        activeNodes.add('output')
        activeArrows.add('llm-output')
        break
    }
  }

  // The tool-call argument currently being executed — derived from the
  // most recent complete tool call so the Tool Executor callout can show
  // "GET openweather.com?q=Hanoi".
  let currentToolQuery = ''
  for (let i = visibleCount - 1; i >= 0; i--) {
    const c = TIMELINE[i]
    if (c.kind === 'tool' && !c.text.startsWith('<')) { currentToolQuery = c.text; break }
    if (c.kind === 'prompt') break
  }

  // Has the tool executor actually been triggered in the current turn?
  // The trigger fires when the closing tool-call tag has been parsed —
  // either on a later chip in the same turn, or on the closing-tag chip
  // itself once the match→tool wave has advanced to its final stage.
  let executorTriggered = false
  for (let i = visibleCount - 1; i >= 0; i--) {
    const c = TIMELINE[i]
    if (c.kind === 'prompt') break
    if (c.kind === 'tool' && c.text.startsWith('</')) {
      executorTriggered = i === visibleCount - 1 ? wave >= 3 : true
      break
    }
  }

  // Most recent result chip (for the flying animation + ⑥ result label)
  let lastResultIdx = -1
  for (let i = visibleCount - 1; i >= 0; i--) {
    if (TIMELINE[i].kind === 'result') { lastResultIdx = i; break }
  }
  // Flying chip rides the loopback arc — only visible once the wave has
  // advanced to the loopback stage so it feels like one continuous pulse.
  const showFlyingResult = lastChip?.fliesBack && visibleCount - 1 === lastResultIdx && wave >= 3
  const currentResultText = lastResultIdx >= 0 ? TIMELINE[lastResultIdx].text : ''

  const flyFrom = { x: cxN(result), y: cyN(result) }
  const flyTo   = { x: cxN(llm),    y: cyN(llm) }
  const flyMid  = { x: (flyFrom.x + flyTo.x) / 2, y: Math.min(flyFrom.y, flyTo.y) - 70 }

  // Prompt pills docked on the User node. Oldest pill at top, newest
  // closest to the "① prompt" label. Pills appear as each new cycle begins.
  const labelY = ctN(user) - 10
  const PROMPTS  = PROMPT_INDICES.map(i => TIMELINE[i].text)
  const PILL_GAP = 24
  // Center-y for each pill (index 0 = earliest prompt, farthest from label)
  const pillTops = PROMPTS.map((_, i) => labelY - 22 - PILL_GAP * (PROMPTS.length - 1 - i))

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

      {/* ═══════ Context window + Chat window (row) ═══════ */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexShrink: 0, minHeight: 0 }}>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          border: `1px dashed ${T.border}`,
          borderRadius: 10,
          background: `${T.surface}30`,
          padding: '10px 0 12px 0',
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span style={{ color: T.accent, fontWeight: 600 }}>Context window</span>
          <span style={{ color: T.muted, letterSpacing: '0.12em' }}>
            ← drag to scroll →
          </span>
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
              never overlaps. Scrollbar is hidden so a horizontal scrollbar
              appearing doesn't push lane content vertically; the left-edge
              mask fade still hints that older chips exist offscreen. */}
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
              msOverflowStyle: 'none',
              cursor: 'grab',
              touchAction: 'pan-x',
              // Subtle left-edge fade hints at older chips offscreen.
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 100%)',
              maskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 100%)',
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
                  // Static-positioned children paint below absolutely-
                  // positioned siblings regardless of source order, so
                  // give the chip grid its own stacking context to lift
                  // it above the dashed lane guides.
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {TIMELINE.slice(0, ctxVisibleCount).map((it, i) => {
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

      {/* Chat window — user prompts and assistant answers only */}
      <ChatWindow visibleCount={ctxVisibleCount} />
      </div>

      {/* ═══════ Flow diagram ═══════ */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <svg viewBox={`0 0 ${DIAG_W} ${DIAG_H}`} style={{ width: '100%', maxWidth: DIAG_W, overflow: 'visible' }}>
          <ArrowDefs id="arr" />

          {/* ═══ User block ═══ */}
          <FlowNode {...user} label="User" delay={0} isActive={isActive}
            highlight={activeNodes.has('user')} />

          {/* Prompt pills — one per visible cycle, oldest at top */}
          {PROMPTS.map((text, i) => {
            if (i > cycleIdx) return null
            const w = wFor(text)
            const cy = pillTops[i]
            return (
              <motion.g
                key={`pill-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <rect
                  x={cxN(user) - w / 2} y={cy - 10}
                  width={w} height={20} rx={5}
                  fill={T.surface} stroke={T.accent} strokeWidth={1.5}
                />
                <text
                  x={cxN(user)} y={cy}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={T.accent} fontSize={8}
                  fontFamily="JetBrains Mono, monospace" fontWeight={500}
                >
                  {text}
                </text>
              </motion.g>
            )
          })}

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
                key={`a-user-llm`}
                d={`M${crN(user)} ${cyN(user)} L${clN(llm)} ${cyN(llm)}`}
                delay={0} isActive markerEnd="url(#arr)"
                hot={activeArrows.has('user-llm')}
              />
              <FlowNode {...llm} label="LLM" delay={BLOCK_DELAY} isActive accent
                highlight={activeNodes.has('llm')}
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
                key={`a-llm-out`}
                d={`M${crN(llm)} ${cyN(llm)} L${clN(output)} ${cyN(output)}`}
                delay={0} isActive markerEnd="url(#arr)"
                hot={activeArrows.has('llm-output')}
              />
              <motion.g
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: BLOCK_DELAY, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: `${cxN(output)}px ${cyN(output)}px` }}
              >
                <motion.rect
                  x={output.x} y={output.y} width={output.w} height={output.h} rx={8}
                  fill={T.surface}
                  animate={{
                    stroke: activeNodes.has('output') ? T.highlight : T.border,
                    strokeWidth: activeNodes.has('output') ? 2 : 1,
                  }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
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
                key={`a-out-match`}
                d={`M${crN(output)} ${cyN(output)} L${clN(match)} ${cyN(match)}`}
                delay={0} isActive markerEnd="url(#arr)"
                hot={activeArrows.has('output-match')}
              />
              <FlowNode {...match} label="Pattern Match" delay={BLOCK_DELAY} isActive
                highlight={activeNodes.has('match')}
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
                key={`a-match-tool`}
                d={`M${cxN(match)} ${cbN(match)} L${cxN(tool)} ${ctN(tool)}`}
                delay={0} isActive markerEnd="url(#arr)"
                hot={activeArrows.has('match-tool')}
              />
              {/* Tool Executor is an EXTERNAL system (it leaves the LLM's
                  world and hits the network) — rendered as a dashed amber
                  box with a small ↗ outbound glyph in the top-right so it
                  reads differently from the model-internal blocks. */}
              <motion.g
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: BLOCK_DELAY, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: `${cxN(tool)}px ${cyN(tool)}px` }}
              >
                <motion.rect
                  x={tool.x} y={tool.y} width={tool.w} height={tool.h}
                  rx={8} ry={8}
                  fill={T.surface}
                  strokeDasharray="4 3"
                  animate={{
                    stroke: activeNodes.has('tool') ? '#eab308' : `${'#eab308'}88`,
                    strokeWidth: activeNodes.has('tool') ? 2 : 1.2,
                  }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                />
                <motion.text
                  x={tool.x + tool.w / 2} y={tool.y + tool.h / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={12}
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight={600}
                  animate={{ fill: activeNodes.has('tool') ? '#eab308' : T.text }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                >
                  Tool Executor
                </motion.text>
                {/* External-link glyph — small square with an arrow
                    breaking out of it, the usual "opens in a new tab"
                    symbol. Signals that the executor leaves the model's
                    sandbox and hits the outside world. */}
                <g transform={`translate(${tool.x + tool.w - 16}, ${tool.y + 6})`}>
                  <rect
                    x={0} y={3} width={7} height={7} rx={1}
                    fill="#eab308" stroke="#eab308" strokeWidth={1}
                  />
                  <path
                    d="M4 0 L10 0 L10 6"
                    fill="none" stroke="#eab308" strokeWidth={1}
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                  <line
                    x1={10} y1={0} x2={5} y2={5}
                    stroke="#eab308" strokeWidth={1}
                    strokeLinecap="round"
                  />
                </g>
              </motion.g>
              {/* Tool Executor callout — appears the moment the tool
                  argument has been emitted and persists through the rest
                  of the turn so the audience can actually read it. It
                  brightens while the executor is running and dims
                  afterwards, then gets replaced when the next cycle's
                  tool call starts. */}
              <AnimatePresence>
                {executorTriggered && currentToolQuery && (
                  <motion.g
                    key={`tool-callout-${currentToolQuery}`}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: activeNodes.has('tool') ? 1 : 0.55, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <rect
                      x={crN(tool) + 14} y={cyN(tool) - 18}
                      width={156} height={36} rx={6}
                      fill={T.surface}
                      stroke="#eab308"
                      strokeWidth={1.3}
                      strokeDasharray="4 3"
                    />
                    <text
                      x={crN(tool) + 22} y={cyN(tool) - 4}
                      fill={T.textDim} fontSize={8}
                      fontFamily="JetBrains Mono, monospace"
                    >
                      GET api.openweather.com
                    </text>
                    <text
                      x={crN(tool) + 22} y={cyN(tool) + 8}
                      fill="#eab308" fontSize={9}
                      fontFamily="JetBrains Mono, monospace" fontWeight={600}
                    >
                      ?q={currentToolQuery}
                    </text>
                    {/* little connector tick */}
                    <line
                      x1={crN(tool)} y1={cyN(tool)}
                      x2={crN(tool) + 14} y2={cyN(tool)}
                      stroke="#eab308" strokeWidth={1.2}
                    />
                  </motion.g>
                )}
              </AnimatePresence>
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
                key={`a-tool-result`}
                d={`M${clN(tool)} ${cyN(tool)} L${crN(result)} ${cyN(result)}`}
                delay={0} isActive markerEnd="url(#arr)"
                hot={activeArrows.has('tool-result')}
              />
              <FlowNode {...result} label="Result" delay={BLOCK_DELAY} isActive
                highlight={activeNodes.has('result')}
              />
              <motion.text
                key={`rtxt`}
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
                key={`a-loop`}
                d={`M${cxN(result)} ${ctN(result)} C${cxN(result)} ${ctN(result) - 50} ${cxN(llm)} ${ctN(llm) + 90} ${cxN(llm)} ${cbN(llm)}`}
                delay={0}
                isActive dashed markerEnd="url(#arr)"
                hot={activeArrows.has('loopback')}
              />
              <motion.text
                key={`loop-lbl`}
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

    </div>
  )
}
