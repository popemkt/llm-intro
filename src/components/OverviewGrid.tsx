import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Pencil, Trash2, Settings, ChevronDown, ChevronRight, Download, CheckSquare, X, Check, AlertTriangle, Loader2, RotateCcw, FolderPlus, LayoutGrid, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import {
  DndContext, pointerWithin, rectIntersection, PointerSensor, useSensor, useSensors, useDroppable,
  type DragEndEvent, type DragOverEvent, type DragStartEvent, type CollisionDetection,
} from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { UnifiedSlide, ApiSlideGroup, LayoutInput, ThemeName } from '@/types'
import { DbSlideRenderer } from './DbSlideRenderer'
import { Breadcrumb, type BreadcrumbSegment } from './Breadcrumb'

interface OverviewGridProps {
  slides: UnifiedSlide[]
  groups: ApiSlideGroup[]
  presentationId: number
  presentationTheme: ThemeName
  title: string
  onSelectSlide: (index: number) => void
  onAddSlide: () => void
  onAddSlideToGroup: (groupId: number) => void
  onLayoutChange: (layout: LayoutInput) => void
  onCreateGroup: () => void
  onUpdateGroup: (gid: number, patch: { title?: string; collapsed?: boolean }) => void
  onDeleteGroup: (gid: number) => void
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

const UNGROUPED_KEY = 'bucket:null'
const groupBucketKey = (id: number) => `bucket:${id}`

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

function AddTile({ icon, label, onClick, testId, fill = false }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  testId?: string
  fill?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      data-testid={testId}
      className="rounded-xl border-2 border-dashed border-(--color-border) hover:border-(--color-accent)/60 transition-colors"
      style={fill
        ? { position: 'absolute', inset: 0, flex: 1, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }
        : { flex: 1, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
    >
      {icon}
      <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'Inter, sans-serif' }}>
        {label}
      </span>
    </button>
  )
}

function GroupAddCard({ onPickExisting, onCreateNew }: {
  onPickExisting: () => void
  onCreateNew: () => void
}) {
  return (
    <div style={{ paddingBottom: '56.25%', position: 'relative', width: '100%' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 10 }}>
        <AddTile
          icon={<LayoutGrid size={20} style={{ color: 'var(--color-text-dim)' }} />}
          label="Pick existing"
          onClick={onPickExisting}
        />
        <AddTile
          icon={<Plus size={20} style={{ color: 'var(--color-text-dim)' }} />}
          label="Add slide"
          onClick={onCreateNew}
        />
      </div>
    </div>
  )
}

