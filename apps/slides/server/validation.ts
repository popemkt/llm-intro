import {
  THEME_NAMES,
  type ApiSlideBackground,
  type ApiSlideTransition,
  type Block,
  type SlideTransitionEngine,
  type SlideTransitionPhase,
  type SlideTransitionPreset,
  type ThemeName,
} from "@llm-intro/api-contract";
import { AppError } from "./errors.js";

type JsonRecord = Record<string, unknown>;
type BlockPosition = {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
  opacity?: number;
  shadow?: string;
  flipX?: boolean;
  flipY?: boolean;
  animation?: Block["animation"];
  linkTarget?: Block["linkTarget"];
  linkTitle?: string;
  linkUrl?: string;
  hidden?: boolean;
  locked?: boolean;
  groupId?: string;
  groupName?: string;
  displayName?: string;
};

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(400, "request body must be an object");
  }

  return value as JsonRecord;
}

function parseNonEmptyString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, `${field} is required`);
  }

  return value.trim();
}

function parseOptionalTrimmedString(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new AppError(400, `${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) throw new AppError(400, `${field} cannot be empty`);
  return trimmed;
}

function parseOptionalString(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new AppError(400, `${field} must be a string`);
  return value;
}

function parseTheme(value: unknown): ThemeName | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !THEME_NAMES.includes(value as (typeof THEME_NAMES)[number])) {
    throw new AppError(400, "theme is invalid");
  }
  return value as ThemeName;
}

function parsePosition(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new AppError(400, `${field} must be a number between 0 and 100`);
  }
  return value;
}

function parseBoundedNumber(
  value: unknown,
  field: string,
  { max, min }: { max: number; min: number },
) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new AppError(400, `${field} must be a number between ${min} and ${max}`);
  }
  return value;
}

function parseShapeDimension(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new AppError(400, `${field} must be a string`);
  return value;
}

function parsePositiveInteger(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new AppError(400, `${field} must be a positive integer`);
  }
  return value;
}

function parseOptionalColor(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, `${field} must be a non-empty string`);
  }
  return value;
}

function parseTextAlign(value: unknown) {
  if (value === undefined) return undefined;
  if (!["left", "center", "right"].includes(String(value))) {
    throw new AppError(400, "text block align is invalid");
  }
  return value as "left" | "center" | "right";
}

function parseFontStyle(value: unknown) {
  if (value === undefined) return undefined;
  if (!["normal", "italic"].includes(String(value))) {
    throw new AppError(400, "text block fontStyle is invalid");
  }
  return value as "normal" | "italic";
}

function parseObjectFit(value: unknown) {
  if (value === undefined) return undefined;
  if (!["contain", "cover", "fill"].includes(String(value))) {
    throw new AppError(400, "image block objectFit is invalid");
  }
  return value as "contain" | "cover" | "fill";
}

function parseSlideBackground(value: unknown): ApiSlideBackground | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const background = asRecord(value);
  const fill = parseOptionalColor(background.fill, "slide background fill");
  const imageUrl = parseOptionalString(background.imageUrl, "slide background imageUrl");
  const imageFit = parseObjectFit(background.imageFit);
  const imagePosition = parseOptionalString(
    background.imagePosition,
    "slide background imagePosition",
  );
  if (
    fill === undefined &&
    imageUrl === undefined &&
    imageFit === undefined &&
    imagePosition === undefined
  ) {
    throw new AppError(400, "slide background must include at least one field");
  }
  if (imageFit !== undefined && !imageUrl) {
    throw new AppError(400, "slide background imageFit requires imageUrl");
  }
  if (imagePosition !== undefined && !imageUrl) {
    throw new AppError(400, "slide background imagePosition requires imageUrl");
  }
  return { fill, imageUrl, imageFit, imagePosition };
}

function parseLineDash(value: unknown) {
  if (value === undefined) return undefined;
  if (!["solid", "dash", "dot"].includes(String(value))) {
    throw new AppError(400, "line block dash is invalid");
  }
  return value as "solid" | "dash" | "dot";
}

function parseTableRows(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError(400, "table block rows must be a non-empty array");
  }
  if (value.length > 30) throw new AppError(400, "table block rows must have 30 rows or less");
  return value.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length === 0) {
      throw new AppError(400, `table block row ${rowIndex + 1} must be a non-empty array`);
    }
    if (row.length > 12) {
      throw new AppError(400, `table block row ${rowIndex + 1} must have 12 cells or less`);
    }
    return row.map((cell, cellIndex) => {
      if (typeof cell !== "string") {
        throw new AppError(
          400,
          `table block cell ${rowIndex + 1}.${cellIndex + 1} must be a string`,
        );
      }
      return cell;
    });
  });
}

function parseChartKind(value: unknown) {
  if (!["bar", "line", "pie"].includes(String(value))) {
    throw new AppError(400, "chart block chart is invalid");
  }
  return value as "bar" | "line" | "pie";
}

function parseStringArray(value: unknown, field: string, max: number) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError(400, `${field} must be a non-empty array`);
  }
  if (value.length > max) throw new AppError(400, `${field} must have ${max} items or less`);
  return value.map((entry, index) => {
    if (typeof entry !== "string") throw new AppError(400, `${field}.${index} must be a string`);
    return entry;
  });
}

function parseNumberArray(value: unknown, field: string, max: number) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError(400, `${field} must be a non-empty array`);
  }
  if (value.length > max) throw new AppError(400, `${field} must have ${max} items or less`);
  return value.map((entry, index) => {
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      throw new AppError(400, `${field}.${index} must be a finite number`);
    }
    return entry;
  });
}

function parseChartSeries(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError(400, "chart block series must be a non-empty array");
  }
  if (value.length > 6) throw new AppError(400, "chart block series must have 6 items or less");
  return value.map((entry, index) => {
    const series = asRecord(entry);
    return {
      name: parseNonEmptyString(series.name, `chart block series.${index}.name`),
      values: parseNumberArray(series.values, `chart block series.${index}.values`, 20),
      color: parseOptionalColor(series.color, `chart block series.${index}.color`),
    };
  });
}

function parseOptionalBlockGroupString(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new AppError(400, `${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) throw new AppError(400, `${field} cannot be empty`);
  if (trimmed.length > 80) throw new AppError(400, `${field} must be 80 characters or less`);
  return trimmed;
}

function parseOptionalBlockStyleString(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new AppError(400, `${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) throw new AppError(400, `${field} cannot be empty`);
  if (trimmed.length > 160) throw new AppError(400, `${field} must be 160 characters or less`);
  return trimmed;
}

function parseOptionalBoolean(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new AppError(400, `${field} must be a boolean`);
  return value;
}

function parseOptionalLinkUrl(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new AppError(400, `${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) throw new AppError(400, `${field} cannot be empty`);
  if (trimmed.length > 2048) throw new AppError(400, `${field} must be 2048 characters or less`);
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    throw new AppError(400, `${field} uses an unsupported protocol`);
  }
  return trimmed;
}

function parseOptionalLinkTarget(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (value !== "_self" && value !== "_blank") {
    throw new AppError(400, `${field} must be _self or _blank`);
  }
  return value;
}

function parseBlockAnimation(value: unknown) {
  if (value === undefined) return undefined;
  const animation = asRecord(value);
  const preset = animation.preset;
  if (
    !["fade-in", "rise", "scale-in", "slide-left", "slide-right", "wipe-right", "pulse"].includes(
      String(preset),
    )
  ) {
    throw new AppError(400, "block.animation.preset is invalid");
  }
  return {
    preset: preset as NonNullable<Block["animation"]>["preset"],
    duration: parseBoundedNumber(animation.duration, "block.animation.duration", {
      min: 0,
      max: 10000,
    }),
    delay: parseBoundedNumber(animation.delay, "block.animation.delay", { min: 0, max: 10000 }),
    easing: parseTransitionEasing(animation.easing, "block.animation.easing"),
    iterationCount: parseBoundedNumber(animation.iterationCount, "block.animation.iterationCount", {
      min: 1,
      max: 20,
    }),
  };
}

function parseBlockIdentity(value: JsonRecord) {
  if (typeof value.id !== "string" || !value.id) throw new AppError(400, "block id is required");
  if (typeof value.type !== "string") throw new AppError(400, "block type is required");
  return { id: value.id, type: value.type };
}

function parseBlockPosition(value: JsonRecord): BlockPosition {
  return {
    x: parsePosition(value.x, "block.x"),
    y: parsePosition(value.y, "block.y"),
    w: parsePosition(value.w, "block.w"),
    h: parsePosition(value.h, "block.h"),
    rotation: parseBoundedNumber(value.rotation, "block.rotation", { min: -360, max: 360 }),
    opacity: parseBoundedNumber(value.opacity, "block.opacity", { min: 0, max: 1 }),
    shadow: parseOptionalBlockStyleString(value.shadow, "block.shadow"),
    flipX: parseOptionalBoolean(value.flipX, "block.flipX"),
    flipY: parseOptionalBoolean(value.flipY, "block.flipY"),
    animation: parseBlockAnimation(value.animation),
    linkUrl: parseOptionalLinkUrl(value.linkUrl, "block.linkUrl"),
    linkTitle: parseOptionalBlockGroupString(value.linkTitle, "block.linkTitle"),
    linkTarget: parseOptionalLinkTarget(value.linkTarget, "block.linkTarget"),
    hidden: parseOptionalBoolean(value.hidden, "block.hidden"),
    locked: parseOptionalBoolean(value.locked, "block.locked"),
    groupId: parseOptionalBlockGroupString(value.groupId, "block.groupId"),
    groupName: parseOptionalBlockGroupString(value.groupName, "block.groupName"),
    displayName: parseOptionalBlockGroupString(value.displayName, "block.displayName"),
  };
}

function validateTextBlock(id: string, value: JsonRecord, position: BlockPosition): Block {
  if (typeof value.markdown !== "string") {
    throw new AppError(400, "text block markdown must be a string");
  }
  return {
    id,
    type: "text",
    markdown: value.markdown,
    fontSize: parseBoundedNumber(value.fontSize, "text block fontSize", { min: 8, max: 180 }),
    fontFamily: parseOptionalBlockStyleString(value.fontFamily, "text block fontFamily"),
    fontWeight: parseBoundedNumber(value.fontWeight, "text block fontWeight", {
      min: 100,
      max: 900,
    }),
    fontStyle: parseFontStyle(value.fontStyle),
    lineHeight: parseBoundedNumber(value.lineHeight, "text block lineHeight", { min: 0.8, max: 3 }),
    color: parseOptionalColor(value.color, "text block color"),
    background: parseOptionalColor(value.background, "text block background"),
    align: parseTextAlign(value.align),
    padding: parseBoundedNumber(value.padding, "text block padding", { min: 0, max: 80 }),
    ...position,
  };
}

function validateImageBlock(id: string, value: JsonRecord, position: BlockPosition): Block {
  if (typeof value.url !== "string") {
    throw new AppError(400, "image block url must be a string");
  }
  if (value.alt !== undefined && typeof value.alt !== "string") {
    throw new AppError(400, "image block alt must be a string");
  }
  return {
    id,
    type: "image",
    url: value.url,
    assetId: parsePositiveInteger(value.assetId, "image block assetId"),
    alt: value.alt,
    objectFit: parseObjectFit(value.objectFit),
    objectPosition: parseOptionalBlockStyleString(
      value.objectPosition,
      "image block objectPosition",
    ),
    borderRadius: parseBoundedNumber(value.borderRadius, "image block borderRadius", {
      min: 0,
      max: 120,
    }),
    cropX: parseBoundedNumber(value.cropX, "image block cropX", { min: 0, max: 100 }),
    cropY: parseBoundedNumber(value.cropY, "image block cropY", { min: 0, max: 100 }),
    cropW: parseBoundedNumber(value.cropW, "image block cropW", { min: 1, max: 100 }),
    cropH: parseBoundedNumber(value.cropH, "image block cropH", { min: 1, max: 100 }),
    ...position,
  };
}

function validateIframeBlock(id: string, value: JsonRecord, position: BlockPosition): Block {
  if (typeof value.url !== "string") {
    throw new AppError(400, "iframe block url must be a string");
  }
  if (
    value.height !== undefined &&
    (typeof value.height !== "number" || !Number.isFinite(value.height) || value.height <= 0)
  ) {
    throw new AppError(400, "iframe block height must be a positive number");
  }
  return { id, type: "iframe", url: value.url, height: value.height, ...position };
}

function validateShapeBlock(id: string, value: JsonRecord, position: BlockPosition): Block {
  if (!["rect", "pill", "circle"].includes(String(value.shape))) {
    throw new AppError(400, "shape block shape is invalid");
  }
  if (typeof value.color !== "string" || !value.color) {
    throw new AppError(400, "shape block color is required");
  }
  if (value.label !== undefined && typeof value.label !== "string") {
    throw new AppError(400, "shape block label must be a string");
  }
  return {
    id,
    type: "shape",
    shape: value.shape as "rect" | "pill" | "circle",
    color: value.color,
    label: value.label as string | undefined,
    textColor: parseOptionalColor(value.textColor, "shape block textColor"),
    labelFontSize: parseBoundedNumber(value.labelFontSize, "shape block labelFontSize", {
      min: 8,
      max: 96,
    }),
    labelFontWeight: parseBoundedNumber(value.labelFontWeight, "shape block labelFontWeight", {
      min: 100,
      max: 900,
    }),
    borderColor: parseOptionalColor(value.borderColor, "shape block borderColor"),
    borderWidth: parseBoundedNumber(value.borderWidth, "shape block borderWidth", {
      min: 0,
      max: 24,
    }),
    width: parseShapeDimension(value.width, "shape block width"),
    height: parseShapeDimension(value.height, "shape block height"),
    ...position,
  };
}

function validateLineBlock(id: string, value: JsonRecord, position: BlockPosition): Block {
  if (typeof value.color !== "string" || !value.color) {
    throw new AppError(400, "line block color is required");
  }
  return {
    id,
    type: "line",
    color: value.color,
    strokeWidth: parseBoundedNumber(value.strokeWidth, "line block strokeWidth", {
      min: 1,
      max: 32,
    }),
    dash: parseLineDash(value.dash),
    startX: parsePosition(value.startX, "line block startX"),
    startY: parsePosition(value.startY, "line block startY"),
    endX: parsePosition(value.endX, "line block endX"),
    endY: parsePosition(value.endY, "line block endY"),
    startArrow: parseOptionalBoolean(value.startArrow, "line block startArrow"),
    endArrow: parseOptionalBoolean(value.endArrow, "line block endArrow"),
    ...position,
  };
}

function validateTableBlock(id: string, value: JsonRecord, position: BlockPosition): Block {
  return {
    id,
    type: "table",
    rows: parseTableRows(value.rows),
    headerRows: parseBoundedNumber(value.headerRows, "table block headerRows", {
      min: 0,
      max: 5,
    }),
    fontSize: parseBoundedNumber(value.fontSize, "table block fontSize", { min: 8, max: 80 }),
    color: parseOptionalColor(value.color, "table block color"),
    background: parseOptionalColor(value.background, "table block background"),
    headerBackground: parseOptionalColor(value.headerBackground, "table block headerBackground"),
    borderColor: parseOptionalColor(value.borderColor, "table block borderColor"),
    borderWidth: parseBoundedNumber(value.borderWidth, "table block borderWidth", {
      min: 0,
      max: 12,
    }),
    cellPadding: parseBoundedNumber(value.cellPadding, "table block cellPadding", {
      min: 0,
      max: 40,
    }),
    align: parseTextAlign(value.align),
    ...position,
  };
}

function validateChartBlock(id: string, value: JsonRecord, position: BlockPosition): Block {
  return {
    id,
    type: "chart",
    chart: parseChartKind(value.chart),
    categories: parseStringArray(value.categories, "chart block categories", 20),
    series: parseChartSeries(value.series),
    title: parseOptionalTrimmedString(value.title, "chart block title"),
    showLegend: parseOptionalBoolean(value.showLegend, "chart block showLegend"),
    showValues: parseOptionalBoolean(value.showValues, "chart block showValues"),
    axisColor: parseOptionalColor(value.axisColor, "chart block axisColor"),
    labelColor: parseOptionalColor(value.labelColor, "chart block labelColor"),
    background: parseOptionalColor(value.background, "chart block background"),
    ...position,
  };
}

function validateBlock(block: unknown): Block {
  const value = asRecord(block);
  const { id, type } = parseBlockIdentity(value);
  const position = parseBlockPosition(value);

  switch (type) {
    case "text":
      return validateTextBlock(id, value, position);
    case "image":
      return validateImageBlock(id, value, position);
    case "iframe":
      return validateIframeBlock(id, value, position);
    case "shape":
      return validateShapeBlock(id, value, position);
    case "line":
      return validateLineBlock(id, value, position);
    case "table":
      return validateTableBlock(id, value, position);
    case "chart":
      return validateChartBlock(id, value, position);
    default:
      throw new AppError(400, `unsupported block type: ${String(type)}`);
  }
}

export function parseBlocks(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new AppError(400, "blocks must be an array");
  return value.map(validateBlock);
}

function parseTransitionEngine(value: unknown): SlideTransitionEngine | undefined {
  if (value === undefined) return undefined;
  if (!["waapi", "css", "motion", "three", "custom"].includes(String(value))) {
    throw new AppError(400, "transition.engine is invalid");
  }
  return value as SlideTransitionEngine;
}

function parseTransitionName(value: unknown): SlideTransitionPreset | string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, "transition.name must be a non-empty string");
  }
  return value.trim();
}

