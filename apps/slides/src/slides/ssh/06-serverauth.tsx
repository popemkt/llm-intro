import { motion } from "motion/react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";
import { Frame, Terminal } from "./_frame";
import { AnimBox } from "@/design/AnimBox";

export default function SshServerAuth({ isActive }: SlideProps) {
  return (
    <Frame
      isActive={isActive}
      eyebrow="The Handshake · Phase 2"
      title="Is the server who it claims?"
    >
      <div style={{ display: "flex", gap: 44, height: "100%", alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            "Server presents its host key and signs the handshake with it",
            "First connect → you confirm the fingerprint",
            "Accepted keys are stored in ~/.ssh/known_hosts",
            "A later mismatch = warning: possible man-in-the-middle",
          ].map((t, i) => (
            <AnimBox key={t} isActive={isActive} delay={0.2 + i * 0.12} from="left">
              <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                <span style={{ color: T.accent, fontWeight: 800 }}>›</span>
                <span style={{ fontSize: 17.5, lineHeight: 1.4 }}>{t}</span>
              </div>
            </AnimBox>
          ))}
        </div>

        <div style={{ width: 440, flexShrink: 0 }}>
          <Terminal isActive={isActive} delay={0.5} title="ssh user@server">
            <div style={{ color: T.textDim }}>The authenticity of host 'server'</div>
            <div style={{ color: T.textDim }}>can't be established.</div>
            <div style={{ marginTop: 8 }}>ED25519 fingerprint is</div>
            <div style={{ color: T.accent }}>SHA256:9aK2…fQ7r</div>
            <motion.div
              animate={isActive ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.4 }}
              transition={{ duration: 1.6, repeat: Infinity }}
              style={{ marginTop: 10, color: T.highlight }}
            >
              Continue connecting (yes/no)? ▊
            </motion.div>
          </Terminal>
        </div>
      </div>
    </Frame>
  );
}
