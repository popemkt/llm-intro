import { motion } from 'motion/react'
import type { SlideProps } from '@/types'

// Authored for the 1000 × 562.5 canvas provided by SlideShell.
// All sizes are logical px; no vw/vh/rem.

export default function Opener({ isActive }: SlideProps) {
  const words = ['What', 'is', 'an', 'LLM?']

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#0a0c0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Gradient-mesh background: three large blurred blobs + subtle grain */}
      <motion.div
        aria-hidden
        animate={isActive ? { x: [0, 30, 0], y: [0, -20, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 620,
          height: 620,
          left: -160,
          top: -140,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #25d36688 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />
      <motion.div
        aria-hidden
        animate={isActive ? { x: [0, -40, 0], y: [0, 25, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 720,
          height: 720,
          right: -220,
          bottom: -220,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 50%, #00ffa344 0%, transparent 65%)',
          filter: 'blur(80px)',
        }}
      />
      <motion.div
        aria-hidden
        animate={isActive ? { opacity: [0.4, 0.7, 0.4] } : { opacity: 0.3 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 420,
          height: 420,
          left: '55%',
          top: '30%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 50%, #1a944855 0%, transparent 55%)',
          filter: 'blur(70px)',
        }}
      />

      {/* Thin grid overlay — subtle structure */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(to right, #ffffff08 1px, transparent 1px),' +
            'linear-gradient(to bottom, #ffffff08 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 80%)',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 80px' }}>
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px',
            borderRadius: 999,
            border: '1px solid #25d36633',
            background: '#25d36610',
            color: '#25d366',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 36,
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#25d366' }} />
          Session 01
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
          initial="hidden"
          animate={isActive ? 'show' : 'hidden'}
          style={{
            display: 'flex',
            gap: 28,
            justifyContent: 'center',
            margin: 0,
            fontSize: 96,
            fontWeight: 900,
            letterSpacing: '-0.035em',
            lineHeight: 1,
          }}
        >
          {words.map((word) => (
            <motion.span
              key={word}
              variants={{
                hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
                show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
              }}
              style={{
                color: word === 'LLM?' ? '#25d366' : '#e8f0eb',
                display: 'inline-block',
              }}
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.5, delay: 0.7, ease: 'easeOut' }}
          style={{
            marginTop: 32,
            color: '#7a9985',
            fontSize: 18,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          Let's build some intuition
        </motion.p>
      </div>

      {/* Bottom-left corner sigil */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 48,
          bottom: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          color: '#3a4d42',
          letterSpacing: '0.12em',
        }}
      >
        <span style={{ width: 24, height: 1, background: '#25d36655' }} />
        llm · intro
      </div>

      {/* Bottom-right corner counter */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: 48,
          bottom: 36,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          color: '#3a4d42',
          letterSpacing: '0.12em',
        }}
      >
        01 / 10
      </div>
    </div>
  )
}
