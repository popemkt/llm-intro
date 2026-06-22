import { motion } from "motion/react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";
import { Frame } from "./_frame";

const DANGER = "#ff5f57";

function Card({
  isActive,
  delay,
  bad,
  title,
  wire,
  bullets,
}: {
  isActive: boolean;
  delay: number;
  bad: boolean;
  title: string;
  wire: string;
  bullets: string[];
}) {
  const accent = bad ? DANGER : T.accent;
  const Icon = bad ? ShieldAlert : ShieldCheck;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        flex: 1,
        background: T.surface,
        border: `1px solid ${accent}55`,
        borderRadius: 14,
        padding: "24px 26px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon size={26} color={accent} />
        <span style={{ fontSize: 22, fontWeight: 700 }}>{title}</span>
      </div>
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 14,
          padding: "10px 14px",
          background: "#0a0d0b",
          borderRadius: 8,
          color: accent,
          letterSpacing: bad ? 0 : 1,
        }}
      >
        on the wire: {wire}
      </div>
      {bullets.map((b) => (
        <div key={b} style={{ color: T.textDim, fontSize: 16, lineHeight: 1.4 }}>
          {b}
        </div>
      ))}
    </motion.div>
  );
}

export default function SshProblem({ isActive }: SlideProps) {
  return (
    <Frame isActive={isActive} eyebrow="Basics" title="Why not just Telnet?">
      <div style={{ display: "flex", flexDirection: "column", gap: 22, height: "100%" }}>
        <div style={{ display: "flex", gap: 24, flex: 1 }}>
          <Card
            isActive={isActive}
            delay={0.15}
            bad
            title="Telnet / rlogin"
            wire="p@ssw0rd123"
            bullets={[
              "Password sent in cleartext",
              "Anyone sniffing reads everything",
              "No proof of server identity",
            ]}
          />
          <Card
            isActive={isActive}
            delay={0.3}
            bad={false}
            title="SSH"
            wire="x9#Kp2$vL8@qR…"
            bullets={[
              "Password never travels readable",
              "Traffic is encrypted end to end",
              "Server proves who it is",
            ]}
          />
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          {["confidentiality", "integrity", "authentication"].map((g, i) => (
            <motion.span
              key={g}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
              style={{
                padding: "8px 20px",
                borderRadius: 999,
                background: T.accentDim,
                color: T.highlight,
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              {g}
            </motion.span>
          ))}
        </div>
      </div>
    </Frame>
  );
}
