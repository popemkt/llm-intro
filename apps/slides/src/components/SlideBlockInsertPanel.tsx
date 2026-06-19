import { useState } from "react";
import {
  BarChart3,
  Columns2,
  GitBranch,
  Globe,
  Image as ImageIcon,
  List,
  Quote,
  Route,
  Square,
  SplitSquareHorizontal,
  Type,
} from "lucide-react";
import type { Block } from "@/types";
import { C } from "@/design/tokens";
import {
  buildManualPresetBlocks,
  MANUAL_PRESET_META,
  type ManualPresetIcon,
} from "../../shared/manual-presets";

type SlideBlockInsertPanelProps = {
  onAddBlock: (type: Block["type"]) => void;
  onAddBlocks: (blocks: Block[]) => void;
};

const primitiveBlocks = [
  { type: "text" as const, icon: <Type size={12} />, label: "Text" },
  { type: "image" as const, icon: <ImageIcon size={12} />, label: "Image" },
  { type: "iframe" as const, icon: <Globe size={12} />, label: "Embed" },
  { type: "shape" as const, icon: <Square size={12} />, label: "Shape" },
];

type PrimitiveBlockType = (typeof primitiveBlocks)[number]["type"];

const primitiveByCommand = new Map<string, PrimitiveBlockType>([
  ...primitiveBlocks.map((block) => [block.type, block.type] as const),
  ["embed", "iframe"],
]);

const iconByPreset: Record<ManualPresetIcon, React.ReactNode> = {
  "bar-chart": <BarChart3 size={12} />,
  columns: <Columns2 size={12} />,
  image: <ImageIcon size={12} />,
  list: <List size={12} />,
  quote: <Quote size={12} />,
  route: <Route size={12} />,
  split: <SplitSquareHorizontal size={12} />,
  timeline: <GitBranch size={12} />,
  type: <Type size={12} />,
};

const presetByCommand = new Map(
  MANUAL_PRESET_META.flatMap((preset) => [
    [preset.id, preset],
    [preset.label.toLowerCase(), preset],
    [preset.label.toLowerCase().replace(/\s+/g, "-"), preset],
    ...preset.commands.map((command) => [command, preset] as const),
  ]),
);

const buttonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 10px",
  borderRadius: 7,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 600,
  background: C.accentSubtle,
  border: `1px solid ${C.border}`,
  color: C.accent,
  fontFamily: "Inter, sans-serif",
};

export function SlideBlockInsertPanel({ onAddBlock, onAddBlocks }: SlideBlockInsertPanelProps) {
  const [command, setCommand] = useState("");

  function runCommand() {
    const value = command.trim().replace(/^\//, "").toLowerCase();
    if (!value) return;

    const primitive = primitiveByCommand.get(value);
    if (primitive) {
      onAddBlock(primitive);
      setCommand("");
      return;
    }

    const preset = presetByCommand.get(value);
    if (preset) {
      onAddBlocks(buildManualPresetBlocks(preset.id) as Block[]);
      setCommand("");
    }
  }

  return (
    <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
      <input
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") runCommand();
        }}
        placeholder="/title, /bullets, /quote, /metric"
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 7,
          padding: "7px 10px",
          color: C.text,
          fontSize: 12,
          outline: "none",
          marginBottom: 12,
        }}
      />
      <div
        style={{
          fontSize: 9,
          fontFamily: "JetBrains Mono, monospace",
          color: C.muted,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Add Block
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {primitiveBlocks.map(({ type, icon, label }) => (
          <button key={type} onClick={() => onAddBlock(type)} style={buttonStyle}>
            {icon} {label}
          </button>
        ))}
      </div>
      <div
        style={{
          fontSize: 9,
          fontFamily: "JetBrains Mono, monospace",
          color: C.muted,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Presets
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {MANUAL_PRESET_META.map((preset) => (
          <button
            key={preset.label}
            title={preset.description}
            onClick={() => onAddBlocks(buildManualPresetBlocks(preset.id) as Block[])}
            style={buttonStyle}
          >
            {iconByPreset[preset.icon]} {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
