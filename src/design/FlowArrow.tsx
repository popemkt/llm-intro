import { motion } from 'motion/react'
import { T } from './tokens'

interface FlowArrowProps {
  d: string
  delay?: number
  isActive?: boolean
  accent?: boolean
  dashed?: boolean
  markerEnd?: string
}

export function FlowArrow({
  d, delay = 0, isActive = true, accent = false, dashed = false, markerEnd = 'url(#arrowhead)',
}: FlowArrowProps) {
  return (
    <motion.path
      d={d}
      stroke={accent ? T.accent : T.muted}
      strokeWidth={accent ? 1.5 : 1}
      fill="none"
      strokeDasharray={dashed ? '5 4' : undefined}
      markerEnd={markerEnd}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={isActive ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeInOut' }}
    />
  )
}

/** Drop this once inside an <svg> to get the arrowhead marker available */
export function ArrowDefs({ id = 'arrowhead', color = T.muted }: { id?: string; color?: string }) {
  return (
    <defs>
      <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill={color} />
      </marker>
    </defs>
  )
}