function parseTransitionEasing(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, `${field} must be a non-empty string`);
  }
  return value.trim();
}

function parseTransitionDuration(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 5000) {
    throw new AppError(400, `${field} must be a number between 0 and 5000`);
  }
  return value;
}

function parseOptionalTransitionDuration(value: unknown, field: string) {
  if (value === undefined) return undefined;
  return parseTransitionDuration(value, field);
}

function parseTransitionKeyframe(value: unknown, field: string) {
  const frame = asRecord(value);
  const parsed: Record<string, string | number | boolean | null> = {};
  for (const [key, entry] of Object.entries(frame)) {
    if (
      typeof entry !== "string" &&
      typeof entry !== "number" &&
      typeof entry !== "boolean" &&
      entry !== null
    ) {
      throw new AppError(400, `${field}.${key} must be a string, number, boolean, or null`);
    }
    parsed[key] = entry;
  }
  return parsed;
}

function parseTransitionPhase(value: unknown, field: string): SlideTransitionPhase | undefined {
  if (value === undefined) return undefined;
  const phase = asRecord(value);
  if (!Array.isArray(phase.keyframes) || phase.keyframes.length === 0) {
    throw new AppError(400, `${field}.keyframes must be a non-empty array`);
  }
  return {
    keyframes: phase.keyframes.map((frame, index) =>
      parseTransitionKeyframe(frame, `${field}.keyframes[${index}]`),
    ),
    duration: parseOptionalTransitionDuration(phase.duration, `${field}.duration`),
    easing: parseTransitionEasing(phase.easing, `${field}.easing`),
    delay: parseOptionalTransitionDuration(phase.delay, `${field}.delay`),
  };
}

