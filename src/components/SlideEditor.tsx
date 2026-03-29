import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Trash2, GripVertical, Type, Image as ImageIcon, Globe, Square, Circle, Pill } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { Block, ShapeBlock, ApiSlide, ThemeName } from '@/types'
import { api } from '@/api/client'
import { DbSlideRenderer } from './DbSlideRenderer'
import { T } from '@/design/tokens'

interface Props {
  pid: number
  slide: { id: number; title: string; blocks: Block[] }
  theme: ThemeName
  onClose: () => void
  onSaved: (updated: ApiSlide) => void
}

const SHAPE_COLORS = [
  '#25d366', '#4c9fff', '#ff6b6b', '#ffd93d', '#a29bfe',
  '#fd79a8', '#00cec9', '#e17055', '#6c5ce7', '#ffffff',
  '#2d3436', '#0d0f0e',
]

const BLOCK_TYPES: { type: Block['type']; icon: React.ReactNode; label: string }[] = [
  { type: 'text',  icon: <Type size={13} />,    label: 'Text' },
  { type: 'shape', icon: <Square size={13} />,  label: 'Shape' },
  { type: 'image', icon: <ImageIcon size={13} />, label: 'Image' },
  { type: 'iframe',icon: <Globe size={13} />,   label: 'Embed' },
]

function makeBlock(type: Block['type']): Block {
  const id = nanoid()
  switch (type) {
    case 'text':  return { id, type, markdown: '' }
    case 'image': return { id, type, url: '', alt: '' }
    case 'iframe':return { id, type, url: '', height: 300 }
    case 'shape': return { id, type, shape: 'rect', color: '#25d366', label: '' }
  }
}

