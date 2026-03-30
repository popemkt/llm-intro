import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { SlideProps } from '@/types'
import { computeOLS, type Point } from '@/lib/regression'
import { T } from '@/design/tokens'

type Part = 'A' | 'B'

const PAD = 40
const SVG_W = 460
const SVG_H = 300
const DATA_MIN = 0
const DATA_MAX = 10

function toSVGX(v: number) { return PAD + (v / DATA_MAX) * (SVG_W - PAD * 2) }
function toSVGY(v: number) { return SVG_H - PAD - (v / DATA_MAX) * (SVG_H - PAD * 2) }
function fromSVGX(s: number) { return ((s - PAD) / (SVG_W - PAD * 2)) * DATA_MAX }
function fromSVGY(s: number) { return ((SVG_H - PAD - s) / (SVG_H - PAD * 2)) * DATA_MAX }

const INITIAL_POINTS: Point[] = [
  { x: 1.2, y: 1.8 }, { x: 2.1, y: 2.9 }, { x: 2.8, y: 3.1 },
  { x: 3.9, y: 3.7 }, { x: 4.5, y: 5.2 }, { x: 5.3, y: 5.1 },
  { x: 6.4, y: 6.3 }, { x: 7.8, y: 7.5 },
]

const TOKEN_POOL = [
  'The', 'model', 'reads', 'all', 'previous', 'tokens',
  'then', 'predicts', 'the', 'next', 'one', 'and', 'appends',
  'it', 'to', 'input', 'loop', 'repeats',
]