function parseTransition(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const transition = asRecord(value);
  return {
    engine: parseTransitionEngine(transition.engine),
    name: parseTransitionName(transition.name),
    duration: parseTransitionDuration(transition.duration, "transition.duration"),
    easing: parseTransitionEasing(transition.easing, "transition.easing"),
    enter: parseTransitionPhase(transition.enter, "transition.enter"),
    exit: parseTransitionPhase(transition.exit, "transition.exit"),
    params:
      transition.params === undefined
        ? undefined
        : (asRecord(transition.params) as Record<string, unknown>),
  } satisfies ApiSlideTransition;
}

export function parsePresentationCreate(input: unknown) {
  const body = asRecord(input);
  return {
    name: parseNonEmptyString(body.name, "name"),
    theme: parseTheme(body.theme) ?? "dark-green",
    defaultTransition: parseTransition(body.defaultTransition) ?? null,
  };
}

export function parsePresentationPatch(input: unknown) {
  const body = asRecord(input);
  const patch = {
    name: parseOptionalTrimmedString(body.name, "name"),
    theme: parseTheme(body.theme),
    defaultTransition: parseTransition(body.defaultTransition),
  };

  if (
    patch.name === undefined &&
    patch.theme === undefined &&
    patch.defaultTransition === undefined
  ) {
    throw new AppError(400, "at least one field is required");
  }

  return patch;
}

