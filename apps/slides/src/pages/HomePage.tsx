import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Plus, Trash2, Presentation } from "lucide-react";
import { useActionMutation, useActionQuery } from "@agent-native/core/client";
import { getErrorMessage } from "@/api/client";
import { type ApiPresentation, type ApiSlide } from "@/types";
import { C } from "@/design/tokens";
import { DeckCreatePanel } from "@/components/DeckCreatePanel";
import { SlidesMark } from "@/components/SlidesMark";
import { SlidePreview } from "@/components/SlidePreview";
import { toUnifiedSlide } from "@/lib/presentationSlides";

type ErrorBannerProps = {
  message: string;
  onRetry: () => void;
};

type DeckGridProps = {
  presentations: ApiPresentation[];
  onDelete: (id: number) => void;
  onOpen: (id: number) => void;
  onCreate: () => void;
};

function HomeHeader() {
  return (
    <div
      style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "18px 40px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: C.surface,
      }}
    >
      <SlidesMark size={20} />
      <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: C.text }}>
        Decks
      </span>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      style={{
        marginBottom: 20,
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.surface,
        color: "#ff8a8a",
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <span>{message}</span>
      <button
        onClick={onRetry}
        style={{
          background: "none",
          border: "none",
          color: C.textDim,
          cursor: "pointer",
          fontSize: 12,
          textDecoration: "underline",
        }}
      >
        Retry
      </button>
    </div>
  );
}

function NewDeckTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="New deck"
      style={{
        width: "100%",
        background: "transparent",
        border: `1px dashed ${C.border}`,
        borderRadius: 12,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        textAlign: "left",
        color: C.textDim,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "56.25%",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.accent,
            }}
          >
            <Plus size={20} />
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>New Deck</div>
        <div
          style={{
            fontSize: 10,
            color: C.muted,
            fontFamily: "JetBrains Mono, monospace",
            marginTop: 4,
          }}
        >
          Create a deck or visual
        </div>
      </div>
    </button>
  );
}

function DeckCard({
  pres,
  onOpen,
  onDelete,
}: {
  pres: ApiPresentation;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const slidesQuery = useActionQuery<ApiSlide[]>("list-slides", { pid: pres.id });
  const slides = slidesQuery.data ?? [];
  const cover =
    slides.length > 0
      ? toUnifiedSlide([...slides].sort((a, b) => a.position - b.position)[0], pres.theme)
      : null;

  return (
    <motion.div whileHover={{ scale: 1.02 }} style={{ position: "relative" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(pres.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(pres.id);
          }
        }}
        aria-label={`Open ${pres.name}`}
        style={{
          width: "100%",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
          display: "block",
          overflow: "hidden",
        }}
      >
        <div style={{ background: "#070908", borderBottom: `1px solid ${C.border}` }}>
          {cover ? (
            <SlidePreview slide={cover} />
          ) : (
            <div
              style={{
                position: "relative",
                width: "100%",
                paddingBottom: "56.25%",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontFamily: "JetBrains Mono, monospace",
                  color: C.muted,
                }}
              >
                {slidesQuery.isLoading ? "…" : "empty deck"}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Presentation size={14} style={{ color: C.accent, flexShrink: 0 }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {pres.name}
            </span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: C.muted,
              fontFamily: "JetBrains Mono, monospace",
              marginTop: 4,
            }}
          >
            {slides.length} slide{slides.length === 1 ? "" : "s"} · {pres.theme}
          </div>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(pres.id);
        }}
        aria-label={`Delete ${pres.name}`}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "rgba(0,0,0,0.45)",
          border: "none",
          cursor: "pointer",
          color: C.textDim,
          padding: 5,
          borderRadius: 6,
        }}
        title="Delete"
      >
        <Trash2 size={13} />
      </button>
    </motion.div>
  );
}

function DeckGrid({ presentations, onDelete, onOpen, onCreate }: DeckGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 16,
      }}
    >
      <NewDeckTile onClick={onCreate} />
      {presentations.map((pres) => (
        <DeckCard key={pres.id} pres={pres} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const decksQuery = useActionQuery<ApiPresentation[]>("list-decks", {});
  const presentations: ApiPresentation[] = decksQuery.data ?? [];
  const visibleError = error ?? (decksQuery.error ? getErrorMessage(decksQuery.error) : null);
  const deleteDeck = useActionMutation<null, { id: number }>("delete-deck", { method: "DELETE" });

  const remove = async (id: number) => {
    if (!confirm("Delete this presentation and all its slides?")) return;
    setError(null);
    try {
      await deleteDeck.mutateAsync({ id });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <HomeHeader />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 40px" }}>
        {visibleError && (
          <ErrorBanner message={visibleError} onRetry={() => void decksQuery.refetch()} />
        )}

        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <DeckCreatePanel
              onCancel={() => setShowForm(false)}
              onCreated={(deck) => navigate(`/p/${deck.id}`)}
            />
          </motion.div>
        )}

        {decksQuery.isLoading ? (
          <div style={{ fontSize: 12, color: C.textDim }}>Loading…</div>
        ) : (
          <DeckGrid
            presentations={presentations}
            onDelete={(id) => void remove(id)}
            onOpen={(id) => navigate(`/p/${id}`)}
            onCreate={() => setShowForm(true)}
          />
        )}
      </div>
    </div>
  );
}
