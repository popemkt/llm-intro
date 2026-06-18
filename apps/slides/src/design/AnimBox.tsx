import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface AnimBoxProps {
  children: React.ReactNode
  className?: string
  delay?: number
  isActive?: boolean
  /** 'up' slides up from below (default), 'left' slides in from left, 'scale' scales in */
  from?: 'up' | 'left' | 'scale' | 'fade'
}

export function AnimBox({ children, className, delay = 0, isActive = true, from = 'up' }: AnimBoxProps) {
  const initial =
    from === 'up'    ? { opacity: 0, y: 24 } :
    from === 'left'  ? { opacity: 0, x: -24 } :
    from === 'scale' ? { opacity: 0, scale: 0.85 } :
                       { opacity: 0 }

  const animate =
    from === 'up'    ? { opacity: 1, y: 0 } :
    from === 'left'  ? { opacity: 1, x: 0 } :
    from === 'scale' ? { opacity: 1, scale: 1 } :
                       { opacity: 1 }

  const hidden =
    from === 'up'    ? { opacity: 0, y: 24 } :
    from === 'left'  ? { opacity: 0, x: -24 } :
    from === 'scale' ? { opacity: 0, scale: 0.85 } :
                       { opacity: 0 }

  return (
    <motion.div
      className={cn(className)}
      initial={initial}
      animate={isActive ? animate : hidden}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
