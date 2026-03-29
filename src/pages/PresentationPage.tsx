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
  // companion = DB presentation used to store extra slides for code presentations
  const [companion, setCompanion] = useState<DbPresentation | null>(null)
  const [presentation, setPresentation] = useState<DbPresentation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isDb = /^\d+$/.test(id ?? '')
  // The presentation that owns the slides (companion for code, self for DB)
  const slideOwner = isDb ? presentation : companion

  useEffect(() => {
    if (!id) return

    if (!isDb) {
      // Code presentation — load code slides + companion DB slides
      const codePresentation = codePresentations.find(p => p.slug === id)
      if (!codePresentation) { setError('Presentation not found'); setLoading(false); return }

      const codeSlides: UnifiedSlide[] = codePresentation.slides.map(s => ({
        kind: 'code', id: s.id, title: s.title, component: s.component,
      }))

      api.presentations.getOrCreateBySlug(id)
        .then(comp => {
          setCompanion(comp)
          return api.slides.list(comp.id).then(dbSlides => {
            setSlides([
              ...codeSlides,
              ...dbSlides.map(s => ({
                kind: 'db' as const,
                id: s.id,
                title: s.title,
                blocks: parseBlocks(s.blocks),
                theme: comp.theme,
              })),
            ])
          })
        })
        .catch(() => {
          // If API is not reachable, just show code slides without "+"
          setSlides(codeSlides)
        })
        .finally(() => setLoading(false))
      return
    }

    // Pure DB presentation
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
    if (!slideOwner) return
    const newSlide = await api.slides.create(slideOwner.id)
    setSlides(prev => [...prev, {
      kind: 'db',
      id: newSlide.id,
      title: newSlide.title,
      blocks: [],
      theme: slideOwner.theme,
    }])
  }, [slideOwner])

  const handleReorder = useCallback(async (ids: number[]) => {
    if (!slideOwner) return
    setSlides(prev => {
      const map = new Map(prev.map(s => [s.id, s]))
      // Keep code slides in front, reorder only DB slides
      const codeSlides = prev.filter(s => s.kind === 'code')
      const reorderedDb = ids.map(id => map.get(id)).filter(Boolean) as UnifiedSlide[]
      return [...codeSlides, ...reorderedDb]
    })
    await api.slides.reorder(slideOwner.id, ids)
  }, [slideOwner])

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

  const codePresentation = !isDb ? codePresentations.find(p => p.slug === id) : null
  const presTitle = codePresentation?.name ?? presentation?.name ?? ''

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {mode === 'overview' ? (
          <OverviewGrid
            key="overview"
            slides={slides}
            presentationId={slideOwner?.id}
            presentationTheme={slideOwner?.theme}
            title={presTitle}
            onSelectSlide={i => { setActiveIndex(i); setMode('presentation') }}
            onAddSlide={slideOwner ? handleAddSlide : undefined}
            onReorder={slideOwner ? handleReorder : undefined}
            onSlideUpdated={slideOwner ? handleSlideUpdated : undefined}
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

function parseBlocks(raw: string): Block[] {
  try { return JSON.parse(raw) as Block[] } catch { return [] }
}
