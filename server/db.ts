import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DB_PATH = path.join(__dirname, 'data', 'app.db')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const LLM_INTRO_SLIDES = [
  { code_id: '01-opener',             title: 'What is an LLM?' },
  { code_id: '02-linear-regression',  title: 'Linear Regression → LLM' },
  { code_id: '03-tool-use',           title: 'Tool Use / Agent Loop' },
  { code_id: '04-claude-desktop',     title: 'Claude Desktop' },
  { code_id: '05-browser-control',    title: 'Browser Control (Playwright)' },
  { code_id: '06-workspace-setup',    title: 'Workspace Setup' },
  { code_id: '07-workspace-concepts', title: 'Workspace Concepts' },
  { code_id: '08-appendix',           title: 'Tech Landscape (Appendix)' },
]

migrate()
seed()

function migrate() {
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
      try { db.exec(sql) } catch { /* already exists */ }
    }
    db.pragma('user_version = 2')
  }
}

function seed() {
  let pres = db.prepare("SELECT id FROM presentations WHERE name = 'LLM & Agent Basics'").get() as { id: number } | undefined

  if (!pres) {
    const { lastInsertRowid } = db
      .prepare("INSERT INTO presentations (name, theme) VALUES ('LLM & Agent Basics', 'dark-green')")
      .run()
    pres = { id: Number(lastInsertRowid) }
  }

  // If all code slides are already there, nothing to do
  const codeCount = (db.prepare(
    "SELECT COUNT(*) as n FROM slides WHERE presentation_id=? AND kind='code'"
  ).get(pres.id) as { n: number }).n
  if (codeCount >= LLM_INTRO_SLIDES.length) return

  // Wipe and re-seed (handles migration leftover where slides got kind='db' by default)
  db.prepare('DELETE FROM slides WHERE presentation_id=?').run(pres.id)
  const insert = db.prepare(
    "INSERT INTO slides (presentation_id, position, kind, code_id, title, blocks) VALUES (?, ?, 'code', ?, ?, '[]')"
  )
  LLM_INTRO_SLIDES.forEach(({ code_id, title }, i) => insert.run(pres!.id, i, code_id, title))
}
