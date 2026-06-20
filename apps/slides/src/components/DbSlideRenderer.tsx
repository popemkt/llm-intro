import ReactMarkdown from "react-markdown";
import type { ApiSlideBackground, Block, ThemeName } from "@/types";
import { getReadableTextColor } from "@/lib/color";
import { ChartBlockView } from "./ChartBlockView";

interface Props {
  background?: ApiSlideBackground | null;
  blocks: Block[];
  theme: ThemeName;
}

function cssUrl(value: string) {
  return `url("${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
}

function backgroundStyle(background?: ApiSlideBackground | null): React.CSSProperties {
  if (!background) return {};
  const imageUrl = background.imageUrl ? cssUrl(background.imageUrl) : undefined;
  const layeredGradient =
    background.imageUrl && background.fill?.includes("gradient(")
      ? `${imageUrl}, ${background.fill}`
      : undefined;
  return {
    background: layeredGradient ? undefined : (background.fill ?? "var(--theme-bg)"),
    backgroundImage: layeredGradient ?? imageUrl,
    backgroundPosition: background.imagePosition,
    backgroundRepeat: background.imageUrl ? "no-repeat" : undefined,
    backgroundSize:
      background.imageFit === "fill" ? "100% 100%" : (background.imageFit ?? undefined),
  };
}

export function DbSlideRenderer({ background, blocks, theme }: Props) {
  // Canvas mode: any block has percentage-based x/y positioning
  const isCanvas = blocks.some((b) => b.x !== undefined);

  return (
    <div
      data-theme={theme}
      style={{
        width: "100%",
        height: "100%",
        background: "var(--theme-bg)",
        ...backgroundStyle(background),
        color: "var(--theme-text)",
        fontFamily: "Inter, system-ui, sans-serif",
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
        ...(isCanvas
          ? {}
          : {
              padding: "32px 40px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }),
      }}
    >
      {blocks.length === 0 && (
        <div
          style={{
            ...(isCanvas
              ? {
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }
              : { margin: "auto" }),
            opacity: 0.25,
            fontSize: 13,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          empty slide
        </div>
      )}

      {isCanvas
        ? blocks.map((block) => (
            <div
              key={block.id}
              style={{
                position: "absolute",
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: `${block.w}%`,
                height: `${block.h}%`,
                overflow: "hidden",
                transform: block.rotation ? `rotate(${block.rotation}deg)` : undefined,
                opacity: block.opacity,
                boxShadow: block.shadow,
              }}
            >
              <BlockView block={block} canvas />
            </div>
          ))
        : blocks.map((block) => <BlockView key={block.id} block={block} />)}
    </div>
  );
}

function BlockView({ block, canvas }: { block: Block; canvas?: boolean }) {
  switch (block.type) {
    case "text":
      return <TextBlockView block={block} canvas={canvas} />;

    case "image":
      return <ImageBlockView block={block} canvas={canvas} />;

    case "iframe":
      return <IframeBlockView block={block} canvas={canvas} />;

    case "shape":
      return <ShapeBlockView block={block} canvas={canvas} />;

    case "line":
      return <LineBlockView block={block} />;

    case "table":
      return <TableBlockView block={block} canvas={canvas} />;

    case "chart":
      return <ChartBlockView block={block} />;
  }
}

function TextBlockView({
  block,
  canvas,
}: {
  block: Extract<Block, { type: "text" }>;
  canvas?: boolean;
}) {
  return (
    <div
      style={{
        fontSize: block.fontSize ? `${block.fontSize}px` : "clamp(0.85rem, 1.5vw, 1.05rem)",
        lineHeight: 1.7,
        color: block.color ?? "var(--theme-text)",
        background: block.background,
        textAlign: block.align,
        ...(canvas
          ? {
              width: "100%",
              height: "100%",
              padding: block.padding ?? "6px 10px",
              overflow: "auto",
              boxSizing: "border-box",
            }
          : {}),
      }}
      className="prose-block"
    >
      <ReactMarkdown>{block.markdown}</ReactMarkdown>
    </div>
  );
}

function ImageBlockView({
  block,
  canvas,
}: {
  block: Extract<Block, { type: "image" }>;
  canvas?: boolean;
}) {
  const imgStyle: React.CSSProperties = canvas
    ? {
        width: "100%",
        height: "100%",
        objectFit: block.objectFit ?? "contain",
        borderRadius: block.borderRadius,
      }
    : {
        maxWidth: "100%",
        maxHeight: 360,
        objectFit: block.objectFit ?? "contain",
        borderRadius: block.borderRadius ?? 8,
      };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        ...(canvas ? { width: "100%", height: "100%" } : {}),
      }}
    >
      <img src={block.url} alt={block.alt ?? ""} style={imgStyle} />
    </div>
  );
}

function IframeBlockView({
  block,
  canvas,
}: {
  block: Extract<Block, { type: "iframe" }>;
  canvas?: boolean;
}) {
  return (
    <iframe
      src={block.url}
      title="embedded"
      style={{
        width: "100%",
        height: canvas ? "100%" : (block.height ?? 300),
        border: "1px solid var(--theme-border)",
        borderRadius: 8,
        background: "var(--theme-surface)",
        display: "block",
      }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}

function ShapeBlockView({
  block,
  canvas,
}: {
  block: Extract<Block, { type: "shape" }>;
  canvas?: boolean;
}) {
  const radius = block.shape === "circle" ? "50%" : block.shape === "pill" ? 9999 : 10;
  const isCircle = block.shape === "circle";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        ...(canvas ? { width: "100%", height: "100%", alignItems: "center" } : {}),
      }}
    >
      <div
        style={{
          background: block.color,
          borderRadius: radius,
          border:
            block.borderWidth && block.borderWidth > 0
              ? `${block.borderWidth}px solid ${block.borderColor ?? "var(--theme-border)"}`
              : undefined,
          width: block.width ?? (isCircle ? 120 : "100%"),
          height: block.height ?? (isCircle ? 120 : canvas ? "100%" : "auto"),
          padding: isCircle || canvas ? 0 : "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: isCircle && !canvas ? 120 : undefined,
          boxShadow: `0 2px 12px ${block.color}44`,
        }}
      >
        {block.label && (
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: block.textColor ?? getReadableTextColor(block.color),
              fontFamily: "Inter, sans-serif",
            }}
          >
            {block.label}
          </span>
        )}
      </div>
    </div>
  );
}

function LineBlockView({ block }: { block: Extract<Block, { type: "line" }> }) {
  const markerId = `line-arrow-${block.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const strokeWidth = block.strokeWidth ?? 3;
  const dashArray = block.dash === "dash" ? "10 8" : block.dash === "dot" ? "2 7" : undefined;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-label="line"
      style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
    >
      {(block.startArrow || block.endArrow) && (
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto-start-reverse"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill={block.color} />
          </marker>
        </defs>
      )}
      <line
        x1={block.startX ?? 0}
        y1={block.startY ?? 50}
        x2={block.endX ?? 100}
        y2={block.endY ?? 50}
        stroke={block.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashArray}
        vectorEffect="non-scaling-stroke"
        markerStart={block.startArrow ? `url(#${markerId})` : undefined}
        markerEnd={block.endArrow ? `url(#${markerId})` : undefined}
      />
    </svg>
  );
}

