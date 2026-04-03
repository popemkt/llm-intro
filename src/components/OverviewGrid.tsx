import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Pencil, Home, Trash2, Settings, ChevronDown, Download, CheckSquare, X, Check } from 'lucide-react'
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
  presentationId: number
  presentationTheme: ThemeName
  title: string
  onSelectSlide: (index: number) => void
  onAddSlide: () => void
  onReorder: (ids: number[]) => void
  onEditSlide: (slideId: number) => void
  onDeleteSlide: (slideId: number, options?: { confirm?: boolean }) => Promise<void>
  onRenameSlide: (slideId: number, newTitle: string) => void
  onGoHome: () => void
}

const LOGICAL_W = 1000
const LOGICAL_H = 562.5

function ThumbnailCell({ slide, index, onSelect, onEdit, onDelete, onRename, sortableEnabled, selectMode, selected, onToggleSelect }: {
  slide: UnifiedSlide
  index: number
  onSelect: (i: number) => void
  onEdit: (slideId: number) => void
  onDelete: (slideId: number) => void
  onRename: (slideId: number, newTitle: string) => void
  sortableEnabled: boolean
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (slideId: number) => void
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slide.id, disabled: !sortableEnabled || isRenaming || selectMode })
  const dragHandleProps = sortableEnabled && !isRenaming && !selectMode
    ? { ...attributes, ...listeners }
    : {}

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
        {...dragHandleProps}
        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined, cursor: selectMode ? 'pointer' : sortableEnabled && !isRenaming ? (isDragging ? 'grabbing' : 'grab') : undefined }}
        className="relative group"
      >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
        onClick={() => {
          if (selectMode && onToggleSelect) onToggleSelect(slide.id)
          else if (!isRenaming) onSelect(index)
        }}
        aria-label={selectMode ? `${selected ? 'Deselect' : 'Select'} slide ${index + 1}` : `Open slide ${index + 1}: ${slide.title}`}
        data-testid="slide-thumbnail"
        className="relative rounded-xl overflow-hidden border transition-colors text-left w-full"
        style={{
          background: 'var(--color-surface)',
          borderColor: selectMode && selected ? 'var(--color-accent)' : 'var(--color-border)',
          boxShadow: selectMode && selected ? '0 0 0 2px var(--color-accent)' : undefined,
        }}
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
              {sortableEnabled && (
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

      {/* Selection indicator */}
      {selectMode && (
        <div
          className="absolute top-2 left-2 rounded-md flex items-center justify-center"
          style={{
            width: 22, height: 22,
            background: selected ? 'var(--color-accent)' : 'rgba(0,0,0,0.5)',
            border: selected ? 'none' : '2px solid var(--color-text-dim)',
            pointerEvents: 'none',
          }}
        >
          {selected && <Check size={14} style={{ color: '#fff' }} />}
        </div>
      )}

      {/* Edit + delete buttons — visible on hover, db slides only */}
      {!selectMode && sortableEnabled && slide.kind === 'db' && !isRenaming && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onEdit(slide.id) }}
            onPointerDown={e => e.stopPropagation()}
            aria-label={`Edit ${slide.title}`}
            className="p-1.5 rounded-lg"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', cursor: 'pointer' }}
            title="Edit slide"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(slide.id) }}
            onPointerDown={e => e.stopPropagation()}
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

