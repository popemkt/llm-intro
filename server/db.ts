import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const DB_PATH = path.join(__dirname, 'data', 'app.db')

export const SYSTEM_PRESENTATION_KEY = 'llm-intro'

const BUILT_IN_SLIDES = [
  { code_id: '01-opener', title: 'What is an LLM?' },
  { code_id: '02-linear-regression', title: 'Linear Regression → LLM' },
  { code_id: '03-tool-use', title: 'Tool Use / Agent Loop' },
  { code_id: '04-claude-desktop', title: 'Claude Desktop' },
  { code_id: '05-browser-control', title: 'Browser Control (Playwright)' },
  { code_id: '06-workspace-setup', title: 'Workspace Setup' },
  { code_id: '07-workspace-concepts', title: 'Workspace Concepts' },
  { code_id: '08-appendix', title: 'Tech Landscape (Appendix)' },
] as const

export function openDatabase(filePath = DB_PATH) {
  const db = new Database(filePath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function bootstrapDatabase(
  db: Database.Database,
  options: { seedSystemPresentation?: boolean } = {},
) {
  migrate(db)
  if (options.seedSystemPresentation ?? true) {
    seedSystemPresentation(db)
  }
}

function migrate(db: Database.Database) {
  const version = db.pragma('user_version', { simple: true }) as number

  if (version < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS presentations (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        theme      TEXT NOT NULL DEFAULT 'dark-green',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS slides (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        presentation_id INTEGER NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
        position        INTEGER NOT NULL DEFAULT 0,
        title           TEXT NOT NULL DEFAULT 'Untitled',
        blocks          TEXT NOT NULL DEFAULT '[]',
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
    db.pragma('user_version = 1')
  }

  if (version < 2) {
    for (const sql of [
      `ALTER TABLE slides ADD COLUMN kind TEXT NOT NULL DEFAULT 'db'`,
      `ALTER TABLE slides ADD COLUMN code_id TEXT`,
    ]) {
      try {
        db.exec(sql)
      } catch {
        // Column already exists.
      }
    }
    db.pragma('user_version = 2')
  }

  if (version < 3) {
    try {
      db.exec(`ALTER TABLE presentations ADD COLUMN system_key TEXT`)
    } catch {
      // Column already exists.
    }
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS presentations_system_key_unique
      ON presentations(system_key)
      WHERE system_key IS NOT NULL
    `)
    db.pragma('user_version = 3')
  }

  if (version < 4) {
    normalizeSlidePositions(db)
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS slides_presentation_position_unique
      ON slides(presentation_id, position);
      CREATE UNIQUE INDEX IF NOT EXISTS slides_presentation_code_id_unique
      ON slides(presentation_id, code_id)
      WHERE code_id IS NOT NULL
    `)
    db.pragma('user_version = 4')
  }
}

function normalizeSlidePositions(db: Database.Database) {
  const presentationIds = db.prepare('SELECT id FROM presentations ORDER BY id').all() as Array<{ id: number }>
  const update = db.prepare('UPDATE slides SET position=? WHERE id=?')

  db.transaction(() => {
    for (const { id } of presentationIds) {
      const slides = db
        .prepare('SELECT id FROM slides WHERE presentation_id=? ORDER BY position, id')
        .all(id) as Array<{ id: number }>

      slides.forEach((slide, index) => {
        update.run(index, slide.id)
      })
    }
  })()
}

function seedSystemPresentation(db: Database.Database) {
  const existing = db
    .prepare('SELECT id, name, theme FROM presentations WHERE system_key=?')
    .get(SYSTEM_PRESENTATION_KEY) as { id: number; name: string; theme: string } | undefined

  let presentationId: number

  if (existing) {
    presentationId = existing.id
  } else {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO presentations (name, theme, system_key) VALUES (?, ?, ?)')
      .run('LLM & Agent Basics', 'dark-green', SYSTEM_PRESENTATION_KEY)
    presentationId = Number(lastInsertRowid)
  }

  const selectSlide = db.prepare(
    'SELECT id FROM slides WHERE presentation_id=? AND code_id=?',
  )
  const insertSlide = db.prepare(
    "INSERT INTO slides (presentation_id, position, kind, code_id, title, blocks) VALUES (?, ?, 'code', ?, ?, '[]')",
  )
  const updateSlide = db.prepare(
    "UPDATE slides SET position=?, title=?, kind='code', updated_at=datetime('now') WHERE id=?",
  )
  const deleteMissing = db.prepare(
    `DELETE FROM slides
     WHERE presentation_id=?
       AND kind='code'
       AND code_id NOT IN (${BUILT_IN_SLIDES.map(() => '?').join(', ')})`,
  )

  db.transaction(() => {
    BUILT_IN_SLIDES.forEach(({ code_id, title }, position) => {
      const row = selectSlide.get(presentationId, code_id) as { id: number } | undefined
      if (row) {
        updateSlide.run(position, title, row.id)
      } else {
        insertSlide.run(presentationId, position, code_id, title)
      }
    })
    deleteMissing.run(presentationId, ...BUILT_IN_SLIDES.map((slide) => slide.code_id))
  })()
}
