import type Database from 'better-sqlite3'
import type { ApiSlideGroup } from '../../shared/api.js'

type GroupRow = {
  id: number
  presentation_id: number
  title: string
  position: number
  collapsed: number
  created_at: string
  updated_at: string
}

function mapGroup(row: GroupRow): ApiSlideGroup {
  return { ...row, collapsed: !!row.collapsed }
}

export function createGroupsRepository(db: Database.Database) {
  const listStmt = db.prepare('SELECT * FROM slide_groups WHERE presentation_id=? ORDER BY position, id')
  const getByIdStmt = db.prepare('SELECT * FROM slide_groups WHERE id=? AND presentation_id=?')
  const maxPositionStmt = db.prepare('SELECT MAX(position) as max_position FROM slide_groups WHERE presentation_id=?')
  const insertStmt = db.prepare(
    'INSERT INTO slide_groups (presentation_id, title, position, collapsed) VALUES (?, ?, ?, 0)',
  )
  const deleteStmt = db.prepare('DELETE FROM slide_groups WHERE id=? AND presentation_id=?')

  return {
    listByPresentationId(presentationId: number): ApiSlideGroup[] {
      return (listStmt.all(presentationId) as GroupRow[]).map(mapGroup)
    },

    getById(presentationId: number, groupId: number): ApiSlideGroup | null {
      const row = getByIdStmt.get(groupId, presentationId) as GroupRow | undefined
      return row ? mapGroup(row) : null
    },

    create(presentationId: number, title: string): ApiSlideGroup {
      const row = maxPositionStmt.get(presentationId) as { max_position: number | null }
      const position = (row.max_position ?? -1) + 1
      const { lastInsertRowid } = insertStmt.run(presentationId, title, position)
      return this.getById(presentationId, Number(lastInsertRowid))!
    },

    update(
      presentationId: number,
      groupId: number,
      patch: { title?: string; collapsed?: boolean },
    ): ApiSlideGroup | null {
      const assignments: string[] = []
      const values: Array<string | number> = []
      if (patch.title !== undefined) {
        assignments.push('title=?')
        values.push(patch.title)
      }
      if (patch.collapsed !== undefined) {
        assignments.push('collapsed=?')
        values.push(patch.collapsed ? 1 : 0)
      }
      if (assignments.length === 0) return this.getById(presentationId, groupId)
      assignments.push("updated_at=datetime('now')")
      values.push(groupId, presentationId)
      db.prepare(`UPDATE slide_groups SET ${assignments.join(', ')} WHERE id=? AND presentation_id=?`).run(...values)
      return this.getById(presentationId, groupId)
    },

    delete(presentationId: number, groupId: number): boolean {
      return deleteStmt.run(groupId, presentationId).changes > 0
    },
  }
}
