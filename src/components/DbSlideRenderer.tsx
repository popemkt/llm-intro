import ReactMarkdown from 'react-markdown'
import type { Block, ThemeName } from '@/types'

interface Props {
  blocks: Block[]
  theme: ThemeName
}

export function DbSlideRenderer({ blocks, theme }: Props) {
  // Canvas mode: any block has percentage-based x/y positioning
  const isCanvas = blocks.some(b => b.x !== undefined)

  return (
    <div
      data-theme={theme}
      style={{
        width: '100%', height: '100%',
        background: 'var(--theme-bg)',
        color: 'var(--theme-text)',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        ...(isCanvas ? {} : {
          padding: '32px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }),
      }}
    >
      {blocks.length === 0 && (
        <div style={{
          ...(isCanvas
            ? { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }
            : { margin: 'auto' }),
          opacity: 0.25, fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
        }}>
          empty slide
        </div>
      )}

      {isCanvas
        ? blocks.map(block => (
          <div key={block.id} style={{
            position: 'absolute',
            left: `${block.x}%`, top: `${block.y}%`,
            width: `${block.w}%`, height: `${block.h}%`,
            overflow: 'hidden',
          }}>
            <BlockView block={block} canvas />
          </div>
        ))
        : blocks.map(block => <BlockView key={block.id} block={block} />)
      }
    </div>
  )
}

function BlockView({ block, canvas }: { block: Block; canvas?: boolean }) {
  switch (block.type) {
    case 'text':
      return (
        <div
          style={{
            fontSize: 'clamp(0.85rem, 1.5vw, 1.05rem)', lineHeight: 1.7,
            color: 'var(--theme-text)',
            ...(canvas ? { width: '100%', height: '100%', padding: '6px 10px', overflow: 'auto', boxSizing: 'border-box' } : {}),
          }}
          className="prose-block"
        >
          <ReactMarkdown>{block.markdown}</ReactMarkdown>
        </div>
      )

    case 'image':
      return (
        <div style={{ display: 'flex', justifyContent: 'center', ...(canvas ? { width: '100%', height: '100%' } : {}) }}>
          <img
            src={block.url}
            alt={block.alt ?? ''}
            style={canvas
              ? { width: '100%', height: '100%', objectFit: 'contain' }
              : { maxWidth: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 8 }
            }
          />
        </div>
      )

    case 'iframe':
      return (
        <iframe
          src={block.url}
          title="embedded"
          style={{
            width: '100%',
            height: canvas ? '100%' : (block.height ?? 300),
            border: '1px solid var(--theme-border)',
            borderRadius: 8,
            background: 'var(--theme-surface)',
            display: 'block',
          }}
          sandbox="allow-scripts allow-same-origin"
        />
      )

    case 'shape': {
      const radius =
        block.shape === 'circle' ? '50%' :
        block.shape === 'pill'   ? 9999  : 10
      const isCircle = block.shape === 'circle'
      return (
        <div style={{ display: 'flex', justifyContent: 'center', ...(canvas ? { width: '100%', height: '100%', alignItems: 'center' } : {}) }}>
          <div style={{
            background: block.color,
            borderRadius: radius,
            width:  block.width  ?? (isCircle ? 120 : '100%'),
            height: block.height ?? (isCircle ? 120 : (canvas ? '100%' : 'auto')),
            padding: (isCircle || canvas) ? 0 : '14px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: (isCircle && !canvas) ? 120 : undefined,
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

function textColorFor(hex: string): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return '#ffffff'
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1a1a1a' : '#ffffff'
}
