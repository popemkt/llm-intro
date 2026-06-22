import { motion } from "motion/react";
import { FileDown, ArrowLeftRight, Share2, Network } from "lucide-react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";
import { Frame } from "./_frame";

const CAPS = [
  {
    Icon: FileDown,
    title: "scp / sftp",
    desc: "Copy files over the same encrypted channel.",
    code: "scp file prod:/tmp",
  },
  {
    Icon: ArrowLeftRight,
    title: "Local forward -L",
    desc: "Tunnel a remote port to localhost.",
    code: "ssh -L 5432:localhost:5432 prod",
  },
  {
    Icon: Share2,
    title: "Remote forward -R",
    desc: "Expose a local service to the server.",
    code: "ssh -R 8080:localhost:3000 prod",
  },
  {
    Icon: Network,
    title: "ProxyJump -J",
    desc: "Hop through a bastion host.",
    code: "ssh -J bastion prod",
  },
];

export default function SshBeyond({ isActive }: SlideProps) {
  return (
    <Frame isActive={isActive} eyebrow="Using SSH" title="SSH is more than a shell">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
          height: "100%",
        }}
      >
        {CAPS.map(({ Icon, title, desc, code }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
            transition={{ duration: 0.45, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: "18px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon size={22} color={T.accent} />
              <span style={{ fontSize: 19, fontWeight: 700 }}>{title}</span>
            </div>
            <span style={{ fontSize: 15, color: T.textDim, lineHeight: 1.35 }}>{desc}</span>
            <code
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12.5,
                color: T.highlight,
                background: "#0a0d0b",
                padding: "6px 10px",
                borderRadius: 6,
                marginTop: "auto",
              }}
            >
              {code}
            </code>
          </motion.div>
        ))}
      </div>
    </Frame>
  );
}
