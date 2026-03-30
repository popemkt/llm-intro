import { and, asc, desc, eq, inArray, not, sql } from 'drizzle-orm'
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import { SQLocalDrizzle } from 'sqlocal/drizzle'
import type { ApiPresentation, ApiSlide, Block, ThemeName } from '@/types'
import {
  BUILT_IN_SLIDES,
  SYSTEM_PRESENTATION_KEY,
  SYSTEM_PRESENTATION_NAME,
  SYSTEM_PRESENTATION_THEME,
} from '../../shared/systemPresentation'
import * as schema from './schema'
import initMigrationSql from './migrations/0000_init.sql?raw'

const SCHEMA_VERSION_KEY = 'schema_version'
const MIGRATIONS = [{ version: 1, sql: initMigrationSql }]

export type DatabaseRuntime = {
  client: SQLocalDrizzle
  db: SqliteRemoteDatabase<typeof schema>
}

export type DatabaseRuntimeOptions = {
  databasePath?: string
}

type MetaRow = { value: string }

export async function createDatabaseRuntime(
  options: DatabaseRuntimeOptions = {},
): Promise<DatabaseRuntime> {
  let resolveReady!: () => void
  let rejectReady!: (error: unknown) => void
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })

  const client = new SQLocalDrizzle({
    databasePath: options.databasePath ?? 'llm-intro.sqlite3',
    onConnect: () => resolveReady(),
  })
  const db = drizzle(client.driver, client.batchDriver, { schema })

  try {
    await ready
    await runMigrations(client)
    await bootstrapDatabase(db, client)
  } catch (error) {
    rejectReady(error)
    await client.destroy()
    throw error
  }

  return { client, db }
}

async function runMigrations(client: SQLocalDrizzle) {
  await client.sql`
    CREATE TABLE IF NOT EXISTS __app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `

  const currentVersion = await getSchemaVersion(client)
  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue

    const tx = await client.beginTransaction()
    try {
      for (const statement of splitSqlStatements(migration.sql)) {
        await tx.sql(statement)
      }
      await tx.sql`
        INSERT INTO __app_meta (key, value)
        VALUES (${SCHEMA_VERSION_KEY}, ${String(migration.version)})
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
      `
      await tx.commit()
    } catch (error) {
      await tx.rollback()
      throw error
    }
  }
}

async function getSchemaVersion(client: SQLocalDrizzle) {
  const rows = await client.sql<MetaRow>`
    SELECT value
    FROM __app_meta
    WHERE key = ${SCHEMA_VERSION_KEY}
    LIMIT 1
  `
  return Number(rows[0]?.value ?? '0')
}

function splitSqlStatements(source: string) {
  return source
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
}

async function bootstrapDatabase(db: SqliteRemoteDatabase<typeof schema>, client: SQLocalDrizzle) {
  const tx = await client.beginTransaction()

  try {
    const [existing] = await tx.query(
      db.select({
        id: schema.presentations.id,
        name: schema.presentations.name,
        theme: schema.presentations.theme,
      })
        .from(schema.presentations)
        .where(eq(schema.presentations.systemKey, SYSTEM_PRESENTATION_KEY))
        .limit(1),
    )

    let presentationId = existing?.id

    if (!presentationId) {
      const [inserted] = await tx.query(
        db.insert(schema.presentations)
          .values({
            name: SYSTEM_PRESENTATION_NAME,
            theme: SYSTEM_PRESENTATION_THEME,
            systemKey: SYSTEM_PRESENTATION_KEY,
          })
          .returning({ id: schema.presentations.id }),
      )
      presentationId = inserted.id
    }

    const existingSlides = await tx.query(
      db.select({
        id: schema.slides.id,
        codeId: schema.slides.codeId,
      })
        .from(schema.slides)
        .where(and(
          eq(schema.slides.presentationId, presentationId),
          eq(schema.slides.kind, 'code'),
        )),
    )

    const existingByCodeId = new Map(
      existingSlides
        .filter((slide) => slide.codeId !== null)
        .map((slide) => [slide.codeId as string, slide.id]),
    )

    for (const [position, builtInSlide] of BUILT_IN_SLIDES.entries()) {
      const existingId = existingByCodeId.get(builtInSlide.code_id)
      if (existingId) {
        await tx.query(
          db.update(schema.slides)
            .set({
              position,
              title: builtInSlide.title,
              kind: 'code',
              updatedAt: sql`datetime('now')`,
            })
            .where(eq(schema.slides.id, existingId)),
        )
      } else {
        await tx.query(
          db.insert(schema.slides).values({
            presentationId,
            position,
            kind: 'code',
            codeId: builtInSlide.code_id,
            title: builtInSlide.title,
            blocks: '[]',
          }),
        )
      }
    }

    const validCodeIds = BUILT_IN_SLIDES.map((slide) => slide.code_id)
    await tx.query(
      db.delete(schema.slides)
        .where(and(
          eq(schema.slides.presentationId, presentationId),
          eq(schema.slides.kind, 'code'),
          not(inArray(schema.slides.codeId, validCodeIds)),
        )),
    )

    await tx.commit()
  } catch (error) {
    await tx.rollback()
    throw error
  }
}

