import { motion } from "motion/react";
import { Lock, Terminal as TerminalIcon } from "lucide-react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";

const PROMPT = "ssh user@server";

export default function SshTitle({ isActive }: SlideProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `radial-gradient(circle at 30% 20%, #14241b 0%, ${T.bg} 60%)`,
        color: T.text,
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 80px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: T.accentDim,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 28,
          boxShadow: `0 0 40px ${T.accent}55`,
        }}
      >
        <Lock size={32} color={T.highlight} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{ fontSize: 68, fontWeight: 800, margin: 0, letterSpacing: -1.5 }}
      >
        How SSH Works
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.5, delay: 0.22 }}
        style={{ fontSize: 22, color: T.textDim, margin: "16px 0 40px", fontWeight: 400 }}
      >
        Secure Shell — a private tunnel over a public network.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.5, delay: 0.34 }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 22px",
          background: "#0a0d0b",
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 20,
          alignSelf: "flex-start",
        }}
      >
        <TerminalIcon size={20} color={T.accent} />
        <span style={{ color: T.accent }}>$</span>
        <span>{PROMPT}</span>
        <motion.span
          animate={isActive ? { opacity: [1, 0] } : { opacity: 0 }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
          style={{ width: 10, height: 22, background: T.highlight, display: "inline-block" }}
        />
      </motion.div>
    </div>
  );
}
