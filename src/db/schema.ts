import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import type { Block, ThemeName } from '@/types'

export const presentations = sqliteTable('presentations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  theme: text('theme').$type<ThemeName>().notNull().default('dark-green'),
  systemKey: text('system_key'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export const slides = sqliteTable('slides', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  presentationId: integer('presentation_id').notNull().references(() => presentations.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
  kind: text('kind').$type<'code' | 'db'>().notNull().default('db'),
  codeId: text('code_id'),
  title: text('title').notNull().default('Untitled'),
  blocks: text('blocks').$type<string>().notNull().default('[]'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export type PresentationRow = typeof presentations.$inferSelect
export type SlideRow = typeof slides.$inferSelect
export type SlideInsert = Omit<typeof slides.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>
export type SerializedBlocks = string

export function serializeBlocks(blocksValue: Block[]) {
  return JSON.stringify(blocksValue)
}

export function deserializeBlocks(blocksValue: SerializedBlocks) {
  return JSON.parse(blocksValue) as Block[]
}
