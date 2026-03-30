import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import type { ThemeName } from '@/types'
import { THEME_NAMES } from '@/types'
import { api } from '@/api/client'
import { C } from '@/design/tokens'

const THEME_META: Record<ThemeName, { label: string; desc: string }> = {
  'dark-green': { label: 'Dark Green',  desc: 'Terminal signal green'  },
  'dark-blue':  { label: 'Dark Blue',   desc: 'Midnight cool blue'     },
  'light':      { label: 'Light',       desc: 'Clean minimal light'    },
  'neon':       { label: 'Neon',        desc: 'Vivid neon magenta'     },
  'warm':       { label: 'Warm',        desc: 'Amber candlelight dark' },
  'ocean':      { label: 'Ocean',       desc: 'Deep teal seabed'       },
}

const inp: React.CSSProperties = {
  width: '100%', background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 8, padding: '9px 13px', fontSize: 13, color: C.text,
  fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
}

export function SettingsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const pid = Number(id)

  const [name,       setName]  = useState('')
  const [slideTheme, setSlideTheme] = useState<ThemeName>('dark-green')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    api.presentations.get(pid).then(p => { setName(p.name); setSlideTheme(p.theme) })
  }, [pid])

  const save = async () => {
    setSaving(true)
    try {
      await api.presentations.update(pid, { name, theme: slideTheme })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      {/* Header */}
      <div style={{ height: 56, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', background: C.surface }}>
        <button onClick={() => navigate(`/p/${pid}`)}
          style={{ color: C.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', borderRadius: 6 }}>
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Presentation Settings</span>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={save}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 18px', borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700,
              background: saved ? C.accentDim : C.accent,
              border: 'none', color: C.bg, opacity: saving ? 0.7 : 1,
              transition: 'background 0.2s',
            }}
          >
            {saved ? <><Check size={13} /> Saved</> : saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 36 }}>

        {/* Presentation Name */}
        <section>
          <h2 style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>
            Presentation Name
          </h2>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name…" style={inp} />
        </section>

        {/* Slide Theme */}
        <section>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px 0' }}>
              Slide Theme
            </h2>
            <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>
              Styles DB-backed slides. Code slides have their own styling.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {THEME_NAMES.map(t => {
              const { label, desc } = THEME_META[t]
              const isActive = slideTheme === t
              return (
                <button
                  key={t}
                  data-theme={t}
                  onClick={() => setSlideTheme(t)}
                  style={{
                    background: 'var(--theme-bg)',
                    border: `2px solid ${isActive ? 'var(--theme-accent)' : 'var(--theme-border)'}`,
                    borderRadius: 12, padding: '14px', cursor: 'pointer',
                    textAlign: 'left', display: 'flex', flexDirection: 'column',
                    gap: 10, transition: 'border-color 0.15s', position: 'relative',
                  }}
                >
                  {isActive && (
                    <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: 'var(--theme-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={10} style={{ color: 'var(--theme-bg)' }} />
                    </div>
                  )}
                  <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--theme-surface)', borderRadius: 6, border: '1px solid var(--theme-border)', display: 'flex', flexDirection: 'column', padding: '6px 8px', gap: 4, boxSizing: 'border-box' }}>
                    <div style={{ height: 4, width: '60%', background: 'var(--theme-accent)', borderRadius: 2 }} />
                    <div style={{ height: 3, width: '85%', background: 'var(--theme-text-dim)', borderRadius: 2, opacity: 0.5 }} />
                    <div style={{ height: 3, width: '70%', background: 'var(--theme-text-dim)', borderRadius: 2, opacity: 0.3 }} />
                    <div style={{ marginTop: 'auto', display: 'flex', gap: 4 }}>
                      <div style={{ height: 8, width: 8, borderRadius: '50%', background: 'var(--theme-accent)' }} />
                      <div style={{ height: 8, width: 8, borderRadius: '50%', background: 'var(--theme-muted)' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--theme-text)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--theme-text-dim)' }}>{desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

      </div>
    </div>
  )
}