function TableBlockView({
  block,
  canvas,
}: {
  block: Extract<Block, { type: "table" }>;
  canvas?: boolean;
}) {
  const borderWidth = block.borderWidth ?? 1;
  const border = `${borderWidth}px solid ${block.borderColor ?? "var(--theme-border)"}`;
  const headerRows = block.headerRows ?? 1;
  return (
    <div
      style={{
        width: canvas ? "100%" : undefined,
        height: canvas ? "100%" : undefined,
        overflow: "hidden",
        background: block.background,
        color: block.color ?? "var(--theme-text)",
        fontSize: block.fontSize ?? (canvas ? 13 : 15),
        boxSizing: "border-box",
      }}
    >
      <table
        style={{
          width: "100%",
          height: canvas ? "100%" : undefined,
          borderCollapse: "collapse",
          tableLayout: "fixed",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => {
                const isHeader = rowIndex < headerRows;
                const Cell = isHeader ? "th" : "td";
                return (
                  <Cell
                    key={cellIndex}
                    style={{
                      border: borderWidth > 0 ? border : undefined,
                      padding: block.cellPadding ?? (canvas ? 8 : 10),
                      textAlign: block.align ?? "left",
                      background: isHeader
                        ? (block.headerBackground ?? "var(--theme-surface)")
                        : undefined,
                      fontWeight: isHeader ? 700 : 500,
                      verticalAlign: "middle",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {cell}
                  </Cell>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
