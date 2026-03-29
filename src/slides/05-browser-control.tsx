import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MousePointer2, Camera, Globe, CheckCircle2 } from 'lucide-react'
import type { SlideProps } from '@/types'
import { FlowNode } from '@/design/FlowNode'
import { FlowArrow, ArrowDefs } from '@/design/FlowArrow'
import { T } from '@/design/tokens'

const STEPS = [
  { icon: Globe,         label: 'Open browser',      detail: 'navigate to files.example.com',   color: T.textDim },
  { icon: MousePointer2, label: 'Find upload button', detail: 'locate element by text / selector', color: T.textDim },
  { icon: null,          label: 'Select file',        detail: 'pick file from local path',        color: T.textDim },
  { icon: MousePointer2, label: 'Click Submit',       detail: 'trigger form submission',           color: T.textDim },
  { icon: Camera,        label: 'Screenshot',         detail: 'verify upload succeeded',           color: T.textDim },
  { icon: CheckCircle2,  label: 'Done ✓',             detail: 'report back to Claude',             color: T.accent  },
]

// Left: loop diagram
const DW = 340
const DH = 300
const claud  = { x: 20,  y: 120, w: 80, h: 40 }
const play   = { x: 130, y: 120, w: 80, h: 40 }
const brow   = { x: 240, y: 120, w: 80, h: 40 }
const screen = { x: 240, y: 220, w: 80, h: 40 }

const cx = (n: typeof claud) => n.x + n.w / 2
const cy = (n: typeof claud) => n.y + n.h / 2
const cr = (n: typeof claud) => n.x + n.w
const cl = (n: typeof claud) => n.x
const cb = (n: typeof claud) => n.y + n.h
const ct = (n: typeof claud) => n.y

function LoopDiagram({ isActive }: { isActive: boolean }) {
  return (
    <svg viewBox={`0 0 ${DW} ${DH}`} style={{ width: '100%', maxWidth: DW }}>
      <ArrowDefs id="darr" color={T.muted} />
      <ArrowDefs id="darr-a" color={T.accent} />

      <FlowNode {...claud}  label="Claude"    delay={0.1} isActive={isActive} accent />
      <FlowNode {...play}   label="Playwright" delay={0.3} isActive={isActive} />
      <FlowNode {...brow}   label="Browser"   delay={0.5} isActive={isActive} />
      <FlowNode {...screen} label="Screenshot/DOM" delay={0.7} isActive={isActive} />

      {/* Claude → Playwright */}
      <FlowArrow d={`M${cr(claud)} ${cy(claud)} L${cl(play)} ${cy(play)}`} delay={0.2} isActive={isActive} accent markerEnd="url(#darr-a)" />
      {/* Playwright → Browser */}
      <FlowArrow d={`M${cr(play)} ${cy(play)} L${cl(brow)} ${cy(brow)}`} delay={0.4} isActive={isActive} markerEnd="url(#darr)" />
      {/* Browser → Screenshot */}
      <FlowArrow d={`M${cx(brow)} ${cb(brow)} L${cx(screen)} ${ct(screen)}`} delay={0.6} isActive={isActive} markerEnd="url(#darr)" />
      {/* Screenshot → Claude (loop-back) */}
      <FlowArrow
        d={`M${cx(screen)} ${cb(screen)} C${cx(screen)} ${cb(screen)+40} ${cx(claud)} ${cb(claud)+40} ${cx(claud)} ${cb(claud)}`}
        delay={0.9} isActive={isActive} accent dashed markerEnd="url(#darr-a)"
      />

      {/* Labels */}
      {[
        { x: (cx(claud) + cx(play)) / 2,    y: cy(claud) - 10, t: 'instructions' },
        { x: (cx(play) + cx(brow)) / 2,     y: cy(play) - 10,  t: 'clicks/types' },
        { x: cx(brow) + 16,                  y: (cy(brow) + cy(screen)) / 2, t: 'returns' },
        { x: (cx(screen) + cx(claud)) / 2,  y: cb(screen) + 28, t: 'feeds back' },
      ].map(({ x, y, t }) => (
        <motion.text key={t} x={x} y={y} textAnchor="middle" fill={T.textDim} fontSize={8.5} fontFamily="Inter, sans-serif"
          initial={{ opacity: 0 }} animate={isActive ? { opacity: 1 } : { opacity: 0 }} transition={{ delay: 1.1, duration: 0.4 }}>
          {t}
        </motion.text>
      ))}
    </svg>
  )
}

export default function BrowserControl({ isActive }: SlideProps) {
  const [shownSteps, setShownSteps] = useState(0)

  useEffect(() => {
    if (!isActive) { setShownSteps(0); return }
    const id = setInterval(() => {
      setShownSteps(prev => {
        if (prev >= STEPS.length) { clearInterval(id); return prev }
        return prev + 1
      })
    }, 900)
    return () => clearInterval(id)
  }, [isActive])

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, padding: '20px 32px', boxSizing: 'border-box' }}>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 16 }}
      >
        <span style={{ fontSize: 'clamp(1rem, 2.2vw, 1.4rem)', fontWeight: 800, color: T.text }}>
          Browser control = <span style={{ color: T.accent }}>a tool</span> Claude can use
        </span>
      </motion.div>

      {/* Two-col layout */}
      <div style={{ flex: 1, display: 'flex', gap: 32, alignItems: 'center', overflow: 'hidden' }}>

        {/* Left: loop diagram */}
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: T.textDim, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            how it works
          </span>
          <LoopDiagram isActive={isActive} />
        </div>

        {/* Divider */}
        <div style={{ width: 1, alignSelf: 'stretch', background: T.border }} />

        {/* Right: step-by-step */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 10, color: T.textDim, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
            example: upload file to website
          </span>

          {STEPS.map((step, i) => {
            const Icon = step.icon
            const shown = i < shownSteps
            return (
              <AnimatePresence key={i}>
                {shown && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      border: `1px solid ${i === STEPS.length - 1 ? T.accent : T.border}`,
                      background: i === STEPS.length - 1 ? `${T.accent}20` : T.surface,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {Icon
                        ? <Icon size={13} color={i === STEPS.length - 1 ? T.accent : T.textDim} />
                        : <span style={{ fontSize: 9, color: T.textDim }}>📄</span>
                      }
                    </div>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: i === STEPS.length - 1 ? T.accent : T.text, fontFamily: 'Inter, sans-serif' }}>
                        {step.label}
                      </span>
                      <span style={{ marginLeft: 8, fontSize: 10, color: T.textDim, fontFamily: 'JetBrains Mono, monospace' }}>
                        {step.detail}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )
          })}
        </div>
      </div>

      {/* Bottom note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isActive ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.8, duration: 0.4 }}
        style={{
          marginTop: 12,
          padding: '8px 14px',
          borderRadius: 8,
          border: `1px solid ${T.accentDim}`,
          background: `${T.accentDim}12`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 10, color: T.textDim, fontFamily: 'Inter, sans-serif' }}>
          ↳ This whole workflow becomes a <strong style={{ color: T.accent }}>Skill</strong> — one <code style={{ fontFamily: 'JetBrains Mono, monospace', color: T.highlight }}>.md</code> file telling Claude exactly what to do
        </span>
      </motion.div>
    </div>
  )
}
