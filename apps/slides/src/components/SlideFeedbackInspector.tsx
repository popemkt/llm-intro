import { useCallback, useEffect, useRef, useState } from "react";
import { Check, MessageSquare, X } from "lucide-react";
import type { ApiSlideFeedback, SlideFeedbackRect, UnifiedSlide } from "@/types";
import { api, getErrorMessage } from "@/api/client";

type InspectTarget = {
  domPath: string;
  elementLabel: string;
  logicalRect: SlideFeedbackRect;
  pointer: { x: number; y: number };
  selector?: string;
};

interface SlideFeedbackInspectorProps {
  enabled: boolean;
  presentationId: number;
  slide: UnifiedSlide;
  onClose: () => void;
}

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 562.5;

function logicalRectForElement(element: Element, root: HTMLElement): SlideFeedbackRect {
  const rootRect = root.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rootRect.width;
  const scaleY = CANVAS_HEIGHT / rootRect.height;
  return {
    h: elementRect.height * scaleY,
    w: elementRect.width * scaleX,
    x: (elementRect.left - rootRect.left) * scaleX,
    y: (elementRect.top - rootRect.top) * scaleY,
  };
}

function logicalPointer(clientX: number, clientY: number, root: HTMLElement) {
  const rootRect = root.getBoundingClientRect();
  return {
    x: ((clientX - rootRect.left) / rootRect.width) * CANVAS_WIDTH,
    y: ((clientY - rootRect.top) / rootRect.height) * CANVAS_HEIGHT,
  };
}

function elementIndex(element: Element) {
  const siblings = Array.from(element.parentElement?.children ?? []).filter(
    (entry) => entry.tagName === element.tagName,
  );
  return Math.max(1, siblings.indexOf(element) + 1);
}

function describeElement(element: Element) {
  const tag = element.tagName.toLowerCase();
  const dataTarget = element.getAttribute("data-slide-feedback-target");
  const id = element.id ? `#${element.id}` : "";
  const text = (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return [dataTarget ?? `${tag}${id}`, text].filter(Boolean).join(" ");
}

function domPathForElement(element: Element, root: HTMLElement) {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== root) {
    const target = current.getAttribute("data-slide-feedback-target");
    if (target) {
      parts.unshift(`[data-slide-feedback-target="${target}"]`);
      break;
    }
    const tag = current.tagName.toLowerCase();
    parts.unshift(`${tag}:nth-of-type(${elementIndex(current)})`);
    current = current.parentElement;
  }
  return parts.join(" > ");
}

function findTargetElement(clientX: number, clientY: number, root: HTMLElement) {
  const elements = document.elementsFromPoint(clientX, clientY);
  return elements.find((element) => {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) return false;
    if (!root.contains(element)) return false;
    if (element.closest("[data-slide-inspector-ui]")) return false;
    if (element.hasAttribute("data-slide-inspector-overlay")) return false;
    return element !== root;
  });
}

function feedbackPinRect(feedback: ApiSlideFeedback) {
  const rect = feedback.location.rect;
  if (!rect) return { x: 14, y: 14, w: 22, h: 22 };
  return { x: rect.x, y: rect.y, w: Math.max(22, rect.w), h: Math.max(22, rect.h) };
}