export function SlideEditor({ pid, slide, theme, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(slide.title)
  const [blocks, setBlocks] = useState<Block[]>(slide.blocks)
  const [saving, setSaving] = useState(false)

  const addBlock = useCallback((type: Block['type']) => {
    setBlocks(b => [...b, makeBlock(type)])
  }, [])

  const updateBlock = useCallback((id: string, patch: Partial<Block>) =>
    setBlocks(b => b.map(x => x.id === id ? { ...x, ...patch } as Block : x)), [])

  const removeBlock = useCallback((id: string) =>
    setBlocks(b => b.filter(x => x.id !== id)), [])

  const save = async () => {
    setSaving(true)
    try {
      const updated = await api.slides.update(pid, slide.id, { title, blocks })
      onSaved(updated)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'stretch' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.2 }}
        style={{ marginLeft: 'auto', width: 420, height: '100%', background: T.surface, borderLeft: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Slide title"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, fontWeight: 700, color: T.text, fontFamily: 'Inter, sans-serif' }}
          />
          <button onClick={onClose} style={{ color: T.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Live preview strip */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${T.border}`, background: T.bg }}>
          <div style={{ width: '100%', paddingBottom: '56.25%', position: 'relative', borderRadius: 6, overflow: 'hidden', border: `1px solid ${T.border}` }}>
            <div style={{ position: 'absolute', inset: 0, transform: 'scale(0.38)', transformOrigin: 'top left', width: '263%', height: '263%', pointerEvents: 'none' }}>
              <DbSlideRenderer blocks={blocks} theme={theme} />
            </div>
          </div>
        </div>

        {/* Block list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {blocks.length === 0 && (
            <div style={{ fontSize: 11, color: T.muted, textAlign: 'center', padding: '20px 0', fontFamily: 'JetBrains Mono, monospace' }}>
              no blocks yet — add one below
            </div>
          )}
          <AnimatePresence initial={false}>
            {blocks.map((block, i) => (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
              >
                <BlockRow block={block} index={i} onChange={updateBlock} onRemove={removeBlock} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add block bar */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {BLOCK_TYPES.map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => addBlock(type)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: `${T.accent}18`, border: `1px solid ${T.border}`, color: T.accent, fontFamily: 'Inter, sans-serif' }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, background: 'transparent', border: `1px solid ${T.border}`, color: T.textDim }}>
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{ padding: '8px 20px', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, background: T.accent, border: 'none', color: T.bg, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Block row editors ────────────────────────────────────────────────────────

function BlockRow({ block, index: _i, onChange, onRemove }: {
  block: Block; index: number
  onChange: (id: string, patch: Partial<Block>) => void
  onRemove: (id: string) => void
}) {
  const input: React.CSSProperties = {
    width: '100%', background: T.bg, border: `1px solid ${T.border}`,
    borderRadius: 6, padding: '6px 10px', fontSize: 12, color: T.text,
    fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, display: 'flex', gap: 8 }}>
      <GripVertical size={13} style={{ color: T.muted, flexShrink: 0, marginTop: 3 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{block.type}</span>
        </div>

        {block.type === 'text' && (
          <textarea
            value={block.markdown}
            onChange={e => onChange(block.id, { markdown: e.target.value })}
            placeholder="Markdown text…"
            rows={4}
            style={{ ...input, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
          />
        )}

        {block.type === 'image' && <>
          <input value={block.url} onChange={e => onChange(block.id, { url: e.target.value })} placeholder="Image URL" style={input} />
          <input value={block.alt ?? ''} onChange={e => onChange(block.id, { alt: e.target.value })} placeholder="Alt text (optional)" style={input} />
        </>}

        {block.type === 'iframe' && <>
          <input value={block.url} onChange={e => onChange(block.id, { url: e.target.value })} placeholder="URL to embed" style={input} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: T.textDim, whiteSpace: 'nowrap' }}>Height px</span>
            <input value={block.height ?? 300} onChange={e => onChange(block.id, { height: Number(e.target.value) })} type="number" style={{ ...input, width: 90 }} />
          </div>
        </>}

        {block.type === 'shape' && <ShapeEditor block={block} onChange={onChange} />}
      </div>
      <button onClick={() => onRemove(block.id)} style={{ color: T.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'flex-start' }}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function ShapeEditor({ block, onChange }: { block: ShapeBlock; onChange: (id: string, patch: Partial<Block>) => void }) {
  const input: React.CSSProperties = {
    background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6,
    padding: '5px 9px', fontSize: 12, color: T.text, fontFamily: 'Inter, sans-serif',
    outline: 'none', boxSizing: 'border-box', width: '100%',
  }
  const shapeOptions: { value: ShapeBlock['shape']; icon: React.ReactNode; label: string }[] = [
    { value: 'rect',   icon: <Square size={12} />,  label: 'Rect' },
    { value: 'pill',   icon: <Pill size={12} />,    label: 'Pill' },
    { value: 'circle', icon: <Circle size={12} />,  label: 'Circle' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Shape selector */}
      <div style={{ display: 'flex', gap: 6 }}>
        {shapeOptions.map(({ value, icon, label }) => (
          <button
            key={value}
            onClick={() => onChange(block.id, { shape: value })}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '5px 0', borderRadius: 7, cursor: 'pointer', fontSize: 11,
              border: `1.5px solid ${block.shape === value ? T.accent : T.border}`,
              background: block.shape === value ? `${T.accent}18` : T.bg,
              color: block.shape === value ? T.accent : T.textDim,
              fontFamily: 'Inter, sans-serif', fontWeight: 600,
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Color picker */}
      <div>
        <div style={{ fontSize: 10, color: T.textDim, marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>Color</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SHAPE_COLORS.map(c => (
            <button
              key={c}
              onClick={() => onChange(block.id, { color: c })}
              style={{
                width: 22, height: 22, borderRadius: 6, background: c, cursor: 'pointer',
                border: block.color === c ? `2px solid ${T.highlight}` : `1.5px solid ${T.border}`,
                padding: 0, flexShrink: 0,
              }}
              title={c}
            />
          ))}
          <input
            type="color"
            value={block.color}
            onChange={e => onChange(block.id, { color: e.target.value })}
            style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${T.border}`, padding: 0, cursor: 'pointer', background: 'none' }}
            title="Custom color"
          />
        </div>
      </div>

      {/* Label */}
      <input value={block.label ?? ''} onChange={e => onChange(block.id, { label: e.target.value })} placeholder="Label text (optional)" style={input} />

      {/* Custom size (optional) */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>Width</div>
          <input value={block.width ?? ''} onChange={e => onChange(block.id, { width: e.target.value || undefined })} placeholder="e.g. 200px, 60%" style={input} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>Height</div>
          <input value={block.height ?? ''} onChange={e => onChange(block.id, { height: e.target.value || undefined })} placeholder="e.g. 80px" style={input} />
        </div>
      </div>
    </div>
  )
}
