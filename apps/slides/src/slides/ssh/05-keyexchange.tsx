import { motion } from "motion/react";
import { KeyRound } from "lucide-react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";
import { Frame } from "./_frame";

const STEPS = [
  "TCP opens on port 22",
  "Both sides send a version banner + supported algorithms",
  "Diffie–Hellman: each mixes a private secret with public values",
  "Both arrive at the same session key — it never crosses the wire",
];

export default function SshKeyExchange({ isActive }: SlideProps) {
  return (
    <Frame isActive={isActive} eyebrow="The Handshake · Phase 1" title="Key exchange">
      <div style={{ display: "flex", gap: 44, height: "100%", alignItems: "center" }}>
        <ol
          style={{
            flex: 1,
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {STEPS.map((s, i) => (
            <motion.li
              key={s}
              initial={{ opacity: 0, x: -20 }}
              animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0 }}
              transition={{ duration: 0.45, delay: 0.2 + i * 0.15 }}
              style={{ display: "flex", gap: 14, alignItems: "center" }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: T.accentDim,
                  color: T.highlight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 18, lineHeight: 1.35 }}>{s}</span>
            </motion.li>
          ))}
        </ol>

        <div style={{ width: 360, flexShrink: 0 }}>
          <svg viewBox="0 0 360 230" width="100%">
            {[
              { x: 30, c: "#4aa3ff", label: "client secret" },
              { x: 250, c: "#f5a623", label: "server secret" },
            ].map((p, i) => (
              <motion.g
                key={p.label}
                initial={{ opacity: 0, y: -12 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.15 }}
              >
                <circle cx={p.x + 40} cy={40} r={26} fill={p.c} opacity={0.85} />
                <text
                  x={p.x + 40}
                  y={86}
                  textAnchor="middle"
                  fill={T.textDim}
                  fontSize={12}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {p.label}
                </text>
              </motion.g>
            ))}
            {/* converging paths */}
            {[70, 290].map((x1, i) => (
              <motion.path
                key={x1}
                d={`M ${x1} 60 Q 180 120 180 160`}
                fill="none"
                stroke={T.muted}
                strokeWidth={2}
                strokeDasharray="5 4"
                initial={{ pathLength: 0 }}
                animate={isActive ? { pathLength: 1 } : { pathLength: 0 }}
                transition={{ duration: 0.6, delay: 0.7 + i * 0.1 }}
              />
            ))}
            <motion.g
              initial={{ opacity: 0, scale: 0.5 }}
              animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              style={{ transformOrigin: "180px 185px" }}
            >
              <circle cx={180} cy={185} r={34} fill={T.accent} />
              <foreignObject x={166} y={171} width={28} height={28}>
                <KeyRound size={28} color={T.bg} />
              </foreignObject>
              <text
                x={180}
                y={228}
                textAnchor="middle"
                fill={T.highlight}
                fontSize={13}
                fontWeight={700}
                fontFamily="JetBrains Mono, monospace"
              >
                shared session key
              </text>
            </motion.g>
          </svg>
        </div>
      </div>
    </Frame>
  );
}
