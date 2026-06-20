import type {
  ApiSlide,
  ApiSlideFeedback,
  SlideFeedbackSourceLocation,
  SlideFeedbackStatus,
} from "@llm-intro/api-contract";

type SourceMarkerKind = "html" | "jsx";

type MarkerPayload = {
  note: string;
  status?: SlideFeedbackStatus;
  presentationId?: number;
  slideId?: number;
  slideKind?: ApiSlide["kind"];
  slideTitle?: string;
  location?: SlideFeedbackSourceLocation;
  updatedAt?: string;
  resolvedAt?: string | null;
};

type MarkerBase = {
  presentationId: number;
  slide: ApiSlide;
  sourcePath?: string;
};

const JSX_MARKER_RE =
  /\{\/\*\s*@slide-comment\s+id="(c-[a-f0-9]+)"\s+ts="([^"]+)"\s+text="([A-Za-z0-9_-]+={0,2})"\s*\*\/\}/g;
const HTML_MARKER_RE =
  /<!--\s*@slide-comment\s+id="(c-[a-f0-9]+)"\s+ts="([^"]+)"\s+text="([A-Za-z0-9_-]+={0,2})"\s*-->/g;

function markerRegex(kind: SourceMarkerKind) {
  return kind === "jsx" ? JSX_MARKER_RE : HTML_MARKER_RE;
}

export function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function offsetLineColumn(source: string, offset: number) {
  const before = source.slice(0, offset);
  const lines = before.split("\n");
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}

function parsePayload(encoded: string): MarkerPayload {
  try {
    const decoded = decodeBase64Url(encoded);
    const parsed = JSON.parse(decoded) as MarkerPayload;
    return typeof parsed === "object" && parsed ? parsed : { note: decoded };
  } catch {
    return { note: "" };
  }
}

function payloadToFeedback(input: {
  base: MarkerBase;
  createdAt: string;
  id: string;
  offset: number;
  payload: MarkerPayload;
  source: string;
}): ApiSlideFeedback {
  const { base, createdAt, id, offset, payload, source } = input;
  const sourcePosition = offsetLineColumn(source, offset);
  const location = {
    sourceKind: base.slide.kind === "html" ? "html" : "code",
    sourcePath: base.sourcePath,
    codeId: base.slide.code_id ?? undefined,
    line: sourcePosition.line,
    column: sourcePosition.column,
    ...payload.location,
  } satisfies SlideFeedbackSourceLocation;

  return {
    id,
    presentation_id: payload.presentationId ?? base.presentationId,
    slide_id: payload.slideId ?? base.slide.id,
    slide_kind: payload.slideKind ?? base.slide.kind,
    slide_title: payload.slideTitle ?? base.slide.title,
    status: payload.status ?? "open",
    text: payload.note,
    location,
    storage: "source-marker",
    created_at: createdAt,
    updated_at: payload.updatedAt ?? createdAt,
    resolved_at: payload.resolvedAt ?? null,
  };
}

export function parseFeedbackMarkers(
  source: string,
  kind: SourceMarkerKind,
  base: MarkerBase,
): ApiSlideFeedback[] {
  const regex = markerRegex(kind);
  regex.lastIndex = 0;
  const feedback: ApiSlideFeedback[] = [];
  for (const match of source.matchAll(regex)) {
    const id = match[1];
    const createdAt = match[2];
    const encoded = match[3];
    if (!id || !createdAt || !encoded) continue;
    feedback.push(
      payloadToFeedback({
        base,
        createdAt,
        id,
        offset: match.index,
        payload: parsePayload(encoded),
        source,
      }),
    );
  }
  return feedback;
}

export function serializeFeedbackMarker(
  feedback: ApiSlideFeedback,
  kind: SourceMarkerKind,
): string {
  const payload: MarkerPayload = {
    note: feedback.text,
    status: feedback.status,
    presentationId: feedback.presentation_id,
    slideId: feedback.slide_id,
    slideKind: feedback.slide_kind,
    slideTitle: feedback.slide_title,
    location: feedback.location,
    updatedAt: feedback.updated_at,
    resolvedAt: feedback.resolved_at,
  };
  const text = encodeBase64Url(JSON.stringify(payload));
  if (kind === "html") {
    return `<!-- @slide-comment id="${feedback.id}" ts="${feedback.created_at}" text="${text}" -->`;
  }
  return `{/* @slide-comment id="${feedback.id}" ts="${feedback.created_at}" text="${text}" */}`;
}

function findOpeningTagEnd(source: string, start: number) {
  let quote: string | null = null;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === quote && source[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === ">") return index;
  }
  return -1;
}

function findFirstJsxTagStart(source: string, start: number) {
  for (let index = start; index < source.length - 1; index += 1) {
    if (source[index] !== "<") continue;
    const next = source[index + 1];
    if (!next || next === "/" || next === "!" || next === "?" || next === "=") continue;
    return index;
  }
  return -1;
}

export function insertJsxFeedbackMarker(source: string, marker: string) {
  const componentStart = source.search(/export\s+default\s+function\b/);
  const returnRegex = /return\s*\(/g;
  returnRegex.lastIndex = componentStart >= 0 ? componentStart : 0;
  const returnMatch = returnRegex.exec(source);
  const searchStart = returnMatch ? returnMatch.index + returnMatch[0].length : 0;
  const tagStart = findFirstJsxTagStart(source, searchStart);
  if (tagStart < 0) return null;

  const tagEnd = findOpeningTagEnd(source, tagStart);
  if (tagEnd < 0) return null;

  const openingTag = source.slice(tagStart, tagEnd + 1);
  if (openingTag.trimEnd().endsWith("/>")) return null;

  const lineStart = source.lastIndexOf("\n", tagStart) + 1;
  const baseIndent = source.slice(lineStart, tagStart).match(/^\s*/)?.[0] ?? "";
  return `${source.slice(0, tagEnd + 1)}\n${baseIndent}  ${marker}${source.slice(tagEnd + 1)}`;
}

export function insertHtmlFeedbackMarker(source: string, marker: string) {
  return `${marker}\n${source}`;
}

export function replaceFeedbackMarker(
  source: string,
  kind: SourceMarkerKind,
  feedbackId: string,
  replacement: ApiSlideFeedback,
) {
  const regex = markerRegex(kind);
  regex.lastIndex = 0;
  let replaced = false;
  const next = source.replace(regex, (match, id: string) => {
    if (id !== feedbackId) return match;
    replaced = true;
    return serializeFeedbackMarker(replacement, kind);
  });
  return replaced ? next : null;
}
