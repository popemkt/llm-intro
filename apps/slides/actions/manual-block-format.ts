import type { Block } from "@llm-intro/api-contract";

type ManualBlockFormatClipboard = { patch: Partial<Block>; sourceType: Block["type"] };

export function copyManualBlockFormat(block: Block): ManualBlockFormatClipboard {
  const common: Partial<Block> = {
    opacity: block.opacity,
    rotation: block.rotation,
    shadow: block.shadow,
  };

  switch (block.type) {
    case "text":
      return {
        sourceType: block.type,
        patch: {
          ...common,
          align: block.align,
          background: block.background,
          color: block.color,
          fontFamily: block.fontFamily,
          fontSize: block.fontSize,
          fontStyle: block.fontStyle,
          fontWeight: block.fontWeight,
          lineHeight: block.lineHeight,
          padding: block.padding,
        } as Partial<Block>,
      };
    case "image":
      return {
        sourceType: block.type,
        patch: {
          ...common,
          borderRadius: block.borderRadius,
          objectFit: block.objectFit,
          objectPosition: block.objectPosition,
        } as Partial<Block>,
      };
    case "iframe":
      return { sourceType: block.type, patch: common };
    case "shape":
      return {
        sourceType: block.type,
        patch: {
          ...common,
          borderColor: block.borderColor,
          borderWidth: block.borderWidth,
          color: block.color,
          height: block.height,
          labelFontSize: block.labelFontSize,
          labelFontWeight: block.labelFontWeight,
          shape: block.shape,
          textColor: block.textColor,
          width: block.width,
        } as Partial<Block>,
      };
    case "line":
      return {
        sourceType: block.type,
        patch: {
          ...common,
          color: block.color,
          dash: block.dash,
          endArrow: block.endArrow,
          startArrow: block.startArrow,
          strokeWidth: block.strokeWidth,
        } as Partial<Block>,
      };
    case "table":
      return {
        sourceType: block.type,
        patch: {
          ...common,
          align: block.align,
          background: block.background,
          borderColor: block.borderColor,
          borderWidth: block.borderWidth,
          cellPadding: block.cellPadding,
          color: block.color,
          fontSize: block.fontSize,
          headerBackground: block.headerBackground,
          headerRows: block.headerRows,
        } as Partial<Block>,
      };
    case "chart":
      return {
        sourceType: block.type,
        patch: {
          ...common,
          axisColor: block.axisColor,
          background: block.background,
          labelColor: block.labelColor,
          series: block.series.map((series) => ({ ...series, values: [...series.values] })),
          showLegend: block.showLegend,
          showValues: block.showValues,
        } as Partial<Block>,
      };
  }
}

export function applyManualBlockFormat(block: Block, clipboard: ManualBlockFormatClipboard): Block {
  const common = {
    opacity: clipboard.patch.opacity,
    rotation: clipboard.patch.rotation,
    shadow: clipboard.patch.shadow,
  };
  if (block.type !== clipboard.sourceType) return { ...block, ...common } as Block;
  return { ...block, ...clipboard.patch } as Block;
}
