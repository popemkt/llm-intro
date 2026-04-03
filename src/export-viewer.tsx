/**
 * Minimal read-only presentation viewer for exported single-HTML builds.
 * Renders slides with keyboard/click navigation. No editor, no DB, no routing.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { ComponentType } from 'react'
import type { SlideProps, ApiSlide, ApiPresentation } from '@/types'
import { SlideShell } from '@/components/SlideShell'
import { DbSlideRenderer } from '@/components/DbSlideRenderer'

// These will be replaced at build time by the export route
declare const __EXPORT_REGISTRY__: Record<string, ComponentType<SlideProps>>
declare const __EXPORT_PRESENTATION__: ApiPresentation
declare const __EXPORT_SLIDES__: ApiSlide[]

type Slide =
  | { kind: 'code'; component: ComponentType<SlideProps> }
  | { kind: 'db'; blocks: ApiSlide['blocks']; theme: ApiPresentation['theme'] }

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}

function resolve(apiSlide: ApiSlide, pres: ApiPresentation, registry: Record<string, ComponentType<SlideProps>>): Slide {
  if (apiSlide.kind === 'code' && apiSlide.code_id && registry[apiSlide.code_id]) {
    return { kind: 'code', component: registry[apiSlide.code_id] }
  }
  return { kind: 'db', blocks: apiSlide.blocks, theme: pres.theme }
}

export default function ExportViewer() {
  const pres = __EXPORT_PRESENTATION__
  const slides = __EXPORT_SLIDES__.map(s => resolve(s, pres, __EXPORT_REGISTRY__))

  const [idx, setIdx] = useState(0)
  const dirRef = useRef(1)
  const transitioning = useRef(false)

  const go = useCallback((next: number) => {
    if (transitioning.current) return
    if (next < 0 || next >= slides.length) return
    dirRef.current = next > idx ? 1 : -1
    transitioning.current = true
    setIdx(next)
  }, [idx, slides.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); go(idx + 1) }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(idx - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, idx])

  const slide = slides[idx]
  if (!slide) return <div style={{ width: '100vw', height: '100vh', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No slides</div>

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', maxWidth: 'calc(100vh * 16 / 9)' }}>
        <AnimatePresence mode="wait" custom={dirRef.current}>
          <motion.div
            key={idx}
            custom={dirRef.current}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onAnimationComplete={() => { transitioning.current = false }}
            style={{ position: 'absolute', inset: 0 }}
          >
            {slide.kind === 'code' ? (
              <SlideShell><slide.component isActive={true} /></SlideShell>
            ) : (
              <DbSlideRenderer blocks={slide.blocks} theme={slide.theme} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Slide counter */}
        <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace' }}>
          {idx + 1} / {slides.length}
        </div>
      </div>
    </div>
  )
}
