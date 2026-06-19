import type Database from "better-sqlite3";
import type {
  ApiDeckSnapshot,
  ApiDeckSnapshotDetail,
  ApiDeckSnapshotRestoreResult,
} from "@llm-intro/api-contract";

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

function snapshotDetailToSummary(snapshot: ApiDeckSnapshotDetail): ApiDeckSnapshot {
  const { payload: _payload, ...summary } = snapshot;
  return summary;
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
  const updatePresentationStmt = db.prepare(
    "UPDATE presentations SET name=?, theme=?, updated_at=datetime('now') WHERE id=?",
  );
  const deleteSlidesStmt = db.prepare("DELETE FROM slides WHERE presentation_id=?");
  const deleteGroupsStmt = db.prepare("DELETE FROM slide_groups WHERE presentation_id=?");
  const insertGroupStmt = db.prepare(`
    INSERT INTO slide_groups
      (id, presentation_id, title, position, collapsed, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSlideStmt = db.prepare(`
    INSERT INTO slides
      (id, presentation_id, position, group_id, kind, code_id, title, blocks, html, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    restore(presentationId: number, snapshot: ApiDeckSnapshotDetail): ApiDeckSnapshotRestoreResult {
      const { deck, groups, slides } = snapshot.payload;

      db.transaction(() => {
        updatePresentationStmt.run(deck.name, deck.theme, presentationId);
        deleteSlidesStmt.run(presentationId);
        deleteGroupsStmt.run(presentationId);

        for (const group of groups) {
          insertGroupStmt.run(
            group.id,
            presentationId,
            group.title,
            group.position,
            group.collapsed ? 1 : 0,
            group.created_at,
            group.updated_at,
          );
        }

        for (const slide of slides) {
          insertSlideStmt.run(
            slide.id,
            presentationId,
            slide.position,
            slide.group_id,
            slide.kind,
            slide.code_id,
            slide.title,
            JSON.stringify(slide.blocks),
            slide.html ?? "",
            slide.notes ?? "",
            slide.created_at,
            slide.updated_at,
          );
        }
      })();

      return {
        snapshot: snapshotDetailToSummary(snapshot),
        deck: { ...deck, id: presentationId },
        groups: groups.map((group) => ({ ...group, presentation_id: presentationId })),
        slides: slides.map((slide) => ({ ...slide, presentation_id: presentationId })),
      };
    },
  };
}
