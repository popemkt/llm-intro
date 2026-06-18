import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Plus, Trash2, Presentation, Settings } from "lucide-react";
import { useActionMutation, useActionQuery } from "@agent-native/core/client";
import { getErrorMessage } from "@/api/client";
import { type ApiPresentation } from "@/types";
import { C } from "@/design/tokens";
import { DeckCreatePanel } from "@/components/DeckCreatePanel";

type HomeHeaderProps = {
  onSettings: () => void;
  onToggleCreate: () => void;
};

type ErrorBannerProps = {
  message: string;
  onRetry: () => void;
};

type DeckGridProps = {
  presentations: ApiPresentation[];
  onDelete: (id: number) => void;
  onOpen: (id: number) => void;
};

function HomeHeader({ onSettings, onToggleCreate }: HomeHeaderProps) {
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
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent }} />
      <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: C.text }}>
        Decks
      </span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={onSettings}
          aria-label="App settings"
          title="App settings"
          style={{
            display: "flex",
            alignItems: "center",
            padding: 7,
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            cursor: "pointer",
            color: C.textDim,
          }}
        >
          <Settings size={14} />
        </button>
        <button
          onClick={onToggleCreate}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: C.accent,
            color: C.bg,
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Plus size={13} /> New
        </button>
      </div>
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

function DeckGrid({ presentations, onDelete, onOpen }: DeckGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 16,
      }}
    >
      {presentations.map((pres) => (
        <motion.div key={pres.id} whileHover={{ scale: 1.02 }} style={{ position: "relative" }}>
          <button
            onClick={() => onOpen(pres.id)}
            aria-label={`Open ${pres.name}`}
            style={{
              width: "100%",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "18px 20px",
              textAlign: "left",
              cursor: "pointer",
              display: "block",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Presentation size={14} style={{ color: C.accent }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{pres.name}</span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.muted,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              slides theme: {pres.theme}
            </div>
          </button>
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
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.muted,
              padding: 4,
              borderRadius: 6,
            }}
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </motion.div>
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
      <HomeHeader
        onSettings={() => navigate("/settings")}
        onToggleCreate={() => setShowForm((v) => !v)}
      />

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
        ) : presentations.length === 0 ? (
          <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>No decks yet.</div>
        ) : (
          <DeckGrid
            presentations={presentations}
            onDelete={(id) => void remove(id)}
            onOpen={(id) => navigate(`/p/${id}`)}
          />
        )}
      </div>
    </div>
  );
}
