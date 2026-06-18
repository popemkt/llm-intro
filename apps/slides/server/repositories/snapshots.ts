import type Database from "better-sqlite3";
import type { ApiDeckSnapshot, ApiDeckSnapshotDetail } from "@llm-intro/api-contract";

type SnapshotRow = {
  id: number;
  presentation_id: number;
  label: string;
  deck_name: string;
  slide_count: number;
  group_count: number;
  payload: string;
  created_at: string;
};

function mapSnapshot(row: SnapshotRow): ApiDeckSnapshot {
  const { payload: _payload, ...snapshot } = row;
  return snapshot;
}

function mapSnapshotDetail(row: SnapshotRow): ApiDeckSnapshotDetail {
  return {
    ...mapSnapshot(row),
    payload: JSON.parse(row.payload) as ApiDeckSnapshotDetail["payload"],
  };
}

export function createSnapshotsRepository(db: Database.Database) {
  const listStmt = db.prepare(
    "SELECT * FROM deck_snapshots WHERE presentation_id=? ORDER BY created_at DESC, id DESC",
  );
  const getByIdStmt = db.prepare("SELECT * FROM deck_snapshots WHERE id=? AND presentation_id=?");
  const insertStmt = db.prepare(`
    INSERT INTO deck_snapshots
      (presentation_id, label, deck_name, slide_count, group_count, payload)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  return {
    listByPresentationId(presentationId: number): ApiDeckSnapshot[] {
      return (listStmt.all(presentationId) as SnapshotRow[]).map(mapSnapshot);
    },

    getById(presentationId: number, snapshotId: number): ApiDeckSnapshotDetail | null {
      const row = getByIdStmt.get(snapshotId, presentationId) as SnapshotRow | undefined;
      return row ? mapSnapshotDetail(row) : null;
    },

    create(
      presentationId: number,
      input: {
        label: string;
        deckName: string;
        slideCount: number;
        groupCount: number;
        payload: ApiDeckSnapshotDetail["payload"];
      },
    ): ApiDeckSnapshotDetail {
      const { lastInsertRowid } = insertStmt.run(
        presentationId,
        input.label,
        input.deckName,
        input.slideCount,
        input.groupCount,
        JSON.stringify(input.payload),
      );
      return this.getById(presentationId, Number(lastInsertRowid))!;
    },
  };
}
