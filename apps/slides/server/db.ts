import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DB_PATH = path.join(__dirname, "data", "app.db");

const SEED_PRESENTATION_KEY = "llm-intro";
const SEED_PRESENTATION_NAME = "LLM & Agent Basics";

const BUILT_IN_SLIDES = [
  { code_id: "01-opener", title: "What is an LLM?" },
  { code_id: "02-linear-regression", title: "Linear Regression → LLM" },
  { code_id: "10-word-dimensions", title: "How Words Become Numbers" },
  { code_id: "03-context", title: "Context Window" },
  { code_id: "04-tool-use", title: "Tool Use / Agent Loop" },
  { code_id: "05-claude-desktop", title: "Claude Desktop" },
  { code_id: "06-browser-control", title: "Browser Control (Playwright)" },
  { code_id: "07-workspace-setup", title: "Workspace Setup" },
  { code_id: "08-workspace-concepts", title: "Workspace Concepts" },
  { code_id: "09-appendix", title: "Tech Landscape (Appendix)" },
] as const;

// One-time seed for the system presentation's group layout. Applied only
// when the presentation has no groups yet, so user customisations on
// existing databases are preserved.
const SEED_LAYOUT = {
  ungrouped: ["06-browser-control", "08-workspace-concepts"] as string[],
  groups: [
    {
      title: "How it works from a visible standpoint",
      slides: ["01-opener", "02-linear-regression", "04-tool-use", "03-context"],
    },
    { title: "Indepth theory", slides: ["10-word-dimensions"] },
    { title: "Claude code", slides: ["05-claude-desktop", "07-workspace-setup"] },
    { title: "Advanced tools and workflows", slides: ["09-appendix"] },
    { title: "Cowork", slides: [] as string[] },
  ],
} as const;

export function openDatabase(filePath = process.env.LLM_INTRO_DB_PATH ?? DB_PATH) {
  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function bootstrapDatabase(
  db: Database.Database,
  options: { seedSystemPresentation?: boolean } = {},
) {
  migrate(db);
  if (options.seedSystemPresentation ?? true) {
    seedSystemPresentation(db);
  }
}

function migrate(db: Database.Database) {
  const version = db.pragma("user_version", { simple: true }) as number;

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
    `);
    db.pragma("user_version = 1");
  }

  if (version < 2) {
    for (const sql of [
      `ALTER TABLE slides ADD COLUMN kind TEXT NOT NULL DEFAULT 'db'`,
      `ALTER TABLE slides ADD COLUMN code_id TEXT`,
    ]) {
      try {
        db.exec(sql);
      } catch {
        // Column already exists.
      }
    }
    db.pragma("user_version = 2");
  }

  if (version < 3) {
    try {
      db.exec(`ALTER TABLE presentations ADD COLUMN system_key TEXT`);
    } catch {
      // Column already exists.
    }
    db.pragma("user_version = 3");
  }

  if (version < 4) {
    normalizeSlidePositions(db);
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS slides_presentation_position_unique
      ON slides(presentation_id, position);
      CREATE UNIQUE INDEX IF NOT EXISTS slides_presentation_code_id_unique
      ON slides(presentation_id, code_id)
      WHERE code_id IS NOT NULL
    `);
    db.pragma("user_version = 4");
  }

  if (version < 5) {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS presentations_system_key_unique
      ON presentations(system_key)
      WHERE system_key IS NOT NULL
    `);
    db.pragma("user_version = 5");
  }

  if (version < 6) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS slide_groups (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        presentation_id INTEGER NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
        title           TEXT NOT NULL DEFAULT 'Group',
        position        INTEGER NOT NULL DEFAULT 0,
        collapsed       INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS slide_groups_presentation_idx ON slide_groups(presentation_id, position);
    `);
    try {
      db.exec(
        `ALTER TABLE slides ADD COLUMN group_id INTEGER REFERENCES slide_groups(id) ON DELETE SET NULL`,
      );
    } catch {
      // Column already exists.
    }
    // Positions now scoped per-bucket (null group = ungrouped); old global
    // uniqueness no longer applies.
    db.exec(`DROP INDEX IF EXISTS slides_presentation_position_unique`);
    db.pragma("user_version = 6");
  }

  if (version < 7) {
    migrateDeckSnapshots(db);
    db.pragma("user_version = 7");
  }

  if (version < 8) {
    migrateSlideNotes(db);
    db.pragma("user_version = 8");
  }

  if (version < 9) {
    migrateDeckAssets(db);
    db.pragma("user_version = 9");
  }

  if (version < 10) {
    migrateHtmlSlides(db);
    db.pragma("user_version = 10");
  }

  if (version < 11) {
    migrateSlideTransitions(db);
    db.pragma("user_version = 11");
  }

  if (version < 12) {
    migrateSlideBackgrounds(db);
    db.pragma("user_version = 12");
  }

  if (version < 13) {
    migratePresentationDefaultTransitions(db);
    db.pragma("user_version = 13");
  }

  if (version < 14) {
    migrateExtensions(db);
    db.pragma("user_version = 14");
  }
}

