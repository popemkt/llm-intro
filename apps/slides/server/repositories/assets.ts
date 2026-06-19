import type Database from "better-sqlite3";
import type { ApiDeckAsset, DeckAssetKind } from "@llm-intro/api-contract";

type DeckAssetRow = {
  id: number;
  presentation_id: number;
  name: string;
  kind: DeckAssetKind;
  mime_type: string;
  content: string;
  source_url: string | null;
  source_name: string | null;
  license: string | null;
  usage: string | null;
  metadata: string;
  created_at: string;
  updated_at: string;
};

function mapDeckAsset(row: DeckAssetRow): ApiDeckAsset {
  return {
    ...row,
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
  };
}

export function createAssetsRepository(db: Database.Database) {
  const listStmt = db.prepare(
    "SELECT * FROM deck_assets WHERE presentation_id=? ORDER BY kind, name, id",
  );
  const getStmt = db.prepare("SELECT * FROM deck_assets WHERE id=? AND presentation_id=?");
  const insertStmt = db.prepare(`
    INSERT INTO deck_assets
      (presentation_id, name, kind, mime_type, content, source_url, source_name, license, usage, metadata)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateMetadataStmt = db.prepare(`
    UPDATE deck_assets
    SET name=?, source_url=?, source_name=?, license=?, usage=?, metadata=?, updated_at=datetime('now')
    WHERE id=? AND presentation_id=?
  `);
  const deleteStmt = db.prepare("DELETE FROM deck_assets WHERE id=? AND presentation_id=?");

  return {
    list(presentationId: number): ApiDeckAsset[] {
      return (listStmt.all(presentationId) as DeckAssetRow[]).map(mapDeckAsset);
    },

    get(presentationId: number, assetId: number): ApiDeckAsset | null {
      const row = getStmt.get(assetId, presentationId) as DeckAssetRow | undefined;
      return row ? mapDeckAsset(row) : null;
    },

    create(
      presentationId: number,
      input: {
        name: string;
        kind: DeckAssetKind;
        mimeType: string;
        content: string;
        sourceUrl?: string | null;
        sourceName?: string | null;
        license?: string | null;
        usage?: string | null;
        metadata?: Record<string, unknown>;
      },
    ): ApiDeckAsset {
      const { lastInsertRowid } = insertStmt.run(
        presentationId,
        input.name,
        input.kind,
        input.mimeType,
        input.content,
        input.sourceUrl ?? null,
        input.sourceName ?? null,
        input.license ?? null,
        input.usage ?? null,
        JSON.stringify(input.metadata ?? {}),
      );
      return this.get(presentationId, Number(lastInsertRowid))!;
    },

    updateMetadata(
      presentationId: number,
      assetId: number,
      input: {
        name: string;
        sourceUrl: string | null;
        sourceName: string | null;
        license: string | null;
        usage: string | null;
        metadata: Record<string, unknown>;
      },
    ): ApiDeckAsset {
      updateMetadataStmt.run(
        input.name,
        input.sourceUrl,
        input.sourceName,
        input.license,
        input.usage,
        JSON.stringify(input.metadata),
        assetId,
        presentationId,
      );
      return this.get(presentationId, assetId)!;
    },

    delete(presentationId: number, assetId: number): boolean {
      return deleteStmt.run(assetId, presentationId).changes > 0;
    },
  };
}
