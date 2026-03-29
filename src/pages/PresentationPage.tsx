import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { OverviewGrid } from '@/components/OverviewGrid'
import { PresentationView } from '@/components/PresentationView'
import { codePresentations } from '@/presentations/registry'
import { api } from '@/api/client'
import type { UnifiedSlide, DbSlide, DbPresentation, Block } from '@/types'

export function PresentationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'overview' | 'presentation'>('overview')
  const [activeIndex, setActiveIndex] = useState(0)
  const [slides, setSlides] = useState<UnifiedSlide[]>([])
  const [presentation, setPresentation] = useState<DbPresentation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Determine if numeric (DB) or slug (code)
  const isDb = /^\d+$/.test(id ?? '')

  useEffect(() => {
    if (!id) return

    if (!isDb) {
      // Code presentation
      const found = codePresentations.find(p => p.slug === id)
      if (!found) { setError('Presentation not found'); setLoading(false); return }
      setSlides(found.slides.map(s => ({ kind: 'code', id: s.id, title: s.title, component: s.component })))
      setLoading(false)
      return
    }

    // DB presentation
    const pid = Number(id)
    Promise.all([
      api.presentations.list().then(all => all.find(p => p.id === pid)),
      api.slides.list(pid),
    ]).then(([pres, dbSlides]) => {
      if (!pres) { setError('Presentation not found'); return }
      setPresentation(pres)
      setSlides(dbSlides.map(s => ({
        kind: 'db',
        id: s.id,
        title: s.title,
        blocks: parseBlocks(s.blocks),
        theme: pres.theme,
      })))
    }).catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [id, isDb])

  useEffect(() => {
    if (mode !== 'presentation') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, slides.length - 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Escape') {
        setMode('overview')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, slides.length])

  const handleAddSlide = useCallback(async () => {
    if (!presentation) return
    const newSlide = await api.slides.create(presentation.id)
    setSlides(prev => [...prev, {
      kind: 'db',
      id: newSlide.id,
      title: newSlide.title,
      blocks: [],
      theme: presentation.theme,
    }])
  }, [presentation])

  const handleReorder = useCallback(async (ids: number[]) => {
    if (!presentation) return
    // Optimistic update
    setSlides(prev => {
      const map = new Map(prev.map(s => [s.id, s]))
      return ids.map(id => map.get(id)!).filter(Boolean)
    })
    await api.slides.reorder(presentation.id, ids)
  }, [presentation])

  const handleSlideUpdated = useCallback((updated: DbSlide) => {
    setSlides(prev => prev.map(s =>
      s.id === updated.id
        ? { ...s, title: updated.title, blocks: parseBlocks(updated.blocks) } as UnifiedSlide
        : s
    ))
  }, [])

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0f0e', color: '#7a9985', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0d0f0e', color: '#e8f0eb', fontFamily: 'Inter, sans-serif', gap: 16 }}>
        <div style={{ fontSize: 14 }}>{error}</div>
        <button onClick={() => navigate('/')} style={{ fontSize: 12, color: '#7a9985', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          ← Back to home
        </button>
      </div>
    )
  }

  const presTitle = isDb ? (presentation?.name ?? '') : (codePresentations.find(p => p.slug === id)?.name ?? '')

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {mode === 'overview' ? (
          <OverviewGrid
            key="overview"
            slides={slides}
            presentationId={isDb ? presentation?.id : undefined}
            presentationTheme={presentation?.theme}
            title={presTitle}
            onSelectSlide={i => { setActiveIndex(i); setMode('presentation') }}
            onAddSlide={isDb ? handleAddSlide : undefined}
            onReorder={isDb ? handleReorder : undefined}
            onSlideUpdated={isDb ? handleSlideUpdated : undefined}
          />
        ) : (
          <PresentationView
            key="presentation"
            slides={slides}
            activeIndex={activeIndex}
            onExit={() => setMode('overview')}
            onNavigate={setActiveIndex}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function parseBlocks(raw: string): Block[] {
  try { return JSON.parse(raw) as Block[] } catch { return [] }
}
