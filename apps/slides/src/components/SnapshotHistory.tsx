import { useState } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { useActionMutation, useActionQuery } from "@agent-native/core/client";
import { getErrorMessage } from "@/api/client";
import { C } from "@/design/tokens";
import type { ApiDeckSnapshot, ApiDeckSnapshotDetail, ApiDeckSnapshotRestoreResult } from "@/types";

type SnapshotHistoryProps = {
  pid: number;
  disabled?: boolean;
  onRestored?: () => void;
};

type Message = { text: string; type: "error" | "success" };

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontFamily: "JetBrains Mono, monospace",
  color: C.muted,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: "0 0 4px 0",
};

const buttonBaseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  color: C.text,
  fontSize: 12,
};

function disabledStyle(disabled: boolean): React.CSSProperties {
  return { cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 };
}

function formatSnapshotDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function defaultLabel() {
  return `Manual ${new Date().toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function SnapshotHistoryHeader({
  disabled,
  onCreateSnapshot,
}: {
  disabled: boolean;
  onCreateSnapshot: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 14,
      }}
    >
      <div>
        <h2 style={sectionTitleStyle}>Version History</h2>
        <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>
          Save and restore deck snapshots through Agent Native actions.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreateSnapshot}
        disabled={disabled}
        style={{
          ...buttonBaseStyle,
          ...disabledStyle(disabled),
          gap: 7,
          padding: "8px 12px",
          background: C.surface,
          fontWeight: 700,
        }}
      >
        <Camera size={14} />
        Save Snapshot
      </button>
    </div>
  );
}

function SnapshotMessage({ message }: { message: Message }) {
  return (
    <div
      style={{
        padding: "9px 11px",
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: C.surface,
        color: message.type === "error" ? "#ff8a8a" : C.accent,
        fontSize: 12,
        marginBottom: 12,
      }}
    >
      {message.text}
    </div>
  );
}

function SnapshotRow({
  snapshot,
  disabled,
  onRestore,
}: {
  snapshot: ApiDeckSnapshot;
  disabled: boolean;
  onRestore: (snapshot: ApiDeckSnapshot) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 12,
        alignItems: "center",
        padding: "12px 14px",
        borderTop: `1px solid ${C.border}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{snapshot.label}</div>
        <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>
          {snapshot.slide_count} slides, {snapshot.group_count} groups,{" "}
          {formatSnapshotDate(snapshot.created_at)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRestore(snapshot)}
        disabled={disabled}
        style={{
          ...buttonBaseStyle,
          ...disabledStyle(disabled),
          gap: 6,
          padding: "7px 10px",
          background: C.bg,
        }}
      >
        <RotateCcw size={13} />
        Restore
      </button>
    </div>
  );
}

function SnapshotList({
  snapshots,
  loading,
  disabled,
  onRestore,
}: {
  snapshots: ApiDeckSnapshot[];
  loading: boolean;
  disabled: boolean;
  onRestore: (snapshot: ApiDeckSnapshot) => void;
}) {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden",
        background: C.surface,
      }}
    >
      {loading ? (
        <div style={{ padding: 14, fontSize: 12, color: C.textDim }}>Loading snapshots...</div>
      ) : snapshots.length === 0 ? (
        <div style={{ padding: 14, fontSize: 12, color: C.textDim }}>No snapshots saved yet.</div>
      ) : (
        snapshots.map((snapshot) => (
          <SnapshotRow
            key={snapshot.id}
            snapshot={snapshot}
            disabled={disabled}
            onRestore={onRestore}
          />
        ))
      )}
    </div>
  );
}

export function SnapshotHistory({ pid, disabled = false, onRestored }: SnapshotHistoryProps) {
  const [message, setMessage] = useState<Message | null>(null);
  const snapshotsQuery = useActionQuery<ApiDeckSnapshot[]>(
    "list-deck-snapshots",
    { pid },
    { enabled: !disabled },
  );
  const createSnapshot = useActionMutation<ApiDeckSnapshotDetail, { pid: number; label?: string }>(
    "create-deck-snapshot",
  );
  const restoreSnapshot = useActionMutation<
    ApiDeckSnapshotRestoreResult,
    { pid: number; snapshotId: number }
  >("restore-deck-snapshot");

  const snapshots: ApiDeckSnapshot[] = snapshotsQuery.data ?? [];
  const busy =
    createSnapshot.isPending || restoreSnapshot.isPending || Boolean(snapshotsQuery.isLoading);

  async function handleCreateSnapshot() {
    setMessage(null);
    try {
      const snapshot = await createSnapshot.mutateAsync({ pid, label: defaultLabel() });
      await snapshotsQuery.refetch();
      setMessage({ type: "success", text: `Saved "${snapshot.label}".` });
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err) });
    }
  }

  async function handleRestoreSnapshot(snapshot: ApiDeckSnapshot) {
    const ok = window.confirm(
      `Restore "${snapshot.label}"? This replaces the current deck slides and groups.`,
    );
    if (!ok) return;

    setMessage(null);
    try {
      await restoreSnapshot.mutateAsync({ pid, snapshotId: snapshot.id });
      await snapshotsQuery.refetch();
      onRestored?.();
      setMessage({ type: "success", text: `Restored "${snapshot.label}".` });
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err) });
    }
  }

  return (
    <section>
      <SnapshotHistoryHeader disabled={disabled || busy} onCreateSnapshot={handleCreateSnapshot} />
      {message && <SnapshotMessage message={message} />}
      <SnapshotList
        snapshots={snapshots}
        loading={Boolean(snapshotsQuery.isLoading)}
        disabled={disabled || busy}
        onRestore={(snapshot) => void handleRestoreSnapshot(snapshot)}
      />
    </section>
  );
}
