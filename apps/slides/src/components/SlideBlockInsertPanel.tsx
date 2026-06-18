import { useState } from "react";
import { BarChart3, Globe, Image as ImageIcon, List, Quote, Square, Type } from "lucide-react";
import { nanoid } from "nanoid";
import type { Block } from "@/types";
import { C } from "@/design/tokens";

type SlideBlockInsertPanelProps = {
  onAddBlock: (type: Block["type"]) => void;
  onAddBlocks: (blocks: Block[]) => void;
};

type InsertPreset = {
  label: string;
  icon: React.ReactNode;
  blocks: () => Block[];
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

function textBlock(markdown: string, pos: { x: number; y: number; w: number; h: number }): Block {
  return { id: nanoid(), type: "text", markdown, ...pos };
}

function shapeBlock(label: string, pos: { x: number; y: number; w: number; h: number }): Block {
  return {
    id: nanoid(),
    type: "shape",
    shape: "pill",
    color: "#25d366",
    label,
    ...pos,
  };
}

const insertPresets: InsertPreset[] = [
  {
    label: "Title",
    icon: <Type size={12} />,
    blocks: () => [
      textBlock("# New slide title\nA concise supporting line.", { x: 8, y: 12, w: 84, h: 30 }),
    ],
  },
  {
    label: "Bullets",
    icon: <List size={12} />,
    blocks: () => [
      textBlock("## Key points\n- First point\n- Second point\n- Third point", {
        x: 10,
        y: 16,
        w: 78,
        h: 52,
      }),
    ],
  },
  {
    label: "Quote",
    icon: <Quote size={12} />,
    blocks: () => [
      textBlock("> Add a memorable quote here.\n\n-- Attribution", { x: 12, y: 24, w: 76, h: 36 }),
    ],
  },
  {
    label: "Metric",
    icon: <BarChart3 size={12} />,
    blocks: () => [
      textBlock("# 42%\nMetric label", { x: 12, y: 18, w: 28, h: 28 }),
      shapeBlock("Signal", { x: 48, y: 22, w: 34, h: 16 }),
    ],
  },
];

const presetByCommand = new Map(
  insertPresets.flatMap((preset) => [
    [preset.label.toLowerCase(), preset],
    [preset.label.toLowerCase().replace(/\s+/g, "-"), preset],
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
      onAddBlocks(preset.blocks());
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
        {insertPresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onAddBlocks(preset.blocks())}
            style={buttonStyle}
          >
            {preset.icon} {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
