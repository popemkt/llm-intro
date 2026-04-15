import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { UnifiedSlide } from '@/types'
import { SlideShell } from './SlideShell'
import { DbSlideRenderer } from './DbSlideRenderer'

interface Props {
  slides: UnifiedSlide[]
  activeIndex: number
  onNavigate: (index: number) => void
  onExit: () => void
}

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}

export function FullscreenView({ slides, activeIndex, onNavigate, onExit }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const directionRef  = useRef(1)
  const transitioning = useRef(false)

  useEffect(() => {
    containerRef.current?.requestFullscreen().catch(() => {})
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onFSChange = () => { if (!document.fullscreenElement) onExit() }
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [onExit])

  const go = useCallback((next: number) => {
    if (transitioning.current) return
    if (next < 0 || next >= slides.length) return
    directionRef.current = next > activeIndex ? 1 : -1
    transitioning.current = true
    onNavigate(next)
  }, [activeIndex, slides.length, onNavigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(activeIndex + 1) }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(activeIndex - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, activeIndex])

  const slide = slides[activeIndex]

  if (!slide) {
    return (
      <div ref={containerRef} style={{ width: '100vw', height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        No slides available.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      <div style={{ width: '100%', maxWidth: 'calc(100vh * 16/9)' }}>
        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', overflow: 'hidden' }}>
          <AnimatePresence mode="wait" custom={directionRef.current}>
            <motion.div
              key={activeIndex}
              custom={directionRef.current}
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
        </div>
      </div>
    </div>
  )
}
