import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { C } from '@/design/tokens'

export interface BreadcrumbSegment {
  label: string
  to?: string
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[]
}

export function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" data-testid="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 0 }}>
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1
        const isHome = i === 0

        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 0 }}>
            {i > 0 && (
              <ChevronRight
                size={12}
                style={{ color: C.muted, flexShrink: 0, margin: '0 6px' }}
                aria-hidden
              />
            )}
            {seg.to && !isLast ? (
              <Link
                to={seg.to}
                data-testid={`breadcrumb-link-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: C.textDim,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  borderRadius: 4,
                  padding: '2px 4px',
                  margin: '-2px -4px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-dim)')}
              >
                {isHome && <Home size={12} aria-hidden />}
                {seg.label}
              </Link>
            ) : (
              <span
                data-testid={`breadcrumb-current-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                }}
              >
                {isHome && <Home size={12} aria-hidden />}
                {seg.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
