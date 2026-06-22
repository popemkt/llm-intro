import { motion } from "motion/react";
import { KeyRound, Asterisk } from "lucide-react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";
import { Frame } from "./_frame";

function Method({
  isActive,
  delay,
  Icon,
  title,
  desc,
  recommended,
}: {
  isActive: boolean;
  delay: number;
  Icon: typeof KeyRound;
  title: string;
  desc: string;
  recommended?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        flex: 1,
        background: recommended ? T.accentDim : T.surface,
        border: `1px solid ${recommended ? T.accent : T.border}`,
        borderRadius: 16,
        padding: "30px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
      }}
    >
      {recommended && (
        <span
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            fontSize: 12,
            fontWeight: 700,
            color: T.highlight,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          recommended
        </span>
      )}
      <Icon size={34} color={recommended ? T.highlight : T.textDim} />
      <span style={{ fontSize: 24, fontWeight: 700 }}>{title}</span>
      <span style={{ fontSize: 17, color: recommended ? T.text : T.textDim, lineHeight: 1.45 }}>
        {desc}
      </span>
    </motion.div>
  );
}

export default function SshClientAuth({ isActive }: SlideProps) {
  return (
    <Frame isActive={isActive} eyebrow="The Handshake · Phase 3" title="Are you who you claim?">
      <div style={{ display: "flex", flexDirection: "column", gap: 22, height: "100%" }}>
        <div style={{ display: "flex", gap: 24, flex: 1 }}>
          <Method
            isActive={isActive}
            delay={0.2}
            Icon={Asterisk}
            title="Password"
            desc="Simple to start, but brute-forceable and phishable."
          />
          <Method
            isActive={isActive}
            delay={0.35}
            Icon={KeyRound}
            title="Public key"
            desc="Strong, passwordless, the default for real systems."
            recommended
          />
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isActive ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.6 }}
          style={{ textAlign: "center", color: T.textDim, fontSize: 16, margin: 0 }}
        >
          The channel is already encrypted and the server is trusted — now it's your turn.
        </motion.p>
      </div>
    </Frame>
  );
}
