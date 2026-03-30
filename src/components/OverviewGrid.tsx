import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { Plus, Pencil, Home, Trash2, Settings } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { UnifiedSlide, ThemeName } from '@/types'
import { DbSlideRenderer } from './DbSlideRenderer'
import { useNavigate } from 'react-router-dom'

interface OverviewGridProps {
  slides: UnifiedSlide[]
  canManageSlides: boolean
  presentationId: number
  presentationTheme: ThemeName
  title: string
  onSelectSlide: (index: number) => void
  onAddSlide: () => void
  onReorder: (ids: number[]) => void
  onEditSlide: (slideId: number) => void
  onDeleteSlide: (slideId: number) => void
  onRenameSlide: (slideId: number, newTitle: string) => void
  onGoHome: () => void
}

const LOGICAL_W = 1000
const LOGICAL_H = 562.5

function ThumbnailCell({ slide, index, onSelect, onEdit, onDelete, onRename, sortableEnabled }: {
  slide: UnifiedSlide
  index: number
  onSelect: (i: number) => void
  onEdit: (slideId: number) => void
  onDelete: (slideId: number) => void
  onRename: (slideId: number, newTitle: string) => void
  sortableEnabled: boolean
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slide.id, disabled: !sortableEnabled })

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / LOGICAL_W))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraftTitle(slide.title)
    setIsRenaming(true)
  }

  const commitRename = () => {
    const trimmed = draftTitle.trim()
    if (trimmed && trimmed !== slide.title) onRename(slide.id, trimmed)
    setIsRenaming(false)
  }

  const cancelRename = () => setIsRenaming(false)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined }}
      className="relative group"
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
        onClick={() => { if (!isRenaming) onSelect(index) }}
        onKeyDown={(e) => {
          if (isRenaming) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(index)
          }
        }}
        aria-label={`Open slide ${index + 1}: ${slide.title}`}
        data-testid="slide-thumbnail"
        className="relative rounded-xl overflow-hidden border border-(--color-border) hover:border-(--color-accent)/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) transition-colors text-left w-full"
        style={{ background: 'var(--color-surface)', cursor: isRenaming ? 'default' : sortableEnabled ? 'grab' : 'pointer' }}
        {...attributes}
        {...(isRenaming || !sortableEnabled ? {} : listeners)}
      >
        <div ref={outerRef} style={{ position: 'relative', width: '100%', paddingBottom: '56.25%' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: LOGICAL_W, height: LOGICAL_H, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
            {slide.kind === 'code'
              ? <slide.component isActive={false} />
              : <DbSlideRenderer blocks={slide.blocks} theme={slide.theme} />
            }
          </div>
        </div>
        <div className="px-3 py-2 border-t border-(--color-border) flex items-center gap-2">
          <span className="text-xs font-mono text-(--color-text-dim)" style={{ flexShrink: 0 }}>{String(index + 1).padStart(2, '0')}</span>
          {isRenaming ? (
            <input
              autoFocus
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              onKeyDown={e => {
                e.stopPropagation()
                if (e.key === 'Enter') commitRename()
                else if (e.key === 'Escape') cancelRename()
              }}
              onBlur={commitRename}
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              className="flex-1 min-w-0 text-xs font-medium bg-transparent focus:outline-none"
              style={{ color: 'var(--color-text)', boxShadow: '0 1px 0 0 var(--color-accent)' }}
            />
          ) : (
            <>
              <span className="text-xs font-medium text-(--color-text) truncate flex-1">{slide.title}</span>
              {sortableEnabled && slide.kind === 'db' && (
                <button
                  onClick={startRename}
                  onPointerDown={e => e.stopPropagation()}
                  aria-label={`Rename ${slide.title}`}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
                  style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                  title="Rename slide"
                >
                  <Pencil size={10} />
                </button>
              )}
            </>
          )}
          {slide.kind === 'db' && !isRenaming && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'var(--color-muted)', color: 'var(--color-text-dim)', flexShrink: 0 }}>db</span>
          )}
        </div>
      </motion.div>

      {/* Edit + delete buttons — visible on hover, db slides only */}
      {sortableEnabled && slide.kind === 'db' && !isRenaming && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onEdit(slide.id) }}
            aria-label={`Edit ${slide.title}`}
            className="p-1.5 rounded-lg"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', cursor: 'pointer' }}
            title="Edit slide"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(slide.id) }}
            aria-label={`Delete ${slide.title}`}
            className="p-1.5 rounded-lg"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: '#ff6b6b', cursor: 'pointer' }}
            title="Delete slide"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Add slide"
      data-testid="add-slide-card"
      className="rounded-xl border-2 border-dashed border-(--color-border) hover:border-(--color-accent)/60 transition-colors w-full"
      style={{ paddingBottom: '56.25%', position: 'relative', background: 'transparent' }}
    >
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Plus size={20} style={{ color: 'var(--color-text-dim)' }} />
        <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'Inter, sans-serif' }}>Add slide</span>
      </div>
    </button>
  )
}

export function OverviewGrid({ slides, canManageSlides, presentationId, presentationTheme, title, onSelectSlide, onAddSlide, onReorder, onEditSlide, onDeleteSlide, onRenameSlide, onGoHome }: OverviewGridProps) {
  const navigate = useNavigate()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = slides.findIndex(s => s.id === active.id)
    const to   = slides.findIndex(s => s.id === over.id)
    if (from < 0 || to < 0) return
    const reordered = [...slides]
    reordered.splice(to, 0, reordered.splice(from, 1)[0])
    onReorder(reordered.map(s => s.id))
  }, [slides, onReorder])

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
      <div
        className="sticky top-0 z-10 px-8 py-4 border-b border-(--color-border) backdrop-blur-sm flex items-center gap-3"
        style={{ background: 'color-mix(in srgb, var(--color-bg) 85%, transparent)' }}
      >
        <button aria-label="Home" onClick={onGoHome} className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)" style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <Home size={14} />
        </button>
        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)' }} />
        <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--color-text)' }}>{title}</span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--color-surface)', color: 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}>
          {presentationTheme}
        </span>
        <span className="text-xs font-mono ml-auto" style={{ color: 'var(--color-text-dim)' }}>
          {slides.length} slides · {canManageSlides ? 'click to present' : 'read-only'}
        </span>
        {canManageSlides && (
          <button
            onClick={() => navigate(`/p/${presentationId}/settings`)}
            aria-label="Presentation settings"
            title="Presentation settings"
            className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
            style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Settings size={14} />
          </button>
        )}
      </div>

      <DndContext sensors={canManageSlides ? sensors : undefined} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slides.map(s => s.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-5 p-8" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {slides.map((slide, i) => (
              <ThumbnailCell
                key={slide.id}
                slide={slide}
                index={i}
                sortableEnabled={canManageSlides && slide.kind === 'db'}
                onSelect={onSelectSlide}
                onEdit={onEditSlide}
                onDelete={onDeleteSlide}
                onRename={onRenameSlide}
              />
            ))}
            {canManageSlides && <AddCard onClick={onAddSlide} />}
          </div>
        </SortableContext>
      </DndContext>
    </motion.div>
  )
}
