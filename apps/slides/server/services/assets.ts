import type { DeckAssetKind } from "@llm-intro/api-contract";
import { AppError } from "../errors.js";
import type { createAssetsRepository } from "../repositories/assets.js";
import type { createPresentationsRepository } from "../repositories/presentations.js";

type AssetsRepository = ReturnType<typeof createAssetsRepository>;
type PresentationsRepository = ReturnType<typeof createPresentationsRepository>;

const SVG_MIME_TYPE = "image/svg+xml";

function inferAssetKind(mimeType: string): DeckAssetKind {
  if (mimeType === SVG_MIME_TYPE) return "svg";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "other";
}

function assertDeckExists(presentationsRepo: PresentationsRepository, presentationId: number) {
  if (!presentationsRepo.getById(presentationId)) {
    throw new AppError(404, "presentation not found");
  }
}

function assertSvg(content: string) {
  if (!content.trim().startsWith("<svg") && !content.includes("<svg")) {
    throw new AppError(400, "imported SVG content must include an <svg> element");
  }
}

export function createAssetsService(
  presentationsRepo: PresentationsRepository,
  assetsRepo: AssetsRepository,
) {
  return {
    list(presentationId: number) {
      assertDeckExists(presentationsRepo, presentationId);
      return assetsRepo.list(presentationId);
    },

    get(presentationId: number, assetId: number) {
      assertDeckExists(presentationsRepo, presentationId);
      const asset = assetsRepo.get(presentationId, assetId);
      if (!asset) throw new AppError(404, "deck asset not found");
      return asset;
    },

    create(
      presentationId: number,
      input: {
        name: string;
        mimeType: string;
        content: string;
        sourceUrl?: string | null;
        sourceName?: string | null;
        license?: string | null;
        usage?: string | null;
        metadata?: Record<string, unknown>;
      },
    ) {
      assertDeckExists(presentationsRepo, presentationId);
      const mimeType = input.mimeType.trim() || "application/octet-stream";
      if (mimeType === SVG_MIME_TYPE) assertSvg(input.content);

      return assetsRepo.create(presentationId, {
        ...input,
        mimeType,
        kind: inferAssetKind(mimeType),
        name: input.name.trim(),
      });
    },

    updateMetadata(
      presentationId: number,
      assetId: number,
      patch: {
        name?: string;
        sourceUrl?: string | null;
        sourceName?: string | null;
        license?: string | null;
        usage?: string | null;
        metadata?: Record<string, unknown>;
      },
    ) {
      const current = this.get(presentationId, assetId);
      return assetsRepo.updateMetadata(presentationId, assetId, {
        name: patch.name?.trim() || current.name,
        sourceUrl: patch.sourceUrl === undefined ? current.source_url : patch.sourceUrl,
        sourceName: patch.sourceName === undefined ? current.source_name : patch.sourceName,
        license: patch.license === undefined ? current.license : patch.license,
        usage: patch.usage === undefined ? current.usage : patch.usage,
        metadata: patch.metadata ?? current.metadata,
      });
    },

    delete(presentationId: number, assetId: number) {
      assertDeckExists(presentationsRepo, presentationId);
      if (!assetsRepo.delete(presentationId, assetId)) {
        throw new AppError(404, "deck asset not found");
      }
    },
  };
}
