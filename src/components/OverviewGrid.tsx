import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import type { SlideDefinition } from '@/types'

interface OverviewGridProps {
  slides: SlideDefinition[]
  onSelectSlide: (index: number) => void
}

const LOGICAL_W = 1000
const LOGICAL_H = 562.5

function ThumbnailCell({
  slide,
  index,
  onSelect,
}: {
  slide: SlideDefinition
  index: number
  onSelect: (i: number) => void
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / LOGICAL_W)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const SlideComponent = slide.component

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      onClick={() => onSelect(index)}
      className="group relative rounded-xl overflow-hidden border border-(--color-border) hover:border-(--color-accent)/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) transition-colors text-left w-full"
      style={{ background: 'var(--color-surface)' }}
    >
      {/* 16:9 aspect ratio container */}
      <div ref={outerRef} style={{ position: 'relative', width: '100%', paddingBottom: '56.25%' }}>
        {/* Scaled slide — pointer-events off so it doesn't intercept the button click */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: LOGICAL_W,
            height: LOGICAL_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <SlideComponent isActive={false} />
        </div>
      </div>

      {/* Caption */}
      <div className="px-3 py-2 border-t border-(--color-border) flex items-center gap-2">
        <span className="text-xs font-mono text-(--color-text-dim)">{String(index + 1).padStart(2, '0')}</span>
        <span className="text-xs font-medium text-(--color-text) truncate">{slide.title}</span>
      </div>
    </motion.button>
  )
}

export function OverviewGrid({ slides, onSelectSlide }: OverviewGridProps) {
  const handleSelect = useCallback((i: number) => onSelectSlide(i), [onSelectSlide])

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="h-full w-full overflow-y-auto"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 px-8 py-4 border-b border-(--color-border) backdrop-blur-sm flex items-center gap-3"
           style={{ background: 'color-mix(in srgb, var(--color-bg) 85%, transparent)' }}>
        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)' }} />
        <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--color-text)' }}>
          LLM Intro
        </span>
        <span className="text-xs font-mono ml-auto" style={{ color: 'var(--color-text-dim)' }}>
          {slides.length} slides · click to present
        </span>
      </div>

      {/* Grid */}
      <div className="grid gap-5 p-8" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {slides.map((slide, i) => (
          <ThumbnailCell key={slide.id} slide={slide} index={i} onSelect={handleSelect} />
        ))}
      </div>
    </motion.div>
  )
}