export function parseSlideCreate(input: unknown) {
  const body = asRecord(input);
  return {
    kind: "db" as const,
    title: parseOptionalTrimmedString(body.title, "title") ?? "New slide",
    blocks: parseBlocks(body.blocks) ?? [],
    notes: parseOptionalString(body.notes, "notes") ?? "",
    transition: parseTransition(body.transition),
    background: parseSlideBackground(body.background) ?? null,
  };
}

export function parseHtmlSlideCreate(input: unknown) {
  const body = asRecord(input);
  return {
    kind: "html" as const,
    title: parseOptionalTrimmedString(body.title, "title") ?? "New HTML slide",
    html: parseNonEmptyString(body.html, "html"),
    notes: parseOptionalString(body.notes, "notes") ?? "",
    transition: parseTransition(body.transition),
    background: parseSlideBackground(body.background) ?? null,
  };
}

export function parseSlidePatch(input: unknown) {
  const body = asRecord(input);
  const patch = {
    title: parseOptionalTrimmedString(body.title, "title"),
    blocks: parseBlocks(body.blocks),
    html: parseOptionalString(body.html, "html"),
    notes: parseOptionalString(body.notes, "notes"),
    transition: parseTransition(body.transition),
    background: parseSlideBackground(body.background),
  };

  if (
    patch.title === undefined &&
    patch.blocks === undefined &&
    patch.html === undefined &&
    patch.notes === undefined &&
    patch.transition === undefined &&
    patch.background === undefined
  ) {
    throw new AppError(400, "at least one field is required");
  }

  return patch;
}

