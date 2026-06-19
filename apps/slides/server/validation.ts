import { THEME_NAMES, type Block, type ThemeName } from "@llm-intro/api-contract";
import { AppError } from "./errors.js";

type JsonRecord = Record<string, unknown>;
type BlockPosition = {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
  opacity?: number;
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
    default:
      throw new AppError(400, `unsupported block type: ${String(type)}`);
  }
}

function parseBlocks(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new AppError(400, "blocks must be an array");
  return value.map(validateBlock);
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
  };
}

export function parseHtmlSlideCreate(input: unknown) {
  const body = asRecord(input);
  return {
    kind: "html" as const,
    title: parseOptionalTrimmedString(body.title, "title") ?? "New HTML slide",
    html: parseNonEmptyString(body.html, "html"),
    notes: parseOptionalString(body.notes, "notes") ?? "",
  };
}

export function parseSlidePatch(input: unknown) {
  const body = asRecord(input);
  const patch = {
    title: parseOptionalTrimmedString(body.title, "title"),
    blocks: parseBlocks(body.blocks),
    html: parseOptionalString(body.html, "html"),
    notes: parseOptionalString(body.notes, "notes"),
  };

  if (
    patch.title === undefined &&
    patch.blocks === undefined &&
    patch.html === undefined &&
    patch.notes === undefined
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
