import { motion } from 'motion/react'
import type { SlideProps } from '@/types'
import { FlowNode } from '@/design/FlowNode'
import { FlowArrow, ArrowDefs } from '@/design/FlowArrow'
import { T } from '@/design/tokens'

const W = 800
const H = 380

// Node positions
const nodes = {
  user:    { x: 20,  y: 150, w: 110, h: 48 },
  llm:     { x: 180, y: 150, w: 110, h: 48 },
  output:  { x: 340, y: 150, w: 110, h: 48 },
  match:   { x: 500, y: 150, w: 110, h: 48 },
  tool:    { x: 500, y: 270, w: 110, h: 48 },
  result:  { x: 180, y: 270, w: 110, h: 48 },
}

const cx = (n: typeof nodes[keyof typeof nodes]) => n.x + n.w / 2
const cy = (n: typeof nodes[keyof typeof nodes]) => n.y + n.h / 2
const cr = (n: typeof nodes[keyof typeof nodes]) => n.x + n.w
const cl = (n: typeof nodes[keyof typeof nodes]) => n.x
const cb = (n: typeof nodes[keyof typeof nodes]) => n.y + n.h
const ct = (n: typeof nodes[keyof typeof nodes]) => n.y

export default function ToolUse({ isActive }: SlideProps) {
  const { user, llm, output, match, tool, result } = nodes

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, padding: '24px 32px', boxSizing: 'border-box' }}>

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

          {/* Step labels */}
          {[
            { x: cx(user),   y: ct(user) - 14,   label: '① prompt',   delay: 0.1 },
            { x: cx(llm),    y: ct(llm) - 14,    label: '② thinks',   delay: 0.4 },
            { x: cx(output), y: ct(output) - 14,  label: '③ raw output', delay: 0.7 },
            { x: cx(match),  y: ct(match) - 14,   label: '④ parse',    delay: 1.0 },
            { x: cx(tool),   y: cb(tool) + 18,    label: '⑤ execute',  delay: 1.3 },
            { x: cx(result), y: cb(result) + 18,  label: '⑥ result → LLM', delay: 1.6 },
          ].map(({ x, y, label, delay }) => (
            <motion.text
              key={label}
              x={x} y={y}
              textAnchor="middle"
              fill={T.textDim}
              fontSize={9}
              fontFamily="Inter, sans-serif"
              initial={{ opacity: 0 }}
              animate={isActive ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay, duration: 0.3 }}
            >
              {label}
            </motion.text>
          ))}

          {/* Nodes */}
          <FlowNode {...user}   label="User"          delay={0.0}  isActive={isActive} />
          <FlowNode {...llm}    label="LLM"           delay={0.3}  isActive={isActive} accent />
          <FlowNode {...output} label="Output"  sublabel='{"tool":"bash"}' delay={0.6} isActive={isActive} />
          <FlowNode {...match}  label="Pattern Match" delay={0.9}  isActive={isActive} />
          <FlowNode {...tool}   label="Tool Executor" delay={1.2}  isActive={isActive} accent />
          <FlowNode {...result} label="Result"        delay={1.5}  isActive={isActive} highlight />

          {/* Arrows — forward */}
          <FlowArrow d={`M${cr(user)} ${cy(user)} L${cl(llm)} ${cy(llm)}`}         delay={0.15} isActive={isActive} markerEnd="url(#arr)" />
          <FlowArrow d={`M${cr(llm)} ${cy(llm)} L${cl(output)} ${cy(output)}`}     delay={0.45} isActive={isActive} markerEnd="url(#arr)" />
          <FlowArrow d={`M${cr(output)} ${cy(output)} L${cl(match)} ${cy(match)}`} delay={0.75} isActive={isActive} accent markerEnd="url(#arr-accent)" />
          <FlowArrow d={`M${cx(match)} ${cb(match)} L${cx(tool)} ${ct(tool)}`}     delay={1.05} isActive={isActive} accent markerEnd="url(#arr-accent)" />

          {/* Arrow: tool → result */}
          <FlowArrow
            d={`M${cl(tool)} ${cy(tool)} L${cr(result)} ${cy(result)}`}
            delay={1.35} isActive={isActive} markerEnd="url(#arr)"
          />

          {/* Loop-back arrow: result → LLM */}
          <FlowArrow
            d={`M${cx(result)} ${ct(result)} C${cx(result)} ${ct(result) - 50} ${cx(llm)} ${ct(llm) + 90} ${cx(llm)} ${cb(llm)}`}
            delay={1.65} isActive={isActive} accent dashed markerEnd="url(#arr-accent)"
          />

          {/* "loop" label on loop-back */}
          <motion.text
            x={(cx(result) + cx(llm)) / 2}
            y={cy(result) - 30}
            textAnchor="middle"
            fill={T.accent}
            fontSize={9}
            fontFamily="Inter, sans-serif"
            fontWeight={600}
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 1.9, duration: 0.4 }}
          >
            loop
          </motion.text>

          {/* JSON highlight box inside Output node */}
          <motion.rect
            x={output.x + 4} y={output.y + 26} width={output.w - 8} height={16}
            rx={3}
            fill={`${T.accent}25`}
            stroke={T.accentDim}
            strokeWidth={0.5}
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.9, duration: 0.3 }}
          />
        </svg>
      </div>

      {/* Bottom insight */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ delay: 2.1, duration: 0.4 }}
        style={{ textAlign: 'center', color: T.textDim, fontSize: 11, fontFamily: 'Inter, sans-serif', marginTop: 4 }}
      >
        Tool use = pattern matching on LLM output → run code on client → feed result back
      </motion.p>
    </div>
  )
}