async function exportPresentation(presentationId: number, slideIds?: number[]) {
  const body = slideIds ? JSON.stringify({ slideIds }) : undefined
  const headers: Record<string, string> = {}
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`/api/presentations/${presentationId}/export`, { method: 'POST', body, headers })
  if (!res.ok) throw new Error(await res.text())
  const blob = await res.blob()
  const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'presentation.html'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function CommandMenu({ presentationId, onEnterSelectMode }: { presentationId: number; onEnterSelectMode: () => void }) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportPresentation(presentationId)
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : 'unknown error'}`)
    } finally {
      setExporting(false)
      setOpen(false)
    }
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Commands"
        title="Commands"
        className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
        style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <ChevronDown size={14} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="rounded-lg border border-(--color-border) overflow-hidden"
            style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, minWidth: 180, background: 'var(--color-surface)', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}
          >
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-(--color-border) disabled:opacity-50"
              style={{ color: 'var(--color-text)', background: 'none', border: 'none', cursor: exporting ? 'wait' : 'pointer', textAlign: 'left' }}
            >
              <Download size={13} style={{ color: 'var(--color-text-dim)' }} />
              {exporting ? 'Exporting…' : 'Export all as HTML'}
            </button>
            <button
              onClick={() => { setOpen(false); onEnterSelectMode() }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-(--color-border)"
              style={{ color: 'var(--color-text)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <CheckSquare size={13} style={{ color: 'var(--color-text-dim)' }} />
              Select slides
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function OverviewGrid({ slides, presentationId, presentationTheme, title, onSelectSlide, onAddSlide, onReorder, onEditSlide, onDeleteSlide, onRenameSlide, onGoHome }: OverviewGridProps) {
  const navigate = useNavigate()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkExporting, setBulkExporting] = useState(false)
  const selectedSlides = slides.filter(slide => selected.has(slide.id))
  const selectedDbSlides = selectedSlides.filter((slide): slide is Extract<UnifiedSlide, { kind: 'db' }> => slide.kind === 'db')

  const toggleSelect = useCallback((slideId: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(slideId)) next.delete(slideId)
      else next.add(slideId)
      return next
    })
  }, [])

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelected(new Set())
  }, [])

  const selectAll = useCallback(() => {
    setSelected(new Set(slides.map(s => s.id)))
  }, [slides])

  const handleBulkExport = useCallback(async () => {
    if (selected.size === 0) return
    setBulkExporting(true)
    try {
      await exportPresentation(presentationId, Array.from(selected))
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : 'unknown error'}`)
    } finally {
      setBulkExporting(false)
    }
  }, [presentationId, selected])

  const handleBulkDelete = useCallback(async () => {
    if (selectedDbSlides.length === 0) {
      alert('Select at least one editable slide to delete.')
      return
    }
    if (!confirm(`Delete ${selectedDbSlides.length} slide${selectedDbSlides.length > 1 ? 's' : ''}?`)) return
    for (const slide of selectedDbSlides) await onDeleteSlide(slide.id, { confirm: false })
    exitSelectMode()
  }, [selectedDbSlides, onDeleteSlide, exitSelectMode])

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
        {selectMode ? (
          <>
            <span className="text-xs font-mono ml-auto" style={{ color: 'var(--color-accent)' }}>
              {selected.size} of {slides.length} selected
            </span>
            <button
              onClick={selectAll}
              className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-(--color-border)"
              style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Select all
            </button>
            <button
              onClick={exitSelectMode}
              className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
              style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
              title="Cancel selection"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <span className="text-xs font-mono ml-auto" style={{ color: 'var(--color-text-dim)' }}>
              {slides.length} slides · click to present
            </span>
            <button
              onClick={() => navigate(`/p/${presentationId}/settings`)}
              aria-label="Presentation settings"
              title="Presentation settings"
              className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
              style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Settings size={14} />
            </button>
            <CommandMenu presentationId={presentationId} onEnterSelectMode={() => setSelectMode(true)} />
          </>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slides.map(s => s.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-5 p-8" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {slides.map((slide, i) => (
              <ThumbnailCell
                key={slide.id}
                slide={slide}
                index={i}
                sortableEnabled={!selectMode}
                selectMode={selectMode}
                selected={selected.has(slide.id)}
                onToggleSelect={toggleSelect}
                onSelect={onSelectSlide}
                onEdit={onEditSlide}
                onDelete={onDeleteSlide}
                onRename={onRenameSlide}
              />
            ))}
            {!selectMode && <AddCard onClick={onAddSlide} />}
          </div>
        </SortableContext>
      </DndContext>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectMode && selected.size > 0 && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-(--color-border)"
            style={{ background: 'var(--color-surface)', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}
          >
            <span className="text-xs font-mono mr-2" style={{ color: 'var(--color-text-dim)' }}>
              {selected.size} selected
            </span>
            <button
              onClick={handleBulkExport}
              disabled={bulkExporting}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-(--color-border) disabled:opacity-50"
              style={{ color: 'var(--color-text)', background: 'none', border: 'none', cursor: bulkExporting ? 'wait' : 'pointer' }}
            >
              <Download size={13} />
              {bulkExporting ? 'Exporting…' : 'Export'}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={selectedDbSlides.length === 0}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
              style={{ color: '#ff6b6b', background: 'none', border: 'none', cursor: selectedDbSlides.length === 0 ? 'not-allowed' : 'pointer', opacity: selectedDbSlides.length === 0 ? 0.45 : 1 }}
            >
              <Trash2 size={13} />
              Delete
            </button>
            <button
              onClick={exitSelectMode}
              className="text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
              style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