// ---- Part A: Interactive scatter plot ----
function ScatterPlot(_: { isActive: boolean }) {
  const [points, setPoints] = useState<Point[]>(INITIAL_POINTS)
  const [dragging, setDragging] = useState<number | null>(null)
  const didDrag = useRef(false)
  const [predictX, setPredictX] = useState(8.5)
  const [draggingPredict, setDraggingPredict] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const regression = useMemo(() => computeOLS(points), [points])

  const svgPoint = useCallback((e: React.PointerEvent) => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }, [])

  const handleBgClick = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const sp = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    const x = Math.max(0, Math.min(DATA_MAX, fromSVGX(sp.x)))
    const y = Math.max(0, Math.min(DATA_MAX, fromSVGY(sp.y)))
    setPoints(prev => [...prev, { x, y }])
  }, [])

  const handlePointDown = useCallback((e: React.PointerEvent, i: number) => {
    e.stopPropagation()
    svgRef.current!.setPointerCapture(e.pointerId)
    didDrag.current = false
    setDragging(i)
  }, [])


  const handlePredictDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    svgRef.current!.setPointerCapture(e.pointerId)
    setDraggingPredict(true)
  }, [])

  const handleMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (dragging !== null) {
      didDrag.current = true
      const sp = svgPoint(e)
      const x = Math.max(0.05, Math.min(DATA_MAX - 0.05, fromSVGX(sp.x)))
      const y = Math.max(0.05, Math.min(DATA_MAX - 0.05, fromSVGY(sp.y)))
      setPoints(prev => prev.map((p, i) => i === dragging ? { x, y } : p))
    }
    if (draggingPredict) {
      const sp = svgPoint(e)
      const x = Math.max(0.1, Math.min(DATA_MAX - 0.1, fromSVGX(sp.x)))
      setPredictX(x)
    }
  }, [dragging, draggingPredict, svgPoint])

  const handleUp = useCallback(() => {
    if (dragging !== null && !didDrag.current) {
      setPoints(prev => prev.filter((_, idx) => idx !== dragging))
    }
    setDragging(null)
    setDraggingPredict(false)
  }, [dragging])

  const lineX1 = toSVGX(DATA_MIN)
  const lineX2 = toSVGX(DATA_MAX)
  const lineY1 = regression ? toSVGY(regression.predict(DATA_MIN)) : 0
  const lineY2 = regression ? toSVGY(regression.predict(DATA_MAX)) : 0
  const predictY = regression ? toSVGY(regression.predict(predictX)) : 0
  const predictSVGX = toSVGX(predictX)

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>

      <div style={{ display: 'flex', gap: 16, marginBottom: 4, fontSize: 11, color: T.textDim, fontFamily: 'Inter, sans-serif' }}>
        <span>● drag points &nbsp;|&nbsp; click blank = add &nbsp;|&nbsp; click point = remove &nbsp;|&nbsp; drag <span style={{ color: T.highlight }}>◆</span> = predict</span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: '100%', maxWidth: SVG_W, cursor: dragging !== null ? 'grabbing' : 'crosshair', userSelect: 'none' }}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
      >
        {/* Grid */}
        {[2, 4, 6, 8].map(v => (
          <g key={v}>
            <line x1={PAD} y1={toSVGY(v)} x2={SVG_W - PAD} y2={toSVGY(v)} stroke={T.border} strokeWidth={0.5} />
            <line x1={toSVGX(v)} y1={PAD} x2={toSVGX(v)} y2={SVG_H - PAD} stroke={T.border} strokeWidth={0.5} />
          </g>
        ))}

        {/* Axes */}
        <line x1={PAD} y1={SVG_H - PAD} x2={SVG_W - PAD} y2={SVG_H - PAD} stroke={T.muted} strokeWidth={1} />
        <line x1={PAD} y1={PAD} x2={PAD} y2={SVG_H - PAD} stroke={T.muted} strokeWidth={1} />
        <text x={SVG_W / 2} y={SVG_H - 8} textAnchor="middle" fill={T.textDim} fontSize={10} fontFamily="Inter, sans-serif">income →</text>
        <text x={12} y={SVG_H / 2} textAnchor="middle" fill={T.textDim} fontSize={10} fontFamily="Inter, sans-serif" transform={`rotate(-90, 12, ${SVG_H / 2})`}>spending →</text>

        {/* Background click zone */}
        <rect
          x={PAD} y={PAD}
          width={SVG_W - PAD * 2} height={SVG_H - PAD * 2}
          fill="transparent"
          onClick={handleBgClick}
        />

        {/* Regression line */}
        {regression && (
          <motion.line
            x1={lineX1} y1={lineY1} x2={lineX2} y2={lineY2}
            stroke={T.accent}
            strokeWidth={2}
            strokeDasharray="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          />
        )}

        {/* Predict handle */}
        {regression && (
          <>
            {/* Dashed vertical */}
            <line
              x1={predictSVGX} y1={SVG_H - PAD}
              x2={predictSVGX} y2={predictY}
              stroke={T.highlight} strokeWidth={1} strokeDasharray="4 3"
            />
            {/* Predicted point on line */}
            <circle cx={predictSVGX} cy={predictY} r={5} fill={T.highlight} opacity={0.9} />
            {/* Label */}
            <text
              x={predictSVGX + 8} y={predictY - 8}
              fill={T.highlight} fontSize={9.5} fontFamily="Inter, sans-serif" fontWeight={600}
            >
              {`ŷ = ${regression.predict(predictX).toFixed(1)}`}
            </text>
            {/* Drag handle */}
            <rect
              x={predictSVGX - 7} y={SVG_H - PAD - 7} width={14} height={14}
              rx={3} fill={T.highlight} opacity={0.85}
              style={{ cursor: 'ew-resize' }}
              onPointerDown={handlePredictDown}
            />
            <text
              x={predictSVGX} y={SVG_H - PAD + 1}
              textAnchor="middle" dominantBaseline="middle"
              fill={T.bg} fontSize={8} fontFamily="Inter, sans-serif" fontWeight={700}
              style={{ pointerEvents: 'none' }}
            >◆</text>
          </>
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={toSVGX(p.x)} cy={toSVGY(p.y)} r={6}
            fill={T.surface} stroke={T.accent} strokeWidth={1.5}
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => handlePointDown(e, i)}
          />
        ))}

        {/* Label: the model */}
        {regression && (
          <text
            x={SVG_W - PAD - 8} y={toSVGY(regression.predict(DATA_MAX)) - 10}
            textAnchor="end" fill={T.accent} fontSize={10} fontFamily="Inter, sans-serif" fontWeight={600}
          >
            the model (line)
          </text>
        )}
      </svg>

      {/* R² badge */}
      {regression && (
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: T.textDim }}>
          R² = <span style={{ color: T.accent, fontWeight: 700 }}>{regression.r2.toFixed(3)}</span>
          &nbsp;&nbsp;·&nbsp;&nbsp;
          slope = <span style={{ color: T.textDim }}>{regression.slope.toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}

// ---- Part B: Token prediction loop ----
const MAX_SHOWN = 6
const SEED = ['Large', 'language', 'models', 'predict']

