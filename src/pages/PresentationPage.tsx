import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { OverviewGrid } from '@/components/OverviewGrid'
import { PresentationView } from '@/components/PresentationView'
import { FullscreenView } from '@/components/FullscreenView'
import { codeSlideRegistry } from '@/slides/registry'
import { api, getErrorMessage } from '@/api/client'
import type { UnifiedSlide, ApiSlide, ApiPresentation } from '@/types'

function toUnified(slide: ApiSlide, theme: ApiPresentation['theme']): UnifiedSlide {
  if (slide.kind === 'code') {
    const component = codeSlideRegistry[slide.code_id ?? '']
    if (!component) {
      console.warn(`Unknown code_id: ${slide.code_id}`)
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

  const [mode, setMode] = useState<'overview' | 'presentation' | 'fullscreen'>('overview')
  const [activeIndex, setActiveIndex] = useState(0)
  const [slides, setSlides] = useState<UnifiedSlide[]>([])
  const [presentation, setPresentation] = useState<ApiPresentation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const hydrateSlides = useCallback((apiSlides: ApiSlide[], pres: ApiPresentation) => {
    setSlides(apiSlides.map(slide => toUnified(slide, pres.theme)))
  }, [])

  const loadPresentation = useCallback(async () => {
    if (!id || isNaN(pid)) {
      setError('Invalid ID')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [pres, apiSlides] = await Promise.all([api.presentations.get(pid), api.slides.list(pid)])
      setPresentation(pres)
      hydrateSlides(apiSlides, pres)
    } catch {
      setError('Presentation not found')
    } finally {
      setLoading(false)
    }
  }, [hydrateSlides, id, pid])

  useEffect(() => {
    void loadPresentation()
  }, [loadPresentation])

  // Keyboard handler for regular presentation mode only
  // (fullscreen mode handles its own keys)
  useEffect(() => {
    if (mode !== 'presentation') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, slides.length - 1)) }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Escape') setMode('overview')
      else if (e.key === 'f' || e.key === 'F') setMode('fullscreen')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, slides.length])

  useEffect(() => {
    if (slides.length === 0) {
      setActiveIndex(0)
      if (mode !== 'overview') setMode('overview')
      return
    }
    setActiveIndex(index => Math.min(index, slides.length - 1))
  }, [mode, slides.length])

  const handleAddSlide = useCallback(async () => {
    if (!presentation) return
    setNotice(null)
    try {
      const slide = await api.slides.create(presentation.id)
      setSlides(prev => [...prev, toUnified(slide, presentation.theme)])
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }, [presentation])

  const handleReorder = useCallback(async (ids: number[]) => {
    if (!presentation) return
    const previousSlides = slides
    setNotice(null)
    setSlides(prev => {
      const map = new Map(prev.map(slide => [slide.id, slide]))
      return ids.map((slideId) => map.get(slideId)!).filter(Boolean)
    })

    try {
      const reordered = await api.slides.reorder(presentation.id, ids)
      hydrateSlides(reordered, presentation)
    } catch (err) {
      setSlides(previousSlides)
      setNotice(getErrorMessage(err))
    }
  }, [hydrateSlides, presentation, slides])

  const handleEditSlide = useCallback((slideId: number) => {
    navigate(`/p/${pid}/edit/${slideId}`)
  }, [navigate, pid])

  const handleDeleteSlide = useCallback(async (slideId: number) => {
    if (!presentation) return
    if (!confirm('Delete this slide?')) return
    setNotice(null)
    try {
      await api.slides.delete(presentation.id, slideId)
      setSlides(prev => prev.filter(slide => slide.id !== slideId))
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }, [presentation])

  const handleRenameSlide = useCallback(async (slideId: number, newTitle: string) => {
    if (!presentation) return
    setNotice(null)
    try {
      const updatedSlide = await api.slides.update(presentation.id, slideId, { title: newTitle })
      setSlides(prev => prev.map(slide => slide.id === slideId ? toUnified(updatedSlide, presentation.theme) : slide))
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
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
      {notice && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20, maxWidth: 320, padding: '10px 12px', borderRadius: 10, background: 'rgba(20, 26, 23, 0.95)', border: '1px solid var(--color-border)', color: '#ff9b9b', fontSize: 12 }}>
          {notice}
        </div>
      )}
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
            onEditSlide={handleEditSlide}
            onDeleteSlide={handleDeleteSlide}
            onRenameSlide={handleRenameSlide}
            onGoHome={() => navigate('/')}
          />
        ) : mode === 'presentation' ? (
          <PresentationView
            key="presentation"
            slides={slides}
            activeIndex={activeIndex}
            onExit={() => setMode('overview')}
            onNavigate={setActiveIndex}
            onGoHome={() => navigate('/')}
            onEnterFullscreen={() => setMode('fullscreen')}
          />
        ) : (
          <FullscreenView
            key="fullscreen"
            slides={slides}
            activeIndex={activeIndex}
            onNavigate={setActiveIndex}
            onExit={() => setMode('overview')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
