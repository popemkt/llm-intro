import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { SlideProps } from '@/types'
import { T } from '@/design/tokens'
import { FlowArrow, ArrowDefs } from '@/design/FlowArrow'

const W = 680
const H = 360

// Node definitions
const NODES = {
  dev:    { x: 260, y: 20,  w: 160, h: 44, label: 'Develop a Skill',        sub: 'commands/*.md',        accent: true  },
  stable: { x: 260, y: 120, w: 160, h: 44, label: 'Skill is stable',        sub: 'tested & reliable',    accent: false },
  manual: { x: 60,  y: 230, w: 150, h: 44, label: 'Keep using manually',    sub: 'works great as-is',    accent: false },
  auto:   { x: 430, y: 230, w: 150, h: 44, label: 'Automate it',            sub: 'repetitive pipeline',  accent: false },
  n8n:    { x: 430, y: 310, w: 150, h: 36, label: 'n8n workflow',           sub: 'visual pipeline',      accent: true  },
}

const cx = (n: typeof NODES.dev) => n.x + n.w / 2
const cy = (n: typeof NODES.dev) => n.y + n.h / 2
const cb = (n: typeof NODES.dev) => n.y + n.h
const ct = (n: typeof NODES.dev) => n.y

const TOOLTIPS: Record<string, string> = {
  dev:    'Write a .md file in ~/.claude/commands/ describing the steps. Test with /skill-name.',
  stable: 'You\'ve run it a few times, edge cases handled, output is predictable.',
  manual: 'You run /skill-name in Claude whenever needed. Simple, effective.',
  auto:   'The workflow triggers on a schedule or event, no manual step needed.',
  n8n:    'Drag-and-drop pipeline builder. Claude skill becomes one node in a larger flow.',
}

type NodeKey = keyof typeof NODES

function FlowNodeRect({ nodeKey, isActive, delay, onClick, active }: { nodeKey: NodeKey; isActive: boolean; delay: number; onClick: (k: NodeKey) => void; active: boolean }) {
  const n = NODES[nodeKey]
  const fill   = active ? (n.accent ? T.accent : `${T.accent}22`) : n.accent ? `${T.accentDim}22` : T.surface
  const stroke = active ? T.highlight : n.accent ? T.accent : T.border
  const textColor = active ? (n.accent ? T.bg : T.accent) : n.accent ? T.accent : T.text

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.85 }}
      animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: `${cx(n)}px ${cy(n)}px`, cursor: 'pointer' }}
      onClick={() => onClick(nodeKey)}
      whileHover={{ scale: 1.04 } as never}
    >
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill={fill} stroke={stroke} strokeWidth={n.accent ? 1.5 : 1} />
      <text x={cx(n)} y={n.sub ? cy(n) - 7 : cy(n)} textAnchor="middle" dominantBaseline="middle"
        fill={textColor} fontSize={11} fontFamily="Inter, sans-serif" fontWeight={700}>{n.label}</text>
      {n.sub && (
        <text x={cx(n)} y={cy(n) + 9} textAnchor="middle" dominantBaseline="middle"
          fill={active ? (n.accent ? `${T.bg}99` : T.textDim) : T.textDim} fontSize={8.5} fontFamily="JetBrains Mono, monospace">{n.sub}</text>
      )}
    </motion.g>
  )
}

