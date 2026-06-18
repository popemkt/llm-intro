import { motion } from 'motion/react'
import { Folder, FileText, Settings2, FolderOpen } from 'lucide-react'
import type { SlideProps } from '@/types'
import { T } from '@/design/tokens'

interface TreeItem {
  depth: number
  type: 'dir' | 'file'
  name: string
  desc: string
  highlight?: boolean
  icon: React.ComponentType<{ size?: number; color?: string }>
}

const TREE: TreeItem[] = [
  { depth: 0, type: 'dir',  name: '~/.claude/',        desc: 'your Claude workspace',         icon: FolderOpen },
  { depth: 1, type: 'file', name: 'CLAUDE.md',          desc: 'project instructions & context', icon: FileText, highlight: false },
  { depth: 1, type: 'file', name: 'settings.json',      desc: 'permissions, hooks, env vars',  icon: Settings2 },
  { depth: 1, type: 'dir',  name: 'commands/',          desc: 'your skills live here',         icon: Folder },
  { depth: 2, type: 'file', name: 'upload.md',          desc: '/upload — pick up & upload files', icon: FileText, highlight: true },
  { depth: 2, type: 'file', name: 'review.md',          desc: '/review — review code',         icon: FileText },
  { depth: 1, type: 'file', name: '.mcp.json',          desc: 'MCP plugin registry',           icon: FileText },
]

export default function WorkspaceSetup({ isActive }: SlideProps) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, padding: '24px 40px', boxSizing: 'border-box' }}>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 20 }}
      >
        <span style={{ fontSize: 'clamp(1rem, 2.2vw, 1.4rem)', fontWeight: 800, color: T.text }}>
          Set up your <span style={{ color: T.accent }}>~/.claude/</span> workspace
        </span>
      </motion.div>

      {/* Tree */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 580 }}>
          {TREE.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -24 }}
                animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -24 }}
                transition={{ delay: i * 0.18, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingLeft: item.depth * 28,
                }}
              >
                {/* Tree connector */}
                {item.depth > 0 && (
                  <span style={{ color: T.muted, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, marginLeft: -14, marginRight: -4 }}>
                    {item.depth === 1 ? '├─' : '│  '}
                  </span>
                )}

                {/* Icon */}
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  border: `1px solid ${item.highlight ? T.accent : item.type === 'dir' ? T.accentDim : T.border}`,
                  background: item.highlight ? `${T.accent}20` : item.type === 'dir' ? `${T.accentDim}18` : T.surface,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={13} color={item.highlight ? T.accent : item.type === 'dir' ? T.accentDim : T.textDim} />
                </div>

                {/* Name */}
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  fontWeight: item.highlight || item.depth === 0 ? 700 : 500,
                  color: item.highlight ? T.accent : item.depth === 0 ? T.highlight : T.text,
                }}>
                  {item.name}
                </span>

                {/* Description badge */}
                <span style={{
                  fontSize: 9.5,
                  color: T.textDim,
                  fontFamily: 'Inter, sans-serif',
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 4,
                  padding: '1px 7px',
                  marginLeft: 4,
                  whiteSpace: 'nowrap',
                }}>
                  {item.desc}
                </span>

                {/* Highlight pulse for upload.md */}
                {item.highlight && (
                  <motion.span
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    style={{ fontSize: 9, color: T.accent, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
                  >
                    ← your skill
                  </motion.span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={isActive ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: TREE.length * 0.18 + 0.3, duration: 0.4 }}
        style={{ color: T.textDim, fontSize: 11, textAlign: 'center', fontFamily: 'Inter, sans-serif', marginTop: 8 }}
      >
        Everything Claude knows about working with you lives in this folder
      </motion.p>
    </div>
  )
}