export function SlideFeedbackInspector({
  enabled,
  presentationId,
  slide,
  onClose,
}: SlideFeedbackInspectorProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<ApiSlideFeedback[]>([]);
  const [target, setTarget] = useState<InspectTarget | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeedback = useCallback(async () => {
    if (!enabled || slide.kind === "db") return;
    try {
      setFeedback(await api.feedback.list(presentationId, slide.id));
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [enabled, presentationId, slide.id, slide.kind]);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  if (!enabled || slide.kind === "db") return null;

  const getRoot = () => overlayRef.current?.parentElement as HTMLElement | null;

  const inspectAt = (clientX: number, clientY: number) => {
    const root = getRoot();
    if (!root) return;
    const element = findTargetElement(clientX, clientY, root);
    if (!element) {
      setTarget(null);
      return;
    }
    const rect = logicalRectForElement(element, root);
    setTarget({
      domPath: domPathForElement(element, root),
      elementLabel: describeElement(element),
      logicalRect: rect,
      pointer: logicalPointer(clientX, clientY, root),
      selector: element.getAttribute("data-slide-feedback-target") ?? undefined,
    });
  };

  const handleCreate = async () => {
    if (!target || !draft.trim()) return;
    setSaving(true);
    try {
      await api.feedback.create(presentationId, slide.id, {
        text: draft.trim(),
        location: {
          codeId: slide.kind === "code" ? (slide.codeId ?? undefined) : undefined,
          domPath: target.domPath,
          elementLabel: target.elementLabel,
          rect: target.logicalRect,
          selector: target.selector,
          sourceKind: slide.kind === "code" ? "code" : "html",
        },
      });
      setDraft("");
      setTarget(null);
      await loadFeedback();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (entry: ApiSlideFeedback) => {
    try {
      await api.feedback.resolve(presentationId, slide.id, entry.id);
      await loadFeedback();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div
      ref={overlayRef}
      data-slide-inspector-overlay
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        cursor: "crosshair",
        pointerEvents: "auto",
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        inspectAt(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => inspectAt(event.clientX, event.clientY)}
    >
      <div
        data-slide-inspector-ui
        style={{
          position: "absolute",
          left: 12,
          top: 12,
          zIndex: 45,
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "1px solid rgba(255,255,255,.22)",
          borderRadius: 8,
          background: "rgba(10,14,20,.9)",
          color: "white",
          padding: "7px 9px",
          fontSize: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        }}
      >
        <MessageSquare size={14} />
        <span>{feedback.filter((entry) => entry.status === "open").length} open</span>
        <button
          type="button"
          aria-label="Close feedback inspector"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          style={{ color: "inherit", opacity: 0.8 }}
        >
          <X size={14} />
        </button>
      </div>

      {feedback
        .filter((entry) => entry.status === "open")
        .map((entry, index) => {
          const rect = feedbackPinRect(entry);
          return (
            <button
              key={entry.id}
              data-slide-inspector-ui
              type="button"
              title={entry.text}
              onClick={(event) => {
                event.stopPropagation();
                void handleResolve(entry);
              }}
              style={{
                position: "absolute",
                left: rect.x,
                top: rect.y,
                zIndex: 43,
                width: 24,
                height: 24,
                borderRadius: 999,
                background: "#f59e0b",
                color: "#111827",
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                fontWeight: 700,
                boxShadow: "0 8px 20px rgba(0,0,0,.28)",
              }}
            >
              {index + 1}
            </button>
          );
        })}

      {target ? (
        <div
          style={{
            position: "absolute",
            left: target.logicalRect.x,
            top: target.logicalRect.y,
            width: target.logicalRect.w,
            height: target.logicalRect.h,
            border: "2px solid #38bdf8",
            boxShadow: "0 0 0 9999px rgba(2,6,23,.28)",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {target ? (
        <div
          data-slide-inspector-ui
          style={{
            position: "absolute",
            left: Math.min(target.pointer.x + 12, 700),
            top: Math.min(target.pointer.y + 12, 382),
            zIndex: 46,
            width: 286,
            border: "1px solid rgba(255,255,255,.18)",
            borderRadius: 8,
            background: "rgba(15,23,42,.96)",
            color: "white",
            padding: 10,
            boxShadow: "0 16px 42px rgba(0,0,0,.42)",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div style={{ marginBottom: 8, fontSize: 11, color: "rgba(255,255,255,.72)" }}>
            {target.elementLabel || "Selected element"}
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Feedback"
            autoFocus
            style={{
              width: "100%",
              minHeight: 74,
              resize: "vertical",
              border: "1px solid rgba(255,255,255,.2)",
              borderRadius: 6,
              background: "rgba(255,255,255,.08)",
              color: "white",
              padding: 8,
              fontSize: 13,
              lineHeight: 1.35,
              outline: "none",
            }}
          />
          {error ? (
            <div style={{ marginTop: 7, color: "#fca5a5", fontSize: 11 }}>{error}</div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 9 }}>
            <button
              type="button"
              onClick={() => {
                setTarget(null);
                setDraft("");
              }}
              style={{ color: "rgba(255,255,255,.74)", fontSize: 12 }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!draft.trim() || saving}
              onClick={() => void handleCreate()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                borderRadius: 6,
                background: draft.trim() ? "#38bdf8" : "rgba(148,163,184,.35)",
                color: "#082f49",
                padding: "6px 9px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <Check size={13} />
              Add
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
