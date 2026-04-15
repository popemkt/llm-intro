import { motion } from 'motion/react'
import { T } from './tokens'

interface FlowArrowProps {
  d: string
  delay?: number
  isActive?: boolean
  dashed?: boolean
  markerEnd?: string
  hot?: boolean
}

export function FlowArrow({
  d, delay = 0, isActive = true, dashed = false, markerEnd = 'url(#arrowhead)', hot = false,
}: FlowArrowProps) {
  const stroke = hot ? T.highlight : T.muted
  const width  = hot ? 2.4 : 1
  return (
    <motion.path
      d={d}
      fill="none"
      strokeDasharray={dashed ? '5 4' : undefined}
      markerEnd={markerEnd}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={isActive ? { pathLength: 1, opacity: hot ? 1 : 0.5, stroke, strokeWidth: width } : { pathLength: 0, opacity: 0 }}
      transition={{
        pathLength: { duration: 0.5, delay, ease: 'easeInOut' },
        opacity:    { duration: 0.25, ease: 'easeOut' },
        stroke:     { duration: 0.25, ease: 'easeOut' },
        strokeWidth:{ duration: 0.25, ease: 'easeOut' },
      }}
    />
  )
}

/**
 * Drop this once inside an <svg> to get the arrowhead marker available.
 * The marker uses `fill="context-stroke"` so the arrowhead auto-matches the
 * path's current stroke color — no need for a separate "accent" marker.
 */
export function ArrowDefs({ id = 'arrowhead' }: { id?: string }) {
  return (
    <defs>
      <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="context-stroke" />
      </marker>
    </defs>
  )
}
