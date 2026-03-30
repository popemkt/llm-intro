import type Database from 'better-sqlite3'
import type { ApiSlide, Block } from '../../shared/api.js'

type SlideRow = {
  id: number
  presentation_id: number
  position: number
  kind: 'code' | 'db'
  code_id: string | null
  title: string
  blocks: string
  created_at: string
  updated_at: string
}

function mapSlide(row: SlideRow): ApiSlide {
  return {
    ...row,
    blocks: JSON.parse(row.blocks) as Block[],
  }
}

export function createSlidesRepository(db: Database.Database) {
  const listStmt = db.prepare('SELECT * FROM slides WHERE presentation_id=? ORDER BY position, id')
  const getByIdStmt = db.prepare('SELECT * FROM slides WHERE id=? AND presentation_id=?')
  const maxPositionStmt = db.prepare('SELECT MAX(position) as max_position FROM slides WHERE presentation_id=?')
  const insertStmt = db.prepare(
    "INSERT INTO slides (presentation_id, position, kind, title, blocks) VALUES (?, ?, 'db', ?, ?)",
  )
  const updateStmt = db.prepare(
    "UPDATE slides SET title=?, blocks=?, updated_at=datetime('now') WHERE id=?",
  )
  const deleteStmt = db.prepare('DELETE FROM slides WHERE id=? AND presentation_id=?')
  const tempPositionStmt = db.prepare(
    'UPDATE slides SET position=? WHERE id=? AND presentation_id=?',
  )
  const finalPositionStmt = db.prepare(
    "UPDATE slides SET position=?, updated_at=datetime('now') WHERE id=? AND presentation_id=?",
  )

  return {
    listByPresentationId(presentationId: number): ApiSlide[] {
      return (listStmt.all(presentationId) as SlideRow[]).map(mapSlide)
    },

    getById(presentationId: number, slideId: number): ApiSlide | null {
      const row = getByIdStmt.get(slideId, presentationId) as SlideRow | undefined
      return row ? mapSlide(row) : null
    },

    create(presentationId: number, input: { title: string; blocks: Block[] }): ApiSlide {
      const row = maxPositionStmt.get(presentationId) as { max_position: number | null }
      const position = (row.max_position ?? -1) + 1
      const { lastInsertRowid } = insertStmt.run(presentationId, position, input.title, JSON.stringify(input.blocks))
      return this.getById(presentationId, Number(lastInsertRowid))!
    },

    update(presentationId: number, slideId: number, input: { title: string; blocks: Block[] }): ApiSlide {
      updateStmt.run(input.title, JSON.stringify(input.blocks), slideId)
      return this.getById(presentationId, slideId)!
    },

    delete(presentationId: number, slideId: number): boolean {
      return deleteStmt.run(slideId, presentationId).changes > 0
    },

    replaceOrder(presentationId: number, ids: number[]): ApiSlide[] {
      db.transaction((orderedIds: number[]) => {
        orderedIds.forEach((id, index) => {
          tempPositionStmt.run(ids.length + index, id, presentationId)
        })
        orderedIds.forEach((id, index) => {
          finalPositionStmt.run(index, id, presentationId)
        })
      })(ids)

      return this.listByPresentationId(presentationId)
    },
  }
}