export default function Appendix({ isActive }: SlideProps) {
  const [activeNode, setActiveNode] = useState<NodeKey | null>(null)

  const handleClick = (k: NodeKey) => setActiveNode(prev => prev === k ? null : k)

  return (
    <div
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, padding: '20px 32px', boxSizing: 'border-box' }}
      onClick={() => setActiveNode(null)}
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <span style={{ fontSize: 'clamp(1rem, 2.2vw, 1.4rem)', fontWeight: 800, color: T.text }}>
          What to do next
        </span>
        <span style={{ fontSize: 10, color: T.textDim, fontFamily: 'JetBrains Mono, monospace', border: `1px solid ${T.border}`, borderRadius: 4, padding: '2px 7px' }}>appendix</span>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={isActive ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.2 }}
        style={{ fontSize: 10, color: T.textDim, fontFamily: 'Inter, sans-serif', marginBottom: 8, marginTop: 0 }}
      >
        click any node for details
      </motion.p>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', gap: 24, alignItems: 'flex-start', overflow: 'hidden' }}>

        {/* SVG flow */}
        <svg viewBox={`0 0 ${W} ${H}`} style={{ flex: '0 0 auto', width: '60%', maxWidth: W }} onClick={e => e.stopPropagation()}>
          <ArrowDefs id="app" />
          <ArrowDefs id="app-a" />

          {/* Arrows */}
          <FlowArrow d={`M${cx(NODES.dev)} ${cb(NODES.dev)} L${cx(NODES.stable)} ${ct(NODES.stable)}`} delay={0.5} isActive={isActive} accent markerEnd="url(#app-a)" />
          <FlowArrow d={`M${cx(NODES.stable)} ${cb(NODES.stable)} C${cx(NODES.stable)} ${cb(NODES.stable)+30} ${cx(NODES.manual)} ${ct(NODES.manual)-30} ${cx(NODES.manual)} ${ct(NODES.manual)}`} delay={0.8} isActive={isActive} markerEnd="url(#app)" />
          <FlowArrow d={`M${cx(NODES.stable)} ${cb(NODES.stable)} C${cx(NODES.stable)} ${cb(NODES.stable)+30} ${cx(NODES.auto)} ${ct(NODES.auto)-30} ${cx(NODES.auto)} ${ct(NODES.auto)}`} delay={0.8} isActive={isActive} markerEnd="url(#app)" />
          <FlowArrow d={`M${cx(NODES.auto)} ${cb(NODES.auto)} L${cx(NODES.n8n)} ${ct(NODES.n8n)}`} delay={1.1} isActive={isActive} accent markerEnd="url(#app-a)" />

          {/* Arrow labels */}
          {[
            { x: cx(NODES.dev) + 10, y: (cb(NODES.dev) + ct(NODES.stable)) / 2, t: 'iterate & test' },
            { x: (cx(NODES.stable) + cx(NODES.manual)) / 2 - 20, y: (cb(NODES.stable) + ct(NODES.manual)) / 2 + 10, t: 'if manual is fine' },
            { x: (cx(NODES.stable) + cx(NODES.auto)) / 2 + 20, y: (cb(NODES.stable) + ct(NODES.auto)) / 2 + 10, t: 'if repetitive' },
            { x: cx(NODES.auto) + 10, y: (cb(NODES.auto) + ct(NODES.n8n)) / 2, t: 'use' },
          ].map(({ x, y, t }) => (
            <motion.text key={t} x={x} y={y} textAnchor="middle" fill={T.textDim} fontSize={8} fontFamily="Inter, sans-serif"
              initial={{ opacity: 0 }} animate={isActive ? { opacity: 1 } : { opacity: 0 }} transition={{ delay: 1.3, duration: 0.4 }}>
              {t}
            </motion.text>
          ))}

          {/* Nodes */}
          {(Object.keys(NODES) as NodeKey[]).map((k, i) => (
            <FlowNodeRect key={k} nodeKey={k} isActive={isActive} delay={0.1 + i * 0.15} onClick={handleClick} active={activeNode === k} />
          ))}
        </svg>

        {/* Tooltip panel */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <AnimatePresence mode="wait">
            {activeNode ? (
              <motion.div
                key={activeNode}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.25 }}
                style={{
                  padding: '16px 18px',
                  borderRadius: 12,
                  border: `1.5px solid ${T.accent}`,
                  background: `${T.accent}0d`,
                  maxWidth: 220,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 8, fontFamily: 'Inter, sans-serif' }}>
                  {NODES[activeNode].label}
                </div>
                <p style={{ margin: 0, fontSize: 11, color: T.text, fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
                  {TOOLTIPS[activeNode]}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ fontSize: 10, color: T.textDim, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}
              >
                ← click a node
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
