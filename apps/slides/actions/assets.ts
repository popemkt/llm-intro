import { defineAction } from "@agent-native/core";
import type { ApiLogoAssetCandidate } from "@llm-intro/api-contract";
import { z } from "zod";
import { AppError } from "../server/errors.js";
import type { createAssetsService } from "../server/services/assets.js";

type AssetsService = ReturnType<typeof createAssetsService>;

const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };
const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

type SvglThemeOptions = { dark?: string; light?: string };
type SvglLogo = {
  id: number;
  title: string;
  category: string | string[];
  route: string | SvglThemeOptions;
  url?: string;
  brandUrl?: string;
  wordmark?: string | SvglThemeOptions;
};

function categories(input: SvglLogo["category"]) {
  return Array.isArray(input) ? input : [input];
}

function routeVariants(route: SvglLogo["route"]): Array<{ name: string; svgUrl: string }> {
  if (typeof route === "string") return [{ name: "default", svgUrl: route }];
  return Object.entries(route)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([name, svgUrl]) => ({ name, svgUrl }));
}

function mapSvglLogo(logo: SvglLogo): ApiLogoAssetCandidate | null {
  const variants = routeVariants(logo.route);
  const first = variants[0];
  if (!first) return null;
  return {
    id: String(logo.id),
    title: logo.title,
    category: categories(logo.category),
    svgUrl: first.svgUrl,
    brandUrl: logo.brandUrl ?? logo.url ?? null,
    source: "svgl",
    variants,
  };
}

function matchesQuery(candidate: ApiLogoAssetCandidate, query: string) {
  const haystack = [candidate.title, candidate.brandUrl ?? "", ...candidate.category]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

async function searchSvgl(query: string, limit: number) {
  const res = await fetch("https://api.svgl.app");
  if (!res.ok) throw new AppError(502, `SVGL search failed with HTTP ${res.status}`);
  const logos = (await res.json()) as SvglLogo[];
  return logos
    .map(mapSvglLogo)
    .filter((candidate): candidate is ApiLogoAssetCandidate => candidate !== null)
    .filter((candidate) => matchesQuery(candidate, query))
    .slice(0, limit);
}

async function fetchText(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new AppError(502, `asset fetch failed with HTTP ${res.status}`);
  return res.text();
}

function createSearchLogoAssetsAction() {
  return defineAction({
    description: "Search SVG logo candidates from SVGL for deck-local import.",
    schema: z.object({
      query: z.string().min(1),
      limit: z.coerce.number().int().positive().max(25).default(8),
    }),
    http: { method: "GET", path: "search-logo-assets" },
    requiresAuth: false,
    readOnly: true,
    publicAgent: {
      ...publicReadAction,
      title: "Search logo assets",
      description: "Search SVG logo candidates from SVGL for deck-local import.",
    },
    run: async ({ query, limit }) => ({
      source: "svgl",
      results: await searchSvgl(query, limit),
    }),
  });
}

function createImportDeckAssetAction(assetsService: AssetsService) {
  return defineAction({
    description:
      "Import an SVG or other text asset into a deck-local asset library. Provide content directly or an svgUrl to fetch.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      name: z.string().min(1),
      content: z.string().optional(),
      svgUrl: z.string().url().optional(),
      mimeType: z.string().default("image/svg+xml"),
      sourceUrl: z.string().url().nullable().optional(),
      sourceName: z.string().nullable().optional(),
      license: z.string().nullable().optional(),
      usage: z.string().nullable().optional(),
      metadata: z.record(z.string(), z.unknown()).default({}),
    }),
    http: { method: "POST", path: "import-deck-asset" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Import deck asset",
      description:
        "Import an SVG or other text asset into a deck-local asset library. Provide content directly or an svgUrl to fetch.",
    },
    run: async ({ pid, content, svgUrl, mimeType, ...input }) => {
      const assetContent = content ?? (svgUrl ? await fetchText(svgUrl) : null);
      if (!assetContent) throw new AppError(400, "content or svgUrl is required");
      return assetsService.create(pid, {
        ...input,
        content: assetContent,
        mimeType,
        sourceUrl: input.sourceUrl ?? svgUrl ?? null,
      });
    },
  });
}

function createListDeckAssetsAction(assetsService: AssetsService) {
  return defineAction({
    description: "List deck-local assets and their source/license metadata.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      includeContent: z.boolean().default(false),
    }),
    http: { method: "GET", path: "list-deck-assets" },
    requiresAuth: false,
    readOnly: true,
    publicAgent: {
      ...publicReadAction,
      title: "List deck assets",
      description: "List deck-local assets and their source/license metadata.",
    },
    run: ({ pid, includeContent }) =>
      assetsService.list(pid).map((asset) =>
        includeContent
          ? asset
          : {
              ...asset,
              content: undefined,
              contentLength: asset.content.length,
            },
      ),
  });
}

function createUpdateDeckAssetMetadataAction(assetsService: AssetsService) {
  return defineAction({
    description:
      "Update deck asset metadata such as name, source, license, usage, and custom metadata.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      assetId: z.coerce.number().int().positive(),
      name: z.string().min(1).optional(),
      sourceUrl: z.string().url().nullable().optional(),
      sourceName: z.string().nullable().optional(),
      license: z.string().nullable().optional(),
      usage: z.string().nullable().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    http: { method: "PUT", path: "update-deck-asset-metadata" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Update deck asset metadata",
      description:
        "Update deck asset metadata such as name, source, license, usage, and custom metadata.",
    },
    run: ({ pid, assetId, ...patch }) => assetsService.updateMetadata(pid, assetId, patch),
  });
}

function createDeleteDeckAssetAction(assetsService: AssetsService) {
  return defineAction({
    description: "Delete a deck-local asset.",
    schema: z.object({
      pid: z.coerce.number().int().positive(),
      assetId: z.coerce.number().int().positive(),
    }),
    http: { method: "DELETE", path: "delete-deck-asset" },
    requiresAuth: false,
    publicAgent: {
      ...publicWriteAction,
      title: "Delete deck asset",
      description: "Delete a deck-local asset.",
    },
    run: ({ pid, assetId }) => {
      assetsService.delete(pid, assetId);
      return null;
    },
  });
}

export function createAssetActions(assetsService: AssetsService) {
  return {
    "search-logo-assets": createSearchLogoAssetsAction(),
    "import-deck-asset": createImportDeckAssetAction(assetsService),
    "list-deck-assets": createListDeckAssetsAction(assetsService),
    "update-deck-asset-metadata": createUpdateDeckAssetMetadataAction(assetsService),
    "delete-deck-asset": createDeleteDeckAssetAction(assetsService),
  };
}
