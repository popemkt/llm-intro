import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SlideProps } from "@/types";
import { Backdrop, EASE } from "./_frame";
import { P, F } from "./branding";

/* 3✦ · The world — verbatim SVG from _playground/wip/harness-model-graphs.html (#bridge2) */
const WORLD_SVG = `
<svg viewBox="0 0 1160 660" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" font-family="ui-sans-serif, system-ui">
  <defs>
    <marker id="b2-fwd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/></marker>
  </defs>
  <g class="g" data-s="1">
    <rect x="10" y="10" width="1140" height="640" rx="18" fill="none" stroke="#64748b" stroke-opacity="0.35" stroke-dasharray="8 7"/>
    <text x="28" y="36" fill="#94a3b8" font-size="11" font-weight="600">ENVIRONMENT · WORLD</text>
    <rect x="11" y="11" width="629" height="638" rx="18" fill="rgba(148,163,184,0.02)"/>
    <rect x="640" y="11" width="510" height="638" fill="rgba(148,163,184,0.012)"/>
    <line x1="262" y1="34" x2="1040" y2="34" stroke="#64748b" stroke-opacity="0.4" stroke-dasharray="2 4" marker-end="url(#b2-fwd)"/>
    <text x="256" y="38" text-anchor="end" fill="#8a93a3" font-size="8.5" font-style="italic">intent</text>
    <text x="1048" y="38" fill="#8a93a3" font-size="8.5" font-style="italic">behavior</text>
    <line x1="640" y1="60" x2="640" y2="600" stroke="#ef4444" stroke-opacity="0.72" stroke-width="2"/>
    <text x="632" y="52" text-anchor="end" fill="#94a3b8" font-size="9.5" font-weight="600">building phase</text>
    <text x="648" y="52" fill="#94a3b8" font-size="9.5" font-weight="600">running phase</text>
    <circle cx="640" cy="330" r="128" fill="#0f1a16" stroke="#64748b" stroke-opacity="0.3" stroke-width="1"/>
    <text x="640" y="334" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">software</text>
    <g class="hot" tabindex="0">
      <line class="target" x1="640" y1="60" x2="640" y2="600" stroke="#ef4444" stroke-opacity="0" stroke-width="12"/>
      <g class="label">
        <rect x="665" y="72" width="226" height="54" rx="8" fill="#121821" stroke="#ef4444" stroke-opacity="0.5"/>
        <text x="680" y="94" fill="#ef8888" font-size="10" font-weight="700">compile · run meridian</text>
        <text x="680" y="110" class="tagline">left side is authored; right side is executed.</text>
      </g>
    </g>
  </g>
  <g class="g" data-s="2">
    <g class="hot" tabindex="0">
      <path class="target" d="M 640 82 A 248 248 0 0 0 640 578" fill="none" stroke="#a78bfa" stroke-opacity="0.36"/>
      <text x="425" y="334" text-anchor="middle" fill="#8b85a8" font-size="10.5" font-weight="600">Spec</text>
      <g class="label">
        <rect x="286" y="382" width="230" height="54" rx="8" fill="#121821" stroke="#a78bfa" stroke-opacity="0.5"/>
        <text x="300" y="404" fill="#a78bfa" font-size="10" font-weight="700">Artifact · Specification</text>
        <text x="300" y="420" class="tagline">the durable reference consumed by validation.</text>
      </g>
    </g>
    <g class="hot" tabindex="0">
      <path class="target" d="M 640 148 A 182 182 0 0 0 640 512" fill="none" stroke="#60a5fa" stroke-opacity="0.34"/>
      <text x="489" y="334" text-anchor="middle" fill="#7d96b8" font-size="10.5" font-weight="600">Code</text>
      <g class="label">
        <rect x="396" y="214" width="210" height="54" rx="8" fill="#121821" stroke="#60a5fa" stroke-opacity="0.5"/>
        <text x="410" y="236" fill="#93c5fd" font-size="10" font-weight="700">Artifact · Code</text>
        <text x="410" y="252" class="tagline">the authored object that later executes.</text>
      </g>
    </g>
    <g class="hot" tabindex="0">
      <path class="target" d="M 640 148 A 182 182 0 0 1 640 512" fill="none" stroke="#2dd4bf" stroke-opacity="0.42"/>
      <text x="792" y="330" text-anchor="middle" fill="#2dd4bf" font-size="11" font-weight="600" transform="rotate(90 792 330)">Behavior</text>
      <g class="label">
        <rect x="820" y="318" width="232" height="54" rx="8" fill="#121821" stroke="#2dd4bf" stroke-opacity="0.5"/>
        <text x="834" y="340" fill="#2dd4bf" font-size="10" font-weight="700">Phenomenon · Behavior</text>
        <text x="834" y="356" class="tagline">what the running system actually exhibits.</text>
      </g>
    </g>
  </g>
  <g class="g" data-s="3">
    <g class="hot" tabindex="0">
      <path class="target" d="M 640 202 A 128 128 0 0 0 640 458" fill="none" stroke="#8ea0b5" stroke-opacity="0.78" stroke-width="1.8" stroke-dasharray="6 5"/>
      <text x="556" y="214" text-anchor="middle" fill="#8ea0b5" font-size="9.5" font-weight="600">compilation</text>
      <g class="label">
        <rect x="404" y="102" width="224" height="54" rx="8" fill="#121821" stroke="#8ea0b5" stroke-opacity="0.5"/>
        <text x="418" y="124" fill="#8ea0b5" font-size="10" font-weight="700">Process · compilation</text>
        <text x="418" y="140" class="tagline">mechanical crossing into executable software.</text>
      </g>
    </g>
    <g class="hot" tabindex="0">
      <path class="target" d="M 640 202 A 128 128 0 0 1 640 458" fill="none" stroke="#60a5fa" stroke-opacity="0.78" stroke-width="1.8" stroke-dasharray="6 5"/>
      <text x="726" y="214" text-anchor="middle" fill="#60a5fa" font-size="9.5" font-weight="600">launch conditions</text>
      <g class="label">
        <rect x="724" y="102" width="236" height="54" rx="8" fill="#121821" stroke="#60a5fa" stroke-opacity="0.5"/>
        <text x="738" y="124" fill="#60a5fa" font-size="10" font-weight="700">Environment · runtime world</text>
        <text x="738" y="140" class="tagline">entrypoint, config and data held repeatable.</text>
      </g>
    </g>
  </g>
  <g class="g" data-s="4">
    <g class="hot" tabindex="0">
      <path class="target" d="M 640 82 A 248 248 0 0 0 640 578" fill="none" stroke="#fbbf24" stroke-opacity="0.78" stroke-width="1.5" stroke-dasharray="6 5"/>
      <circle cx="405" cy="260" r="5" fill="#fbbf24"/>
      <g class="label">
        <rect x="300" y="244" width="246" height="62" rx="8" fill="#121821" stroke="#fbbf24" stroke-opacity="0.5"/>
        <text x="314" y="266" fill="#fbbf24" font-size="10" font-weight="700">Process · elicitation</text>
        <text x="314" y="282" class="tagline">Intent Holder + Agent produce Specification.</text>
        <text x="314" y="296" class="tagline">Failure here: the wrong thing.</text>
      </g>
    </g>
    <g class="hot" tabindex="0">
      <path class="target" d="M 640 148 A 182 182 0 0 0 640 512" fill="none" stroke="#fb7185" stroke-opacity="0.78" stroke-width="1.5" stroke-dasharray="6 5"/>
      <circle cx="486" cy="296" r="5" fill="#fb7185"/>
      <g class="label">
        <rect x="472" y="276" width="254" height="62" rx="8" fill="#121821" stroke="#fb7185" stroke-opacity="0.5"/>
        <text x="486" y="298" fill="#fb7185" font-size="10" font-weight="700">Process · code-spec binding</text>
        <text x="486" y="314" class="tagline">Specification + Evidence feed Validation.</text>
        <text x="486" y="328" class="tagline">Failure here: the thing built wrong.</text>
      </g>
    </g>
  </g>
  <g class="g" data-s="5">
    <g class="hot" tabindex="0">
      <rect class="target" x="40" y="82" width="180" height="46" rx="10" fill="rgba(251,191,36,0.05)" stroke="#fbbf24" stroke-opacity="0.55"/>
      <text x="130" y="108" text-anchor="middle" fill="#e2e8f0" font-size="11.5" font-weight="600">INTENT HOLDER</text>
      <g class="label">
        <rect x="236" y="76" width="220" height="54" rx="8" fill="#121821" stroke="#fbbf24" stroke-opacity="0.5"/>
        <text x="250" y="98" fill="#fbbf24" font-size="10" font-weight="700">Actor · Intent Holder</text>
        <text x="250" y="114" class="tagline">owns the want and signs off.</text>
      </g>
    </g>
    <g class="hot" tabindex="0">
      <rect class="target" x="40" y="164" width="180" height="46" rx="10" fill="rgba(52,211,153,0.05)" stroke="#34d399" stroke-opacity="0.55"/>
      <text x="130" y="190" text-anchor="middle" fill="#e2e8f0" font-size="11.5" font-weight="600">AGENT</text>
      <path d="M 220 187 Q 380 220 516 322" fill="none" stroke="#34d399" stroke-opacity="0.28" stroke-dasharray="3 5"/>
      <g>
        <animateMotion dur="3s" repeatCount="indefinite" keyTimes="0;0.85;1" keyPoints="0;1;1" calcMode="linear" path="M 220 187 Q 380 220 516 322"/>
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.82;0.9" dur="3s" repeatCount="indefinite"/>
        <polygon points="0,-7 8,0 0,7 -8,0" fill="#34d399"/>
        <circle cx="0" cy="-13" r="5.5" fill="#fbbf24"/>
        <text x="0" y="-10.5" font-size="6.5" fill="#0d1117" font-weight="700" text-anchor="middle">i</text>
      </g>
      <g class="label">
        <rect x="236" y="158" width="226" height="54" rx="8" fill="#121821" stroke="#34d399" stroke-opacity="0.5"/>
        <text x="250" y="180" fill="#34d399" font-size="10" font-weight="700">Actor · Agent</text>
        <text x="250" y="196" class="tagline">participates in elicitation and generation.</text>
      </g>
    </g>
    <rect x="268" y="106" width="236" height="46" rx="8" fill="#121821" stroke="#fbbf24" stroke-opacity="0.5"/>
    <circle cx="286" cy="129" r="5.5" fill="#fbbf24"/>
    <text x="286" y="131.5" font-size="6.5" fill="#0d1117" font-weight="700" text-anchor="middle">i</text>
    <text x="300" y="125" fill="#fbbf24" font-size="10" font-weight="700">intent</text>
    <text x="300" y="140" class="tagline">the agent carries it inside → software.</text>
    <path d="M 388 152 C 388 178, 360 196, 338 207" fill="none" stroke="#fbbf24" stroke-opacity="0.3" stroke-dasharray="3 4"/>
    <g class="hot" tabindex="0">
      <rect class="target" x="40" y="498" width="180" height="44" rx="10" fill="rgba(251,146,60,0.05)" stroke="#fb923c" stroke-opacity="0.55" stroke-dasharray="5 4"/>
      <text x="130" y="524" text-anchor="middle" fill="#e2e8f0" font-size="11.5" font-weight="600">VALIDATOR</text>
      <g class="label">
        <rect x="236" y="494" width="220" height="54" rx="8" fill="#121821" stroke="#fb923c" stroke-opacity="0.5"/>
        <text x="250" y="516" fill="#fb923c" font-size="10" font-weight="700">Actor · Validator</text>
        <text x="250" y="532" class="tagline">participates in Validation; produces Verdict.</text>
      </g>
    </g>
  </g>
  <g class="g" data-s="6">
    <rect x="838" y="442" width="248" height="120" rx="10" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.1)"/>
    <text x="856" y="466" fill="#94a3b8" font-size="9.5" font-weight="700">single grammar</text>
    <text x="856" y="488" fill="#cbd5e1" font-size="8.5">boxes = actors</text>
    <text x="856" y="506" fill="#cbd5e1" font-size="8.5">shells = artifacts / phenomena</text>
    <text x="856" y="524" fill="#cbd5e1" font-size="8.5">dashed arcs = processes</text>
    <text x="856" y="542" fill="#cbd5e1" font-size="8.5">stabilizers are separate obligations in 1d</text>
  </g>
</svg>`;

