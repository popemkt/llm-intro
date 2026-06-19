import {
  THEME_NAMES,
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
  locked?: boolean;
  groupId?: string;
  groupName?: string;
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

function parseObjectFit(value: unknown) {
  if (value === undefined) return undefined;
  if (!["contain", "cover", "fill"].includes(String(value))) {
    throw new AppError(400, "image block objectFit is invalid");
  }
  return value as "contain" | "cover" | "fill";
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

function parseOptionalBlockGroupString(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new AppError(400, `${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) throw new AppError(400, `${field} cannot be empty`);
  if (trimmed.length > 80) throw new AppError(400, `${field} must be 80 characters or less`);
  return trimmed;
}

function parseOptionalBoolean(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new AppError(400, `${field} must be a boolean`);
  return value;
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
    locked: parseOptionalBoolean(value.locked, "block.locked"),
    groupId: parseOptionalBlockGroupString(value.groupId, "block.groupId"),
    groupName: parseOptionalBlockGroupString(value.groupName, "block.groupName"),
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
    alt: value.alt,
    objectFit: parseObjectFit(value.objectFit),
    borderRadius: parseBoundedNumber(value.borderRadius, "image block borderRadius", {
      min: 0,
      max: 120,
    }),
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
  };
}

export function parsePresentationPatch(input: unknown) {
  const body = asRecord(input);
  const patch = {
    name: parseOptionalTrimmedString(body.name, "name"),
    theme: parseTheme(body.theme),
  };

  if (patch.name === undefined && patch.theme === undefined) {
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
  };

  if (
    patch.title === undefined &&
    patch.blocks === undefined &&
    patch.html === undefined &&
    patch.notes === undefined &&
    patch.transition === undefined
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
