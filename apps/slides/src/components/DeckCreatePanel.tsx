import { useMemo, useState } from "react";
import { FileText, Plus, X } from "lucide-react";
import { useActionMutation } from "@agent-native/core/client";
import { getErrorMessage } from "@/api/client";
import { THEME_NAMES, type ApiPresentation, type ThemeName } from "@/types";
import { C } from "@/design/tokens";

type NormalSlideLayout =
  | "title"
  | "section"
  | "bullets"
  | "two-column"
  | "quote"
  | "metrics"
  | "closing";

type OutlineSlideInput = {
  layout: NormalSlideLayout;
  title: string;
  bullets?: string[];
  subtitle?: string;
};

type DeckGenerationResult = {
  deck: ApiPresentation;
  slides: unknown[];
};

type PromptDeckStreamEvent =
  | { type: "status"; message: string }
  | { type: "draft"; name: string; slideCount: number }
  | { type: "deck"; deck: ApiPresentation }
  | { type: "slide"; index: number; total: number; title: string; slide: unknown }
  | { type: "done"; deck: ApiPresentation };

type DeckCreatePanelProps = {
  onCancel: () => void;
  onCreated: (deck: ApiPresentation) => void;
};

type CreateMode = "blank" | "outline" | "prompt";

const sampleOutline = [
  "Title slide called Agent Native Adoption",
  "Section slide called What changes",
  "Bullets slide called Migration steps: actions, app shell, local code mode",
  "Two-column slide called Tradeoffs: keep typed slides; borrow better creation",
  "Closing slide called Next steps",
].join("\n");

function inferLayout(line: string): NormalSlideLayout {
  const normalized = line.toLowerCase();
  if (normalized.includes("two-column") || normalized.includes("two column")) return "two-column";
  if (normalized.includes("section")) return "section";
  if (normalized.includes("quote")) return "quote";
  if (normalized.includes("metric")) return "metrics";
  if (normalized.includes("closing") || normalized.includes("next steps")) return "closing";
  if (normalized.includes("title")) return "title";
  return "bullets";
}

function inferTitle(line: string, fallback: string) {
  const quoted = line.match(/["“](.+?)["”]/)?.[1]?.trim();
  if (quoted) return quoted;

  const named = line.match(/\b(?:called|titled|named)\s+([^:]+)(?::|$)/i)?.[1]?.trim();
  if (named) return named.replace(/[.!?]+$/, "");

  return (
    line
      .replace(/^\s*(?:[-*]|\d+[.)])\s*/, "")
      .split(":")[0]
      ?.trim() || fallback
  );
}

function parseOutline(outline: string): OutlineSlideInput[] {
  return outline
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((line, index) => {
      const layout = inferLayout(line);
      const details = line.split(":").slice(1).join(":").trim();
      const bullets = details
        ? details
            .split(/[;,]/)
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined;

      return {
        layout,
        title: inferTitle(line, `Slide ${index + 1}`),
        bullets: layout === "bullets" || layout === "two-column" ? bullets : undefined,
        subtitle: layout === "title" ? details || undefined : undefined,
      };
    });
}

function panelButtonStyle(active = false) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 30,
    border: `1px solid ${active ? C.accent : C.border}`,
    borderRadius: 7,
    background: active ? C.accent : "transparent",
    color: active ? C.bg : C.textDim,
    padding: "0 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };
}

async function createDeckFromPromptStream(input: {
  name?: string;
  prompt: string;
  theme: ThemeName;
  onEvent: (event: PromptDeckStreamEvent) => void;
}) {
  const response = await fetch("/_agent-native/prompt-deck-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      prompt: input.prompt,
      theme: input.theme,
      slideCount: 6,
    }),
  });

  if (!response.ok || !response.body) throw new Error("Prompt deck stream failed");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let deck: ApiPresentation | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as PromptDeckStreamEvent;
      input.onEvent(event);
      if (event.type === "done" || event.type === "deck") deck = event.deck;
    }
  }

  if (!deck) throw new Error("Prompt deck stream did not return a deck");
  return deck;
}

