import { motion } from 'motion/react'
import { T } from './tokens'

interface FlowNodeProps {
  x: number
  y: number
  w: number
  h: number
  label: string
  sublabel?: string
  delay?: number
  isActive?: boolean
  accent?: boolean
  highlight?: boolean
}

export function FlowNode({
  x, y, w, h, label, sublabel,
  delay = 0, isActive = true, accent = false, highlight = false,
}: FlowNodeProps) {
  const fill   = highlight ? T.accent : accent ? T.accentDim : T.surface
  const stroke = highlight ? T.highlight : accent ? T.accent : T.border
  const color  = highlight ? T.bg : T.text

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: `${x + w / 2}px ${y + h / 2}px` }}
    >
      <motion.rect
        x={x} y={y} width={w} height={h}
        rx={8} ry={8}
        animate={{ fill, stroke, strokeWidth: accent || highlight ? 1.5 : 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      />
      <motion.text
        x={x + w / 2}
        y={sublabel ? y + h / 2 - 7 : y + h / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight={600}
        animate={{ fill: color }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        {label}
      </motion.text>
      {sublabel && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={T.textDim}
          fontSize={9.5}
          fontFamily="JetBrains Mono, monospace"
        >
          {sublabel}
        </text>
      )}
    </motion.g>
  )
}
