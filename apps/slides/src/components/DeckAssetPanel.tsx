import { useState } from "react";
import { callAction, useActionMutation, useActionQuery } from "@agent-native/core/client";
import { Download, Image as ImageIcon, Link, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import type { ApiDeckAsset, ApiLogoAssetCandidate } from "@/types";
import { getErrorMessage } from "@/api/client";
import { C } from "@/design/tokens";

type DeckAssetItem = Omit<ApiDeckAsset, "content"> & {
  content?: string;
  contentLength?: number;
};

type SearchLogoAssetsResult = {
  source: "svgl";
  results: ApiLogoAssetCandidate[];
};

type ImportDeckAssetInput = {
  pid: number;
  name: string;
  content?: string;
  svgUrl?: string;
  mimeType?: string;
  sourceUrl?: string | null;
  sourceName?: string | null;
  license?: string | null;
  usage?: string | null;
  metadata?: Record<string, unknown>;
};

type DeleteDeckAssetInput = {
  pid: number;
  assetId: number;
};

type DeckAssetPanelProps = {
  enabled: boolean;
  pid: number;
  onInsertAsset: (asset: ApiDeckAsset) => void;
};

const sectionLabel: React.CSSProperties = {
  fontSize: 9,
  fontFamily: "JetBrains Mono, monospace",
  color: C.muted,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const iconButton: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 7,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.textDim,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  flexShrink: 0,
};

const primaryIconButton: React.CSSProperties = {
  ...iconButton,
  background: C.accentSubtle,
  color: C.accent,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 7,
  padding: "7px 9px",
  color: C.text,
  fontSize: 12,
  outline: "none",
};

const panelStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: `1px solid ${C.border}`,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  flexShrink: 0,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 58,
  resize: "vertical",
  lineHeight: 1.35,
  fontFamily: "JetBrains Mono, monospace",
};

function svgDataUrl(content: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;
}

function assetPreviewSrc(asset: DeckAssetItem) {
  if (asset.content && asset.mime_type === "image/svg+xml") return svgDataUrl(asset.content);
  return asset.source_url ?? "";
}

function candidateVariant(candidate: ApiLogoAssetCandidate) {
  return candidate.variants[0] ?? { name: "default", svgUrl: candidate.svgUrl };
}

function LogoCandidateCard({
  busy,
  candidate,
  onImport,
}: {
  busy: boolean;
  candidate: ApiLogoAssetCandidate;
  onImport: (candidate: ApiLogoAssetCandidate) => void;
}) {
  const variant = candidateVariant(candidate);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "34px 1fr 28px",
        gap: 8,
        alignItems: "center",
        padding: 7,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: C.bg,
      }}
    >
      <AssetPreview src={variant.svgUrl} />
      <AssetLabel title={candidate.title} meta={variant.name} />
      <button
        type="button"
        title="Import and insert"
        aria-label={`Import and insert ${candidate.title}`}
        onClick={() => onImport(candidate)}
        disabled={busy}
        style={{ ...primaryIconButton, opacity: busy ? 0.55 : 1 }}
      >
        <Download size={13} />
      </button>
    </div>
  );
}

function LogoCandidateList({
  busy,
  candidates,
  onImport,
}: {
  busy: boolean;
  candidates: ApiLogoAssetCandidate[];
  onImport: (candidate: ApiLogoAssetCandidate) => void;
}) {
  if (candidates.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {candidates.map((candidate) => (
        <LogoCandidateCard
          key={candidate.id}
          busy={busy}
          candidate={candidate}
          onImport={onImport}
        />
      ))}
    </div>
  );
}

function AssetPreview({ src }: { src: string }) {
  return (
    <div
      style={{
        width: 34,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        borderRadius: 5,
        overflow: "hidden",
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ maxWidth: 26, maxHeight: 20, objectFit: "contain" }} />
      ) : (
        <ImageIcon size={14} color="#111" />
      )}
    </div>
  );
}

function AssetLabel({ meta, title }: { meta: string; title: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          color: C.text,
          fontSize: 11,
          fontWeight: 700,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: C.muted,
          fontSize: 9,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {meta}
      </div>
    </div>
  );
}

