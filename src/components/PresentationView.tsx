import { useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, Grid2X2, Home, Maximize2 } from 'lucide-react'
import type { UnifiedSlide } from '@/types'
import { SlideShell } from './SlideShell'
import { DbSlideRenderer } from './DbSlideRenderer'

interface PresentationViewProps {
  slides: UnifiedSlide[]
  activeIndex: number
  onExit: () => void
  onNavigate: (index: number) => void
  onGoHome?: () => void
  onEnterFullscreen?: () => void
}

const variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

export function PresentationView({ slides, activeIndex, onExit, onNavigate, onGoHome, onEnterFullscreen }: PresentationViewProps) {
  const directionRef = useRef(1)
  const isTransitioning = useRef(false)

  const go = useCallback((next: number) => {
    if (isTransitioning.current) return
    if (next < 0 || next >= slides.length) return
    directionRef.current = next > activeIndex ? 1 : -1
    isTransitioning.current = true
    onNavigate(next)
  }, [activeIndex, slides.length, onNavigate])

  const prev = useCallback(() => go(activeIndex - 1), [go, activeIndex])
  const next = useCallback(() => go(activeIndex + 1), [go, activeIndex])

  const activeSlide = slides[activeIndex]

  return (
    <motion.div
      key="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="h-screen w-screen flex flex-col"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Slide area — 16:9 centered */}
      <div className="flex-1 overflow-hidden flex items-center justify-center" style={{ padding: '16px 24px' }}>
        <div style={{ width: '100%', maxWidth: 'calc((100vh - 88px) * 16/9)' }}>
          <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', overflow: 'hidden', borderRadius: 8 }}>
            <AnimatePresence mode="wait" custom={directionRef.current}>
              <motion.div
                key={activeIndex}
                custom={directionRef.current}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                onAnimationComplete={() => { isTransitioning.current = false }}
                style={{ position: 'absolute', inset: 0 }}
              >
                {activeSlide.kind === 'code' ? (
                  <SlideShell>
                    <activeSlide.component isActive={true} />
                  </SlideShell>
                ) : (
                  <DbSlideRenderer blocks={activeSlide.blocks} theme={activeSlide.theme} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="flex-shrink-0 flex items-center gap-4 px-6 py-3 border-t border-(--color-border)"
        style={{ background: 'var(--color-surface)', height: 56 }}
      >
        {/* Home */}
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
            style={{ color: 'var(--color-text-dim)' }}
            title="Home"
          >
            <Home size={14} />
          </button>
        )}

        {/* Back to overview */}
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
          style={{ color: 'var(--color-text-dim)' }}
        >
          <Grid2X2 size={13} />
          <span className="hidden sm:inline">Overview</span>
          <span className="text-[10px] opacity-50 hidden sm:inline">ESC</span>
        </button>

        {/* Prev */}
        <button
          onClick={prev}
          disabled={activeIndex === 0}
          className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border) disabled:opacity-25 disabled:cursor-not-allowed"
          style={{ color: 'var(--color-text-dim)' }}
        >
          <ChevronLeft size={16} />
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5 flex-1 justify-center">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className="rounded-full transition-all"
              style={{
                width: i === activeIndex ? 20 : 6,
                height: 6,
                background: i === activeIndex ? 'var(--color-accent)' : 'var(--color-muted)',
              }}
            />
          ))}
        </div>

        {/* Next */}
        <button
          onClick={next}
          disabled={activeIndex === slides.length - 1}
          className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border) disabled:opacity-25 disabled:cursor-not-allowed"
          style={{ color: 'var(--color-text-dim)' }}
        >
          <ChevronRight size={16} />
        </button>

        {/* Counter */}
        <span className="text-xs font-mono" style={{ color: 'var(--color-text-dim)', minWidth: '3.5rem', textAlign: 'right' }}>
          {activeIndex + 1} / {slides.length}
        </span>

        {/* Fullscreen */}
        {onEnterFullscreen && (
          <button
            onClick={onEnterFullscreen}
            className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
            style={{ color: 'var(--color-text-dim)' }}
            title="Fullscreen (F)"
          >
            <Maximize2 size={14} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