export function mapPresentation(row: schema.PresentationRow): ApiPresentation {
  return {
    id: row.id,
    name: row.name,
    theme: row.theme,
    system_key: row.systemKey,
    is_system: row.systemKey !== null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}

export function mapSlide(row: schema.SlideRow): ApiSlide {
  return {
    id: row.id,
    presentation_id: row.presentationId,
    position: row.position,
    kind: row.kind,
    code_id: row.codeId,
    title: row.title,
    blocks: schema.deserializeBlocks(row.blocks),
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}

export async function listPresentations(db: SqliteRemoteDatabase<typeof schema>) {
  const rows = await db.select().from(schema.presentations).orderBy(desc(schema.presentations.createdAt), desc(schema.presentations.id))
  return rows.map(mapPresentation)
}

export async function getPresentation(db: SqliteRemoteDatabase<typeof schema>, id: number) {
  const [row] = await db.select().from(schema.presentations).where(eq(schema.presentations.id, id)).limit(1)
  return row ? mapPresentation(row) : null
}

export async function createPresentation(
  db: SqliteRemoteDatabase<typeof schema>,
  input: { name: string; theme: ThemeName },
) {
  const [row] = await db.insert(schema.presentations)
    .values({ name: input.name, theme: input.theme })
    .returning()
  return mapPresentation(row)
}

export async function updatePresentation(
  db: SqliteRemoteDatabase<typeof schema>,
  id: number,
  input: { name: string; theme: ThemeName },
) {
  const [row] = await db.update(schema.presentations)
    .set({ name: input.name, theme: input.theme, updatedAt: sql`datetime('now')` })
    .where(eq(schema.presentations.id, id))
    .returning()
  return row ? mapPresentation(row) : null
}

export async function deletePresentation(db: SqliteRemoteDatabase<typeof schema>, id: number) {
  const deleted = await db.delete(schema.presentations).where(eq(schema.presentations.id, id)).returning({ id: schema.presentations.id })
  return deleted.length > 0
}

export async function listSlides(db: SqliteRemoteDatabase<typeof schema>, presentationId: number) {
  const rows = await db.select().from(schema.slides)
    .where(eq(schema.slides.presentationId, presentationId))
    .orderBy(asc(schema.slides.position), asc(schema.slides.id))
  return rows.map(mapSlide)
}

export async function getSlide(db: SqliteRemoteDatabase<typeof schema>, presentationId: number, slideId: number) {
  const [row] = await db.select().from(schema.slides)
    .where(and(eq(schema.slides.presentationId, presentationId), eq(schema.slides.id, slideId)))
    .limit(1)
  return row ? mapSlide(row) : null
}

export async function createSlide(
  db: SqliteRemoteDatabase<typeof schema>,
  presentationId: number,
  input: { title: string; blocks: Block[] },
) {
  const [maxPositionRow] = await db.select({
    maxPosition: sql<number>`coalesce(max(${schema.slides.position}), -1)`,
  })
    .from(schema.slides)
    .where(eq(schema.slides.presentationId, presentationId))

  const [row] = await db.insert(schema.slides)
    .values({
      presentationId,
      position: (maxPositionRow?.maxPosition ?? -1) + 1,
      kind: 'db',
      title: input.title,
      blocks: schema.serializeBlocks(input.blocks),
    })
    .returning()

  return mapSlide(row)
}

export async function updateSlide(
  db: SqliteRemoteDatabase<typeof schema>,
  presentationId: number,
  slideId: number,
  input: { title: string; blocks: Block[] },
) {
  const [row] = await db.update(schema.slides)
    .set({
      title: input.title,
      blocks: schema.serializeBlocks(input.blocks),
      updatedAt: sql`datetime('now')`,
    })
    .where(and(eq(schema.slides.presentationId, presentationId), eq(schema.slides.id, slideId)))
    .returning()

  return row ? mapSlide(row) : null
}

export async function deleteSlide(db: SqliteRemoteDatabase<typeof schema>, presentationId: number, slideId: number) {
  const deleted = await db.delete(schema.slides)
    .where(and(eq(schema.slides.presentationId, presentationId), eq(schema.slides.id, slideId)))
    .returning({ id: schema.slides.id })
  return deleted.length > 0
}

export async function replaceSlideOrder(
  runtime: DatabaseRuntime,
  presentationId: number,
  ids: number[],
) {
  const tx = await runtime.client.beginTransaction()

  try {
    for (const [index, id] of ids.entries()) {
      await tx.query(
        runtime.db.update(schema.slides)
          .set({ position: ids.length + index })
          .where(and(eq(schema.slides.presentationId, presentationId), eq(schema.slides.id, id))),
      )
    }

    for (const [index, id] of ids.entries()) {
      await tx.query(
        runtime.db.update(schema.slides)
          .set({ position: index, updatedAt: sql`datetime('now')` })
          .where(and(eq(schema.slides.presentationId, presentationId), eq(schema.slides.id, id))),
      )
    }

    await tx.commit()
  } catch (error) {
    await tx.rollback()
    throw error
  }

  return listSlides(runtime.db, presentationId)
}
