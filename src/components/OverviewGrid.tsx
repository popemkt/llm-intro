import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Pencil, Trash2, Settings, ChevronDown, Download, CheckSquare, X, Check, AlertTriangle, Loader2, RotateCcw } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { UnifiedSlide, ThemeName } from '@/types'
import { DbSlideRenderer } from './DbSlideRenderer'
import { Breadcrumb, type BreadcrumbSegment } from './Breadcrumb'

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
  onOpenSettings?: () => void
  breadcrumbs?: BreadcrumbSegment[]
  readonly?: boolean
  simpleHeader?: boolean
  exportCommit?: string
  testId?: string
}

const LOGICAL_W = 1000
const LOGICAL_H = 562.5
type ExportMode = 'player' | 'deck'

function ThumbnailCell({ slide, index, onSelect, onEdit, onDelete, onRename, sortableEnabled, selectMode, selected, onToggleSelect, hoverEffects = true }: {
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
  hoverEffects?: boolean
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
        whileHover={hoverEffects ? { scale: 1.02 } : undefined}
        whileTap={hoverEffects ? { scale: 0.98 } : undefined}
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

function ConfirmDeleteDialog({ slides, onConfirm, onCancel }: {
  slides: { id: number; title: string }[]
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="rounded-xl border border-(--color-border)"
        style={{ background: 'var(--color-surface)', maxWidth: 400, width: '90%', padding: '20px 24px', boxShadow: '0 16px 48px rgba(0,0,0,.5)' }}
        role="alertdialog"
        aria-labelledby="confirm-delete-title"
        data-testid="confirm-delete-dialog"
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} style={{ color: '#ff6b6b' }} />
          <h3 id="confirm-delete-title" className="text-sm font-semibold" style={{ color: 'var(--color-text)', margin: 0 }}>
            Delete {slides.length} slide{slides.length > 1 ? 's' : ''}?
          </h3>
        </div>
        <ul
          className="mb-4"
          style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 180, overflowY: 'auto' }}
          data-testid="confirm-delete-slide-list"
        >
          {slides.map(slide => (
            <li
              key={slide.id}
              className="flex items-center gap-2 py-1.5 px-2 rounded-md text-xs"
              style={{ color: 'var(--color-text-dim)' }}
            >
              <Trash2 size={11} style={{ color: '#ff6b6b', flexShrink: 0 }} />
              <span className="truncate">{slide.title}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
            style={{ color: 'var(--color-text-dim)', background: 'none', border: '1px solid var(--color-border)', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            data-testid="confirm-delete-button"
            autoFocus
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: '#fff', background: '#d63031', border: 'none', cursor: 'pointer' }}
          >
            Delete {slides.length} slide{slides.length > 1 ? 's' : ''}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

type ExportState =
  | { status: 'idle' }
  | { status: 'exporting' }
  | { status: 'error'; message: string; presentationId: number; slideIds?: number[]; mode: ExportMode }

function ExportProgressDialog({
  state,
  onRetry,
  onClose,
}: {
  state: ExportState
  onRetry: () => void
  onClose: () => void
}) {
  if (state.status === 'idle') return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={state.status === 'error' ? onClose : undefined}
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="rounded-xl border border-(--color-border)"
        style={{ background: 'var(--color-surface)', maxWidth: 360, width: '90%', padding: '24px', boxShadow: '0 16px 48px rgba(0,0,0,.5)' }}
        role="dialog"
        aria-labelledby="export-progress-title"
        data-testid="export-progress-dialog"
      >
        {state.status === 'exporting' && (
          <div className="flex flex-col items-center gap-3 py-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 size={24} style={{ color: 'var(--color-accent)' }} />
            </motion.div>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }} data-testid="export-status-text">
              Building bundle…
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
              This may take a few seconds
            </span>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} style={{ color: '#ff6b6b' }} />
              <h3 id="export-progress-title" className="text-sm font-semibold" style={{ color: 'var(--color-text)', margin: 0 }}>
                Export failed
              </h3>
            </div>
            <p className="text-xs text-center" style={{ color: 'var(--color-text-dim)', margin: 0, lineHeight: 1.5 }} data-testid="export-error-message">
              {state.message}
            </p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={onClose}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
                style={{ color: 'var(--color-text-dim)', background: 'none', border: '1px solid var(--color-border)', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={onRetry}
                data-testid="export-retry-button"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: '#fff', background: 'var(--color-accent)', border: 'none', cursor: 'pointer' }}
              >
                <RotateCcw size={12} />
                Retry
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

async function exportPresentation(presentationId: number, slideIds?: number[], mode: ExportMode = 'player') {
  const payload: { slideIds?: number[]; mode?: ExportMode } = {}
  if (slideIds && slideIds.length > 0) payload.slideIds = slideIds
  if (mode !== 'player') payload.mode = mode
  const body = Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined
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

function CommandMenu({
  onExportPlayer,
  onExportDeck,
  exporting,
  onEnterSelectMode,
}: {
  onExportPlayer: () => void
  onExportDeck: () => void
  exporting: boolean
  onEnterSelectMode: () => void
}) {
  const [open, setOpen] = useState(false)
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
              onClick={() => { setOpen(false); onExportPlayer() }}
              disabled={exporting}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-(--color-border) disabled:opacity-50"
              style={{ color: 'var(--color-text)', background: 'none', border: 'none', cursor: exporting ? 'wait' : 'pointer', textAlign: 'left' }}
            >
              <Download size={13} style={{ color: 'var(--color-text-dim)' }} />
              Export player as HTML
            </button>
            <button
              onClick={() => { setOpen(false); onExportDeck() }}
              disabled={exporting}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-(--color-border) disabled:opacity-50"
              style={{ color: 'var(--color-text)', background: 'none', border: 'none', cursor: exporting ? 'wait' : 'pointer', textAlign: 'left' }}
            >
              <Download size={13} style={{ color: 'var(--color-text-dim)' }} />
              Export deck as HTML
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

export function OverviewGrid({
  slides,
  presentationId,
  presentationTheme,
  title,
  onSelectSlide,
  onAddSlide,
  onReorder,
  onEditSlide,
  onDeleteSlide,
  onRenameSlide,
  onOpenSettings,
  breadcrumbs,
  readonly = false,
  simpleHeader = false,
  exportCommit,
  testId,
}: OverviewGridProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [exportState, setExportState] = useState<ExportState>({ status: 'idle' })
  const [confirmDeleteSlides, setConfirmDeleteSlides] = useState<{ id: number; title: string }[] | null>(null)
  const selectedSlides = slides.filter(slide => selected.has(slide.id))
  const selectedDbSlides = selectedSlides.filter((slide): slide is Extract<UnifiedSlide, { kind: 'db' }> => slide.kind === 'db')
  const breadcrumbSegments = breadcrumbs ?? [
    { label: 'Home', to: '/' },
    { label: title },
  ]
  const commitLabel = exportCommit ? exportCommit.slice(0, 7) : null

  const startExport = useCallback(async (slideIds?: number[], mode: ExportMode = 'player') => {
    setExportState({ status: 'exporting' })
    try {
      await exportPresentation(presentationId, slideIds, mode)
      setExportState({ status: 'idle' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setExportState({ status: 'error', message, presentationId, slideIds, mode })
    }
  }, [presentationId])

  const handleExportRetry = useCallback(() => {
    if (exportState.status === 'error') {
      startExport(exportState.slideIds, exportState.mode)
    }
  }, [exportState, startExport])

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

  const handleBulkExport = useCallback((mode: ExportMode = 'player') => {
    if (selected.size === 0) return
    startExport(Array.from(selected), mode)
  }, [selected, startExport])

  const handleBulkDelete = useCallback(() => {
    if (selectedDbSlides.length === 0) {
      alert('Select at least one editable slide to delete.')
      return
    }
    setConfirmDeleteSlides(selectedDbSlides.map(s => ({ id: s.id, title: s.title })))
  }, [selectedDbSlides])

  const executeBulkDelete = useCallback(async () => {
    if (!confirmDeleteSlides) return
    setConfirmDeleteSlides(null)
    for (const slide of selectedDbSlides) await onDeleteSlide(slide.id, { confirm: false })
    exitSelectMode()
  }, [confirmDeleteSlides, selectedDbSlides, onDeleteSlide, exitSelectMode])

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (readonly) return
    if (!over || active.id === over.id) return
    const from = slides.findIndex(s => s.id === active.id)
    const to   = slides.findIndex(s => s.id === over.id)
    if (from < 0 || to < 0) return
    const reordered = [...slides]
    reordered.splice(to, 0, reordered.splice(from, 1)[0])
    onReorder(reordered.map(s => s.id))
  }, [readonly, slides, onReorder])

  return (
    <motion.div
      data-testid={testId}
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
        {simpleHeader ? (
          <h1 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text)' }}>{title}</h1>
        ) : (
          <>
            <Breadcrumb segments={breadcrumbSegments} />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--color-surface)', color: 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}>
              {presentationTheme}
            </span>
          </>
        )}
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
              {simpleHeader ? `${slides.length} slides` : `${slides.length} slides · click to present`}
            </span>
            {readonly && !simpleHeader && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--color-surface)', color: 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}>
                readonly export
              </span>
            )}
            {commitLabel && !simpleHeader && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--color-surface)', color: 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}>
                commit {commitLabel}
              </span>
            )}
            {!readonly && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                aria-label="Presentation settings"
                title="Presentation settings"
                className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
                style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Settings size={14} />
              </button>
            )}
            {!readonly && (
              <CommandMenu
                onExportPlayer={() => startExport()}
                onExportDeck={() => startExport(undefined, 'deck')}
                exporting={exportState.status === 'exporting'}
                onEnterSelectMode={() => setSelectMode(true)}
              />
            )}
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
                sortableEnabled={!selectMode && !readonly}
                selectMode={selectMode}
                selected={selected.has(slide.id)}
                onToggleSelect={toggleSelect}
                hoverEffects={true}
                onSelect={onSelectSlide}
                onEdit={onEditSlide}
                onDelete={onDeleteSlide}
                onRename={onRenameSlide}
              />
            ))}
            {!selectMode && !readonly && <AddCard onClick={onAddSlide} />}
          </div>
        </SortableContext>
      </DndContext>

      {/* Confirm delete dialog */}
      <AnimatePresence>
        {confirmDeleteSlides && (
          <ConfirmDeleteDialog
            slides={confirmDeleteSlides}
            onConfirm={executeBulkDelete}
            onCancel={() => setConfirmDeleteSlides(null)}
          />
        )}
      </AnimatePresence>

      {/* Export progress dialog */}
      <AnimatePresence>
        {!readonly && exportState.status !== 'idle' && (
          <ExportProgressDialog
            state={exportState}
            onRetry={handleExportRetry}
            onClose={() => setExportState({ status: 'idle' })}
          />
        )}
      </AnimatePresence>

      {/* Bulk action bar */}
      <AnimatePresence>
        {!readonly && selectMode && selected.size > 0 && (
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
              onClick={() => handleBulkExport('player')}
              disabled={exportState.status === 'exporting'}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-(--color-border) disabled:opacity-50"
              style={{ color: 'var(--color-text)', background: 'none', border: 'none', cursor: exportState.status === 'exporting' ? 'wait' : 'pointer' }}
            >
              <Download size={13} />
              Export player
            </button>
            <button
              onClick={() => handleBulkExport('deck')}
              disabled={exportState.status === 'exporting'}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-(--color-border) disabled:opacity-50"
              style={{ color: 'var(--color-text)', background: 'none', border: 'none', cursor: exportState.status === 'exporting' ? 'wait' : 'pointer' }}
            >
              <Download size={13} />
              Export deck
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
