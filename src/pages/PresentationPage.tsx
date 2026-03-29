import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { OverviewGrid } from '@/components/OverviewGrid'
import { PresentationView } from '@/components/PresentationView'
import { codeSlideRegistry } from '@/slides/registry'
import { api } from '@/api/client'
import type { UnifiedSlide, ApiSlide, ApiPresentation } from '@/types'

function toUnified(slide: ApiSlide, theme: ApiPresentation['theme']): UnifiedSlide {
  if (slide.kind === 'code') {
    const component = codeSlideRegistry[slide.code_id ?? '']
    if (!component) {
      console.warn(`Unknown code_id: ${slide.code_id}`)
      // Fall back to a db-style empty slide so the app doesn't crash
      return { kind: 'db', id: slide.id, title: slide.title, blocks: [], theme }
    }
    return { kind: 'code', id: slide.id, title: slide.title, component }
  }
  return { kind: 'db', id: slide.id, title: slide.title, blocks: slide.blocks, theme }
}

export function PresentationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const pid = Number(id)

  const [mode, setMode] = useState<'overview' | 'presentation'>('overview')
  const [activeIndex, setActiveIndex] = useState(0)
  const [slides, setSlides] = useState<UnifiedSlide[]>([])
  const [presentation, setPresentation] = useState<ApiPresentation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || isNaN(pid)) { setError('Invalid ID'); setLoading(false); return }
    Promise.all([api.presentations.get(pid), api.slides.list(pid)])
      .then(([pres, apiSlides]) => {
        setPresentation(pres)
        setSlides(apiSlides.map(s => toUnified(s, pres.theme)))
      })
      .catch(() => setError('Presentation not found'))
      .finally(() => setLoading(false))
  }, [id, pid])

  useEffect(() => {
    if (mode !== 'presentation') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, slides.length - 1)) }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Escape') setMode('overview')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, slides.length])

  const handleAddSlide = useCallback(async () => {
    if (!presentation) return
    const s = await api.slides.create(presentation.id)
    setSlides(prev => [...prev, toUnified(s, presentation.theme)])
  }, [presentation])

  const handleReorder = useCallback(async (ids: number[]) => {
    if (!presentation) return
    setSlides(prev => {
      const map = new Map(prev.map(s => [s.id, s]))
      return ids.map(id => map.get(id)!).filter(Boolean)
    })
    await api.slides.reorder(presentation.id, ids)
  }, [presentation])

  const handleSlideUpdated = useCallback((updated: ApiSlide) => {
    if (!presentation) return
    setSlides(prev => prev.map(s => s.id === updated.id ? toUnified(updated, presentation.theme) : s))
  }, [presentation])

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0f0e', color: '#7a9985', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
      Loading…
    </div>
  )

  if (error || !presentation) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0d0f0e', color: '#e8f0eb', fontFamily: 'Inter, sans-serif', gap: 16 }}>
      <div style={{ fontSize: 14 }}>{error ?? 'Not found'}</div>
      <button onClick={() => navigate('/')} style={{ fontSize: 12, color: '#7a9985', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>← Back</button>
    </div>
  )

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {mode === 'overview' ? (
          <OverviewGrid
            key="overview"
            slides={slides}
            presentationId={presentation.id}
            presentationTheme={presentation.theme}
            title={presentation.name}
            onSelectSlide={i => { setActiveIndex(i); setMode('presentation') }}
            onAddSlide={handleAddSlide}
            onReorder={handleReorder}
            onSlideUpdated={handleSlideUpdated}
            onGoHome={() => navigate('/')}
          />
        ) : (
          <PresentationView
            key="presentation"
            slides={slides}
            activeIndex={activeIndex}
            onExit={() => setMode('overview')}
            onNavigate={setActiveIndex}
            onGoHome={() => navigate('/')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
