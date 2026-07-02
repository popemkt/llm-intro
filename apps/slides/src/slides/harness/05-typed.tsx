import type { SlideProps } from "@/types";
import { Backdrop } from "./_frame";
import { P, F } from "./branding";

/* 1d · typed model — verbatim SVG from _playground/wip/harness-model-graphs.html (#typed-model) */
const TYPED_SVG = `
<svg viewBox="0 0 1160 840" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" font-family="ui-sans-serif, system-ui">
  <defs>
    <marker id="d-flow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/></marker>
    <marker id="d-actor" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#34d399"/></marker>
    <marker id="d-store" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#a78bfa"/></marker>
    <marker id="d-judge" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#fb923c"/></marker>
  </defs>
  <rect x="36" y="38" width="184" height="360" rx="12" fill="rgba(52,211,153,0.025)" stroke="#34d399" stroke-opacity="0.2"/>
  <text x="58" y="64" fill="#34d399" font-size="10" font-weight="700" letter-spacing="0.08em">ACTORS</text>
  <text x="58" y="80" fill="#64748b" font-size="8.5">agency, authority, refusal</text>
  <rect x="252" y="38" width="250" height="360" rx="12" fill="rgba(251,191,36,0.022)" stroke="#fbbf24" stroke-opacity="0.18"/>
  <text x="274" y="64" fill="#fbbf24" font-size="10" font-weight="700" letter-spacing="0.08em">PROCESSES</text>
  <text x="274" y="80" fill="#64748b" font-size="8.5">transitions: consume inputs, produce outputs</text>
  <rect x="536" y="38" width="588" height="360" rx="12" fill="none" stroke="#94a3b8" stroke-opacity="0.22"/>
  <rect x="540" y="88" width="264" height="304" rx="9" fill="rgba(167,139,250,0.022)"/>
  <rect x="808" y="88" width="312" height="304" rx="9" fill="rgba(148,163,184,0.025)"/>
  <line x1="806" y1="92" x2="806" y2="388" stroke="#94a3b8" stroke-opacity="0.13" stroke-dasharray="3 6"/>
  <text x="558" y="64" fill="#94a3b8" font-size="10" font-weight="700" letter-spacing="0.08em">NON-ACTORS</text>
  <text x="558" y="80" fill="#64748b" font-size="8.5">refine into → artifact · environment · phenomenon</text>
  <text x="558" y="385" fill="#a78bfa" fill-opacity="0.75" font-size="8.5" letter-spacing="0.06em">ARTIFACT · RECORD</text>
  <text x="1108" y="385" text-anchor="end" fill="#94a3b8" font-size="8.5" letter-spacing="0.06em">ENVIRONMENT · PHENOMENON</text>
  <rect x="58" y="116" width="140" height="42" rx="9" fill="rgba(251,191,36,0.07)" stroke="#fbbf24" stroke-opacity="0.55"/>
  <text x="128" y="141" text-anchor="middle" fill="#e2e8f0" font-size="11.5" font-weight="600">Intent Holder</text>
  <rect x="58" y="198" width="140" height="42" rx="9" fill="rgba(52,211,153,0.07)" stroke="#34d399" stroke-opacity="0.55"/>
  <text x="128" y="223" text-anchor="middle" fill="#e2e8f0" font-size="11.5" font-weight="600">Agent</text>
  <rect x="58" y="280" width="140" height="42" rx="9" fill="rgba(251,146,60,0.06)" stroke="#fb923c" stroke-opacity="0.55" stroke-dasharray="5 4"/>
  <text x="128" y="305" text-anchor="middle" fill="#e2e8f0" font-size="11.5" font-weight="600">Validator</text>
  <rect x="296" y="94" width="164" height="44" rx="22" fill="rgba(251,191,36,0.08)" stroke="#fbbf24" stroke-opacity="0.55"/>
  <text x="378" y="120" text-anchor="middle" fill="#fbbf24" font-size="11.5" font-weight="700">Elicitation</text>
  <rect x="296" y="166" width="164" height="44" rx="22" fill="rgba(52,211,153,0.07)" stroke="#34d399" stroke-opacity="0.55"/>
  <text x="378" y="192" text-anchor="middle" fill="#34d399" font-size="11.5" font-weight="700">Generation</text>
  <rect x="296" y="238" width="164" height="44" rx="22" fill="rgba(96,165,250,0.07)" stroke="#60a5fa" stroke-opacity="0.55"/>
  <text x="378" y="264" text-anchor="middle" fill="#60a5fa" font-size="11.5" font-weight="700">Observation</text>
  <rect x="296" y="310" width="164" height="44" rx="22" fill="rgba(251,146,60,0.07)" stroke="#fb923c" stroke-opacity="0.55"/>
  <text x="378" y="336" text-anchor="middle" fill="#fb923c" font-size="11.5" font-weight="700">Validation</text>
  <rect x="570" y="90" width="182" height="42" rx="9" fill="rgba(167,139,250,0.08)" stroke="#a78bfa" stroke-opacity="0.55"/>
  <text x="661" y="115" text-anchor="middle" fill="#e2e8f0" font-size="11.5" font-weight="600">Specification</text>
  <rect x="570" y="158" width="182" height="42" rx="9" fill="rgba(96,165,250,0.07)" stroke="#60a5fa" stroke-opacity="0.55"/>
  <text x="661" y="183" text-anchor="middle" fill="#e2e8f0" font-size="11.5" font-weight="600">Code</text>
  <rect x="570" y="226" width="182" height="42" rx="9" fill="rgba(96,165,250,0.07)" stroke="#60a5fa" stroke-opacity="0.55"/>
  <text x="661" y="251" text-anchor="middle" fill="#e2e8f0" font-size="11.5" font-weight="600">Evidence</text>
  <rect x="570" y="294" width="182" height="42" rx="9" fill="rgba(251,146,60,0.07)" stroke="#fb923c" stroke-opacity="0.55"/>
  <text x="661" y="319" text-anchor="middle" fill="#e2e8f0" font-size="11.5" font-weight="600">Verdict</text>
  <rect x="570" y="350" width="182" height="30" rx="8" fill="rgba(167,139,250,0.045)" stroke="#a78bfa" stroke-opacity="0.4" stroke-dasharray="4 4"/>
  <text x="661" y="369" text-anchor="middle" fill="#a78bfa" font-size="9.5" font-weight="600">Record stores artifacts</text>
  <rect x="858" y="136" width="214" height="46" rx="10" fill="rgba(96,165,250,0.07)" stroke="#60a5fa" stroke-opacity="0.55"/>
  <text x="965" y="163" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">Runtime World</text>
  <rect x="858" y="244" width="214" height="46" rx="10" fill="rgba(45,212,191,0.06)" stroke="#2dd4bf" stroke-opacity="0.58"/>
  <text x="965" y="271" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">Exhibited Behavior</text>
  <line x1="198" y1="137" x2="288" y2="116" stroke="#34d399" stroke-width="1.3" marker-end="url(#d-actor)"/>
  <text x="238" y="116" fill="#5e9c82" font-size="8.5">participates</text>
  <line x1="198" y1="219" x2="288" y2="124" stroke="#34d399" stroke-width="1.3" stroke-dasharray="4 4" marker-end="url(#d-actor)"/>
  <line x1="198" y1="219" x2="288" y2="188" stroke="#34d399" stroke-width="1.3" marker-end="url(#d-actor)"/>
  <text x="232" y="203" fill="#5e9c82" font-size="8.5">participates</text>
  <line x1="198" y1="301" x2="288" y2="332" stroke="#fb923c" stroke-width="1.3" marker-end="url(#d-judge)"/>
  <text x="232" y="335" fill="#b07a4a" font-size="8.5">participates</text>
  <path d="M 300 322 C 248 300, 246 150, 294 122" fill="none" stroke="#fb923c" stroke-opacity="0.5" stroke-width="1.2" stroke-dasharray="2 3" marker-end="url(#d-judge)"/>
  <path d="M 300 326 C 260 314, 258 212, 294 190" fill="none" stroke="#fb923c" stroke-opacity="0.5" stroke-width="1.2" stroke-dasharray="2 3" marker-end="url(#d-judge)"/>
  <text x="242" y="250" text-anchor="middle" fill="#b07a4a" font-size="8" font-style="italic">validates the two hops</text>
  <line x1="460" y1="116" x2="562" y2="111" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#d-flow)"/>
  <text x="496" y="103" fill="#94a3b8" font-size="8.5">produces</text>
  <line x1="570" y1="132" x2="460" y2="181" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4 4" marker-end="url(#d-flow)"/>
  <text x="492" y="163" fill="#94a3b8" font-size="8.5">consumes</text>
  <line x1="460" y1="188" x2="562" y2="179" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#d-flow)"/>
  <text x="496" y="202" fill="#94a3b8" font-size="8.5">produces</text>
  <line x1="752" y1="179" x2="850" y2="159" stroke="#60a5fa" stroke-width="1.5" marker-end="url(#d-flow)"/>
  <text x="774" y="159" fill="#5b80ab" font-size="8.5">executes-in</text>
  <line x1="965" y1="182" x2="965" y2="236" stroke="#2dd4bf" stroke-width="1.5" marker-end="url(#d-flow)"/>
  <text x="976" y="213" fill="#5bbfb0" font-size="8.5">exhibits</text>
  <line x1="858" y1="267" x2="760" y2="247" stroke="#2dd4bf" stroke-width="1.5" marker-end="url(#d-flow)"/>
  <text x="778" y="278" fill="#5bbfb0" font-size="8.5">observed-as</text>
  <line x1="570" y1="247" x2="460" y2="260" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4 4" marker-end="url(#d-flow)"/>
  <text x="492" y="244" fill="#94a3b8" font-size="8.5">consumes</text>
  <line x1="460" y1="260" x2="562" y2="247" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#d-flow)"/>
  <text x="496" y="276" fill="#94a3b8" font-size="8.5">produces</text>
  <line x1="570" y1="111" x2="460" y2="318" stroke="#a78bfa" stroke-width="1.2" stroke-dasharray="4 4" marker-end="url(#d-store)"/>
  <text x="486" y="300" fill="#8b85a8" font-size="8.5">reference</text>
  <line x1="570" y1="247" x2="460" y2="326" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4 4" marker-end="url(#d-flow)"/>
  <text x="498" y="337" fill="#94a3b8" font-size="8.5">evidence</text>
  <line x1="460" y1="332" x2="562" y2="315" stroke="#fb923c" stroke-width="1.5" marker-end="url(#d-judge)"/>
  <text x="496" y="349" fill="#b07a4a" font-size="8.5">yields</text>
  <path d="M 661 132 L 661 350" fill="none" stroke="#a78bfa" stroke-opacity="0.38" stroke-dasharray="3 5" marker-end="url(#d-store)"/>
  <path d="M 661 336 L 661 350" fill="none" stroke="#a78bfa" stroke-opacity="0.55" marker-end="url(#d-store)"/>
  <path d="M 570 315 C 520 420, 500 440, 570 365" fill="none" stroke="#fb923c" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#d-store)"/>
  <text x="466" y="422" fill="#b07a4a" font-size="8.5">updates record</text>
  <rect x="36" y="438" width="1088" height="152" rx="12" fill="rgba(255,255,255,0.018)" stroke="rgba(255,255,255,0.08)"/>
  <text x="58" y="466" fill="#94a3b8" font-size="10" font-weight="700" letter-spacing="0.08em">DERIVED STABILIZERS</text>
  <text x="1100" y="466" text-anchor="end" fill="#64748b" font-size="9" font-style="italic">… more to come</text>
  <text x="58" y="482" fill="#64748b" font-size="8.8">Hover a stabilizer: it highlights the actor/process/object/environment obligations it touches. These are not MECE node kinds.</text>
  <g class="stabilizer" tabindex="0">
    <path class="st-link" d="M 166 524 C 300 420, 520 374, 661 365" fill="none" stroke="#a78bfa" stroke-width="1.6" stroke-dasharray="5 4"/>
    <path class="st-link" d="M 166 524 C 300 390, 500 134, 570 111" fill="none" stroke="#a78bfa" stroke-width="1.3" stroke-dasharray="5 4"/>
    <rect class="st-highlight" x="566" y="86" width="190" height="50" rx="10" fill="none" stroke="#a78bfa" stroke-width="2.2"/>
    <rect class="st-highlight" x="566" y="222" width="190" height="50" rx="10" fill="none" stroke="#a78bfa" stroke-width="2.2"/>
    <rect class="st-highlight" x="566" y="290" width="190" height="50" rx="10" fill="none" stroke="#a78bfa" stroke-width="2.2"/>
    <rect class="st-highlight" x="566" y="346" width="190" height="38" rx="9" fill="none" stroke="#a78bfa" stroke-width="2.2"/>
    <text class="st-note" x="314" y="430" fill="#c4b5fd">freezes the reference</text>
    <text class="st-note" x="430" y="396" fill="#c4b5fd">retains evidence + verdict</text>
    <rect class="stabilizer-card" x="58" y="504" width="230" height="62" rx="10" fill="rgba(167,139,250,0.045)" stroke="#a78bfa" stroke-opacity="0.45"/>
    <text x="74" y="526" fill="#a78bfa" font-size="10.5" font-weight="700">Durable record</text>
    <text x="74" y="542" fill="#cbd5e1" font-size="8.4">Reference and memory must persist:</text>
    <text x="74" y="555" fill="#64748b" font-size="8.1">spec, evidence, verdict, learnings.</text>
  </g>
  <g class="stabilizer" tabindex="0">
    <path class="st-link" d="M 428 524 C 300 436, 190 240, 128 219" fill="none" stroke="#34d399" stroke-width="1.6" stroke-dasharray="5 4"/>
    <path class="st-link" d="M 428 524 C 380 390, 378 240, 378 188" fill="none" stroke="#34d399" stroke-width="1.3" stroke-dasharray="5 4"/>
    <rect class="st-highlight" x="54" y="194" width="148" height="50" rx="10" fill="none" stroke="#34d399" stroke-width="2.2"/>
    <rect class="st-highlight" x="292" y="90" width="172" height="124" rx="24" fill="none" stroke="#34d399" stroke-width="2.2"/>
    <text class="st-note" x="238" y="432" fill="#6ee7b7">supplies context + tools</text>
    <text class="st-note" x="300" y="394" fill="#6ee7b7">makes crossing possible</text>
    <rect class="stabilizer-card" x="320" y="504" width="230" height="62" rx="10" fill="rgba(52,211,153,0.04)" stroke="#34d399" stroke-opacity="0.45"/>
    <text x="336" y="526" fill="#34d399" font-size="10.5" font-weight="700">Capable agent</text>
    <text x="336" y="542" fill="#cbd5e1" font-size="8.4">Agent participation must be real:</text>
    <text x="336" y="555" fill="#64748b" font-size="8.1">context, tools, permissions, bounds.</text>
  </g>
  <g class="stabilizer" tabindex="0">
    <path class="st-link" d="M 688 524 C 760 400, 862 196, 965 159" fill="none" stroke="#60a5fa" stroke-width="1.6" stroke-dasharray="5 4"/>
    <path class="st-link" d="M 688 524 C 836 458, 984 340, 965 267" fill="none" stroke="#60a5fa" stroke-width="1.3" stroke-dasharray="5 4"/>
    <rect class="st-highlight" x="854" y="132" width="222" height="54" rx="11" fill="none" stroke="#60a5fa" stroke-width="2.2"/>
    <rect class="st-highlight" x="854" y="240" width="222" height="54" rx="11" fill="none" stroke="#60a5fa" stroke-width="2.2"/>
    <line class="st-highlight" x1="752" y1="179" x2="850" y2="159" stroke="#60a5fa" stroke-width="2.4"/>
    <line class="st-highlight" x1="965" y1="182" x2="965" y2="236" stroke="#60a5fa" stroke-width="2.4"/>
    <text class="st-note" x="786" y="428" fill="#93c5fd">pins launch conditions</text>
    <text class="st-note" x="862" y="386" fill="#93c5fd">keeps runs comparable</text>
    <rect class="stabilizer-card" x="582" y="504" width="230" height="62" rx="10" fill="rgba(96,165,250,0.04)" stroke="#60a5fa" stroke-opacity="0.45"/>
    <text x="598" y="526" fill="#60a5fa" font-size="10.5" font-weight="700">Predictable world</text>
    <text x="598" y="542" fill="#cbd5e1" font-size="8.4">Runtime and observation must be stable</text>
    <text x="598" y="555" fill="#64748b" font-size="8.1">enough for evidence to mean something.</text>
  </g>
  <g class="stabilizer" tabindex="0">
    <path class="st-link" d="M 966 524 C 820 438, 630 346, 378 332" fill="none" stroke="#fb923c" stroke-width="1.6" stroke-dasharray="5 4"/>
    <path class="st-link" d="M 966 524 C 860 394, 720 310, 661 247" fill="none" stroke="#fb923c" stroke-width="1.3" stroke-dasharray="5 4"/>
    <rect class="st-highlight" x="54" y="276" width="148" height="50" rx="10" fill="none" stroke="#fb923c" stroke-width="2.2"/>
    <rect class="st-highlight" x="292" y="306" width="172" height="52" rx="24" fill="none" stroke="#fb923c" stroke-width="2.2"/>
    <rect class="st-highlight" x="566" y="222" width="190" height="50" rx="10" fill="none" stroke="#fb923c" stroke-width="2.2"/>
    <rect class="st-highlight" x="566" y="290" width="190" height="50" rx="10" fill="none" stroke="#fb923c" stroke-width="2.2"/>
    <text class="st-note" x="770" y="428" fill="#fdba74">keeps review affordable</text>
    <text class="st-note" x="694" y="388" fill="#fdba74">pre-pays validation with tests</text>
    <rect class="stabilizer-card" x="844" y="504" width="250" height="62" rx="10" fill="rgba(251,146,60,0.04)" stroke="#fb923c" stroke-opacity="0.45"/>
    <text x="860" y="526" fill="#fb923c" font-size="10.5" font-weight="700">Legible work</text>
    <text x="860" y="542" fill="#cbd5e1" font-size="8.4">Validation must be affordable:</text>
    <text x="860" y="555" fill="#64748b" font-size="8.1">small diffs, readable evidence, tests.</text>
  </g>
  <rect x="36" y="612" width="1088" height="190" rx="12" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)"/>
  <text x="58" y="640" fill="#94a3b8" font-size="10" font-weight="700" letter-spacing="0.08em">CHECKABLE INVARIANTS</text>
  <text x="58" y="668" fill="#cbd5e1" font-size="10.5">I1 · node kind is single-valued: Actor, Process, Artifact, Environment, Phenomenon are disjoint.</text>
  <text x="58" y="692" fill="#cbd5e1" font-size="10.5">I2 · every Process consumes at least one input and produces at least one output.</text>
  <text x="58" y="716" fill="#cbd5e1" font-size="10.5">I3 · only Actors participate in Processes; Artifacts do not act.</text>
  <text x="58" y="740" fill="#cbd5e1" font-size="10.5">I4 · Generation must consume Specification and produce Code; Observation must consume Behavior and produce Evidence.</text>
  <text x="58" y="764" fill="#cbd5e1" font-size="10.5">I5 · Validation must consume Specification plus Evidence and produce exactly one Verdict.</text>
  <text x="58" y="788" fill="#cbd5e1" font-size="10.5">I6 · Verdict may update Record; it does not automatically rewrite the Specification.</text>
</svg>`;

