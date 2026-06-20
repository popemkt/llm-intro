import type Database from "better-sqlite3";
import type { ApiPresentation, ApiSlideTransition, ThemeName } from "@llm-intro/api-contract";

type PresentationRow = {
  id: number;
  name: string;
  theme: ThemeName;
  default_transition_json: string | null;
  created_at: string;
  updated_at: string;
};

function mapPresentation(row: PresentationRow): ApiPresentation {
  return {
    id: row.id,
    name: row.name,
    theme: row.theme,
    defaultTransition: parseJsonField<ApiSlideTransition>(row.default_transition_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function parseJsonField<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T | null;
  } catch {
    return null;
  }
}

export function createPresentationsRepository(db: Database.Database) {
  const listStmt = db.prepare("SELECT * FROM presentations ORDER BY created_at DESC, id DESC");
  const getByIdStmt = db.prepare("SELECT * FROM presentations WHERE id=?");
  const insertStmt = db.prepare(
    "INSERT INTO presentations (name, theme, default_transition_json) VALUES (?, ?, ?)",
  );
  const updateStmt = db.prepare(
    "UPDATE presentations SET name=?, theme=?, default_transition_json=?, updated_at=datetime('now') WHERE id=?",
  );
  const deleteStmt = db.prepare("DELETE FROM presentations WHERE id=?");

  return {
    list(): ApiPresentation[] {
      return (listStmt.all() as PresentationRow[]).map(mapPresentation);
    },

    getById(id: number): ApiPresentation | null {
      const row = getByIdStmt.get(id) as PresentationRow | undefined;
      return row ? mapPresentation(row) : null;
    },

    create(input: {
      name: string;
      theme: ThemeName;
      defaultTransition?: ApiSlideTransition | null;
    }): ApiPresentation {
      const { lastInsertRowid } = insertStmt.run(
        input.name,
        input.theme,
        stringifyJson(input.defaultTransition ?? null),
      );
      return this.getById(Number(lastInsertRowid))!;
    },

    update(
      id: number,
      input: { name: string; theme: ThemeName; defaultTransition: ApiSlideTransition | null },
    ): ApiPresentation {
      updateStmt.run(input.name, input.theme, stringifyJson(input.defaultTransition), id);
      return this.getById(id)!;
    },

    delete(id: number): boolean {
      return deleteStmt.run(id).changes > 0;
    },
  };
}

function stringifyJson(value: unknown) {
  return value === null || value === undefined ? null : JSON.stringify(value);
}