// Agent-native "extensions": user/agent-authored sandboxed apps plus the slot
// system that lets them render into named UI mount points, and a per-extension
// key/value store. Mirrors the framework's tool_* schema (renamed extension_*)
// so the stock @agent-native client components work against this local server.
function migrateExtensions(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS extensions (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      content     TEXT NOT NULL DEFAULT '',
      icon        TEXT,
      owner_email TEXT NOT NULL DEFAULT 'local-user',
      visibility  TEXT NOT NULL DEFAULT 'private',
      hidden_at   TEXT,
      hidden_by   TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS extension_slots (
      id           TEXT PRIMARY KEY,
      extension_id TEXT NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
      slot_id      TEXT NOT NULL,
      config       TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(extension_id, slot_id)
    );
    CREATE INDEX IF NOT EXISTS extension_slots_slot_idx ON extension_slots(slot_id);

    CREATE TABLE IF NOT EXISTS extension_slot_installs (
      id           TEXT PRIMARY KEY,
      extension_id TEXT NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
      slot_id      TEXT NOT NULL,
      owner_email  TEXT NOT NULL DEFAULT 'local-user',
      position     INTEGER NOT NULL DEFAULT 0,
      config       TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(extension_id, slot_id, owner_email)
    );
    CREATE INDEX IF NOT EXISTS extension_slot_installs_slot_idx
      ON extension_slot_installs(slot_id, owner_email, position);

    CREATE TABLE IF NOT EXISTS extension_data (
      extension_id TEXT NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
      collection   TEXT NOT NULL DEFAULT 'default',
      item_id      TEXT NOT NULL,
      data         TEXT NOT NULL,
      scope        TEXT NOT NULL DEFAULT 'user',
      scope_key    TEXT NOT NULL DEFAULT 'local-user',
      updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (extension_id, collection, item_id, scope, scope_key)
    );
  `);
}

function migrateDeckSnapshots(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS deck_snapshots (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      presentation_id INTEGER NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
      label           TEXT NOT NULL,
      deck_name       TEXT NOT NULL,
      slide_count     INTEGER NOT NULL DEFAULT 0,
      group_count     INTEGER NOT NULL DEFAULT 0,
      payload         TEXT NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS deck_snapshots_presentation_created_idx
    ON deck_snapshots(presentation_id, created_at DESC, id DESC);
  `);
}

function migrateSlideNotes(db: Database.Database) {
  try {
    db.exec(`ALTER TABLE slides ADD COLUMN notes TEXT NOT NULL DEFAULT ''`);
  } catch {
    // Column already exists.
  }
}

