/**
 * Read-only viewer for exported single-file builds.
 * Supports two shells:
 * - player: direct slide presentation
 * - deck: overview first, then readonly presentation mode
 */
import { useState, useEffect } from 'react'
import type { ComponentType } from 'react'
import type { UnifiedSlide, SlideProps, ApiSlide, ApiSlideGroup, ApiPresentation } from '@/types'
import { PresentationView } from '@/components/PresentationView'
import { FullscreenView } from '@/components/FullscreenView'
import { OverviewGrid } from '@/components/OverviewGrid'

type ExportMode = 'player' | 'deck'

interface ExportDataArtifact {
  version: number
  presentation: ApiPresentation
  slides: ApiSlide[]
  groups?: ApiSlideGroup[]
}

interface ExportMeta {
  artifactVersion: number
  dataVersion: number
  exportMode: ExportMode
  exportedAt: string
  sourceCommit: string
  sourcePresentationId: number
  slideCount: number
}

// These will be replaced at build time by the export route.
declare const __EXPORT_REGISTRY__: Record<string, ComponentType<SlideProps>>
declare const __EXPORT_DATA__: ExportDataArtifact
declare const __EXPORT_META__: ExportMeta

function resolve(apiSlide: ApiSlide, pres: ApiPresentation, registry: Record<string, ComponentType<SlideProps>>): UnifiedSlide {
  const groupId = apiSlide.group_id ?? null
  if (apiSlide.kind === 'code' && apiSlide.code_id && registry[apiSlide.code_id]) {
    return { kind: 'code', id: apiSlide.id, groupId, title: apiSlide.title, component: registry[apiSlide.code_id] }
  }

  return { kind: 'db', id: apiSlide.id, groupId, title: apiSlide.title, blocks: apiSlide.blocks, theme: pres.theme }
}

type ViewMode = 'overview' | 'presentation' | 'fullscreen'

export default function ExportViewer() {
  const presentation = __EXPORT_DATA__.presentation
  const slides = __EXPORT_DATA__.slides.map(slide => resolve(slide, presentation, __EXPORT_REGISTRY__))
  const groups = __EXPORT_DATA__.groups ?? []
  const meta = __EXPORT_META__
  const isDeck = meta.exportMode === 'deck'

  const [mode, setMode] = useState<ViewMode>(isDeck ? 'overview' : 'presentation')
  const [activeIndex, setActiveIndex] = useState(0)

  // Keyboard navigation — PresentationView only handles `?`, so wire up
  // arrows / Escape / F here (mirrors PresentationPage in dev).
  useEffect(() => {
    if (mode !== 'presentation') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, slides.length - 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Escape' && isDeck) {
        setMode('overview')
      } else if (e.key === 'f' || e.key === 'F') {
        setMode('fullscreen')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, slides.length, isDeck])

  if (mode === 'fullscreen') {
    return (
      <FullscreenView
        slides={slides}
        activeIndex={activeIndex}
        onNavigate={setActiveIndex}
        onExit={() => setMode('presentation')}
      />
    )
  }

  if (isDeck && mode === 'overview') {
    return (
      <div style={{ height: '100vh', overflow: 'hidden' }}>
        <OverviewGrid
          testId="export-deck-overview"
          readonly={true}
          simpleHeader={true}
          slides={slides}
          groups={groups}
          presentationId={presentation.id}
          presentationTheme={presentation.theme}
          title={presentation.name}
          onSelectSlide={(index) => {
            setActiveIndex(index)
            setMode('presentation')
          }}
          onAddSlide={() => {}}
          onAddSlideToGroup={() => {}}
          onLayoutChange={() => {}}
          onCreateGroup={() => {}}
          onUpdateGroup={() => {}}
          onDeleteGroup={() => {}}
          onEditSlide={() => {}}
          onDeleteSlide={async () => {}}
          onRenameSlide={() => {}}
        />
      </div>
    )
  }

  return (
    <PresentationView
      slides={slides}
      activeIndex={activeIndex}
      onExit={() => { if (isDeck) setMode('overview') }}
      onNavigate={setActiveIndex}
      onGoHome={undefined}
      onEnterFullscreen={() => setMode('fullscreen')}
      showOverviewButton={isDeck}
    />
  )
}
