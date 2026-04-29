import { useCallback, useEffect, useRef, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { cn } from '@/lib/utils'

interface SlideShellProps {
  children: React.ReactNode
  className?: string
}

// Logical canvas size. Code slides render into a fixed 1000×562.5 viewport
// (16:9) and are scaled with `transform: scale(...)` to fill the parent, so
// layout stays pixel-identical across overview, presentation, and fullscreen
// modes. The parent must already be 16:9 (both PresentationView and
// FullscreenView wrap SlideShell in a 16:9 box); the shell just measures
// width and scales.
const LOGICAL_W = 1000
const LOGICAL_H = 562.5

/**
 * A 16:9 canvas wrapper. Children are rendered at a fixed 1000×562.5 logical
 * size and scaled to fill the parent, matching how OverviewGrid renders
 * thumbnails. Authors code slides assume a 1000×562.5 coordinate system.
 */
export function SlideShell({ children, className }: SlideShellProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / LOGICAL_W)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Framer Motion uses getBoundingClientRect for layout animations. Inside
  // our transform: scale() canvas, those rects are in post-transform
  // coordinates, which makes layoutId deltas wrong. transformPagePoint
  // converts page points back into the canvas's logical coordinate system.
  const transformPagePoint = useCallback(
    ({ x, y }: { x: number; y: number }) => {
      const el = outerRef.current
      if (!el || scale === 0) return { x, y }
      const rect = el.getBoundingClientRect()
      return {
        x: (x - rect.left) / scale + rect.left,
        y: (y - rect.top) / scale + rect.top,
      }
    },
    [scale],
  )

  return (
    <MotionConfig transformPagePoint={transformPagePoint}>
      <div
        ref={outerRef}
        className={cn(
          'relative w-full h-full overflow-hidden bg-(--color-bg)',
          className,
        )}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: LOGICAL_W,
            height: LOGICAL_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </MotionConfig>
  )
}
