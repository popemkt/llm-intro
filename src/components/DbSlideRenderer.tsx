import ReactMarkdown from 'react-markdown'
import type { Block, ThemeName } from '@/types'

interface Props {
  blocks: Block[]
  theme: ThemeName
}

export function DbSlideRenderer({ blocks, theme }: Props) {
  return (
    <div
      data-theme={theme}
      style={{
        width: '100%', height: '100%',
        background: 'var(--theme-bg)',
        color: 'var(--theme-text)',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '32px 40px',
        boxSizing: 'border-box',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {blocks.length === 0 && (
        <div style={{ margin: 'auto', opacity: 0.25, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
          empty slide
        </div>
      )}
      {blocks.map(block => <BlockView key={block.id} block={block} />)}
    </div>
  )
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'text':
      return (
        <div style={{ fontSize: 'clamp(0.85rem, 1.5vw, 1.05rem)', lineHeight: 1.7, color: 'var(--theme-text)' }}
          className="prose-block">
          <ReactMarkdown>{block.markdown}</ReactMarkdown>
        </div>
      )

    case 'image':
      return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img src={block.url} alt={block.alt ?? ''} style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )

    case 'iframe':
      return (
        <iframe
          src={block.url}
          title="embedded"
          style={{ width: '100%', height: block.height ?? 300, border: '1px solid var(--theme-border)', borderRadius: 8, background: 'var(--theme-surface)' }}
          sandbox="allow-scripts allow-same-origin"
        />
      )

    case 'shape': {
      const radius =
        block.shape === 'circle' ? '50%' :
        block.shape === 'pill'   ? 9999 :
        10
      const isCircle = block.shape === 'circle'
      return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            background: block.color,
            borderRadius: radius,
            width:  block.width  ?? (isCircle ? 120 : '100%'),
            height: block.height ?? (isCircle ? 120 : 'auto'),
            padding: isCircle ? 0 : '14px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: isCircle ? 120 : undefined,
            boxShadow: `0 2px 12px ${block.color}44`,
          }}>
            {block.label && (
              <span style={{ fontSize: 15, fontWeight: 700, color: textColorFor(block.color), fontFamily: 'Inter, sans-serif' }}>
                {block.label}
              </span>
            )}
          </div>
        </div>
      )
    }
  }
}

/** Pick white or dark text based on background luminance. */
function textColorFor(hex: string): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return '#ffffff'
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#1a1a1a' : '#ffffff'
}
