import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Brain, Folder, Globe, Terminal, Database, Cog } from 'lucide-react'
import type { SlideProps } from '@/types'
import { T } from '@/design/tokens'

const COMPONENTS = [
  { id: 'llm',     icon: Brain,    label: 'LLM Core',       desc: 'Claude model — reads context, reasons, generates output' },
  { id: 'tool',    icon: Cog,      label: 'Tool Executor',  desc: 'Runs tools when LLM output contains a tool call' },
  { id: 'fs',      icon: Folder,   label: 'File System',    desc: 'Read/write local files — your working directory' },
  { id: 'browser', icon: Globe,    label: 'Browser',        desc: 'Open URLs, click buttons, fill forms, take screenshots' },
  { id: 'code',    icon: Terminal, label: 'Code Runner',    desc: 'Execute bash/Python/JS scripts directly on your machine' },
  { id: 'mem',     icon: Database, label: 'Memory',         desc: 'Persistent context: CLAUDE.md, memory files, conversation history' },
]

export default function ClaudeDesktop({ isActive }: SlideProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  return (
    <div
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: T.bg, padding: '24px 40px', boxSizing: 'border-box', gap: 20 }}
      onClick={() => setActiveTooltip(null)}
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ duration: 0.45 }}
        style={{ textAlign: 'center' }}
      >
        <span style={{ fontSize: 'clamp(1rem, 2.2vw, 1.4rem)', fontWeight: 800, color: T.text }}>
          Claude Desktop = LLM + Tools, <span style={{ color: T.accent }}>packaged</span>
        </span>
      </motion.div>

      {/* Package box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          border: `1.5px solid ${T.accent}`,
          borderRadius: 16,
          padding: '20px 24px',
          background: `${T.accentDim}10`,
          width: '100%',
          maxWidth: 560,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Package label */}
        <div style={{ position: 'absolute', top: -12, left: 20, background: T.bg, padding: '0 8px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: T.accent, fontWeight: 700 }}>
          claude desktop
        </div>

        {/* Component grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {COMPONENTS.map((comp, i) => {
            const Icon = comp.icon
            const isHovered = activeTooltip === comp.id
            return (
              <div key={comp.id} style={{ position: 'relative' }}>
                <motion.button
                  initial={{ opacity: 0, y: 16 }}
                  animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ scale: 1.04 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTooltip(isHovered ? null : comp.id)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 10px',
                    borderRadius: 10,
                    border: `1px solid ${isHovered ? T.accent : T.border}`,
                    background: isHovered ? `${T.accent}18` : T.surface,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <Icon size={18} color={isHovered ? T.accent : T.textDim} />
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: isHovered ? T.accent : T.text, fontFamily: 'Inter, sans-serif' }}>
                    {comp.label}
                  </span>
                </motion.button>

                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: 6,
                        background: T.surface,
                        border: `1px solid ${T.accent}`,
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 10,
                        color: T.text,
                        fontFamily: 'Inter, sans-serif',
                        width: 180,
                        textAlign: 'center',
                        zIndex: 20,
                        lineHeight: 1.5,
                        boxShadow: `0 4px 20px ${T.bg}`,
                      }}
                    >
                      {comp.desc}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Bottom note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={isActive ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.2, duration: 0.4 }}
        style={{ color: T.textDim, fontSize: 11, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}
      >
        click any component ↑ &nbsp;·&nbsp; same loop as slide 3, but wrapped in a nice UI
      </motion.p>
    </div>
  )
}
