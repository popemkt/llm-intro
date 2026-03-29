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
        width: '100%',
        height: '100%',
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
        <div style={{ margin: 'auto', opacity: 0.3, fontSize: 14 }}>Empty slide</div>
      )}
      {blocks.map(block => (
        <BlockView key={block.id} block={block} />
      ))}
    </div>
  )
}

function BlockView({ block }: { block: Block }) {
  if (block.type === 'text') {
    return (
      <div
        className="prose-block"
        style={{
          fontSize: 'clamp(0.85rem, 1.5vw, 1.05rem)',
          lineHeight: 1.7,
          color: 'var(--theme-text)',
        }}
      >
        <ReactMarkdown>{block.markdown}</ReactMarkdown>
      </div>
    )
  }

  if (block.type === 'image') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <img
          src={block.url}
          alt={block.alt ?? ''}
          style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 8 }}
        />
      </div>
    )
  }

  if (block.type === 'iframe') {
    return (
      <iframe
        src={block.url}
        title="embedded"
        style={{
          width: '100%',
          height: block.height ?? 300,
          border: '1px solid var(--theme-border)',
          borderRadius: 8,
          background: 'var(--theme-surface)',
        }}
        sandbox="allow-scripts allow-same-origin"
      />
    )
  }

  return null
}
