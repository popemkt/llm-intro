import { motion } from "motion/react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";
import { Frame } from "./_frame";
import { FlowNode } from "@/design/FlowNode";
import { FlowArrow, ArrowDefs } from "@/design/FlowArrow";

const PHASES = [
  ["1. Key exchange", "agree on a shared secret (Diffie–Hellman)"],
  ["2. Server auth", "server proves identity with its host key"],
  ["3. Client auth", "you prove identity with a key or password"],
];

export default function SshFlow({ isActive }: SlideProps) {
  return (
    <Frame isActive={isActive} eyebrow="The Handshake" title="The connection, top to bottom">
      <svg viewBox="0 0 880 360" width="100%" height="100%" style={{ display: "block" }}>
        <ArrowDefs />
        {/* endpoints */}
        <FlowNode
          x={40}
          y={20}
          w={200}
          h={56}
          label="Your laptop"
          sublabel="ssh client"
          isActive={isActive}
          accent
        />
        <FlowNode
          x={640}
          y={20}
          w={200}
          h={56}
          label="Server"
          sublabel="sshd"
          isActive={isActive}
          accent
        />
        <FlowArrow d="M 240 48 L 636 48" isActive={isActive} delay={0.3} hot />
        <motion.text
          x={440}
          y={36}
          textAnchor="middle"
          fill={T.accent}
          fontSize={13}
          fontFamily="JetBrains Mono, monospace"
          initial={{ opacity: 0 }}
          animate={isActive ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.5 }}
        >
          TCP connect → port 22
        </motion.text>

        {/* phase bars */}
        {PHASES.map(([label, sub], i) => {
          const y = 110 + i * 70;
          return (
            <g key={label}>
              <FlowArrow
                d={`M 440 ${i === 0 ? 76 : y - 14} L 440 ${y}`}
                isActive={isActive}
                delay={0.6 + i * 0.35}
              />
              <motion.g
                initial={{ opacity: 0, y: 12 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.75 + i * 0.35 }}
              >
                <rect
                  x={120}
                  y={y}
                  width={640}
                  height={50}
                  rx={10}
                  fill={T.surface}
                  stroke={T.border}
                />
                <text
                  x={150}
                  y={y + 22}
                  fill={T.highlight}
                  fontSize={17}
                  fontWeight={700}
                  fontFamily="Inter, sans-serif"
                >
                  {label}
                </text>
                <text
                  x={150}
                  y={y + 40}
                  fill={T.textDim}
                  fontSize={13}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {sub}
                </text>
              </motion.g>
            </g>
          );
        })}

        <FlowArrow d="M 440 320 L 440 338" isActive={isActive} delay={1.7} hot />
        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: 1.85 }}
          style={{ transformOrigin: "440px 350px" }}
        >
          <rect x={320} y={338} width={240} height={22} rx={11} fill={T.accent} />
          <text x={440} y={353} textAnchor="middle" fill={T.bg} fontSize={13} fontWeight={700}>
            encrypted session
          </text>
        </motion.g>
      </svg>
    </Frame>
  );
}
