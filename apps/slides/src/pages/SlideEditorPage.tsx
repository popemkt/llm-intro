import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Type, Image as ImageIcon, Globe, Square, Trash2, Settings, Circle, Pill } from 'lucide-react'
import { nanoid } from 'nanoid'
import ReactMarkdown from 'react-markdown'
import type { Block, ShapeBlock, ThemeName } from '@/types'
import { api, getErrorMessage } from '@/api/client'
import { data } from '@/data'
import { C } from '@/design/tokens'
import { getReadableTextColor } from '@/lib/color'
import { Breadcrumb } from '@/components/Breadcrumb'

type DragMode = 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'

type DragState = {
  mode: DragMode
  blockId: string
  startCx: number; startCy: number
  origX: number; origY: number; origW: number; origH: number
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const BLOCK_DEFAULTS: Record<Block['type'], { x: number; y: number; w: number; h: number }> = {
  text:   { x: 5,  y: 5,  w: 90, h: 30 },
  image:  { x: 10, y: 12, w: 80, h: 70 },
  iframe: { x: 5,  y: 5,  w: 90, h: 88 },
  shape:  { x: 30, y: 30, w: 40, h: 30 },
}

function makeBlock(type: Block['type']): Block {
  const id = nanoid()
  const pos = BLOCK_DEFAULTS[type]
  switch (type) {
    case 'text':   return { id, type, markdown: '', ...pos }
    case 'image':  return { id, type, url: '', alt: '', ...pos }
    case 'iframe': return { id, type, url: '', ...pos }
    case 'shape':  return { id, type, shape: 'rect', color: '#25d366', label: '', ...pos }
  }
}

const SHAPE_COLORS = [
  '#25d366', '#4c9fff', '#ff6b6b', '#ffd93d', '#a29bfe',
  '#fd79a8', '#00cec9', '#e17055', '#6c5ce7', '#ffffff',
  '#2d3436', '#0d0f0e',
]

const inp: React.CSSProperties = {
  width: '100%', background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 6, padding: '6px 10px', fontSize: 12, color: C.text,
  fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function SlideEditorPage() {
  const { id: pidStr, sid: sidStr } = useParams<{ id: string; sid: string }>()
  const navigate = useNavigate()
  const pid = Number(pidStr)
  const sid = Number(sidStr)

  const [title, setTitle]       = useState('Untitled')
  const [presName, setPresName] = useState('')
  const [blocks, setBlocks]     = useState<Block[]>([])
  const [theme, setTheme]       = useState<ThemeName>('dark-green')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef   = useRef<DragState | null>(null)
  const hasLoadedRef = useRef(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Current values ref (for keyboard handler)
  const blocksRef = useRef(blocks)
  const titleRef = useRef(title)
  useEffect(() => { blocksRef.current = blocks }, [blocks])
  useEffect(() => { titleRef.current = title }, [title])

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    Promise.all([data.presentations.get(pid), data.slides.list(pid)])
      .then(([pres, slides]) => {
        const slide = slides.find(s => s.id === sid)
        if (!slide) {
          setLoadError('Slide not found')
          return
        }
        if (slide.kind !== 'db') {
          setLoadError('Only custom slides can be edited here')
          return
        }
        setPresName(pres.name)
        setTitle(slide.title)
        setBlocks(slide.blocks)
        setTheme(pres.theme)
        hasLoadedRef.current = true
      })
      .catch(err => setLoadError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [pid, sid])

  // Global pointer handlers (ref-based — no re-render on drag)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || !canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const dx = (e.clientX - drag.startCx) / rect.width * 100
      const dy = (e.clientY - drag.startCy) / rect.height * 100

      setBlocks(prev => prev.map(b => {
        if (b.id !== drag.blockId) return b
        const bw = b.w ?? 80; const bh = b.h ?? 20
        switch (drag.mode) {
          case 'move':
            return { ...b, x: clamp(drag.origX + dx, 0, 100 - bw), y: clamp(drag.origY + dy, 0, 100 - bh) }
          case 'resize-br':
            return { ...b, w: Math.max(5, drag.origW + dx), h: Math.max(5, drag.origH + dy) }
          case 'resize-bl':
            return { ...b, x: clamp(drag.origX + dx, 0, drag.origX + drag.origW - 5), w: Math.max(5, drag.origW - dx), h: Math.max(5, drag.origH + dy) }
          case 'resize-tr':
            return { ...b, y: clamp(drag.origY + dy, 0, drag.origY + drag.origH - 5), w: Math.max(5, drag.origW + dx), h: Math.max(5, drag.origH - dy) }
          case 'resize-tl':
            return {
              ...b,
              x: clamp(drag.origX + dx, 0, drag.origX + drag.origW - 5),
              y: clamp(drag.origY + dy, 0, drag.origY + drag.origH - 5),
              w: Math.max(5, drag.origW - dx), h: Math.max(5, drag.origH - dy),
            }
        }
      }))
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }
  }, [])

  // Auto-save: trigger on blocks/title changes after initial load
  useEffect(() => {
    if (!hasLoadedRef.current || loading) return
    setSaveStatus('idle')
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      setSaveError(null)
      try {
        await api.slides.update(pid, sid, { title: titleRef.current, blocks: blocksRef.current })
        setSaveStatus('saved')
        if (savedStatusTimerRef.current) clearTimeout(savedStatusTimerRef.current)
        savedStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err) {
        setSaveStatus('error')
        setSaveError(getErrorMessage(err))
      }
    }, 1500)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, title, pid, sid, loading])

  const saveAndExit = useCallback(async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    setSaveStatus('saving')
    setSaveError(null)
    try {
      await api.slides.update(pid, sid, { title: titleRef.current, blocks: blocksRef.current })
      navigate(`/p/${pid}`)
    } catch (err) {
      setSaveStatus('error')
      setSaveError(getErrorMessage(err))
    }
  }, [pid, sid, navigate])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+S — save and exit
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void saveAndExit()
        return
      }
      // Delete/Backspace — delete selected block (not when editing text inputs)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        setBlocks(prev => prev.filter(b => b.id !== selectedId))
        setSelectedId(null)
      }
      // Escape — deselect
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveAndExit, selectedId])

  const startDrag = (e: React.PointerEvent, block: Block, mode: DragMode = 'move') => {
    e.stopPropagation()
    setSelectedId(block.id)
    dragRef.current = {
      mode, blockId: block.id,
      startCx: e.clientX, startCy: e.clientY,
      origX: block.x ?? 5, origY: block.y ?? 5,
      origW: block.w ?? 80, origH: block.h ?? 20,
    }
  }

  const addBlock = useCallback((type: Block['type']) => {
    const b = makeBlock(type)
    setBlocks(prev => [...prev, b])
    setSelectedId(b.id)
  }, [])

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    setSelectedId(s => s === id ? null : s)
  }, [])

  const updateBlock = useCallback(<K extends Block>(id: string, patch: Partial<K>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } as Block : b))
  }, [])

  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null

  const saveStatusLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved' ? 'Saved'
    : saveStatus === 'error' ? 'Error'
    : null

  const saveStatusColor = saveStatus === 'saving' ? C.textDim
    : saveStatus === 'saved' ? C.accent
    : saveStatus === 'error' ? '#ff8a8a'
    : undefined

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, color: C.textDim, fontSize: 13 }}>
      Loading…
    </div>
  )

  if (loadError) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: C.bg, color: C.text }}>
      <div style={{ fontSize: 14 }}>{loadError}</div>
      <button onClick={() => navigate(`/p/${pid}`)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', textDecoration: 'underline' }}>
        Back to deck
      </button>
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ height: 52, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', flexShrink: 0, background: C.surface }}>
        <Breadcrumb segments={[
          { label: 'Home', to: '/' },
          { label: presName || 'Deck', to: `/p/${pid}` },
          { label: title },
        ]} />
        <div style={{ width: 1, height: 20, background: C.border }} />
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ ...inp, flex: 1, maxWidth: 320, fontWeight: 600, fontSize: 14, border: 'none', background: 'transparent', padding: '4px 8px' }}
          placeholder="Slide title"
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Auto-save status */}
          {saveStatusLabel && (
            <span style={{ fontSize: 11, color: saveStatusColor, fontFamily: 'JetBrains Mono, monospace', transition: 'color 0.2s' }}>
              {saveStatusLabel}
            </span>
          )}
          <button
            onClick={() => navigate(`/p/${pid}/settings`)}
            style={{ color: C.textDim, background: 'none', border: `1px solid ${C.border}`, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Settings size={13} /> Theme
          </button>
          <button
            onClick={saveAndExit}
            disabled={saveStatus === 'saving'}
            title="Save and exit (⌘S)"
            style={{ padding: '8px 20px', borderRadius: 8, cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, background: C.accent, border: 'none', color: C.bg, opacity: saveStatus === 'saving' ? 0.6 : 1 }}
          >
            {saveStatus === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {saveError && (
        <div style={{ padding: '8px 20px', background: C.surface, borderBottom: `1px solid ${C.border}`, color: '#ff8a8a', fontSize: 12 }}>
          {saveError}
        </div>
      )}

      {/* Canvas + right panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Canvas area */}
        <div
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070908', padding: 28, overflow: 'hidden' }}
          onClick={() => setSelectedId(null)}
        >
          <div
            ref={canvasRef}
            data-theme={theme}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 'calc((100vh - 140px) * 16 / 9)',
              aspectRatio: '16 / 9',
              background: 'var(--theme-bg)',
              overflow: 'hidden',
              boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
            }}
          >
            {blocks.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.18, fontSize: 12, color: 'var(--theme-text)', fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none' }}>
                add blocks using the panel →
              </div>
            )}

            {blocks.map(block => {
              const isSelected = selectedId === block.id
              const x = block.x ?? 5; const y = block.y ?? 5
              const w = block.w ?? 80; const h = block.h ?? 30
              return (
                <div
                  key={block.id}
                  onPointerDown={e => startDrag(e, block, 'move')}
                  onClick={e => { e.stopPropagation(); setSelectedId(block.id) }}
                  style={{
                    position: 'absolute',
                    left: `${x}%`, top: `${y}%`,
                    width: `${w}%`, height: `${h}%`,
                    cursor: 'move',
                    outline: isSelected ? '2px solid var(--theme-accent, #25d366)' : '1px dashed transparent',
                    outlineOffset: 1,
                    overflow: 'hidden',
                    userSelect: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <CanvasBlockContent block={block} />

                  {isSelected && (
                    <>
                      {/* Resize handles */}
                      {(['tl', 'tr', 'bl', 'br'] as const).map(handle => (
                        <div
                          key={handle}
                          onPointerDown={e => startDrag(e, block, `resize-${handle}`)}
                          style={{
                            position: 'absolute', width: 9, height: 9,
                            background: 'var(--theme-accent, #25d366)',
                            border: '2px solid var(--theme-bg, #0d0f0e)',
                            borderRadius: 2,
                            cursor: (handle === 'tl' || handle === 'br') ? 'nwse-resize' : 'nesw-resize',
                            zIndex: 10,
                            ...(handle === 'tl' ? { top: -5, left: -5 } : {}),
                            ...(handle === 'tr' ? { top: -5, right: -5 } : {}),
                            ...(handle === 'bl' ? { bottom: -5, left: -5 } : {}),
                            ...(handle === 'br' ? { bottom: -5, right: -5 } : {}),
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: 272, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: C.surface, overflow: 'hidden', flexShrink: 0 }}>
          {/* Add block */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Add Block</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([
                { type: 'text'   as const, icon: <Type size={12} />,      label: 'Text' },
                { type: 'image'  as const, icon: <ImageIcon size={12} />, label: 'Image' },
                { type: 'iframe' as const, icon: <Globe size={12} />,     label: 'Embed' },
                { type: 'shape'  as const, icon: <Square size={12} />,    label: 'Shape' },
              ] as const).map(({ type, icon, label }) => (
                <button key={type} onClick={() => addBlock(type)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: C.accentSubtle, border: `1px solid ${C.border}`, color: C.accent, fontFamily: 'Inter, sans-serif' }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Selected block properties */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {selectedBlock ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{selectedBlock.type}</span>
                  <button onClick={() => deleteBlock(selectedBlock.id)}
                    style={{ color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>

                {/* Position & size */}
                <div>
                  <div style={{ fontSize: 9, color: C.textDim, marginBottom: 6, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Position &amp; Size (%)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {(['x', 'y', 'w', 'h'] as const).map(k => (
                      <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 9, color: C.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                          {k === 'x' ? 'Left' : k === 'y' ? 'Top' : k === 'w' ? 'Width' : 'Height'}
                        </span>
                        <input
                          type="number"
                          value={Math.round((selectedBlock[k] ?? BLOCK_DEFAULTS[selectedBlock.type][k]) * 10) / 10}
                          onChange={e => updateBlock(selectedBlock.id, { [k]: Number(e.target.value) })}
                          min={0} max={100} step={0.5}
                          style={{ ...inp, padding: '4px 8px' }}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Type-specific fields */}
                {selectedBlock.type === 'text' && (
                  <div>
                    <div style={{ fontSize: 9, color: C.textDim, marginBottom: 4, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Markdown</div>
                    <textarea
                      value={selectedBlock.markdown}
                      onChange={e => updateBlock(selectedBlock.id, { markdown: e.target.value })}
                      placeholder="Markdown content…"
                      rows={7}
                      style={{ ...inp, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
                    />
                  </div>
                )}

                {selectedBlock.type === 'image' && <>
                  <div>
                    <div style={{ fontSize: 9, color: C.textDim, marginBottom: 4, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>URL</div>
                    <input value={selectedBlock.url} onChange={e => updateBlock(selectedBlock.id, { url: e.target.value })} placeholder="https://…" style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: C.textDim, marginBottom: 4, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Alt text</div>
                    <input value={selectedBlock.alt ?? ''} onChange={e => updateBlock(selectedBlock.id, { alt: e.target.value })} placeholder="Description" style={inp} />
                  </div>
                </>}

                {selectedBlock.type === 'iframe' && (
                  <div>
                    <div style={{ fontSize: 9, color: C.textDim, marginBottom: 4, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>URL</div>
                    <input value={selectedBlock.url} onChange={e => updateBlock(selectedBlock.id, { url: e.target.value })} placeholder="https://…" style={inp} />
                  </div>
                )}

                {selectedBlock.type === 'shape' && (
                  <ShapePropEditor block={selectedBlock} onUpdate={p => updateBlock(selectedBlock.id, p)} />
                )}
              </>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 11, color: C.muted, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}>
                click a block<br />to select &amp; edit<br /><br />
                <span style={{ fontSize: 10, opacity: 0.6 }}>Del · delete selected<br />⌘S · save &amp; exit</span>
              </div>
            )}
          </div>

          {/* Layers list */}
          {blocks.length > 0 && (
            <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 16px', maxHeight: 190, overflowY: 'auto', flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Layers ({blocks.length})
              </div>
              {[...blocks].reverse().map(b => (
                <div
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 7, cursor: 'pointer', marginBottom: 2,
                    background: selectedId === b.id ? C.accentSubtle : 'transparent',
                    border: `1px solid ${selectedId === b.id ? C.border : 'transparent'}`,
                  }}
                >
                  <span style={{ fontSize: 9, color: C.accent, fontFamily: 'JetBrains Mono, monospace', minWidth: 32, textTransform: 'uppercase' }}>{b.type}</span>
                  <span style={{ fontSize: 11, color: C.textDim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.type === 'text'   ? (b.markdown.slice(0, 22) || '(empty)') :
                     b.type === 'image'  ? (b.url.slice(0, 22) || '(no url)') :
                     b.type === 'iframe' ? (b.url.slice(0, 22) || '(no url)') :
                     `${b.shape} ${b.color}`}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteBlock(b.id) }}
                    style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Canvas block content (WYSIWYG preview) ─────────────────────────────────

function CanvasBlockContent({ block }: { block: Block }) {
  switch (block.type) {
    case 'text':
      return (
        <div style={{
          width: '100%', height: '100%', padding: '6px 10px',
          overflow: 'hidden', boxSizing: 'border-box',
          fontSize: 'clamp(0.6rem, 0.9vw, 0.85rem)', lineHeight: 1.55,
          color: 'var(--theme-text)',
        }} className="prose-block">
          {block.markdown
            ? <ReactMarkdown>{block.markdown}</ReactMarkdown>
            : <span style={{ opacity: 0.25, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7em' }}>empty text</span>}
        </div>
      )

    case 'image':
      return block.url
        ? <img src={block.url} alt={block.alt ?? ''} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--theme-text-dim)', fontSize: 11, opacity: 0.5 }}>
            <ImageIcon size={14} /> no image
          </div>
        )

    case 'iframe':
      return (
        <div style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6,
          background: 'var(--theme-surface)', border: '1px solid var(--theme-border)',
          color: 'var(--theme-text-dim)', fontSize: 11,
        }}>
          <Globe size={16} style={{ opacity: 0.5 }} />
          <span style={{ maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.6 }}>
            {block.url || '(no URL)'}
          </span>
        </div>
      )

    case 'shape': {
      const radius = block.shape === 'circle' ? '50%' : block.shape === 'pill' ? 9999 : 8
      const isCircle = block.shape === 'circle'
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            background: block.color, borderRadius: radius,
            width: block.width  ?? (isCircle ? '70%' : '100%'),
            height: block.height ?? (isCircle ? '70%' : '100%'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 12px ${block.color}44`,
          }}>
            {block.label && (
              <span style={{ fontSize: 13, fontWeight: 700, color: getReadableTextColor(block.color), fontFamily: 'Inter, sans-serif' }}>
                {block.label}
              </span>
            )}
          </div>
        </div>
      )
    }
  }
}

// ─── Shape property editor ────────────────────────────────────────────────────

function ShapePropEditor({ block, onUpdate }: { block: ShapeBlock; onUpdate: (p: Partial<ShapeBlock>) => void }) {
  const btnInp: React.CSSProperties = {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    padding: '5px 0', borderRadius: 7, cursor: 'pointer', fontSize: 11,
    fontFamily: 'Inter, sans-serif', fontWeight: 600,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {([
          { value: 'rect'   as const, icon: <Square size={12} />,  label: 'Rect' },
          { value: 'pill'   as const, icon: <Pill size={12} />,    label: 'Pill' },
          { value: 'circle' as const, icon: <Circle size={12} />,  label: 'Circle' },
        ]).map(({ value, icon, label }) => (
          <button key={value} onClick={() => onUpdate({ shape: value })}
            style={{ ...btnInp, border: `1.5px solid ${block.shape === value ? C.accent : C.border}`, background: block.shape === value ? C.accentSubtle : C.bg, color: block.shape === value ? C.accent : C.textDim }}>
            {icon} {label}
          </button>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 9, color: C.textDim, marginBottom: 6, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Color</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {SHAPE_COLORS.map(c => (
            <button key={c} onClick={() => onUpdate({ color: c })}
              title={c}
              style={{ width: 20, height: 20, borderRadius: 5, background: c, cursor: 'pointer', padding: 0, border: block.color === c ? `2.5px solid ${C.highlight}` : `1px solid ${C.border}` }} />
          ))}
          <input type="color" value={block.color} onChange={e => onUpdate({ color: e.target.value })}
            style={{ width: 20, height: 20, borderRadius: 5, border: `1px solid ${C.border}`, padding: 0, cursor: 'pointer', background: 'none' }} />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 9, color: C.textDim, marginBottom: 4, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Label</div>
        <input value={block.label ?? ''} onChange={e => onUpdate({ label: e.target.value })} placeholder="Label text" style={inp} />
      </div>
    </div>
  )
}
