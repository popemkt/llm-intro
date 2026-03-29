import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export function Card({ children, className, onClick, hover }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-(--color-surface) border-(--color-border) p-4',
        hover && 'cursor-pointer transition-colors hover:border-(--color-accent)/40 hover:bg-(--color-surface)/80',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}
