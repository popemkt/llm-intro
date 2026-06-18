import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Brain, FileText, MessageSquare, Wrench,
  Image as ImageIcon, RotateCcw,
} from 'lucide-react'
import type { SlideProps } from '@/types'
import { T } from '@/design/tokens'

/* ── Models ── */
const MODELS = [
  { name: 'Gemini 1.5 Pro', tokens: '2M',   max: 2_000_000, pct: 100, color: '#4285f4' },
  { name: 'Claude 3.5',     tokens: '200K',  max: 200_000,   pct: 32,  color: T.accent  },
  { name: 'GPT-4o',         tokens: '128K',  max: 128_000,   pct: 26,  color: '#74aa9c' },
  { name: 'Llama 3',        tokens: '128K',  max: 128_000,   pct: 26,  color: '#a855f7' },
]

/* ── Context layers with realistic token costs ── */
const LAYERS = [
  { id: 'system',   tokens: 2_000,  label: 'System Prompt'   },
  { id: 'messages', tokens: 55_000, label: 'Messages'        },
  { id: 'images',   tokens: 35_000, label: 'Images'          },
  { id: 'tools',    tokens: 40_000, label: 'Tools & Results' },
]

/* ── Tiny SVG image thumbnails ── */
function MiniLandscape() {
  return (
    <svg width={40} height={28} viewBox="0 0 40 28" style={{ borderRadius: 4, flexShrink: 0, display: 'block' }}>
      <rect width={40} height={28} fill="#0f1a2e" rx={2} />
      <circle cx={30} cy={8} r={4} fill="#fbbf24" opacity={0.85} />
      <polygon points="4,28 14,10 24,28" fill="#065f46" />
      <polygon points="16,28 26,6 36,28" fill="#059669" opacity={0.85} />
      <rect y={24} width={40} height={4} fill="#064e3b" rx={0} />
    </svg>
  )
}

function MiniScreenshot() {
  return (
    <svg width={40} height={28} viewBox="0 0 40 28" style={{ borderRadius: 4, flexShrink: 0, display: 'block' }}>
      <rect width={40} height={28} fill="#1a1a2e" rx={2} />
      {/* Title bar dots */}
      <circle cx={5} cy={4} r={1.5} fill="#ef4444" opacity={0.7} />
      <circle cx={10} cy={4} r={1.5} fill="#f59e0b" opacity={0.7} />
      <circle cx={15} cy={4} r={1.5} fill={T.accent} opacity={0.7} />
      {/* Code lines */}
      <rect x={4} y={9} width={16} height={2} rx={1} fill="#7c3aed" opacity={0.65} />
      <rect x={4} y={14} width={24} height={2} rx={1} fill={T.accent} opacity={0.5} />
      <rect x={4} y={19} width={12} height={2} rx={1} fill="#f59e0b" opacity={0.5} />
      <rect x={4} y={24} width={20} height={2} rx={1} fill={T.textDim} opacity={0.3} />
    </svg>
  )
}

function MiniChart() {
  return (
    <svg width={40} height={28} viewBox="0 0 40 28" style={{ borderRadius: 4, flexShrink: 0, display: 'block' }}>
      <rect width={40} height={28} fill="#141e26" rx={2} />
      <rect x={6}  y={16} width={6} height={9} rx={1} fill="#4285f4" opacity={0.75} />
      <rect x={15} y={9}  width={6} height={16} rx={1} fill={T.accent} opacity={0.75} />
      <rect x={24} y={12} width={6} height={13} rx={1} fill="#f59e0b" opacity={0.75} />
      <rect x={33} y={6}  width={4} height={19} rx={1} fill="#a855f7" opacity={0.75} />
      <line x1={4} y1={25} x2={38} y2={25} stroke={T.textDim} strokeWidth={0.5} opacity={0.5} />
    </svg>
  )
}

function MiniPhoto() {
  return (
    <svg width={40} height={28} viewBox="0 0 40 28" style={{ borderRadius: 4, flexShrink: 0, display: 'block' }}>
      <rect width={40} height={28} fill="#1c1917" rx={2} />
      {/* Simple face outline */}
      <circle cx={20} cy={12} r={7} fill="none" stroke="#a8a29e" strokeWidth={1} opacity={0.5} />
      <circle cx={17} cy={11} r={1} fill="#a8a29e" opacity={0.5} />
      <circle cx={23} cy={11} r={1} fill="#a8a29e" opacity={0.5} />
      <path d="M17 15 Q20 18 23 15" fill="none" stroke="#a8a29e" strokeWidth={0.8} opacity={0.4} />
      {/* Body hint */}
      <ellipse cx={20} cy={26} rx={10} ry={5} fill="#a8a29e" opacity={0.15} />
    </svg>
  )
}