const CAPS = [
  "world field + compile/run meridian: build on the left, run on the right",
  "typed participants: Spec and Code are artifacts; Behavior is a phenomenon",
  "mechanical boundary: code becomes executable software, software launches inside runtime",
  "probabilistic processes: elicitation and code-spec binding are the risky crossings",
  "actors enter: Intent Holder, Agent and Validator remain boxes, not shell levels",
  "legend: the diagram now uses one visual grammar",
];

function buildCss() {
  let css = `.hx-world .g{opacity:0;transition:opacity .5s ease}`;
  for (let s = 1; s <= 6; s++) {
    for (let k = 1; k <= s; k++) css += `.hx-world[data-step="${s}"] .g[data-s="${k}"]{opacity:1}`;
  }
  css += `.hx-world .hot{cursor:help;outline:none}`;
  css += `.hx-world .hot .target{transition:stroke-opacity .18s ease,stroke-width .18s ease}`;
  css += `.hx-world .hot:hover .target,.hx-world .hot:focus .target{stroke-opacity:1;stroke-width:2.4}`;
  css += `.hx-world .label{opacity:0;pointer-events:none;transition:opacity .18s ease}`;
  css += `.hx-world .hot:hover .label,.hx-world .hot:focus .label{opacity:1}`;
  css += `.hx-world .tagline{font-size:8.5px;fill:#64748b}`;
  return css;
}

