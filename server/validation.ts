import { THEME_NAMES, type Block } from '../shared/api.js'
import { AppError } from './errors.js'

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(400, 'request body must be an object')
  }

  return value as JsonRecord
}

function parseNonEmptyString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, `${field} is required`)
  }

  return value.trim()
}

function parseOptionalTrimmedString(value: unknown, field: string) {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new AppError(400, `${field} must be a string`)
  const trimmed = value.trim()
  if (!trimmed) throw new AppError(400, `${field} cannot be empty`)
  return trimmed
}

function parseTheme(value: unknown) {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !THEME_NAMES.includes(value as (typeof THEME_NAMES)[number])) {
    throw new AppError(400, 'theme is invalid')
  }
  return value
}

function parsePosition(value: unknown, field: string) {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new AppError(400, `${field} must be a number between 0 and 100`)
  }
  return value
}

function parseShapeDimension(value: unknown, field: string) {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new AppError(400, `${field} must be a string`)
  return value
}

function validateBlock(block: unknown): Block {
  const value = asRecord(block)

  if (typeof value.id !== 'string' || !value.id) throw new AppError(400, 'block id is required')
  if (typeof value.type !== 'string') throw new AppError(400, 'block type is required')

  const position = {
    x: parsePosition(value.x, 'block.x'),
    y: parsePosition(value.y, 'block.y'),
    w: parsePosition(value.w, 'block.w'),
    h: parsePosition(value.h, 'block.h'),
  }

  switch (value.type) {
    case 'text':
      if (typeof value.markdown !== 'string') throw new AppError(400, 'text block markdown must be a string')
      return { id: value.id, type: 'text', markdown: value.markdown, ...position }

    case 'image':
      if (typeof value.url !== 'string') throw new AppError(400, 'image block url must be a string')
      if (value.alt !== undefined && typeof value.alt !== 'string') throw new AppError(400, 'image block alt must be a string')
      return { id: value.id, type: 'image', url: value.url, alt: value.alt, ...position }

    case 'iframe':
      if (typeof value.url !== 'string') throw new AppError(400, 'iframe block url must be a string')
      if (value.height !== undefined && (typeof value.height !== 'number' || !Number.isFinite(value.height) || value.height <= 0)) {
        throw new AppError(400, 'iframe block height must be a positive number')
      }
      return { id: value.id, type: 'iframe', url: value.url, height: value.height, ...position }

    case 'shape':
      if (!['rect', 'pill', 'circle'].includes(String(value.shape))) throw new AppError(400, 'shape block shape is invalid')
      if (typeof value.color !== 'string' || !value.color) throw new AppError(400, 'shape block color is required')
      if (value.label !== undefined && typeof value.label !== 'string') throw new AppError(400, 'shape block label must be a string')
      return {
        id: value.id,
        type: 'shape',
        shape: value.shape as 'rect' | 'pill' | 'circle',
        color: value.color,
        label: value.label as string | undefined,
        width: parseShapeDimension(value.width, 'shape block width'),
        height: parseShapeDimension(value.height, 'shape block height'),
        ...position,
      }

    default:
      throw new AppError(400, `unsupported block type: ${String(value.type)}`)
  }
}

function parseBlocks(value: unknown) {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new AppError(400, 'blocks must be an array')
  return value.map(validateBlock)
}

export function parsePresentationCreate(input: unknown) {
  const body = asRecord(input)
  return {
    name: parseNonEmptyString(body.name, 'name'),
    theme: parseTheme(body.theme) ?? 'dark-green',
  }
}

export function parsePresentationPatch(input: unknown) {
  const body = asRecord(input)
  const patch = {
    name: parseOptionalTrimmedString(body.name, 'name'),
    theme: parseTheme(body.theme),
  }

  if (patch.name === undefined && patch.theme === undefined) {
    throw new AppError(400, 'at least one field is required')
  }

  return patch
}

export function parseSlideCreate(input: unknown) {
  const body = asRecord(input)
  return {
    title: parseOptionalTrimmedString(body.title, 'title') ?? 'New slide',
    blocks: parseBlocks(body.blocks) ?? [],
  }
}

export function parseSlidePatch(input: unknown) {
  const body = asRecord(input)
  const patch = {
    title: parseOptionalTrimmedString(body.title, 'title'),
    blocks: parseBlocks(body.blocks),
  }

  if (patch.title === undefined && patch.blocks === undefined) {
    throw new AppError(400, 'at least one field is required')
  }

  return patch
}

function parseIdArray(value: unknown, field: string): number[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'number' || !Number.isInteger(id) || id <= 0)) {
    throw new AppError(400, `${field} must be an array of positive integers`)
  }
  return value as number[]
}

export function parseLayout(input: unknown) {
  const body = asRecord(input)
  const ungrouped = parseIdArray(body.ungrouped ?? [], 'ungrouped')
  if (!Array.isArray(body.groups)) throw new AppError(400, 'groups must be an array')
  const groups = body.groups.map((entry, index) => {
    const group = asRecord(entry)
    if (typeof group.id !== 'number' || !Number.isInteger(group.id) || group.id <= 0) {
      throw new AppError(400, `groups[${index}].id must be a positive integer`)
    }
    const slideIds = parseIdArray(group.slideIds ?? [], `groups[${index}].slideIds`)
    return { id: group.id, slideIds }
  })
  return { ungrouped, groups }
}

export function parseGroupCreate(input: unknown) {
  const body = asRecord(input)
  return { title: parseOptionalTrimmedString(body.title, 'title') ?? 'Group' }
}

export function parseGroupPatch(input: unknown) {
  const body = asRecord(input)
  const title = parseOptionalTrimmedString(body.title, 'title')
  let collapsed: boolean | undefined
  if (body.collapsed !== undefined) {
    if (typeof body.collapsed !== 'boolean') throw new AppError(400, 'collapsed must be a boolean')
    collapsed = body.collapsed
  }
  if (title === undefined && collapsed === undefined) {
    throw new AppError(400, 'at least one field is required')
  }
  return { title, collapsed }
}
