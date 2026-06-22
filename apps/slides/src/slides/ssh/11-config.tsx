import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";
import { Frame, Terminal } from "./_frame";

const CONFIG = [
  ["Host", " prod"],
  ["    HostName", " 203.0.113.10"],
  ["    User", " deploy"],
  ["    Port", " 2222"],
  ["    IdentityFile", " ~/.ssh/id_ed25519"],
];

export default function SshConfig({ isActive }: SlideProps) {
  return (
    <Frame isActive={isActive} eyebrow="Using SSH" title="Stop typing long commands">
      <div style={{ display: "flex", gap: 36, height: "100%", alignItems: "center" }}>
        <Terminal isActive={isActive} delay={0.2} title="~/.ssh/config" style={{ flex: 1 }}>
          {CONFIG.map(([k, v], i) => (
            <motion.div
              key={k + i}
              initial={{ opacity: 0, x: -10 }}
              animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.35 + i * 0.1 }}
            >
              <span style={{ color: T.accent }}>{k}</span>
              <span>{v}</span>
            </motion.div>
          ))}
        </Terminal>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0 }}
          transition={{ delay: 0.9 }}
        >
          <ArrowRight size={36} color={T.textDim} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "28px 32px",
            background: T.accentDim,
            border: `1px solid ${T.accent}`,
            borderRadius: 14,
          }}
        >
          <span style={{ fontSize: 14, color: T.textDim }}>then simply</span>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 26,
              fontWeight: 700,
              color: T.highlight,
            }}
          >
            ssh prod
          </span>
        </motion.div>
      </div>
    </Frame>
  );
}