function PickSlideDialog({ sections, onPick, onCancel }: {
  sections: Array<{ label: string; slides: { id: number; title: string; number: number }[] }>
  onPick: (slideId: number) => void
  onCancel: () => void
}) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sections
    return sections.map(section => ({
      ...section,
      slides: section.slides.filter(s =>
        s.title.toLowerCase().includes(q) || String(s.number).includes(q),
      ),
    }))
  }, [sections, query])

  const flatSlides = useMemo(() => filtered.flatMap(s => s.slides), [filtered])
  const hasAny = flatSlides.length > 0

  useEffect(() => { setSelectedIndex(0) }, [query])
  useEffect(() => {
    if (selectedIndex >= flatSlides.length) setSelectedIndex(Math.max(0, flatSlides.length - 1))
  }, [flatSlides.length, selectedIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, flatSlides.length - 1))
      }
      else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      }
      else if (e.key === 'Enter') {
        const picked = flatSlides[selectedIndex]
        if (picked) { e.preventDefault(); onPick(picked.id) }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, onPick, flatSlides, selectedIndex])

  const selectedId = flatSlides[selectedIndex]?.id

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
        style={{ background: 'var(--color-surface)', maxWidth: 440, width: '90%', maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,.5)' }}
        role="dialog"
        aria-labelledby="pick-slide-title"
      >
        <div className="flex items-center gap-2 px-5 py-3 border-b border-(--color-border)">
          <h3 id="pick-slide-title" className="text-sm font-semibold" style={{ color: 'var(--color-text)', margin: 0 }}>
            Move slide into group
          </h3>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="ml-auto p-1 rounded hover:bg-(--color-border)"
            style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-2 border-b border-(--color-border)">
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by title or number…"
            className="w-full text-xs bg-transparent focus:outline-none"
            style={{ color: 'var(--color-text)', padding: '6px 0' }}
          />
        </div>
        <div style={{ overflowY: 'auto', padding: '8px 0' }}>
          {!hasAny && (
            <div className="px-5 py-4 text-xs" style={{ color: 'var(--color-text-dim)' }}>
              No matching slides.
            </div>
          )}
          {filtered.map((section, i) => section.slides.length === 0 ? null : (
            <div key={i}>
              <div
                className="px-5 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider"
                style={
                  section.label === 'Ungrouped'
                    ? { color: 'var(--color-accent)', fontWeight: 700, letterSpacing: '0.12em' }
                    : { color: 'var(--color-text-dim)' }
                }
              >
                {section.label}
              </div>
              {section.slides.map(slide => {
                const isSelected = slide.id === selectedId
                return (
                  <button
                    key={slide.id}
                    ref={el => { if (isSelected && el) el.scrollIntoView({ block: 'nearest' }) }}
                    onClick={() => onPick(slide.id)}
                    onMouseEnter={() => {
                      const idx = flatSlides.findIndex(s => s.id === slide.id)
                      if (idx >= 0) setSelectedIndex(idx)
                    }}
                    className="flex items-center gap-2 w-full px-5 py-2 text-xs transition-colors"
                    style={{
                      background: isSelected ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'none',
                      borderLeft: isSelected ? '2px solid var(--color-accent)' : '2px solid transparent',
                      border: 'none',
                      borderLeftWidth: 2,
                      borderLeftStyle: 'solid',
                      borderLeftColor: isSelected ? 'var(--color-accent)' : 'transparent',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span className="font-mono" style={{ color: 'var(--color-text-dim)', flexShrink: 0 }}>
                      {String(slide.number).padStart(2, '0')}
                    </span>
                    <span className="truncate">{slide.title}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <div style={{ paddingBottom: '56.25%', position: 'relative', width: '100%' }}>
      <AddTile
        icon={<Plus size={20} style={{ color: 'var(--color-text-dim)' }} />}
        label="Add slide"
        onClick={onClick}
        testId="add-slide-card"
        fill
      />
    </div>
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

function BucketDrop({ id, children, empty }: { id: string; children: React.ReactNode; empty: boolean }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className="grid gap-5"
      style={{
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        minHeight: empty ? 80 : undefined,
      }}
    >
      {children}
    </div>
  )
}

function GroupHeader({
  group,
  slideCount,
  readonly,
  onToggleCollapse,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  group: ApiSlideGroup
  slideCount: number
  readonly: boolean
  onToggleCollapse: () => void
  onRename: (title: string) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(group.title)

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== group.title) onRename(trimmed)
    setEditing(false)
  }

  return (
    <div
      className="flex items-center gap-2 py-2 px-1 border-b border-(--color-border)/60"
      style={{ color: 'var(--color-text)' }}
    >
      <button
        onClick={onToggleCollapse}
        aria-label={group.collapsed ? 'Expand group' : 'Collapse group'}
        className="p-1 rounded hover:bg-(--color-border)"
        style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer' }}
      >
        {group.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </button>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') { setDraft(group.title); setEditing(false) }
          }}
          onBlur={commit}
          className="text-sm font-semibold bg-transparent focus:outline-none"
          style={{ color: 'var(--color-text)', boxShadow: '0 1px 0 0 var(--color-accent)' }}
        />
      ) : (
        <button
          onClick={() => { if (!readonly) { setDraft(group.title); setEditing(true) } }}
          className="text-sm font-semibold"
          style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: readonly ? 'default' : 'text', padding: 0 }}
        >
          {group.title}
        </button>
      )}
      <span className="text-xs font-mono" style={{ color: 'var(--color-text-dim)' }}>
        {slideCount} slide{slideCount === 1 ? '' : 's'}
      </span>
      {!readonly && (
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Move group up"
            className="p-1 rounded hover:bg-(--color-border) disabled:opacity-30"
            style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: canMoveUp ? 'pointer' : 'not-allowed' }}
            title="Move group up"
          >
            <ChevronRight size={12} style={{ transform: 'rotate(-90deg)' }} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Move group down"
            className="p-1 rounded hover:bg-(--color-border) disabled:opacity-30"
            style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: canMoveDown ? 'pointer' : 'not-allowed' }}
            title="Move group down"
          >
            <ChevronRight size={12} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete group"
            className="p-1 rounded hover:bg-(--color-border)"
            style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}
            title="Delete group (slides move to ungrouped)"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

export function OverviewGrid({
  slides,
  groups,
  presentationId,
  presentationTheme,
  title,
  onSelectSlide,
  onAddSlide,
  onAddSlideToGroup,
  onLayoutChange,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
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
  const [pickForGroupId, setPickForGroupId] = useState<number | null>(null)
  const [ungroupedCollapsed, setUngroupedCollapsed] = useState(false)
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

  // Buckets derived from (slides, groups). `slides` is assumed to come back
  // from the API already in layout order: ungrouped first, then per-group.
  type Buckets = { ungrouped: UnifiedSlide[]; byGroup: Map<number, UnifiedSlide[]> }
  const propsBuckets = useMemo<Buckets>(() => {
    const ungrouped: UnifiedSlide[] = []
    const byGroup = new Map<number, UnifiedSlide[]>()
    for (const g of groups) byGroup.set(g.id, [])
    for (const slide of slides) {
      if (slide.groupId == null || !byGroup.has(slide.groupId)) ungrouped.push(slide)
      else byGroup.get(slide.groupId)!.push(slide)
    }
    return { ungrouped, byGroup }
  }, [slides, groups])

  // Ephemeral drag state: while an item is mid-drag across buckets, we mutate
  // a local snapshot so Sortable can animate seamlessly. null when idle.
  const [dragBuckets, setDragBuckets] = useState<Buckets | null>(null)
  const buckets = dragBuckets ?? propsBuckets

  const buildLayoutFromBuckets = (b: Buckets): LayoutInput => ({
    ungrouped: b.ungrouped.map(s => s.id),
    groups: groups.map(g => ({ id: g.id, slideIds: (b.byGroup.get(g.id) ?? []).map(s => s.id) })),
  })

  const cloneBuckets = (b: Buckets): Buckets => ({
    ungrouped: [...b.ungrouped],
    byGroup: new Map([...b.byGroup].map(([k, v]) => [k, [...v]])),
  })

  const readBucket = (b: Buckets, key: string): UnifiedSlide[] =>
    key === UNGROUPED_KEY ? b.ungrouped : b.byGroup.get(Number(key.slice('bucket:'.length)))!

  const groupIdForKey = (key: string) =>
    key === UNGROUPED_KEY ? null : Number(key.slice('bucket:'.length))

  const resolveBucketFromOver = (b: Buckets, overId: string | number): string | null => {
    if (typeof overId === 'string' && overId.startsWith('bucket:')) return overId
    const id = Number(overId)
    if (Number.isNaN(id)) return null
    if (b.ungrouped.some(s => s.id === id)) return UNGROUPED_KEY
    for (const [gid, list] of b.byGroup) if (list.some(s => s.id === id)) return groupBucketKey(gid)
    return null
  }

  const handleDragStart = useCallback((_e: DragStartEvent) => {
    if (readonly) return
    setDragBuckets(cloneBuckets(propsBuckets))
  }, [readonly, propsBuckets])

  const handleDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (readonly || !over) return
    const activeId = Number(active.id)
    if (Number.isNaN(activeId)) return

    setDragBuckets(prev => {
      if (!prev) return prev
      const fromKey = resolveBucketFromOver(prev, activeId)
      const toKey = resolveBucketFromOver(prev, over.id as string | number)
      if (!fromKey || !toKey) return prev
      if (fromKey === toKey) return prev // Sortable handles in-bucket animation

      const next = cloneBuckets(prev)
      const fromList = readBucket(next, fromKey)
      const fromIdx = fromList.findIndex(s => s.id === activeId)
      if (fromIdx < 0) return prev
      const [moved] = fromList.splice(fromIdx, 1)

      const toList = readBucket(next, toKey)
      let insertAt = toList.length
      if (typeof over.id === 'number' || (typeof over.id === 'string' && !over.id.startsWith('bucket:'))) {
        const overSlideId = Number(over.id)
        const idx = toList.findIndex(s => s.id === overSlideId)
        if (idx >= 0) insertAt = idx
      }
      toList.splice(insertAt, 0, { ...moved, groupId: groupIdForKey(toKey) } as UnifiedSlide)
      return next
    })
  }, [readonly])

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (readonly || !dragBuckets) { setDragBuckets(null); return }
    const activeId = Number(active.id)
    if (Number.isNaN(activeId) || !over) { setDragBuckets(null); return }

    // Apply any final in-bucket reorder (Sortable animated it visually; we
    // need to commit it to the snapshot before building the layout).
    const fromKey = resolveBucketFromOver(dragBuckets, activeId)
    const toKey = resolveBucketFromOver(dragBuckets, over.id as string | number)
    const next = cloneBuckets(dragBuckets)
    if (fromKey && toKey && fromKey === toKey && typeof over.id !== 'string') {
      const list = readBucket(next, fromKey)
      const fromIdx = list.findIndex(s => s.id === activeId)
      const toIdx = list.findIndex(s => s.id === Number(over.id))
      if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
        const [moved] = list.splice(fromIdx, 1)
        list.splice(toIdx, 0, moved)
      }
    }

    onLayoutChange(buildLayoutFromBuckets(next))
    setDragBuckets(null)
  }, [readonly, dragBuckets, onLayoutChange, groups])

  const moveSlideToGroup = useCallback((slideId: number, targetGroupId: number) => {
    const nextUngrouped = buckets.ungrouped.filter(s => s.id !== slideId).map(s => s.id)
    const nextGroups = groups.map(g => {
      const current = (buckets.byGroup.get(g.id) ?? []).filter(s => s.id !== slideId).map(s => s.id)
      if (g.id === targetGroupId) current.push(slideId)
      return { id: g.id, slideIds: current }
    })
    onLayoutChange({ ungrouped: nextUngrouped, groups: nextGroups })
  }, [buckets, groups, onLayoutChange])

  // Multi-container collision detection: prefer item (slide) collisions via
  // pointerWithin, then bucket-container collisions via pointerWithin, then
  // fall back to rectIntersection. This fixes cross-bucket drops where
  // closestCorners would sometimes snap back to the source container.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerHits = pointerWithin(args)
    if (pointerHits.length > 0) {
      const itemHits = pointerHits.filter(c => typeof c.id === 'number')
      if (itemHits.length > 0) return itemHits
      return pointerHits
    }
    return rectIntersection(args)
  }, [])

  const handleReorderGroup = useCallback((groupId: number, direction: -1 | 1) => {
    const index = groups.findIndex(g => g.id === groupId)
    if (index < 0) return
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= groups.length) return
    const reorderedGroups = [...groups]
    const [removed] = reorderedGroups.splice(index, 1)
    reorderedGroups.splice(newIndex, 0, removed)
    onLayoutChange({
      ungrouped: buckets.ungrouped.map(s => s.id),
      groups: reorderedGroups.map(g => ({ id: g.id, slideIds: (buckets.byGroup.get(g.id) ?? []).map(s => s.id) })),
    })
  }, [groups, buckets, onLayoutChange])

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
            {!readonly && groups.length > 0 && (() => {
              const allCollapsed = ungroupedCollapsed && groups.every(g => g.collapsed)
              return (
                <button
                  onClick={() => {
                    const next = !allCollapsed
                    setUngroupedCollapsed(next)
                    groups.forEach(g => { if (g.collapsed !== next) onUpdateGroup(g.id, { collapsed: next }) })
                  }}
                  aria-label={allCollapsed ? 'Expand all' : 'Collapse all'}
                  title={allCollapsed ? 'Expand all' : 'Collapse all'}
                  className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
                  style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {allCollapsed ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}
                </button>
              )
            })()}
            {!readonly && (
              <button
                onClick={onCreateGroup}
                aria-label="New group"
                title="New group"
                className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
                style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <FolderPlus size={14} />
              </button>
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

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragBuckets(null)}
      >
        <div className="flex flex-col gap-6 p-8 mx-auto w-full" style={{ maxWidth: 1600 }}>
          {/* Ungrouped bucket */}
          <div className="flex flex-col gap-3">
            {!readonly && (
              <div
                className="flex items-center gap-2 py-2 px-1 border-b border-(--color-border)/60"
                style={{ color: 'var(--color-text)' }}
              >
                <button
                  onClick={() => setUngroupedCollapsed(c => !c)}
                  aria-label={ungroupedCollapsed ? 'Expand ungrouped' : 'Collapse ungrouped'}
                  className="p-1 rounded hover:bg-(--color-border)"
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer' }}
                >
                  {ungroupedCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-accent)', letterSpacing: '0.02em' }}
                >
                  Ungrouped
                </span>
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-dim)' }}>
                  {buckets.ungrouped.length} slide{buckets.ungrouped.length === 1 ? '' : 's'}
                </span>
              </div>
            )}
            {(!ungroupedCollapsed || readonly) && (
          <SortableContext items={buckets.ungrouped.map(s => s.id)} strategy={rectSortingStrategy}>
            <BucketDrop id={UNGROUPED_KEY} empty={buckets.ungrouped.length === 0 && groups.length > 0}>
              {buckets.ungrouped.map((slide) => {
                const absoluteIndex = slides.findIndex(s => s.id === slide.id)
                return (
                  <ThumbnailCell
                    key={slide.id}
                    slide={slide}
                    index={absoluteIndex}
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
                )
              })}
              {!selectMode && !readonly && <AddCard onClick={onAddSlide} />}
            </BucketDrop>
          </SortableContext>
            )}
          </div>

          {/* Groups */}
          {groups.map((group, gIdx) => {
            const groupSlides = buckets.byGroup.get(group.id) ?? []
            return (
              <div key={group.id} className="flex flex-col gap-3">
                <GroupHeader
                  group={group}
                  slideCount={groupSlides.length}
                  readonly={readonly}
                  onToggleCollapse={() => onUpdateGroup(group.id, { collapsed: !group.collapsed })}
                  onRename={(newTitle) => onUpdateGroup(group.id, { title: newTitle })}
                  onDelete={() => onDeleteGroup(group.id)}
                  onMoveUp={() => handleReorderGroup(group.id, -1)}
                  onMoveDown={() => handleReorderGroup(group.id, 1)}
                  canMoveUp={gIdx > 0}
                  canMoveDown={gIdx < groups.length - 1}
                />
                {!group.collapsed && (
                  <SortableContext items={groupSlides.map(s => s.id)} strategy={rectSortingStrategy}>
                    <BucketDrop id={groupBucketKey(group.id)} empty={groupSlides.length === 0}>
                      {groupSlides.map((slide) => {
                        const absoluteIndex = slides.findIndex(s => s.id === slide.id)
                        return (
                          <ThumbnailCell
                            key={slide.id}
                            slide={slide}
                            index={absoluteIndex}
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
                        )
                      })}
                      {!selectMode && !readonly && (
                        <GroupAddCard
                          onPickExisting={() => setPickForGroupId(group.id)}
                          onCreateNew={() => onAddSlideToGroup(group.id)}
                        />
                      )}
                    </BucketDrop>
                  </SortableContext>
                )}
              </div>
            )
          })}
        </div>
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

      {/* Pick existing slide dialog */}
      <AnimatePresence>
        {pickForGroupId != null && (() => {
          const targetGroupId = pickForGroupId
          const slideNumber = (id: number) => slides.findIndex(s => s.id === id) + 1
          const sections: Array<{ label: string; slides: { id: number; title: string; number: number }[] }> = [
            {
              label: 'Ungrouped',
              slides: buckets.ungrouped.map(s => ({ id: s.id, title: s.title, number: slideNumber(s.id) })),
            },
            ...groups
              .filter(g => g.id !== targetGroupId)
              .map(g => ({
                label: g.title,
                slides: (buckets.byGroup.get(g.id) ?? []).map(s => ({ id: s.id, title: s.title, number: slideNumber(s.id) })),
              })),
          ]
          return (
            <PickSlideDialog
              sections={sections}
              onPick={(slideId) => {
                moveSlideToGroup(slideId, targetGroupId)
                setPickForGroupId(null)
              }}
              onCancel={() => setPickForGroupId(null)}
            />
          )
        })()}
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
