import { motion } from "motion/react";
import { T } from "@/design/tokens";

/**
 * Shared chrome for the SSH deck's code-backed slides. Renders into the fixed
 * 1000×562.5 logical canvas (SlideShell scales it). Header animates in when the
 * slide becomes active; body fills the remaining space.
 */
export function Frame({
  children,
  isActive,
  eyebrow,
  title,
  pad = "48px 56px",
}: {
  children: React.ReactNode;
  isActive: boolean;
  eyebrow?: string;
  title?: string;
  pad?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: T.bg,
        color: T.text,
        fontFamily: "Inter, system-ui, sans-serif",
        padding: pad,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {(eyebrow || title) && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {eyebrow && (
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 13,
                color: T.accent,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {eyebrow}
            </div>
          )}
          {title && (
            <h1 style={{ fontSize: 34, fontWeight: 700, margin: 0, lineHeight: 1.15 }}>{title}</h1>
          )}
        </motion.div>
      )}
      <div style={{ flex: 1, minHeight: 0, marginTop: title ? 26 : 0, position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

/** Monospace terminal card used across several SSH slides. */
export function Terminal({
  children,
  isActive,
  delay = 0,
  title = "bash",
  style,
}: {
  children: React.ReactNode;
  isActive: boolean;
  delay?: number;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "#0a0d0b",
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "10px 14px",
          borderBottom: `1px solid ${T.border}`,
          background: T.surface,
        }}
      >
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840" }} />
        <span
          style={{
            marginLeft: 8,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            color: T.textDim,
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          padding: "18px 20px",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 15,
          lineHeight: 1.85,
          color: T.text,
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}