function Stepper({
  step,
  setStep,
  n,
  accent,
}: {
  step: number;
  setStep: (n: number) => void;
  n: number;
  accent: string;
}) {
  const Arrow = ({ dir }: { dir: -1 | 1 }) => {
    const disabled = dir === -1 ? step === 1 : step === n;
    const Icon = dir === -1 ? ChevronLeft : ChevronRight;
    return (
      <button
        onClick={() => setStep(Math.max(1, Math.min(n, step + dir)))}
        disabled={disabled}
        aria-label={dir === -1 ? "previous" : "next"}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: accent,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.25 : 1,
          display: "flex",
        }}
      >
        <Icon size={20} strokeWidth={2.5} />
      </button>
    );
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Arrow dir={-1} />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {Array.from({ length: n }).map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i + 1)}
            aria-label={`step ${i + 1}`}
            style={{
              width: i + 1 === step ? 11 : 8,
              height: i + 1 === step ? 11 : 8,
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              background: i + 1 <= step ? accent : "rgba(148,163,184,0.35)",
              transition: "all 0.2s",
            }}
          />
        ))}
      </div>
      <Arrow dir={1} />
    </div>
  );
}

export default function World({ isActive }: SlideProps) {
  const [step, setStep] = useState(1);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        fontFamily: F.body,
        color: P.text,
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "30px 44px 22px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Backdrop />
      <style>{buildCss()}</style>

      <div
        style={{
          position: "relative",
          flexShrink: 0,
          fontFamily: F.mono,
          fontSize: 12,
          color: P.spec,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        3✦ · the world — a spatial sketch of 1d
      </div>

      {/* verbatim world SVG, cumulative reveal driven by data-step */}
      <div
        className="hx-world"
        data-step={step}
        style={{ position: "relative", flex: 1, minHeight: 0 }}
        dangerouslySetInnerHTML={{ __html: WORLD_SVG }}
      />

      <div
        style={{
          position: "relative",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginTop: 6,
        }}
      >
        <div style={{ position: "relative", flex: 1, minHeight: 30 }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: EASE }}
              style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: P.textMid }}
            >
              <b style={{ color: P.spec }}>{step} / 6</b> — {CAPS[step - 1]}
            </motion.p>
          </AnimatePresence>
        </div>
        {isActive && <Stepper step={step} setStep={setStep} n={6} accent={P.spec} />}
      </div>
    </div>
  );
}