function migrateDeckAssets(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS deck_assets (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      presentation_id INTEGER NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      kind            TEXT NOT NULL DEFAULT 'other',
      mime_type       TEXT NOT NULL,
      content         TEXT NOT NULL,
      source_url      TEXT,
      source_name     TEXT,
      license         TEXT,
      usage           TEXT,
      metadata        TEXT NOT NULL DEFAULT '{}',
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS deck_assets_presentation_idx
    ON deck_assets(presentation_id, kind, name);
  `);
}

function migrateHtmlSlides(db: Database.Database) {
  try {
    db.exec(`ALTER TABLE slides ADD COLUMN html TEXT NOT NULL DEFAULT ''`);
  } catch {
    // Column already exists.
  }
}

function migrateSlideTransitions(db: Database.Database) {
  try {
    db.exec(`ALTER TABLE slides ADD COLUMN transition_json TEXT`);
  } catch {
    // Column already exists.
  }
}

function migrateSlideBackgrounds(db: Database.Database) {
  try {
    db.exec(`ALTER TABLE slides ADD COLUMN background_json TEXT`);
  } catch {
    // Column already exists.
  }
}

function migratePresentationDefaultTransitions(db: Database.Database) {
  try {
    db.exec(`ALTER TABLE presentations ADD COLUMN default_transition_json TEXT`);
  } catch {
    // Column already exists.
  }
}

function normalizeSlidePositions(db: Database.Database) {
  const presentationIds = db.prepare("SELECT id FROM presentations ORDER BY id").all() as Array<{
    id: number;
  }>;
  const update = db.prepare("UPDATE slides SET position=? WHERE id=?");

  db.transaction(() => {
    for (const { id } of presentationIds) {
      const slides = db
        .prepare("SELECT id FROM slides WHERE presentation_id=? ORDER BY position, id")
        .all(id) as Array<{ id: number }>;

      slides.forEach((slide, index) => {
        update.run(index, slide.id);
      });
    }
  })();
}

function seedSystemPresentation(db: Database.Database) {
  const selectBySystemKey = db.prepare("SELECT id FROM presentations WHERE system_key=?");
  const selectByName = db.prepare("SELECT id FROM presentations WHERE name=?");
  const attachSystemKey = db.prepare("UPDATE presentations SET system_key=? WHERE id=?");

  const existing = (selectBySystemKey.get(SEED_PRESENTATION_KEY) ??
    selectByName.get(SEED_PRESENTATION_NAME)) as { id: number } | undefined;

  let presentationId: number;

  if (existing) {
    presentationId = existing.id;
    attachSystemKey.run(SEED_PRESENTATION_KEY, presentationId);
  } else {
    const { lastInsertRowid } = db
      .prepare("INSERT INTO presentations (name, theme, system_key) VALUES (?, ?, ?)")
      .run(SEED_PRESENTATION_NAME, "dark-green", SEED_PRESENTATION_KEY);
    presentationId = Number(lastInsertRowid);
  }

  const selectSlide = db.prepare("SELECT id FROM slides WHERE presentation_id=? AND code_id=?");
  const insertSlide = db.prepare(
    "INSERT INTO slides (presentation_id, position, kind, code_id, title, blocks) VALUES (?, ?, 'code', ?, ?, '[]')",
  );
  const updateSlide = db.prepare(
    "UPDATE slides SET position=?, title=?, kind='code', updated_at=datetime('now') WHERE id=?",
  );
  const deleteMissing = db.prepare(
    `DELETE FROM slides
     WHERE presentation_id=?
       AND kind='code'
       AND code_id NOT IN (${BUILT_IN_SLIDES.map(() => "?").join(", ")})`,
  );

  db.transaction(() => {
    BUILT_IN_SLIDES.forEach(({ code_id, title }, position) => {
      const row = selectSlide.get(presentationId, code_id) as { id: number } | undefined;
      if (row) {
        updateSlide.run(position, title, row.id);
      } else {
        insertSlide.run(presentationId, position, code_id, title);
      }
    });
    deleteMissing.run(presentationId, ...BUILT_IN_SLIDES.map((slide) => slide.code_id));
  })();

  seedSystemLayout(db, presentationId);
}

function seedSystemLayout(db: Database.Database, presentationId: number) {
  const existingGroupCount = db
    .prepare("SELECT COUNT(*) as n FROM slide_groups WHERE presentation_id=?")
    .get(presentationId) as { n: number };
  if (existingGroupCount.n > 0) return;

  const insertGroup = db.prepare(
    "INSERT INTO slide_groups (presentation_id, title, position, collapsed) VALUES (?, ?, ?, 0)",
  );
  const setSlide = db.prepare(
    "UPDATE slides SET position=?, group_id=? WHERE presentation_id=? AND code_id=?",
  );

  db.transaction(() => {
    SEED_LAYOUT.ungrouped.forEach((codeId, index) => {
      setSlide.run(index, null, presentationId, codeId);
    });
    SEED_LAYOUT.groups.forEach((group, groupIndex) => {
      const { lastInsertRowid } = insertGroup.run(presentationId, group.title, groupIndex);
      const groupId = Number(lastInsertRowid);
      group.slides.forEach((codeId, index) => {
        setSlide.run(index, groupId, presentationId, codeId);
      });
    });
  })();
}