function ImportedAssetCard({
  asset,
  busy,
  onDelete,
  onInsert,
}: {
  asset: DeckAssetItem;
  busy: boolean;
  onDelete: (assetId: number) => void;
  onInsert: (asset: ApiDeckAsset) => void;
}) {
  const previewSrc = assetPreviewSrc(asset);
  const canInsert = Boolean(asset.content && asset.mime_type === "image/svg+xml");
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "34px 1fr 28px 28px",
        gap: 7,
        alignItems: "center",
        padding: 7,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: C.bg,
      }}
    >
      <AssetPreview src={previewSrc} />
      <AssetLabel title={asset.name} meta={asset.source_name ?? asset.kind} />
      <button
        type="button"
        title="Insert asset"
        aria-label={`Insert ${asset.name}`}
        onClick={() => onInsert(asset as ApiDeckAsset)}
        disabled={!canInsert}
        style={{ ...primaryIconButton, opacity: canInsert ? 1 : 0.4 }}
      >
        <Plus size={13} />
      </button>
      <button
        type="button"
        title="Delete asset"
        aria-label={`Delete ${asset.name}`}
        onClick={() => onDelete(asset.id)}
        disabled={busy}
        style={{ ...iconButton, color: "#ff8a8a", opacity: busy ? 0.55 : 1 }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function ImportedAssetList({
  assets,
  busy,
  onDelete,
  onInsert,
}: {
  assets: DeckAssetItem[];
  busy: boolean;
  onDelete: (assetId: number) => void;
  onInsert: (asset: ApiDeckAsset) => void;
}) {
  if (assets.length === 0) {
    return (
      <div
        style={{
          border: `1px dashed ${C.border}`,
          borderRadius: 8,
          padding: "12px 8px",
          color: C.muted,
          fontSize: 11,
          textAlign: "center",
        }}
      >
        No deck assets
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {assets.map((asset) => (
        <ImportedAssetCard
          key={asset.id}
          asset={asset}
          busy={busy}
          onDelete={onDelete}
          onInsert={onInsert}
        />
      ))}
    </div>
  );
}

function AssetPanelHeader({
  disabled,
  fetching,
  onRefresh,
}: {
  disabled: boolean;
  fetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={sectionLabel}>Assets</span>
      <button
        type="button"
        title="Refresh assets"
        aria-label="Refresh assets"
        onClick={onRefresh}
        disabled={disabled || fetching}
        style={{ ...iconButton, opacity: fetching ? 0.55 : 1 }}
      >
        <RefreshCw size={13} />
      </button>
    </div>
  );
}

function AssetSearchControls({
  disabled,
  onQueryChange,
  onSearch,
  query,
  searching,
}: {
  disabled: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  query: string;
  searching: boolean;
}) {
  const searchDisabled = disabled || searching || !query.trim();
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSearch();
        }}
        placeholder="Search logos"
        style={inputStyle}
      />
      <button
        type="button"
        title="Search logos"
        aria-label="Search logos"
        onClick={onSearch}
        disabled={searchDisabled}
        style={{ ...primaryIconButton, opacity: searchDisabled ? 0.55 : 1 }}
      >
        <Search size={13} />
      </button>
    </div>
  );
}

function CustomAssetImportControls({
  busy,
  disabled,
  name,
  onContentChange,
  onImport,
  onNameChange,
  onUrlChange,
  svgContent,
  svgUrl,
}: {
  busy: boolean;
  disabled: boolean;
  name: string;
  onContentChange: (value: string) => void;
  onImport: () => void;
  onNameChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  svgContent: string;
  svgUrl: string;
}) {
  const hasSvgUrl = Boolean(svgUrl.trim());
  const hasSvgContent = Boolean(svgContent.trim());
  const canImport = !disabled && !busy && Boolean(name.trim()) && (hasSvgUrl || hasSvgContent);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={sectionLabel}>Import SVG</span>
      <input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="Asset name"
        disabled={disabled}
        style={{ ...inputStyle, opacity: disabled ? 0.55 : 1 }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={svgUrl}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="SVG URL"
          disabled={disabled || hasSvgContent}
          style={{ ...inputStyle, opacity: disabled || hasSvgContent ? 0.55 : 1 }}
        />
        <button
          type="button"
          title="Import SVG"
          aria-label="Import SVG"
          onClick={onImport}
          disabled={!canImport}
          style={{ ...primaryIconButton, opacity: canImport ? 1 : 0.55 }}
        >
          <Link size={13} />
        </button>
      </div>
      <textarea
        value={svgContent}
        onChange={(event) => onContentChange(event.target.value)}
        placeholder="<svg ...>"
        disabled={disabled || hasSvgUrl}
        style={{ ...textareaStyle, opacity: disabled || hasSvgUrl ? 0.55 : 1 }}
      />
    </div>
  );
}

