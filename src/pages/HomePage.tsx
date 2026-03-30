import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Plus, Trash2, Presentation, Settings } from 'lucide-react'
import { api, getErrorMessage } from '@/api/client'
import { THEME_NAMES, type ApiPresentation, type ThemeName } from '@/types'
import { C } from '@/design/tokens'

export function HomePage() {
  const navigate = useNavigate()
  const [presentations, setPresentations] = useState<ApiPresentation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTheme, setNewTheme] = useState<ThemeName>('dark-green')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadPresentations() {
    setLoading(true)
    setError(null)
    try {
      setPresentations(await api.presentations.list())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPresentations()
  }, [])

  const create = async () => {
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const pres = await api.presentations.create(newName.trim(), newTheme)
      navigate(`/p/${pres.id}`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this presentation and all its slides?')) return
    setError(null)
    try {
      await api.presentations.delete(id)
      setPresentations(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '18px 40px', display: 'flex', alignItems: 'center', gap: 12, background: C.surface }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent }} />
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', color: C.text }}>Decks</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/settings')}
            aria-label="App settings"
            title="App settings"
            style={{ display: 'flex', alignItems: 'center', padding: 7, background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.textDim }}
          >
            <Settings size={14} />
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={13} /> New
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px' }}>
        {error && (
          <div style={{ marginBottom: 20, padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: '#ff8a8a', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span>{error}</span>
            <button onClick={() => void loadPresentations()} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>
              Retry
            </button>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 32, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}
          >
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: 11, color: C.textDim, marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>Name</label>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && create()}
                placeholder="My deck"
                style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: C.text, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: C.textDim, marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>Slide theme</label>
              <select
                value={newTheme}
                onChange={e => setNewTheme(e.target.value as ThemeName)}
                style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: C.text, outline: 'none', cursor: 'pointer' }}
              >
                {THEME_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button
              onClick={create}
              disabled={creating || !newName.trim()}
              style={{ background: C.accent, color: C.bg, border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: creating || !newName.trim() ? 0.5 : 1 }}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, color: C.textDim, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </motion.div>
        )}

        {loading ? (
          <div style={{ fontSize: 12, color: C.textDim }}>Loading…</div>
        ) : presentations.length === 0 ? (
          <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>No decks yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {presentations.map(pres => (
              <motion.div key={pres.id} whileHover={{ scale: 1.02 }} style={{ position: 'relative' }}>
                <button
                  onClick={() => navigate(`/p/${pres.id}`)}
                  aria-label={pres.is_system ? `Open built-in ${pres.name}` : `Open ${pres.name}`}
                  style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', textAlign: 'left', cursor: 'pointer', display: 'block' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Presentation size={14} style={{ color: C.accent }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{pres.name}</span>
                    {pres.is_system && (
                      <span style={{ fontSize: 9, color: C.textDim, fontFamily: 'JetBrains Mono, monospace', padding: '2px 6px', borderRadius: 999, border: `1px solid ${C.border}` }}>
                        Built-in
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                    slides theme: {pres.theme}
                  </div>
                </button>
                {!pres.is_system && (
                  <button
                    onClick={e => { e.stopPropagation(); void remove(pres.id) }}
                    aria-label={`Delete ${pres.name}`}
                    style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, borderRadius: 6 }}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
