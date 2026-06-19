import type { Block } from "@/types";

type ChartBlock = Extract<Block, { type: "chart" }>;

const FALLBACK_COLORS = ["#25d366", "#4c9fff", "#ffd93d", "#ff6b6b", "#a29bfe", "#00cec9"];
const CHART_WIDTH = 1000;
const CHART_HEIGHT = 562.5;
const PLOT = { bottom: 458, left: 86, right: 930, top: 82 };

function seriesColor(series: ChartBlock["series"][number], index: number) {
  return series.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function allValues(block: ChartBlock) {
  return block.series.flatMap((series) => series.values);
}

function maxValue(block: ChartBlock) {
  return Math.max(1, ...allValues(block).map((value) => Math.max(0, value)));
}

function yFor(value: number, max: number) {
  const plotHeight = PLOT.bottom - PLOT.top;
  return PLOT.bottom - (Math.max(0, value) / max) * plotHeight;
}

function pieSlicePath(cx: number, cy: number, radius: number, start: number, end: number) {
  const startX = cx + radius * Math.cos(start);
  const startY = cy + radius * Math.sin(start);
  const endX = cx + radius * Math.cos(end);
  const endY = cy + radius * Math.sin(end);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`;
}

export function ChartBlockView({ block }: { block: ChartBlock }) {
  const labelColor = block.labelColor ?? "var(--theme-text)";
  const axisColor = block.axisColor ?? "var(--theme-border)";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: block.background,
        color: labelColor,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={block.title ?? `${block.chart} chart`}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {block.title && (
          <text x={70} y={46} fill={labelColor} fontSize={28} fontWeight={700}>
            {block.title}
          </text>
        )}
        {block.chart === "pie" ? (
          <PieChart block={block} labelColor={labelColor} />
        ) : (
          <CartesianChart block={block} axisColor={axisColor} labelColor={labelColor} />
        )}
        {block.showLegend && <Legend block={block} labelColor={labelColor} />}
      </svg>
    </div>
  );
}

function CartesianChart({
  axisColor,
  block,
  labelColor,
}: {
  axisColor: string;
  block: ChartBlock;
  labelColor: string;
}) {
  const max = maxValue(block);
  return (
    <>
      <line x1={PLOT.left} y1={PLOT.bottom} x2={PLOT.right} y2={PLOT.bottom} stroke={axisColor} />
      <line x1={PLOT.left} y1={PLOT.top} x2={PLOT.left} y2={PLOT.bottom} stroke={axisColor} />
      {block.chart === "bar" ? (
        <BarChart block={block} max={max} labelColor={labelColor} />
      ) : (
        <LineChart block={block} max={max} labelColor={labelColor} />
      )}
    </>
  );
}

function BarChart({
  block,
  labelColor,
  max,
}: {
  block: ChartBlock;
  labelColor: string;
  max: number;
}) {
  const plotWidth = PLOT.right - PLOT.left;
  const band = plotWidth / Math.max(1, block.categories.length);
  const barGap = 8;
  const seriesCount = Math.max(1, block.series.length);
  const barWidth = Math.max(10, (band - 28) / seriesCount - barGap);
  return (
    <>
      {block.categories.map((category, categoryIndex) => (
        <g key={category}>
          {block.series.map((series, seriesIndex) => {
            const value = series.values[categoryIndex] ?? 0;
            const height = PLOT.bottom - yFor(value, max);
            const x = PLOT.left + categoryIndex * band + 16 + seriesIndex * (barWidth + barGap);
            return (
              <g key={series.name}>
                <rect
                  x={x}
                  y={PLOT.bottom - height}
                  width={barWidth}
                  height={height}
                  rx={5}
                  fill={seriesColor(series, seriesIndex)}
                />
                {block.showValues && (
                  <text
                    x={x + barWidth / 2}
                    y={PLOT.bottom - height - 10}
                    textAnchor="middle"
                    fill={labelColor}
                    fontSize={18}
                  >
                    {value}
                  </text>
                )}
              </g>
            );
          })}
          <text
            x={PLOT.left + categoryIndex * band + band / 2}
            y={PLOT.bottom + 34}
            textAnchor="middle"
            fill={labelColor}
            fontSize={18}
          >
            {category}
          </text>
        </g>
      ))}
    </>
  );
}

function LineChart({
  block,
  labelColor,
  max,
}: {
  block: ChartBlock;
  labelColor: string;
  max: number;
}) {
  const plotWidth = PLOT.right - PLOT.left;
  const step = plotWidth / Math.max(1, block.categories.length - 1);
  return (
    <>
      {block.categories.map((category, index) => (
        <text
          key={category}
          x={PLOT.left + index * step}
          y={PLOT.bottom + 34}
          textAnchor="middle"
          fill={labelColor}
          fontSize={18}
        >
          {category}
        </text>
      ))}
      {block.series.map((series, seriesIndex) => {
        const points = block.categories.map((_, index) => ({
          x: PLOT.left + index * step,
          y: yFor(series.values[index] ?? 0, max),
          value: series.values[index] ?? 0,
        }));
        return (
          <g key={series.name}>
            <polyline
              points={points.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke={seriesColor(series, seriesIndex)}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((point, index) => (
              <g key={index}>
                <circle cx={point.x} cy={point.y} r={8} fill={seriesColor(series, seriesIndex)} />
                {block.showValues && (
                  <text
                    x={point.x}
                    y={point.y - 16}
                    textAnchor="middle"
                    fill={labelColor}
                    fontSize={18}
                  >
                    {point.value}
                  </text>
                )}
              </g>
            ))}
          </g>
        );
      })}
    </>
  );
}

function PieChart({ block, labelColor }: { block: ChartBlock; labelColor: string }) {
  const series = block.series[0];
  const values = block.categories.map((_, index) => Math.max(0, series?.values[index] ?? 0));
  const total = Math.max(
    1,
    values.reduce((sum, value) => sum + value, 0),
  );
  let cursor = -Math.PI / 2;
  return (
    <>
      {values.map((value, index) => {
        const next = cursor + (value / total) * Math.PI * 2;
        const path = pieSlicePath(410, 282, 155, cursor, next);
        const mid = (cursor + next) / 2;
        cursor = next;
        return (
          <g key={block.categories[index]}>
            <path d={path} fill={seriesColor(series ?? { name: "", values: [] }, index)} />
            {block.showValues && (
              <text
                x={410 + 200 * Math.cos(mid)}
                y={282 + 200 * Math.sin(mid)}
                textAnchor="middle"
                fill={labelColor}
                fontSize={18}
              >
                {block.categories[index]} {value}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

function Legend({ block, labelColor }: { block: ChartBlock; labelColor: string }) {
  const entries =
    block.chart === "pie"
      ? block.categories.map((category, index) => ({
          color: seriesColor(block.series[0] ?? { name: "", values: [] }, index),
          name: category,
        }))
      : block.series.map((series, index) => ({
          color: seriesColor(series, index),
          name: series.name,
        }));
  return (
    <g>
      {entries.map((entry, index) => (
        <g key={entry.name} transform={`translate(700 ${96 + index * 32})`}>
          <rect width={18} height={18} rx={4} fill={entry.color} />
          <text x={28} y={15} fill={labelColor} fontSize={18}>
            {entry.name}
          </text>
        </g>
      ))}
    </g>
  );
}
