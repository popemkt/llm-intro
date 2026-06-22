import { motion } from "motion/react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";
import { Frame, Terminal } from "./_frame";

const LINES: { cmd: string; out: string; delay: number }[] = [
  {
    cmd: 'ssh-keygen -t ed25519 -C "you@example.com"',
    out: "key pair created in ~/.ssh/",
    delay: 0.3,
  },
  { cmd: "ssh-copy-id user@server", out: "public key installed on the server", delay: 0.9 },
  { cmd: "ssh user@server", out: "Welcome — logged in, no password.", delay: 1.5 },
];

export default function SshGetStarted({ isActive }: SlideProps) {
  return (
    <Frame isActive={isActive} eyebrow="Using SSH" title="Getting started — three commands">
      <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Terminal isActive={isActive} delay={0.15} title="bash" style={{ width: "100%" }}>
          {LINES.map(({ cmd, out, delay }) => (
            <motion.div
              key={cmd}
              initial={{ opacity: 0, y: 6 }}
              animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
              transition={{ duration: 0.35, delay }}
              style={{ marginBottom: 14 }}
            >
              <div>
                <span style={{ color: T.accent }}>$ </span>
                {cmd}
              </div>
              <div style={{ color: T.textDim, fontSize: 13 }}># {out}</div>
            </motion.div>
          ))}
          <motion.span
            animate={isActive ? { opacity: [1, 0] } : { opacity: 0 }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
            style={{
              display: "inline-block",
              width: 9,
              height: 18,
              background: T.highlight,
              verticalAlign: "middle",
            }}
          />
        </Terminal>
      </div>
    </Frame>
  );
}
