CREATE TABLE IF NOT EXISTS presentations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'dark-green',
  system_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS presentations_system_key_unique
ON presentations(system_key)
WHERE system_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS slides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  presentation_id INTEGER NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'db',
  code_id TEXT,
  title TEXT NOT NULL DEFAULT 'Untitled',
  blocks TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS slides_presentation_position_unique
ON slides(presentation_id, position);

CREATE UNIQUE INDEX IF NOT EXISTS slides_presentation_code_id_unique
ON slides(presentation_id, code_id)
WHERE code_id IS NOT NULL;