function ModeTabs({
  mode,
  onCancel,
  onModeChange,
}: {
  mode: CreateMode;
  onCancel: () => void;
  onModeChange: (mode: CreateMode) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => onModeChange("blank")}
        style={panelButtonStyle(mode === "blank")}
      >
        <Plus size={13} /> Blank
      </button>
      <button
        type="button"
        onClick={() => onModeChange("outline")}
        style={panelButtonStyle(mode === "outline")}
      >
        <FileText size={13} /> Outline
      </button>
      <button
        type="button"
        onClick={() => onModeChange("prompt")}
        style={panelButtonStyle(mode === "prompt")}
      >
        <FileText size={13} /> Prompt
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel deck creation"
        title="Cancel"
        style={{
          ...panelButtonStyle(false),
          marginLeft: "auto",
          width: 30,
          padding: 0,
          justifyContent: "center",
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

function DeckFields({
  mode,
  name,
  theme,
  onCreate,
  onNameChange,
  onThemeChange,
}: {
  mode: CreateMode;
  name: string;
  theme: ThemeName;
  onCreate: () => void;
  onNameChange: (value: string) => void;
  onThemeChange: (value: ThemeName) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 180px", gap: 12 }}>
      <label style={{ display: "grid", gap: 6, fontSize: 11, color: C.textDim }}>
        Name
        <input
          autoFocus
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && mode === "blank" && onCreate()}
          placeholder="My deck"
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 13,
            color: C.text,
            outline: "none",
          }}
        />
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: 11, color: C.textDim }}>
        Slide theme
        <select
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as ThemeName)}
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 13,
            color: C.text,
            outline: "none",
            cursor: "pointer",
          }}
        >
          {THEME_NAMES.map((themeName) => (
            <option key={themeName} value={themeName}>
              {themeName}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function OutlineField({
  outline,
  onOutlineChange,
}: {
  outline: string;
  onOutlineChange: (value: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 6, marginTop: 12, fontSize: 11, color: C.textDim }}>
      Outline
      <textarea
        value={outline}
        onChange={(e) => onOutlineChange(e.target.value)}
        rows={7}
        style={{
          width: "100%",
          boxSizing: "border-box",
          resize: "vertical",
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 12,
          lineHeight: 1.5,
          color: C.text,
          outline: "none",
          fontFamily: "JetBrains Mono, monospace",
        }}
      />
    </label>
  );
}

function PromptField({
  prompt,
  streamMessages,
  onPromptChange,
}: {
  prompt: string;
  streamMessages: string[];
  onPromptChange: (value: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
      <label style={{ display: "grid", gap: 6, fontSize: 11, color: C.textDim }}>
        Prompt
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={5}
          placeholder="Create a deck about agent-native slide creation with app actions, local code mode, and themeable exports."
          style={{
            width: "100%",
            boxSizing: "border-box",
            resize: "vertical",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            lineHeight: 1.5,
            color: C.text,
            outline: "none",
            fontFamily: "Inter, sans-serif",
          }}
        />
      </label>
      {streamMessages.length > 0 && (
        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            background: C.bg,
            padding: "8px 10px",
            display: "grid",
            gap: 4,
          }}
        >
          {streamMessages.map((message, index) => (
            <div
              key={`${message}-${index}`}
              style={{ fontSize: 11, color: C.textDim, fontFamily: "JetBrains Mono, monospace" }}
            >
              {message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateActions({
  mode,
  canCreate,
  isPending,
  slideCount,
  onCreate,
}: {
  mode: CreateMode;
  canCreate: boolean;
  isPending: boolean;
  slideCount: number;
  onCreate: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
      <button
        type="button"
        onClick={onCreate}
        disabled={!canCreate}
        style={{
          background: C.accent,
          color: C.bg,
          border: "none",
          borderRadius: 8,
          padding: "8px 18px",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          opacity: canCreate ? 1 : 0.5,
        }}
      >
        {isPending
          ? "Creating..."
          : mode === "outline"
            ? "Create deck and slides"
            : mode === "prompt"
              ? "Generate deck"
              : "Create deck"}
      </button>
      {mode === "outline" && (
        <span style={{ color: C.muted, fontSize: 11 }}>
          {slideCount} slide{slideCount === 1 ? "" : "s"} detected
        </span>
      )}
    </div>
  );
}

export function DeckCreatePanel({ onCancel, onCreated }: DeckCreatePanelProps) {
  const [mode, setMode] = useState<CreateMode>("blank");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<ThemeName>("dark-green");
  const [outline, setOutline] = useState(sampleOutline);
  const [prompt, setPrompt] = useState("");
  const [streamMessages, setStreamMessages] = useState<string[]>([]);
  const [streamPending, setStreamPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const outlineSlides = useMemo(() => parseOutline(outline), [outline]);
  const createDeck = useActionMutation<ApiPresentation, { name: string; theme: ThemeName }>(
    "create-deck",
  );
  const createDeckFromOutline = useActionMutation<
    DeckGenerationResult,
    { name: string; theme: ThemeName; slides: OutlineSlideInput[] }
  >("create-deck-from-outline");
  const isPending = createDeck.isPending || createDeckFromOutline.isPending || streamPending;
  const canCreate =
    (mode === "prompt" ? prompt.trim().length >= 8 : name.trim().length > 0) &&
    (mode !== "outline" || outlineSlides.length > 0) &&
    !isPending;

  const create = async () => {
    if (!canCreate) return;
    setError(null);
    setStreamMessages([]);
    try {
      if (mode === "outline") {
        const result = await createDeckFromOutline.mutateAsync({
          name: name.trim(),
          theme,
          slides: outlineSlides,
        });
        onCreated(result.deck);
        return;
      }
      if (mode === "prompt") {
        setStreamPending(true);
        const deck = await createDeckFromPromptStream({
          name: name.trim() || undefined,
          theme,
          prompt: prompt.trim(),
          onEvent: (event) => {
            if (event.type === "status") {
              setStreamMessages((prev) => [...prev, event.message]);
            }
            if (event.type === "draft") {
              setStreamMessages((prev) => [
                ...prev,
                `Drafted ${event.slideCount} slides for "${event.name}"`,
              ]);
            }
            if (event.type === "deck") {
              setStreamMessages((prev) => [...prev, `Created deck "${event.deck.name}"`]);
            }
            if (event.type === "slide") {
              setStreamMessages((prev) => [
                ...prev,
                `Created slide ${event.index + 1}/${event.total}: ${event.title}`,
              ]);
            }
          },
        });
        onCreated(deck);
        return;
      }

      onCreated(await createDeck.mutateAsync({ name: name.trim(), theme }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setStreamPending(false);
    }
  };

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 32,
      }}
    >
      <ModeTabs mode={mode} onCancel={onCancel} onModeChange={setMode} />

      {error && <div style={{ marginBottom: 12, color: "#ff8a8a", fontSize: 12 }}>{error}</div>}

      <DeckFields
        mode={mode}
        name={name}
        theme={theme}
        onCreate={() => void create()}
        onNameChange={setName}
        onThemeChange={setTheme}
      />

      {mode === "outline" && <OutlineField outline={outline} onOutlineChange={setOutline} />}
      {mode === "prompt" && (
        <PromptField prompt={prompt} streamMessages={streamMessages} onPromptChange={setPrompt} />
      )}

      <CreateActions
        mode={mode}
        canCreate={canCreate}
        isPending={isPending}
        slideCount={outlineSlides.length}
        onCreate={() => void create()}
      />
    </div>
  );
}
