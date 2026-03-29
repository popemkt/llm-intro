import { useMemo } from 'react'
import { motion } from 'motion/react'
import type { SlideProps } from '@/types'

const PARTICLE_COUNT = 18

interface Particle {
  cx: number
  cy: number
  r: number
  color: string
  dur: number
  dy: number
}

const COLORS = ['#25d366', '#00ffa3', '#1a9448', '#3a4d42', '#7a9985']

export default function Opener({ isActive }: SlideProps) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      cx: 5 + ((i * 53) % 90),
      cy: 5 + ((i * 37) % 90),
      r: 1.5 + ((i * 17) % 4),
      color: COLORS[i % COLORS.length],
      dur: 4 + ((i * 1.3) % 6),
      dy: 3 + ((i * 2.1) % 8),
    }))
  }, [])

  const words = ['What', 'is', 'an', 'LLM?']

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden"
         style={{ background: 'var(--color-bg)' }}>

      {/* Animated conic-gradient orb */}
      <motion.div
        animate={isActive ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: '140%',
          height: '140%',
          background: 'conic-gradient(from 0deg at 50% 50%, #25d366 0%, #0d0f0e 25%, #00ffa3 50%, #0d0f0e 75%, #25d366 100%)',
          filter: 'blur(80px)',
          opacity: 0.18,
          top: '-20%',
          left: '-20%',
        }}
      />

      {/* Floating particles */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6 }}
      >
        {particles.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill={p.color}
            animate={isActive ? {
              cy: [p.cy, p.cy - p.dy, p.cy],
              opacity: [0.3, 0.8, 0.3],
            } : { cy: p.cy, opacity: 0.3 }}
            transition={{
              duration: p.dur,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.22,
            }}
          />
        ))}
      </svg>

      {/* Main text */}
      <div className="relative z-10 text-center px-12">
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          initial="hidden"
          animate={isActive ? 'show' : 'hidden'}
          style={{ display: 'flex', gap: '0.35em', justifyContent: 'center', flexWrap: 'wrap' }}
        >
          {words.map((word) => (
            <motion.span
              key={word}
              variants={{
                hidden: { opacity: 0, y: 32 },
                show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
              }}
              style={{
                fontSize: 'clamp(3rem, 8vw, 6rem)',
                fontWeight: 900,
                color: word === 'LLM?' ? 'var(--color-accent)' : 'var(--color-text)',
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
              }}
            >
              {word}
            </motion.span>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }}
          style={{
            marginTop: '2rem',
            color: 'var(--color-text-dim)',
            fontSize: 'clamp(0.9rem, 2vw, 1.25rem)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          Let's build some intuition
        </motion.p>

        <motion.div
          animate={isActive ? { y: [0, 8, 0], opacity: [0.4, 0.9, 0.4] } : { opacity: 0 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          style={{ marginTop: '3rem', color: 'var(--color-accent)', fontSize: '1.5rem' }}
        >
          ↓
        </motion.div>
      </div>
    </div>
  )
}