const CSS = `
.hx-typed .stabilizer{cursor:help;outline:none}
.hx-typed .st-link,.hx-typed .st-highlight,.hx-typed .st-note{opacity:0;pointer-events:none;transition:opacity .18s ease}
.hx-typed .stabilizer:hover .st-link,.hx-typed .stabilizer:focus .st-link,.hx-typed .stabilizer:hover .st-highlight,.hx-typed .stabilizer:focus .st-highlight,.hx-typed .stabilizer:hover .st-note,.hx-typed .stabilizer:focus .st-note{opacity:1}
.hx-typed .stabilizer-card{transition:stroke-opacity .18s ease,fill-opacity .18s ease}
.hx-typed .stabilizer:hover .stabilizer-card,.hx-typed .stabilizer:focus .stabilizer-card{stroke-opacity:0.85;fill-opacity:0.1}
.hx-typed .st-note{font-size:8.2px;font-weight:600;paint-order:stroke fill;stroke:#0d1117;stroke-width:3px;stroke-linejoin:round}
`;

export default function Typed({ isActive: _isActive }: SlideProps) {
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
        padding: "28px 40px 20px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Backdrop />
      <style>{CSS}</style>
      <div
        style={{
          position: "relative",
          flexShrink: 0,
          fontFamily: F.mono,
          fontSize: 12,
          color: P.spec,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 2,
        }}
      >
        1d · typed model — what the arrows are allowed to mean
      </div>
      <div
        style={{
          position: "relative",
          flexShrink: 0,
          fontSize: 11,
          color: P.textMid,
          marginBottom: 6,
        }}
      >
        Story boxes become typed nodes; arrows become typed relations. Hover a stabilizer.
      </div>
      <div
        className="hx-typed"
        style={{ position: "relative", flex: 1, minHeight: 0 }}
        dangerouslySetInnerHTML={{ __html: TYPED_SVG }}
      />
    </div>
  );
}
