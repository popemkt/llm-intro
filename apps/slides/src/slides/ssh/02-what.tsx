import { motion } from "motion/react";
import { Laptop, Server, Lock } from "lucide-react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";
import { Frame } from "./_frame";
import { AnimBox } from "@/design/AnimBox";

const POINTS = [
  ["Protocol", "operate a remote machine over an encrypted channel"],
  ["Port 22 / TCP", "the sshd daemon listens; your ssh client dials in"],
  ["Client–server", "every keystroke and byte of output is encrypted"],
  ["Replaced Telnet", "which sent your password in plaintext"],
];

export default function SshWhat({ isActive }: SlideProps) {
  return (
    <Frame isActive={isActive} eyebrow="Basics" title="What is SSH?">
      <div style={{ display: "flex", gap: 48, height: "100%", alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {POINTS.map(([head, body], i) => (
            <AnimBox key={head} isActive={isActive} delay={0.15 + i * 0.1} from="left">
              <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                <span style={{ color: T.accent, fontSize: 18, fontWeight: 800 }}>›</span>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 18 }}>{head}</span>
                  <span style={{ color: T.textDim, fontSize: 17 }}> — {body}</span>
                </div>
              </div>
            </AnimBox>
          ))}
        </div>

        <div style={{ width: 380, flexShrink: 0 }}>
          <svg viewBox="0 0 380 200" width="100%">
            {/* encrypted channel */}
            <motion.line
              x1={92}
              y1={100}
              x2={288}
              y2={100}
              stroke={T.accent}
              strokeWidth={3}
              strokeDasharray="6 6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={isActive ? { pathLength: 1, opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            />
            {[
              { x: 40, Icon: Laptop, label: "ssh client" },
              { x: 300, Icon: Server, label: "sshd" },
            ].map(({ x, Icon, label }, i) => (
              <motion.g
                key={label}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.15 }}
                style={{ transformOrigin: `${x + 20}px 100px` }}
              >
                <rect
                  x={x}
                  y={70}
                  width={40}
                  height={60}
                  rx={8}
                  fill={T.surface}
                  stroke={T.border}
                />
                <foreignObject x={x + 8} y={82} width={24} height={24}>
                  <Icon size={24} color={T.accent} />
                </foreignObject>
                <text
                  x={x + 20}
                  y={150}
                  textAnchor="middle"
                  fill={T.textDim}
                  fontSize={12}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {label}
                </text>
              </motion.g>
            ))}
            <motion.g
              initial={{ opacity: 0, y: 8 }}
              animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.9 }}
            >
              <rect x={170} y={78} width={40} height={26} rx={13} fill={T.bg} stroke={T.accent} />
              <foreignObject x={182} y={82} width={18} height={18}>
                <Lock size={18} color={T.highlight} />
              </foreignObject>
              <text
                x={190}
                y={64}
                textAnchor="middle"
                fill={T.accent}
                fontSize={12}
                fontFamily="JetBrains Mono, monospace"
              >
                :22 encrypted
              </text>
            </motion.g>
          </svg>
        </div>
      </div>
    </Frame>
  );
}
