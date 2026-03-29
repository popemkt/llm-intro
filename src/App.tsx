import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'motion/react'
import { slides } from '@/slides'
import { OverviewGrid } from '@/components/OverviewGrid'
import { PresentationView } from '@/components/PresentationView'

type AppMode = 'overview' | 'presentation'

export default function App() {
  const [mode, setMode] = useState<AppMode>('overview')
  const [activeIndex, setActiveIndex] = useState(0)

  const enterPresentation = useCallback((index: number) => {
    setActiveIndex(index)
    setMode('presentation')
  }, [])

  const exitPresentation = useCallback(() => {
    setMode('overview')
  }, [])

  useEffect(() => {
    if (mode !== 'presentation') return
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          setActiveIndex(i => Math.min(i + 1, slides.length - 1))
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          setActiveIndex(i => Math.max(i - 1, 0))
          break
        case 'Escape':
          exitPresentation()
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, exitPresentation])

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--color-bg)' }}>
      <AnimatePresence mode="wait">
        {mode === 'overview' ? (
          <OverviewGrid
            key="overview"
            slides={slides}
            onSelectSlide={enterPresentation}
          />
        ) : (
          <PresentationView
            key="presentation"
            slides={slides}
            activeIndex={activeIndex}
            onExit={exitPresentation}
            onNavigate={setActiveIndex}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
