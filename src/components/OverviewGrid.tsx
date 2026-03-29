import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { Plus, Pencil } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { UnifiedSlide, DbSlide, ThemeName } from '@/types'
import { DbSlideRenderer } from './DbSlideRenderer'
import { SlideEditor } from './SlideEditor'

interface OverviewGridProps {
  slides: UnifiedSlide[]
  presentationId?: number           // set for DB presentations (enables DnD + add)
  presentationTheme?: ThemeName
  title: string
  onSelectSlide: (index: number) => void
  onAddSlide?: () => void
  onReorder?: (ids: number[]) => void
  onSlideUpdated?: (updated: DbSlide) => void
}

const LOGICAL_W = 1000
const LOGICAL_H = 562.5

function ThumbnailCell({
  slide,
  index,
  isDb,
  presentationId,
  onSelect,
  onEdit,
}: {
  slide: UnifiedSlide
  index: number
  isDb: boolean
  presentationId?: number
  onSelect: (i: number) => void
  onEdit?: (index: number) => void
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id, disabled: !isDb })

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / LOGICAL_W)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
        onClick={() => onSelect(index)}
        className="group relative rounded-xl overflow-hidden border border-(--color-border) hover:border-(--color-accent)/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) transition-colors text-left w-full"
        style={{ background: 'var(--color-surface)' }}
        {...(isDb ? attributes : {})}
        {...(isDb ? listeners : {})}
      >
        {/* 16:9 aspect ratio container */}
        <div ref={outerRef} style={{ position: 'relative', width: '100%', paddingBottom: '56.25%' }}>
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
            {slide.kind === 'code' ? (
              <slide.component isActive={false} />
            ) : (
              <DbSlideRenderer blocks={slide.blocks} theme={slide.theme} />
            )}
          </div>
        </div>

        {/* Caption */}
        <div className="px-3 py-2 border-t border-(--color-border) flex items-center gap-2">
          <span className="text-xs font-mono text-(--color-text-dim)">{String(index + 1).padStart(2, '0')}</span>
          <span className="text-xs font-medium text-(--color-text) truncate">{slide.title}</span>
          {isDb && (
            <span className="text-[9px] font-mono ml-auto px-1.5 py-0.5 rounded"
              style={{ background: 'var(--color-muted)', color: 'var(--color-text-dim)' }}>db</span>
          )}
        </div>
      </motion.button>

      {/* Edit overlay for DB slides */}
      {isDb && presentationId !== undefined && onEdit && (
        <button
          onClick={e => { e.stopPropagation(); onEdit(index) }}
          className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}
          title="Edit slide"
        >
          <Pencil size={12} />
        </button>
      )}
    </div>
  )
}

function AddSlideCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border-2 border-dashed border-(--color-border) hover:border-(--color-accent)/60 transition-colors flex items-center justify-center w-full"
      style={{ paddingBottom: '56.25%', position: 'relative', background: 'transparent' }}
    >
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Plus size={20} style={{ color: 'var(--color-text-dim)' }} />
        <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'Inter, sans-serif' }}>Add slide</span>
      </div>
    </button>
  )
}

export function OverviewGrid({
  slides,
  presentationId,
  presentationTheme,
  title,
  onSelectSlide,
  onAddSlide,
  onReorder,
  onSlideUpdated,
}: OverviewGridProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const isDb = Boolean(presentationId)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !onReorder) return
    const oldIndex = slides.findIndex(s => s.id === active.id)
    const newIndex = slides.findIndex(s => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = [...slides]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    onReorder(reordered.map(s => s.id))
  }, [slides, onReorder])

  const handleSelect = useCallback((i: number) => onSelectSlide(i), [onSelectSlide])

  const editingSlide = editingIndex !== null ? slides[editingIndex] : null

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
          {title}
        </span>
        {isDb && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--color-surface)', color: 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}>
            {presentationTheme ?? 'dark-green'}
          </span>
        )}
        <span className="text-xs font-mono ml-auto" style={{ color: 'var(--color-text-dim)' }}>
          {slides.length} slides · click to present
        </span>
      </div>

      {/* Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slides.map(s => s.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-5 p-8" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {slides.map((slide, i) => (
              <ThumbnailCell
                key={slide.id}
                slide={slide}
                index={i}
                isDb={isDb}
                presentationId={presentationId}
                onSelect={handleSelect}
                onEdit={isDb ? setEditingIndex : undefined}
              />
            ))}
            {isDb && onAddSlide && <AddSlideCard onClick={onAddSlide} />}
          </div>
        </SortableContext>
      </DndContext>

      {/* Slide editor modal */}
      {editingSlide && editingSlide.kind === 'db' && presentationId !== undefined && onSlideUpdated && (
        <SlideEditor
          pid={presentationId}
          slide={{
            id: editingSlide.id,
            presentation_id: presentationId,
            position: editingIndex ?? 0,
            title: editingSlide.title,
            blocks: JSON.stringify(editingSlide.blocks),
            created_at: '',
            updated_at: '',
          }}
          theme={editingSlide.theme}
          onClose={() => setEditingIndex(null)}
          onSaved={updated => { onSlideUpdated(updated); setEditingIndex(null) }}
        />
      )}
    </motion.div>
  )
}