function parseIdArray(value: unknown, field: string): number[] {
  if (
    !Array.isArray(value) ||
    value.some((id) => typeof id !== "number" || !Number.isInteger(id) || id <= 0)
  ) {
    throw new AppError(400, `${field} must be an array of positive integers`);
  }
  return value as number[];
}

export function parseLayout(input: unknown) {
  const body = asRecord(input);
  const ungrouped = parseIdArray(body.ungrouped ?? [], "ungrouped");
  if (!Array.isArray(body.groups)) throw new AppError(400, "groups must be an array");
  const groups = body.groups.map((entry, index) => {
    const group = asRecord(entry);
    if (typeof group.id !== "number" || !Number.isInteger(group.id) || group.id <= 0) {
      throw new AppError(400, `groups[${index}].id must be a positive integer`);
    }
    const slideIds = parseIdArray(group.slideIds ?? [], `groups[${index}].slideIds`);
    return { id: group.id, slideIds };
  });
  return { ungrouped, groups };
}

export function parseGroupCreate(input: unknown) {
  const body = asRecord(input);
  return { title: parseOptionalTrimmedString(body.title, "title") ?? "Group" };
}

export function parseGroupPatch(input: unknown) {
  const body = asRecord(input);
  const title = parseOptionalTrimmedString(body.title, "title");
  let collapsed: boolean | undefined;
  if (body.collapsed !== undefined) {
    if (typeof body.collapsed !== "boolean") throw new AppError(400, "collapsed must be a boolean");
    collapsed = body.collapsed;
  }
  if (title === undefined && collapsed === undefined) {
    throw new AppError(400, "at least one field is required");
  }
  return { title, collapsed };
}
