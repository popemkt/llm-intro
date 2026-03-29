import { cn } from '@/lib/utils'

interface SlideShellProps {
  children: React.ReactNode
  className?: string
}

/**
 * A 16:9 wrapper that fills its parent container.
 * Slides are authored to fill this shell completely.
 */
export function SlideShell({ children, className }: SlideShellProps) {
  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden bg-(--color-bg)',
        className,
      )}
    >
      {children}
    </div>
  )
}