function TokenLoop({ isActive }: { isActive: boolean }) {
  const [tokens, setTokens] = useState<string[]>(SEED)
  const [pulsing, setPulsing] = useState(false)
  const poolIdx = useRef(0)

  useEffect(() => {
    if (!isActive) return
    const id = setInterval(() => {
      const next = TOKEN_POOL[poolIdx.current % TOKEN_POOL.length]
      poolIdx.current++
      setTokens(prev => [...prev.slice(-MAX_SHOWN + 1), next])
      setPulsing(true)
      setTimeout(() => setPulsing(false), 300)
    }, 1100)
    return () => clearInterval(id)
  }, [isActive])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%' }}>

      {/* Token stream */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center', minHeight: 44 }}>
        {tokens.map((tok, i) => (
          <motion.span
            key={`${i}-${tok}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: i === tokens.length - 1 ? 1 : 0.5, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13,
              fontWeight: i === tokens.length - 1 ? 700 : 400,
              background: i === tokens.length - 1 ? 'var(--color-accent)' : 'var(--color-surface)',
              color: i === tokens.length - 1 ? 'var(--color-bg)' : 'var(--color-text)',
              border: `1px solid ${i === tokens.length - 1 ? 'transparent' : T.border}`,
            }}
          >
            {tok}
          </motion.span>
        ))}
        <span style={{ color: T.textDim, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>…</span>
      </div>

      {/* Arrow */}
      <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}
        style={{ color: T.textDim, fontSize: 18 }}>↓</motion.div>

      {/* Model box */}
      <motion.div
        animate={pulsing ? { scale: [1, 1.06, 1], boxShadow: [`0 0 0 0 ${T.accent}00`, `0 0 0 8px ${T.accent}40`, `0 0 0 0 ${T.accent}00`] } : {}}
        transition={{ duration: 0.3 }}
        style={{
          padding: '16px 40px',
          borderRadius: 12,
          border: `1.5px solid ${T.accent}`,
          background: `${T.accentDim}18`,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13,
          fontWeight: 700,
          color: T.accent,
          letterSpacing: '0.08em',
        }}
      >
        LLM
      </motion.div>

      {/* Arrow */}
      <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.3 }}
        style={{ color: T.textDim, fontSize: 18 }}>↓</motion.div>

      {/* Output */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: T.textDim, fontSize: 12, fontFamily: 'Inter, sans-serif' }}>next token:</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={tokens[tokens.length - 1]}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            style={{
              padding: '3px 10px',
              borderRadius: 6,
              background: T.highlight,
              color: T.bg,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {tokens[tokens.length - 1]}
          </motion.span>
        </AnimatePresence>
        <span style={{ color: T.textDim, fontSize: 12 }}>→ appended → repeat</span>
      </div>

      <p style={{ color: T.textDim, fontSize: 11, textAlign: 'center', maxWidth: 380, fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
        LLM = regression-like function, but it predicts the next <em>token</em>.
        Output gets appended to input. Loop repeats.
      </p>
    </div>
  )
}

// ---- Main slide ----
export default function LinearRegression({ isActive }: SlideProps) {
  const [part, setPart] = useState<Part>('A')

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, padding: '24px 32px', boxSizing: 'border-box' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 10 }}
      >
        <span style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', fontWeight: 800, color: T.text }}>
          {part === 'A' ? 'A model = a function that fits data' : 'LLM = next-token prediction, looped'}
        </span>
        <span style={{ fontSize: 11, color: T.textDim, fontFamily: 'JetBrains Mono, monospace' }}>
          {part === 'A' ? '(linear regression)' : '(same idea, way more parameters)'}
        </span>
      </motion.div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {part === 'A' ? (
            <motion.div key="A" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} style={{ width: '100%' }}>
              <ScatterPlot isActive={isActive} />
            </motion.div>
          ) : (
            <motion.div key="B" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} style={{ width: '100%' }}>
              <TokenLoop isActive={isActive} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Part toggle */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
        {(['A', 'B'] as Part[]).map(p => (
          <button
            key={p}
            onClick={() => setPart(p)}
            style={{
              padding: '6px 20px',
              borderRadius: 20,
              border: `1.5px solid ${part === p ? T.accent : T.border}`,
              background: part === p ? `${T.accent}18` : 'transparent',
              color: part === p ? T.accent : T.textDim,
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {p === 'A' ? 'Linear Regression' : 'Token Prediction'}
          </button>
        ))}
      </div>
    </div>
  )
}
