import { motion } from "motion/react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";
import { Frame } from "./_frame";

export default function SshSymmetric({ isActive }: SlideProps) {
  return (
    <Frame isActive={isActive} eyebrow="Authentication" title="After the handshake">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          height: "100%",
          gap: 36,
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
          {/* one-time asymmetric setup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              width: 280,
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: "22px 24px",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: T.textDim,
                fontFamily: "JetBrains Mono, monospace",
                marginBottom: 6,
              }}
            >
              ONCE · slow
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Asymmetric setup</div>
            <div style={{ fontSize: 15, color: T.textDim, marginTop: 8, lineHeight: 1.4 }}>
              Diffie–Hellman + signatures establish trust and a shared key.
            </div>
          </motion.div>

          {/* arrow producing key */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "0 24px",
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={isActive ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.6 }}
              style={{
                fontSize: 13,
                color: T.highlight,
                fontFamily: "JetBrains Mono, monospace",
                marginBottom: 4,
              }}
            >
              session key
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={isActive ? { width: 56 } : { width: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              style={{ height: 3, background: T.accent }}
            />
          </div>

          {/* repeated symmetric traffic */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.75 }}
            style={{
              flex: 1,
              background: T.accentDim,
              border: `1px solid ${T.accent}`,
              borderRadius: 14,
              padding: "22px 24px",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: T.highlight,
                fontFamily: "JetBrains Mono, monospace",
                marginBottom: 6,
              }}
            >
              EVERY PACKET · fast
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Symmetric encryption</div>
            <div style={{ fontSize: 15, color: T.text, marginTop: 8, lineHeight: 1.4 }}>
              AES / ChaCha20 encrypt the data; a MAC checks integrity.
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <motion.span
                  key={i}
                  animate={isActive ? { opacity: [0.25, 1, 0.25] } : { opacity: 0.25 }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 }}
                  style={{ width: 22, height: 10, borderRadius: 3, background: T.accent }}
                />
              ))}
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isActive ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1 }}
          style={{ textAlign: "center", fontSize: 18, color: T.textDim, margin: 0 }}
        >
          Asymmetric to <b style={{ color: T.text }}>set up trust</b>, symmetric to{" "}
          <b style={{ color: T.highlight }}>move data fast</b>.
        </motion.p>
      </div>
    </Frame>
  );
}
