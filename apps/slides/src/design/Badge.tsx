import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'accent' | 'dim'
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-(--color-border) text-(--color-text-dim)',
        variant === 'accent' && 'bg-(--color-accent)/15 text-(--color-accent)',
        variant === 'dim' && 'bg-(--color-surface) text-(--color-text-dim) border border-(--color-border)',
        className,
      )}
    >
      {children}
    </span>
  )
}