function CustomAssetImportPanel({
  disabled,
  onError,
  onImported,
  pid,
}: {
  disabled: boolean;
  onError: (error: string | null) => void;
  onImported: (asset: ApiDeckAsset) => void | Promise<void>;
  pid: number;
}) {
  const [name, setName] = useState("");
  const [svgUrl, setSvgUrl] = useState("");
  const [svgContent, setSvgContent] = useState("");
  const importAsset = useActionMutation<ApiDeckAsset, ImportDeckAssetInput>("import-deck-asset", {
    onSuccess: async (asset) => {
      await onImported(asset);
    },
  });

  async function importCustomAsset() {
    const trimmedName = name.trim();
    const trimmedUrl = svgUrl.trim();
    const trimmedContent = svgContent.trim();
    if (!trimmedName || (!trimmedUrl && !trimmedContent)) return;

    onError(null);
    try {
      await importAsset.mutateAsync({
        pid,
        name: trimmedName,
        content: trimmedContent || undefined,
        svgUrl: trimmedUrl || undefined,
        sourceUrl: trimmedUrl || null,
        sourceName: trimmedUrl ? "custom-url" : "inline-svg",
        license: null,
        usage: "manual-slide",
        metadata: { provider: trimmedUrl ? "custom-url" : "inline-svg" },
      });
      setName("");
      setSvgUrl("");
      setSvgContent("");
    } catch (err) {
      onError(getErrorMessage(err));
    }
  }

  return (
    <CustomAssetImportControls
      busy={importAsset.isPending}
      disabled={disabled}
      name={name}
      onContentChange={setSvgContent}
      onImport={() => void importCustomAsset()}
      onNameChange={setName}
      onUrlChange={setSvgUrl}
      svgContent={svgContent}
      svgUrl={svgUrl}
    />
  );
}

export function DeckAssetPanel({ enabled, onInsertAsset, pid }: DeckAssetPanelProps) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<ApiLogoAssetCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assetsQuery = useActionQuery<DeckAssetItem[]>(
    "list-deck-assets",
    { pid, includeContent: true },
    { enabled },
  );
  const importAsset = useActionMutation<ApiDeckAsset, ImportDeckAssetInput>("import-deck-asset", {
    onSuccess: async (asset) => {
      await assetsQuery.refetch();
      onInsertAsset(asset);
    },
  });
  const deleteAsset = useActionMutation<null, DeleteDeckAssetInput>("delete-deck-asset", {
    method: "DELETE",
    onSuccess: async () => {
      await assetsQuery.refetch();
    },
  });

  async function searchLogos() {
    const value = query.trim();
    if (!value) return;
    setSearching(true);
    setError(null);
    try {
      const result = await callAction<SearchLogoAssetsResult>(
        "search-logo-assets",
        { query: value, limit: 8 },
        { method: "GET" },
      );
      setCandidates(result.results);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  async function importCandidate(candidate: ApiLogoAssetCandidate) {
    const variant = candidateVariant(candidate);
    setError(null);
    try {
      await importAsset.mutateAsync({
        pid,
        name: candidate.title,
        svgUrl: variant.svgUrl,
        sourceUrl: candidate.brandUrl ?? variant.svgUrl,
        sourceName: candidate.source,
        license: null,
        usage: "manual-slide",
        metadata: {
          svglId: candidate.id,
          variant: variant.name,
          categories: candidate.category,
        },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function removeAsset(assetId: number) {
    setError(null);
    try {
      await deleteAsset.mutateAsync({ pid, assetId });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const assets: DeckAssetItem[] = assetsQuery.data ?? [];
  const busy = searching || importAsset.isPending || deleteAsset.isPending;

  return (
    <div style={panelStyle}>
      <AssetPanelHeader
        disabled={!enabled}
        fetching={assetsQuery.isFetching}
        onRefresh={() => void assetsQuery.refetch()}
      />
      <AssetSearchControls
        disabled={!enabled}
        onQueryChange={setQuery}
        onSearch={() => void searchLogos()}
        query={query}
        searching={searching}
      />
      <CustomAssetImportPanel
        disabled={!enabled}
        onError={setError}
        onImported={async (asset) => {
          await assetsQuery.refetch();
          onInsertAsset(asset);
        }}
        pid={pid}
      />

      {error && <div style={{ color: "#ff8a8a", fontSize: 11, lineHeight: 1.4 }}>{error}</div>}

      <LogoCandidateList
        busy={busy}
        candidates={candidates}
        onImport={(candidate) => void importCandidate(candidate)}
      />
      <ImportedAssetList
        assets={assets}
        busy={busy}
        onDelete={(assetId) => void removeAsset(assetId)}
        onInsert={onInsertAsset}
      />
    </div>
  );
}