/* ── Main ── */
export default function Context({ isActive }: SlideProps) {
  const [shown, setShown] = useState(0)
  const [selModel, setSelModel] = useState(3) // Llama 3 default — small 128K ceiling so the demo can overflow

  useEffect(() => {
    if (!isActive) { setShown(0); setSelModel(1) }
  }, [isActive])

  const addLayer = () => setShown(s => Math.min(s + 1, LAYERS.length))
  const reset    = () => setShown(0)

  const totalTokens = LAYERS.slice(0, shown).reduce((s, l) => s + l.tokens, 0)
  const model       = MODELS[selModel]
  const pct         = (totalTokens / model.max) * 100
  const overflowing = pct > 100

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: T.bg, padding: '20px 32px', boxSizing: 'border-box',
    }}>
      {/* ── Title ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 10 }}
      >
        <span style={{ fontSize: 'clamp(1rem, 2.2vw, 1.4rem)', fontWeight: 800, color: T.text }}>
          Context = what the <span style={{ color: T.accent }}>model sees</span>
        </span>
      </motion.div>

      {/* ── Two-column layout ── */}
      <div style={{ flex: 1, display: 'flex', gap: 16, alignItems: 'center', overflow: 'hidden' }}>

        {/* ════ Left: Brain + Models ════ */}
        <div style={{
          flex: '0 0 32%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 12,
        }}>
          {/* Brain circle */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              border: `2px solid ${T.accent}`,
              background: `${T.accent}12`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 30px ${T.accent}18`,
            }}
          >
            <Brain size={32} color={T.accent} />
          </motion.div>

          <motion.span
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: 'Inter, sans-serif' }}
          >
            LLM
          </motion.span>

          {/* Models — clickable */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            <span style={{
              fontSize: 8, color: T.textDim, fontFamily: 'Inter, sans-serif',
              fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              textAlign: 'center', marginBottom: 1,
            }}>
              click a model
            </span>

            {MODELS.map((m, i) => {
              const active = i === selModel
              return (
                <motion.div
                  key={m.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                  transition={{ delay: 0.55 + i * 0.08, duration: 0.3 }}
                  onClick={(e) => { e.stopPropagation(); setSelModel(i) }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    cursor: 'pointer', borderRadius: 5, padding: '3px 5px',
                    background: active ? `${m.color}14` : 'transparent',
                    border: `1px solid ${active ? `${m.color}60` : 'transparent'}`,
                    transition: 'background .2s, border-color .2s',
                  }}
                >
                  <span style={{
                    fontSize: 8.5, fontWeight: 500,
                    color: active ? m.color : T.textDim,
                    fontFamily: 'Inter, sans-serif', width: 76,
                    textAlign: 'right', flexShrink: 0, transition: 'color .2s',
                  }}>
                    {m.name}
                  </span>
                  <div style={{
                    flex: 1, height: 8, borderRadius: 3,
                    background: T.surface, overflow: 'hidden',
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isActive ? { width: `${m.pct}%` } : { width: 0 }}
                      transition={{ delay: 0.7 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                      style={{
                        height: '100%', borderRadius: 3, background: m.color,
                        opacity: active ? 0.9 : 0.4, transition: 'opacity .2s',
                      }}
                    />
                  </div>
                  <span style={{
                    fontSize: 8.5, fontWeight: 600,
                    color: active ? m.color : T.textDim,
                    fontFamily: 'JetBrains Mono, monospace',
                    width: 28, flexShrink: 0, transition: 'color .2s',
                  }}>
                    {m.tokens}
                  </span>
                </motion.div>
              )
            })}

            <motion.span
              initial={{ opacity: 0 }}
              animate={isActive ? { opacity: 0.55 } : { opacity: 0 }}
              transition={{ delay: 1.1, duration: 0.4 }}
              style={{
                fontSize: 7.5, color: T.textDim, fontFamily: 'Inter, sans-serif',
                textAlign: 'center', marginTop: 3,
              }}
            >
              1 token ≈ ¾ word &nbsp;·&nbsp; 200K tokens ≈ a novel
            </motion.span>
          </motion.div>
        </div>

        {/* ════ Arrow ════ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isActive ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 2, flexShrink: 0,
          }}
        >
          <motion.span
            animate={{ x: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            style={{ fontSize: 18, color: T.accent, lineHeight: 1 }}
          >
            →
          </motion.span>
          <span style={{
            fontSize: 7, color: T.textDim, fontWeight: 600,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            reads
          </span>
        </motion.div>

        {/* ════ Right: Context Window ════ */}
        <div
          onClick={shown < LAYERS.length ? addLayer : undefined}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            cursor: shown < LAYERS.length ? 'pointer' : 'default',
            userSelect: 'none',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              border: `1.5px solid ${overflowing ? '#ef444460' : T.border}`,
              borderRadius: 14,
              padding: '16px 14px 12px',
              position: 'relative',
              display: 'flex', flexDirection: 'column', gap: 6,
              transition: 'border-color .4s',
            }}
          >
            {/* Container label */}
            <div style={{
              position: 'absolute', top: -10, left: 16,
              background: T.bg, padding: '0 8px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                color: T.textDim, fontWeight: 600,
              }}>
                context window
              </span>
              {shown > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 0.6, scale: 1 }}
                  whileHover={{ opacity: 1, scale: 1.1 }}
                  onClick={(e) => { e.stopPropagation(); reset() }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, display: 'flex', alignItems: 'center',
                  }}
                >
                  <RotateCcw size={10} color={T.textDim} />
                </motion.button>
              )}
            </div>

            {/* ── Layer 1: System Prompt ── */}
            <AnimatePresence>
              {shown >= 1 && (
                <motion.div
                  key="system"
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  style={{
                    padding: '7px 10px', borderRadius: 8,
                    border: `1px solid ${T.accent}35`,
                    background: `${T.accent}08`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <FileText size={11} color={T.accent} />
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: T.accent, fontFamily: 'Inter, sans-serif' }}>
                      System Prompt
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 7.5, color: T.textDim, fontFamily: 'JetBrains Mono, monospace' }}>
                      ~2K tokens
                    </span>
                  </div>
                  <div style={{
                    fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                    color: T.textDim, lineHeight: 1.5,
                    padding: '3px 7px', borderRadius: 4, background: `${T.bg}90`,
                  }}>
                    "You are a helpful coding assistant.<br />
                    &nbsp;Be concise. Use markdown."
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Layer 2: Messages ── */}
            <AnimatePresence>
              {shown >= 2 && (
                <motion.div
                  key="messages"
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  style={{
                    padding: '7px 10px', borderRadius: 8,
                    border: `1px solid ${T.border}`, background: T.surface,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <MessageSquare size={11} color={T.textDim} />
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: T.text, fontFamily: 'Inter, sans-serif' }}>
                      Messages
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 7.5, color: T.textDim, fontFamily: 'JetBrains Mono, monospace' }}>
                      ~55K tokens
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{
                      alignSelf: 'flex-end',
                      background: `${T.accent}18`, border: `1px solid ${T.accent}30`,
                      borderRadius: '7px 7px 3px 7px',
                      padding: '3px 8px', fontSize: 8.5, color: T.text,
                      fontFamily: 'Inter, sans-serif', maxWidth: '70%',
                    }}>
                      Fix the login bug on mobile
                    </div>
                    <div style={{
                      alignSelf: 'flex-start',
                      background: T.bg, border: `1px solid ${T.border}`,
                      borderRadius: '7px 7px 7px 3px',
                      padding: '3px 8px', fontSize: 8.5, color: T.textDim,
                      fontFamily: 'Inter, sans-serif', maxWidth: '70%',
                    }}>
                      I'll read the auth module first...
                    </div>
                    <span style={{
                      fontSize: 7.5, color: T.muted, fontFamily: 'Inter, sans-serif',
                      textAlign: 'center',
                    }}>
                      ... 200+ messages in this session
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Layer 3: Images ── */}
            <AnimatePresence>
              {shown >= 3 && (
                <motion.div
                  key="images"
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  style={{
                    padding: '7px 10px', borderRadius: 8,
                    border: '1px solid rgba(245,158,11,0.22)',
                    background: 'rgba(245,158,11,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <ImageIcon size={11} color="#f59e0b" />
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: '#f59e0b', fontFamily: 'Inter, sans-serif' }}>
                      Images
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 7.5, color: T.textDim, fontFamily: 'JetBrains Mono, monospace' }}>
                      ~35K tokens
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {/* Thumbnails */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 16 }}
                    >
                      <MiniScreenshot />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 16 }}
                    >
                      <MiniLandscape />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 16 }}
                    >
                      <MiniChart />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 16 }}
                    >
                      <MiniPhoto />
                    </motion.div>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                      style={{
                        fontSize: 7.5, color: '#f59e0b', fontFamily: 'Inter, sans-serif',
                        marginLeft: 2, opacity: 0.7,
                      }}
                    >
                      images use<br />lots of tokens!
                    </motion.span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Layer 4: Tools ── */}
            <AnimatePresence>
              {shown >= 4 && (
                <motion.div
                  key="tools"
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  style={{
                    padding: '7px 10px', borderRadius: 8,
                    border: `1px solid ${T.highlight}24`,
                    background: `${T.highlight}05`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <Wrench size={11} color={T.highlight} />
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: T.highlight, fontFamily: 'Inter, sans-serif' }}>
                      Tools & Results
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 7.5, color: T.textDim, fontFamily: 'JetBrains Mono, monospace' }}>
                      ~40K tokens
                    </span>
                  </div>
                  <div style={{
                    fontSize: 8.5, fontFamily: 'JetBrains Mono, monospace',
                    color: T.textDim, display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 7px', borderRadius: 4, background: `${T.bg}90`,
                  }}>
                    <span>read_file("auth.ts")</span>
                    <span style={{ color: T.muted }}>→</span>
                    <span style={{ color: T.highlight }}>1 247 lines</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Click prompt ── */}
            <AnimatePresence mode="wait">
              {shown < LAYERS.length && (
                <motion.div
                  key={`prompt-${shown}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: shown === 0 ? 0.7 : 0.15 }}
                  style={{
                    flex: 1, minHeight: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8, border: `1px dashed ${T.border}`,
                  }}
                >
                  <motion.span
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    style={{ fontSize: 9.5, color: T.textDim, fontFamily: 'Inter, sans-serif' }}
                  >
                    click to add&nbsp;
                    <span style={{
                      fontWeight: 600,
                      color: shown === 0 ? T.accent
                           : shown === 2 ? '#f59e0b'
                           : shown === 3 ? T.highlight
                           : T.text,
                    }}>
                      {LAYERS[shown].label}
                    </span>
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Summary insight — after all layers shown ── */}
            <AnimatePresence>
              {shown >= LAYERS.length && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  style={{
                    textAlign: 'center', fontSize: 8.5, color: T.textDim,
                    fontFamily: 'Inter, sans-serif', lineHeight: 1.5,
                    padding: '4px 8px', borderRadius: 6,
                    background: `${T.accent}06`,
                  }}
                >
                  The entire context is re-read <strong style={{ color: T.accent }}>every time</strong> the model responds.
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Token bar ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginTop: 'auto', paddingTop: 4,
            }}>
              <span style={{
                fontSize: 7.5, color: T.textDim,
                fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
              }}>
                tokens
              </span>
              <div style={{
                flex: 1, height: 6, borderRadius: 3,
                background: T.surface, overflow: 'hidden',
                border: `1px solid ${overflowing ? '#ef444450' : T.border}`,
                transition: 'border-color .4s',
              }}>
                <motion.div
                  animate={{ width: `${Math.min(pct, 100)}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                  style={{
                    height: '100%', borderRadius: 2,
                    background: overflowing
                      ? '#ef4444'
                      : `linear-gradient(90deg, ${model.color}, ${T.highlight})`,
                    transition: 'background .4s',
                  }}
                />
              </div>
              <motion.span
                key={`${shown}-${selModel}`}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{
                  fontSize: 7.5, fontWeight: 600,
                  color: overflowing ? '#ef4444' : model.color,
                  fontFamily: 'JetBrains Mono, monospace',
                  flexShrink: 0, minWidth: 70, textAlign: 'right',
                  transition: 'color .3s',
                }}
              >
                {totalTokens > 0
                  ? `${(totalTokens / 1000).toFixed(0)}K / ${model.tokens}`
                  : `0 / ${model.tokens}`}
              </motion.span>
            </div>

            {/* Overflow warning */}
            <AnimatePresence>
              {overflowing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    fontSize: 8.5, color: '#ef4444', fontFamily: 'Inter, sans-serif',
                    textAlign: 'center', fontWeight: 600,
                    padding: '4px 0',
                  }}
                >
                  Context exceeds {model.tokens} — try a bigger model ↑
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
