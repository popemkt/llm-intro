import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MessageSquare, Wrench, Plug, Brain } from 'lucide-react'
import type { SlideProps } from '@/types'
import { T } from '@/design/tokens'

const CARDS = [
  {
    id: 'prompts',
    icon: MessageSquare,
    title: 'Prompts',
    subtitle: 'CLAUDE.md',
    desc: 'Persistent instructions for every session',
    snippet: `# CLAUDE.md
Always respond in English.
Our stack is React + TypeScript.
Files live in ~/uploads/.`,
  },
  {
    id: 'skills',
    icon: Wrench,
    title: 'Skills',
    subtitle: 'commands/*.md',
    desc: 'Slash commands for multi-step workflows',
    snippet: `# upload.md
Upload files to the site.
1. Open browser at $URL
2. Find the upload input
3. Select file from ~/uploads/
4. Click Submit, screenshot result`,
  },
  {
    id: 'plugins',
    icon: Plug,
    title: 'Plugins',
    subtitle: '.mcp.json (MCP)',
    desc: 'External tools via Model Context Protocol',
    snippet: `{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp"]
    }
  }
}`,
  },
  {
    id: 'memory',
    icon: Brain,
    title: 'Memories',
    subtitle: '~/.claude/memory/',
    desc: 'Context that persists across sessions',
    snippet: `---
type: project
---
Deployment URL: https://files.acme.com
Credentials stored in ~/.env
Last upload: 2026-03-28`,
  },
]

export default function WorkspaceConcepts({ isActive }: SlideProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, padding: '20px 32px', boxSizing: 'border-box' }}>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 16, textAlign: 'center' }}
      >
        <span style={{ fontSize: 'clamp(1rem, 2.2vw, 1.4rem)', fontWeight: 800, color: T.text }}>
          What goes in the workspace
        </span>
      </motion.div>

      {/* 2×2 grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, overflow: 'hidden' }}>
        {CARDS.map((card, i) => {
          const Icon = card.icon
          const isHov = hovered === card.id
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.15 + i * 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.02 }}
              onMouseEnter={() => setHovered(card.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                borderRadius: 12,
                border: `1.5px solid ${isHov ? T.accent : T.border}`,
                background: isHov ? `${T.accent}0d` : T.surface,
                padding: '14px 16px',
                cursor: 'default',
                transition: 'border-color 0.2s, background 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: isHov ? `${T.accent}25` : `${T.muted}40`,
                  border: `1px solid ${isHov ? T.accent : T.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={15} color={isHov ? T.accent : T.textDim} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isHov ? T.accent : T.text, fontFamily: 'Inter, sans-serif' }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: 9.5, color: T.textDim, fontFamily: 'JetBrains Mono, monospace' }}>
                    {card.subtitle}
                  </div>
                </div>
              </div>

              {/* Description */}
              <AnimatePresence mode="wait">
                {!isHov ? (
                  <motion.p key="desc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    style={{ margin: 0, fontSize: 11, color: T.textDim, fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
                    {card.desc}
                  </motion.p>
                ) : (
                  <motion.pre key="snippet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    style={{
                      margin: 0, padding: '8px 10px',
                      borderRadius: 7,
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      fontSize: 9.5,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: T.text,
                      lineHeight: 1.55,
                      overflow: 'hidden',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {card.snippet}
                  </motion.pre>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Bottom note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={isActive ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        style={{ color: T.accent, fontSize: 11, textAlign: 'center', fontFamily: 'Inter, sans-serif', marginTop: 10, fontWeight: 600 }}
      >
        For your use case → start with a Skill
      </motion.p>
    </div>
  )
}
