import type Database from 'better-sqlite3'
import type { ApiPresentation, ThemeName } from '../../shared/api.js'

type PresentationRow = {
  id: number
  name: string
  theme: ThemeName
  created_at: string
  updated_at: string
}

function mapPresentation(row: PresentationRow): ApiPresentation {
  return { ...row }
}

export function createPresentationsRepository(db: Database.Database) {
  const listStmt = db.prepare('SELECT * FROM presentations ORDER BY created_at DESC, id DESC')
  const getByIdStmt = db.prepare('SELECT * FROM presentations WHERE id=?')
  const insertStmt = db.prepare(
    'INSERT INTO presentations (name, theme) VALUES (?, ?)',
  )
  const updateStmt = db.prepare(
    "UPDATE presentations SET name=?, theme=?, updated_at=datetime('now') WHERE id=?",
  )
  const deleteStmt = db.prepare('DELETE FROM presentations WHERE id=?')

  return {
    list(): ApiPresentation[] {
      return (listStmt.all() as PresentationRow[]).map(mapPresentation)
    },

    getById(id: number): ApiPresentation | null {
      const row = getByIdStmt.get(id) as PresentationRow | undefined
      return row ? mapPresentation(row) : null
    },

    create(input: { name: string; theme: ThemeName }): ApiPresentation {
      const { lastInsertRowid } = insertStmt.run(input.name, input.theme)
      return this.getById(Number(lastInsertRowid))!
    },

    update(id: number, input: { name: string; theme: ThemeName }): ApiPresentation {
      updateStmt.run(input.name, input.theme, id)
      return this.getById(id)!
    },

    delete(id: number): boolean {
      return deleteStmt.run(id).changes > 0
    },
  }
}
