import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Plus, Trash2, Type, Image, Globe, GripVertical } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { Block, ApiSlide, ThemeName } from '@/types'
import { api } from '@/api/client'
import { T } from '@/design/tokens'

interface Props {
  pid: number
  slide: { id: number; title: string; blocks: Block[] }
  theme: ThemeName
  onClose: () => void
  onSaved: (updated: ApiSlide) => void
}

export function SlideEditor({ pid, slide, theme: _theme, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(slide.title)
  const [blocks, setBlocks] = useState<Block[]>(slide.blocks)
  const [saving, setSaving] = useState(false)

  const addBlock = (type: Block['type']) => {
    const id = nanoid()
    const block: Block =
      type === 'text'   ? { id, type, markdown: '' } :
      type === 'image'  ? { id, type, url: '', alt: '' } :
                          { id, type: 'iframe', url: '', height: 300 }
    setBlocks(b => [...b, block])
  }

  const updateBlock = (id: string, patch: Partial<Block>) =>
    setBlocks(b => b.map(x => x.id === id ? { ...x, ...patch } as Block : x))

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
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Slide title"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 16, fontWeight: 700, color: T.text, fontFamily: 'Inter, sans-serif' }}
            />
            <button onClick={onClose} style={{ color: T.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {blocks.map((block, i) => (
              <BlockRow key={block.id} block={block} index={i}
                onChange={updateBlock}
                onRemove={id => setBlocks(b => b.filter(x => x.id !== id))}
              />
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {(['text', 'image', 'iframe'] as const).map(type => (
                <button key={type} onClick={() => addBlock(type)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: `${T.accent}15`, border: `1px solid ${T.border}`, color: T.accent, fontFamily: 'Inter, sans-serif' }}>
                  <Plus size={11} />
                  {type === 'text' ? <><Type size={13} /> Text</> : type === 'image' ? <><Image size={13} /> Image</> : <><Globe size={13} /> Embed</>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, background: 'transparent', border: `1px solid ${T.border}`, color: T.textDim }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, background: T.accent, border: 'none', color: T.bg, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function BlockRow({ block, index: _i, onChange, onRemove }: { block: Block; index: number; onChange: (id: string, patch: Partial<Block>) => void; onRemove: (id: string) => void }) {
  const input = { width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, color: T.text, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const }
  return (
    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, display: 'flex', gap: 8 }}>
      <GripVertical size={14} style={{ color: T.muted, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {block.type === 'text' && (
          <textarea value={block.markdown} onChange={e => onChange(block.id, { markdown: e.target.value })} placeholder="Markdown…" rows={4}
            style={{ ...input, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace' }} />
        )}
        {block.type === 'image' && <>
          <input value={block.url}       onChange={e => onChange(block.id, { url: e.target.value })} placeholder="Image URL" style={input} />
          <input value={block.alt ?? ''} onChange={e => onChange(block.id, { alt: e.target.value })} placeholder="Alt text" style={input} />
        </>}
        {block.type === 'iframe' && <>
          <input value={block.url}          onChange={e => onChange(block.id, { url: e.target.value })} placeholder="Embed URL" style={input} />
          <input value={block.height ?? 300} onChange={e => onChange(block.id, { height: Number(e.target.value) })} type="number" placeholder="Height px" style={{ ...input, width: 120 }} />
        </>}
        <span style={{ fontSize: 10, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>{block.type}</span>
      </div>
      <button onClick={() => onRemove(block.id)} style={{ color: T.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}
