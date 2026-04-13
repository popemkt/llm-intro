/**
 * Read-only viewer for exported single-file builds.
 * Supports two shells:
 * - player: direct slide presentation
 * - deck: overview first, then readonly presentation mode
 */
import { useState } from 'react'
import type { ComponentType } from 'react'
import type { UnifiedSlide, SlideProps, ApiSlide, ApiSlideGroup, ApiPresentation } from '@/types'
import { PresentationView } from '@/components/PresentationView'
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

export default function ExportViewer() {
  const presentation = __EXPORT_DATA__.presentation
  const slides = __EXPORT_DATA__.slides.map(slide => resolve(slide, presentation, __EXPORT_REGISTRY__))
  const groups = __EXPORT_DATA__.groups ?? []
  const meta = __EXPORT_META__

  const [deckMode, setDeckMode] = useState<'overview' | 'presentation'>(
    meta.exportMode === 'deck' ? 'overview' : 'presentation',
  )
  const [activeIndex, setActiveIndex] = useState(0)

  if (meta.exportMode === 'deck') {
    return deckMode === 'overview' ? (
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
            setDeckMode('presentation')
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
    ) : (
      <PresentationView
        slides={slides}
        activeIndex={activeIndex}
        onExit={() => setDeckMode('overview')}
        onNavigate={setActiveIndex}
        onGoHome={undefined}
        onEnterFullscreen={undefined}
      />
    )
  }

  return (
    <PresentationView
      slides={slides}
      activeIndex={activeIndex}
      onExit={() => {}}
      onNavigate={setActiveIndex}
      onGoHome={undefined}
      onEnterFullscreen={undefined}
      showOverviewButton={false}
    />
  )
}
