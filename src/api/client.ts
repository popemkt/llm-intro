import { THEME_NAMES, type ApiPresentation, type Block, type ThemeName } from '@/types'
import {
  createDatabaseRuntime,
  createPresentation,
  createSlide,
  deletePresentation,
  deleteSlide,
  getPresentation,
  getSlide,
  listPresentations,
  listSlides,
  replaceSlideOrder,
  updatePresentation,
  updateSlide,
  type DatabaseRuntime,
  type DatabaseRuntimeOptions,
} from '@/db/runtime'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong'
}

type ClientRuntime = Promise<DatabaseRuntime>

function createRuntimeFactory(options?: DatabaseRuntimeOptions) {
  let runtimePromise: ClientRuntime | null = null

  return () => {
    if (!runtimePromise) {
      runtimePromise = createDatabaseRuntime(options)
    }
    return runtimePromise
  }
}

function assert(condition: unknown, status: number, message: string): asserts condition {
  if (!condition) {
    throw new ApiError(status, message)
  }
}

function parseNonEmptyString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, `${field} is required`)
  }
  return value.trim()
}

function parseOptionalTrimmedString(value: unknown, field: string) {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new ApiError(400, `${field} must be a string`)
  const trimmed = value.trim()
  if (!trimmed) throw new ApiError(400, `${field} cannot be empty`)
  return trimmed
}

function parseTheme(value: unknown) {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !THEME_NAMES.includes(value as ThemeName)) {
    throw new ApiError(400, 'theme is invalid')
  }
  return value as ThemeName
}

function parsePosition(value: unknown, field: string) {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new ApiError(400, `${field} must be a number between 0 and 100`)
  }
  return value
}

function parseShapeDimension(value: unknown, field: string) {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new ApiError(400, `${field} must be a string`)
  return value
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'request body must be an object')
  }
  return value as Record<string, unknown>
}

function validateBlock(block: unknown): Block {
  const value = asRecord(block)

  if (typeof value.id !== 'string' || !value.id) throw new ApiError(400, 'block id is required')
  if (typeof value.type !== 'string') throw new ApiError(400, 'block type is required')

  const position = {
    x: parsePosition(value.x, 'block.x'),
    y: parsePosition(value.y, 'block.y'),
    w: parsePosition(value.w, 'block.w'),
    h: parsePosition(value.h, 'block.h'),
  }

  switch (value.type) {
    case 'text':
      if (typeof value.markdown !== 'string') throw new ApiError(400, 'text block markdown must be a string')
      return { id: value.id, type: 'text', markdown: value.markdown, ...position }
    case 'image':
      if (typeof value.url !== 'string') throw new ApiError(400, 'image block url must be a string')
      if (value.alt !== undefined && typeof value.alt !== 'string') throw new ApiError(400, 'image block alt must be a string')
      return { id: value.id, type: 'image', url: value.url, alt: value.alt, ...position }
    case 'iframe':
      if (typeof value.url !== 'string') throw new ApiError(400, 'iframe block url must be a string')
      if (value.height !== undefined && (typeof value.height !== 'number' || !Number.isFinite(value.height) || value.height <= 0)) {
        throw new ApiError(400, 'iframe block height must be a positive number')
      }
      return { id: value.id, type: 'iframe', url: value.url, height: value.height, ...position }
    case 'shape':
      if (!['rect', 'pill', 'circle'].includes(String(value.shape))) throw new ApiError(400, 'shape block shape is invalid')
      if (typeof value.color !== 'string' || !value.color) throw new ApiError(400, 'shape block color is required')
      if (value.label !== undefined && typeof value.label !== 'string') throw new ApiError(400, 'shape block label must be a string')
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
      throw new ApiError(400, `unsupported block type: ${String(value.type)}`)
  }
}

function parseBlocks(value: unknown) {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new ApiError(400, 'blocks must be an array')
  return value.map(validateBlock)
}

async function requirePresentation(runtime: DatabaseRuntime, id: number) {
  const presentation = await getPresentation(runtime.db, id)
  if (!presentation) throw new ApiError(404, 'presentation not found')
  return presentation
}

async function requireSlide(runtime: DatabaseRuntime, presentationId: number, slideId: number) {
  const slide = await getSlide(runtime.db, presentationId, slideId)
  if (!slide) throw new ApiError(404, 'slide not found')
  return slide
}

