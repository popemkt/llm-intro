import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Plus, Trash2, Presentation } from 'lucide-react'
import { api } from '@/api/client'
import { THEME_NAMES, type ApiPresentation, type ThemeName } from '@/types'
import { T } from '@/design/tokens'

export function HomePage() {
  const navigate = useNavigate()
  const [presentations, setPresentations] = useState<ApiPresentation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTheme, setNewTheme] = useState<ThemeName>('dark-green')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.presentations.list().then(setPresentations).finally(() => setLoading(false))
  }, [])

  const create = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const pres = await api.presentations.create(newName.trim(), newTheme)
      navigate(`/p/${pres.id}`)
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this presentation and all its slides?')) return
    await api.presentations.delete(id)
    setPresentations(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: '20px 40px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent }} />
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Decks</span>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: T.accent, color: T.bg, border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={13} /> New
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px' }}>
        {/* Create form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 32, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}
          >
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: 11, color: T.textDim, marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>Name</label>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && create()}
                placeholder="My deck"
                style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: T.text, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: T.textDim, marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>Theme</label>
              <select
                value={newTheme}
                onChange={e => setNewTheme(e.target.value as ThemeName)}
                style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: T.text, outline: 'none', cursor: 'pointer' }}
              >
                {THEME_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button
              onClick={create}
              disabled={creating || !newName.trim()}
              style={{ background: T.accent, color: T.bg, border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: creating || !newName.trim() ? 0.5 : 1 }}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, color: T.textDim, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </motion.div>
        )}

        {loading ? (
          <div style={{ fontSize: 12, color: T.textDim }}>Loading…</div>
        ) : presentations.length === 0 ? (
          <div style={{ fontSize: 12, color: T.muted, fontStyle: 'italic' }}>No decks yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {presentations.map(pres => (
              <motion.div key={pres.id} whileHover={{ scale: 1.02 }} style={{ position: 'relative' }}>
                <button
                  onClick={() => navigate(`/p/${pres.id}`)}
                  style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px', textAlign: 'left', cursor: 'pointer', display: 'block' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Presentation size={14} style={{ color: T.accent }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{pres.name}</span>
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                    theme: {pres.theme}
                  </div>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); remove(pres.id) }}
                  style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 4, borderRadius: 6 }}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
