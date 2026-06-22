import { motion } from "motion/react";
import { Laptop, Server } from "lucide-react";
import type { SlideProps } from "@/types";
import { T } from "@/design/tokens";
import { Frame } from "./_frame";
import { FlowArrow, ArrowDefs } from "@/design/FlowArrow";

export default function SshPubKey({ isActive }: SlideProps) {
  return (
    <Frame isActive={isActive} eyebrow="Authentication" title="Public key authentication">
      <div style={{ display: "flex", flexDirection: "column", gap: 18, height: "100%" }}>
        <svg viewBox="0 0 880 220" width="100%" style={{ flex: 1 }}>
          <ArrowDefs />
          {/* laptop */}
          <motion.g
            initial={{ opacity: 0, x: -16 }}
            animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <rect
              x={20}
              y={60}
              width={260}
              height={100}
              rx={12}
              fill={T.surface}
              stroke={T.border}
            />
            <foreignObject x={40} y={78} width={26} height={26}>
              <Laptop size={26} color={T.accent} />
            </foreignObject>
            <text x={76} y={96} fill={T.text} fontSize={15} fontWeight={700}>
              Your laptop
            </text>
            <text
              x={40}
              y={126}
              fill={T.highlight}
              fontSize={13}
              fontFamily="JetBrains Mono, monospace"
            >
              id_ed25519
            </text>
            <text
              x={40}
              y={146}
              fill={T.textDim}
              fontSize={12}
              fontFamily="JetBrains Mono, monospace"
            >
              private · never leaves
            </text>
          </motion.g>

          {/* server */}
          <motion.g
            initial={{ opacity: 0, x: 16 }}
            animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <rect
              x={600}
              y={60}
              width={260}
              height={100}
              rx={12}
              fill={T.surface}
              stroke={T.border}
            />
            <foreignObject x={620} y={78} width={26} height={26}>
              <Server size={26} color={T.accent} />
            </foreignObject>
            <text x={656} y={96} fill={T.text} fontSize={15} fontWeight={700}>
              Server
            </text>
            <text
              x={620}
              y={126}
              fill={T.highlight}
              fontSize={13}
              fontFamily="JetBrains Mono, monospace"
            >
              authorized_keys
            </text>
            <text
              x={620}
              y={146}
              fill={T.textDim}
              fontSize={12}
              fontFamily="JetBrains Mono, monospace"
            >
              holds your public key
            </text>
          </motion.g>

          {/* challenge / response */}
          <FlowArrow d="M 600 95 L 282 95" isActive={isActive} delay={0.6} hot />
          <motion.text
            x={440}
            y={84}
            textAnchor="middle"
            fill={T.accent}
            fontSize={13}
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.8 }}
          >
            1. server sends random challenge
          </motion.text>
          <FlowArrow d="M 282 130 L 600 130" isActive={isActive} delay={1.1} hot />
          <motion.text
            x={440}
            y={150}
            textAnchor="middle"
            fill={T.accent}
            fontSize={13}
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 1.3 }}
          >
            2. you sign it with the private key
          </motion.text>
        </svg>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isActive ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1.5 }}
          style={{ textAlign: "center", color: T.text, fontSize: 17, margin: 0 }}
        >
          Server verifies the signature with your public key.{" "}
          <b style={{ color: T.highlight }}>No secret is ever transmitted.</b>
        </motion.p>
      </div>
    </Frame>
  );
}
