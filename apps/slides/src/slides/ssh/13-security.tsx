import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";
import { Frame } from "./_frame";

const ITEMS = [
  ["Use ed25519 keys", "protect the private key with a passphrase"],
  ["Disable password auth", "PasswordAuthentication no"],
  ["No direct root login", "PermitRootLogin no"],
  ["Keep sshd patched", "non-default port + fail2ban for extra cover"],
  ["Audit authorized_keys", "remove keys you no longer recognise"],
];

export default function SshSecurity({ isActive }: SlideProps) {
  return (
    <Frame isActive={isActive} eyebrow="Using SSH" title="Harden it">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          height: "100%",
          justifyContent: "center",
        }}
      >
        {ITEMS.map(([head, sub], i) => (
          <motion.div
            key={head}
            initial={{ opacity: 0, x: -20 }}
            animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.12 }}
            style={{ display: "flex", alignItems: "center", gap: 16 }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: 8,
                background: T.accentDim,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={20} color={T.highlight} />
            </span>
            <div>
              <span style={{ fontSize: 19, fontWeight: 700 }}>{head}</span>
              <span
                style={{ fontSize: 16, color: T.textDim, fontFamily: "JetBrains Mono, monospace" }}
              >
                {"  —  "}
                {sub}
              </span>
            </div>
          </motion.div>
        ))}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isActive ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.9 }}
          style={{ marginTop: 10, fontSize: 17, color: T.text }}
        >
          Keys + disabled passwords = <b style={{ color: T.highlight }}>the single biggest win.</b>
        </motion.p>
      </div>
    </Frame>
  );
}
