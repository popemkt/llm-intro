import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import type { ThemeName } from '@/types'
import { THEME_NAMES } from '@/types'
import { applyAppTheme, getStoredAppTheme } from '@/lib/appTheme'
import { C } from '@/design/tokens'
import { THEME_META } from '@/lib/themeMeta'

export function AppSettingsPage() {
  const navigate = useNavigate()
  const [appTheme, setAppTheme] = useState<ThemeName>(getStoredAppTheme)

  const handleChange = (t: ThemeName) => {
    setAppTheme(t)
    applyAppTheme(t)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div style={{ height: 56, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', background: C.surface }}>
        <button aria-label="Back home" onClick={() => navigate('/')}
          style={{ color: C.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', borderRadius: 6 }}>
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>App Settings</span>
      </div>

      <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 24px' }}>
        <section>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 4px 0' }}>App Theme</h2>
            <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>Styles the shell — nav, panels, backgrounds. Applied instantly.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {THEME_NAMES.map(t => {
              const { label, desc } = THEME_META[t]
              const isActive = appTheme === t
              return (
                <button
                  key={t}
                  data-theme={t}
                  onClick={() => handleChange(t)}
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
