import type Database from "better-sqlite3";
import { nanoid } from "nanoid";

// Single-user local server: every extension is owned by the same local user, so
// access control collapses to "exists / not globally hidden". The owner column
// is kept so the schema matches the framework and a future multi-user server
// can tighten it without a migration.
const LOCAL_OWNER = "local-user";

type ExtensionRow = {
  id: string;
  name: string;
  description: string;
  content: string;
  icon: string | null;
  owner_email: string;
  visibility: string;
  hidden_at: string | null;
  hidden_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiExtension = {
  id: string;
  name: string;
  description: string;
  content: string;
  icon: string | null;
  visibility: string;
  globallyHidden: boolean;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SlotInstall = {
  installId: string;
  extensionId: string;
  name: string;
  description: string;
  icon: string | null;
  updatedAt: string;
  position: number;
  config: string | null;
};

export type SlotCandidate = {
  extensionId: string;
  name: string;
  description: string;
  icon: string | null;
  config: string | null;
};

function mapExtension(row: ExtensionRow): ApiExtension {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    content: row.content,
    icon: row.icon,
    visibility: row.visibility,
    globallyHidden: row.hidden_at != null,
    canDelete: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createExtensionsRepository(db: Database.Database) {
  const getStmt = db.prepare("SELECT * FROM extensions WHERE id=?");
  const insertStmt = db.prepare(
    `INSERT INTO extensions (id, name, description, content, icon, owner_email, visibility)
     VALUES (?, ?, ?, ?, ?, ?, 'private')`,
  );
  const deleteStmt = db.prepare("DELETE FROM extensions WHERE id=?");

  return {
    list(options: { includeGloballyHidden?: boolean } = {}): ApiExtension[] {
      const where = options.includeGloballyHidden ? "" : "WHERE hidden_at IS NULL";
      const rows = db
        .prepare(`SELECT * FROM extensions ${where} ORDER BY updated_at DESC, id`)
        .all() as ExtensionRow[];
      return rows.map(mapExtension);
    },

    get(id: string): ApiExtension | null {
      const row = getStmt.get(id) as ExtensionRow | undefined;
      return row ? mapExtension(row) : null;
    },

    create(data: {
      name: string;
      description?: string;
      content?: string;
      icon?: string;
    }): ApiExtension {
      const id = nanoid(12);
      insertStmt.run(
        id,
        data.name,
        data.description ?? "",
        data.content ?? "",
        data.icon ?? null,
        LOCAL_OWNER,
      );
      return this.get(id)!;
    },

    update(
      id: string,
      patch: { name?: string; description?: string; icon?: string; content?: string },
    ): ApiExtension | null {
      const assignments: string[] = [];
      const values: Array<string | null> = [];
      for (const key of ["name", "description", "icon", "content"] as const) {
        if (patch[key] !== undefined) {
          assignments.push(`${key}=?`);
          values.push(patch[key] ?? null);
        }
      }
      if (assignments.length === 0) return this.get(id);
      assignments.push("updated_at=datetime('now')");
      values.push(id);
      db.prepare(`UPDATE extensions SET ${assignments.join(", ")} WHERE id=?`).run(...values);
      return this.get(id);
    },

    delete(id: string): boolean {
      return deleteStmt.run(id).changes > 0;
    },

    setGloballyHidden(id: string, hidden: boolean): ApiExtension | null {
      db.prepare(
        `UPDATE extensions SET hidden_at=${hidden ? "datetime('now')" : "NULL"},
           hidden_by=?, updated_at=datetime('now') WHERE id=?`,
      ).run(hidden ? LOCAL_OWNER : null, id);
      return this.get(id);
    },

    // --- Slots ---------------------------------------------------------------
    listSlotInstalls(slotId: string): SlotInstall[] {
      return db
        .prepare(
          `SELECT i.id AS installId, i.extension_id AS extensionId, e.name, e.description,
                  e.icon, e.updated_at AS updatedAt, i.position, i.config
             FROM extension_slot_installs i
             JOIN extensions e ON e.id = i.extension_id
            WHERE i.slot_id=? AND i.owner_email=? AND e.hidden_at IS NULL
            ORDER BY i.position, i.created_at`,
        )
        .all(slotId, LOCAL_OWNER) as SlotInstall[];
    },

    listSlotCandidates(slotId: string): SlotCandidate[] {
      return db
        .prepare(
          `SELECT s.extension_id AS extensionId, e.name, e.description, e.icon, s.config
             FROM extension_slots s
             JOIN extensions e ON e.id = s.extension_id
            WHERE s.slot_id=? AND e.hidden_at IS NULL
            ORDER BY e.name`,
        )
        .all(slotId) as SlotCandidate[];
    },

    addSlotTarget(extensionId: string, slotId: string, config?: string) {
      db.prepare(
        `INSERT INTO extension_slots (id, extension_id, slot_id, config)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(extension_id, slot_id) DO UPDATE SET config=excluded.config`,
      ).run(nanoid(12), extensionId, slotId, config ?? null);
    },

    removeSlotTarget(extensionId: string, slotId: string): boolean {
      return (
        db
          .prepare("DELETE FROM extension_slots WHERE extension_id=? AND slot_id=?")
          .run(extensionId, slotId).changes > 0
      );
    },

    installSlot(
      extensionId: string,
      slotId: string,
      opts: { position?: number; config?: string } = {},
    ): SlotInstall | null {
      const existing = db
        .prepare(
          "SELECT id FROM extension_slot_installs WHERE extension_id=? AND slot_id=? AND owner_email=?",
        )
        .get(extensionId, slotId, LOCAL_OWNER) as { id: string } | undefined;
      if (!existing) {
        const next = db
          .prepare(
            "SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM extension_slot_installs WHERE slot_id=? AND owner_email=?",
          )
          .get(slotId, LOCAL_OWNER) as { pos: number };
        db.prepare(
          `INSERT INTO extension_slot_installs (id, extension_id, slot_id, owner_email, position, config)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(
          nanoid(12),
          extensionId,
          slotId,
          LOCAL_OWNER,
          opts.position ?? next.pos,
          opts.config ?? null,
        );
      }
      return (
        this.listSlotInstalls(slotId).find((install) => install.extensionId === extensionId) ?? null
      );
    },

    uninstallSlot(extensionId: string, slotId: string): boolean {
      return (
        db
          .prepare(
            "DELETE FROM extension_slot_installs WHERE extension_id=? AND slot_id=? AND owner_email=?",
          )
          .run(extensionId, slotId, LOCAL_OWNER).changes > 0
      );
    },

    // --- Per-extension key/value data ---------------------------------------
    listData(extensionId: string, collection: string) {
      return db
        .prepare(
          `SELECT item_id AS itemId, data FROM extension_data
            WHERE extension_id=? AND collection=? AND scope_key=?
            ORDER BY updated_at DESC`,
        )
        .all(extensionId, collection, LOCAL_OWNER)
        .map((row) => {
          const typed = row as { itemId: string; data: string };
          return { itemId: typed.itemId, data: JSON.parse(typed.data) as unknown };
        });
    },

    putData(extensionId: string, collection: string, itemId: string, data: unknown) {
      db.prepare(
        `INSERT INTO extension_data (extension_id, collection, item_id, data, scope, scope_key, updated_at)
         VALUES (?, ?, ?, ?, 'user', ?, datetime('now'))
         ON CONFLICT(extension_id, collection, item_id, scope, scope_key)
         DO UPDATE SET data=excluded.data, updated_at=datetime('now')`,
      ).run(extensionId, collection, itemId, JSON.stringify(data ?? null), LOCAL_OWNER);
      return { itemId, data };
    },

    deleteData(extensionId: string, collection: string, itemId: string): boolean {
      return (
        db
          .prepare(
            "DELETE FROM extension_data WHERE extension_id=? AND collection=? AND item_id=? AND scope_key=?",
          )
          .run(extensionId, collection, itemId, LOCAL_OWNER).changes > 0
      );
    },
  };
}

export type ExtensionsRepository = ReturnType<typeof createExtensionsRepository>;