export function createLocalApi(options?: DatabaseRuntimeOptions) {
  const getRuntime = createRuntimeFactory(options)

  return {
    presentations: {
      list: async () => {
        const runtime = await getRuntime()
        return listPresentations(runtime.db)
      },

      get: async (id: number) => {
        const runtime = await getRuntime()
        return requirePresentation(runtime, id)
      },

      create: async (name: string, theme: ThemeName = 'dark-green') => {
        const runtime = await getRuntime()
        return createPresentation(runtime.db, {
          name: parseNonEmptyString(name, 'name'),
          theme: parseTheme(theme) ?? 'dark-green',
        })
      },

      update: async (id: number, patch: Partial<Pick<ApiPresentation, 'name' | 'theme'>>) => {
        const runtime = await getRuntime()
        const presentation = await requirePresentation(runtime, id)
        const nextName = parseOptionalTrimmedString(patch.name, 'name') ?? presentation.name
        const nextTheme = parseTheme(patch.theme) ?? presentation.theme

        assert(patch.name !== undefined || patch.theme !== undefined, 400, 'at least one field is required')

        const updated = await updatePresentation(runtime.db, id, {
          name: nextName,
          theme: nextTheme,
        })
        assert(updated, 404, 'presentation not found')
        return updated
      },

      delete: async (id: number) => {
        const runtime = await getRuntime()
        const presentation = await requirePresentation(runtime, id)
        assert(!presentation.is_system, 403, 'built-in presentations cannot be deleted')
        await deletePresentation(runtime.db, id)
      },
    },

    slides: {
      list: async (pid: number) => {
        const runtime = await getRuntime()
        await requirePresentation(runtime, pid)
        return listSlides(runtime.db, pid)
      },

      create: async (pid: number, title?: string) => {
        const runtime = await getRuntime()
        const presentation = await requirePresentation(runtime, pid)
        assert(!presentation.is_system, 403, 'built-in presentations are read-only')
        return createSlide(runtime.db, pid, {
          title: parseOptionalTrimmedString(title, 'title') ?? 'New slide',
          blocks: [],
        })
      },

      update: async (pid: number, sid: number, patch: { title?: string; blocks?: unknown[] }) => {
        const runtime = await getRuntime()
        await requirePresentation(runtime, pid)
        const slide = await requireSlide(runtime, pid, sid)
        assert(slide.kind !== 'code', 403, 'code slides are read-only')

        const nextTitle = parseOptionalTrimmedString(patch.title, 'title') ?? slide.title
        const nextBlocks = parseBlocks(patch.blocks) ?? slide.blocks
        assert(patch.title !== undefined || patch.blocks !== undefined, 400, 'at least one field is required')

        const updated = await updateSlide(runtime.db, pid, sid, {
          title: nextTitle,
          blocks: nextBlocks,
        })
        assert(updated, 404, 'slide not found')
        return updated
      },

      delete: async (pid: number, sid: number) => {
        const runtime = await getRuntime()
        const presentation = await requirePresentation(runtime, pid)
        assert(!presentation.is_system, 403, 'built-in presentations are read-only')
        const slide = await requireSlide(runtime, pid, sid)
        assert(slide.kind !== 'code', 403, 'code slides are read-only')
        await deleteSlide(runtime.db, pid, sid)
      },

      reorder: async (pid: number, ids: number[]) => {
        const runtime = await getRuntime()
        const presentation = await requirePresentation(runtime, pid)
        assert(!presentation.is_system, 403, 'built-in presentations are read-only')

        if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'number' || !Number.isInteger(id) || id <= 0)) {
          throw new ApiError(400, 'ids must be an array of positive integers')
        }

        const uniqueIds = new Set(ids)
        assert(uniqueIds.size === ids.length, 400, 'ids must be unique')

        const slides = await listSlides(runtime.db, pid)
        const slideIds = slides.map((slide) => slide.id)
        assert(ids.length === slideIds.length && ids.every((id) => slideIds.includes(id)), 400, 'ids must exactly match the presentation slide ids')

        return replaceSlideOrder(runtime, pid, ids)
      },
    },
  }
}

export const api = createLocalApi()
