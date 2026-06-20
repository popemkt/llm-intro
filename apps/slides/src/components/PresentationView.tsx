import { useRef, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Grid2X2,
  Home,
  Keyboard,
  Maximize2,
  MessageSquare,
  MonitorUp,
  RotateCcw,
} from "lucide-react";
import type { UnifiedSlide } from "@/types";
import { SlideShell } from "./SlideShell";
import { DbSlideRenderer } from "./DbSlideRenderer";
import { HtmlSlideRenderer } from "./HtmlSlideRenderer";
import { SlideTransitionStage } from "./SlideTransitionStage";
import { SlideFeedbackInspector } from "./SlideFeedbackInspector";

interface PresentationViewProps {
  presentationId?: number;
  slides: UnifiedSlide[];
  activeIndex: number;
  onExit: () => void;
  onNavigate: (index: number) => void;
  onGoHome?: () => void;
  onEnterFullscreen?: () => void;
  showOverviewButton?: boolean;
  showCounter?: boolean;
  externalDisplayUrl?: string;
}

const SHORTCUTS = [
  { key: "→ / ↓", desc: "Next slide" },
  { key: "← / ↑", desc: "Prev slide" },
  { key: "ESC", desc: "Back to overview" },
  { key: "F", desc: "Fullscreen" },
  { key: "?", desc: "Toggle shortcuts" },
];

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function SpeakerNotesPanel({ notes }: { notes: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      className="rounded-xl border border-(--color-border) p-3"
      style={{
        position: "absolute",
        left: 24,
        right: 24,
        bottom: 68,
        zIndex: 20,
        maxHeight: 120,
        overflow: "auto",
        background: "color-mix(in srgb, var(--color-surface) 94%, transparent)",
        color: "var(--color-text-dim)",
        fontSize: 12,
        lineHeight: 1.5,
        boxShadow: "0 8px 32px rgba(0,0,0,.35)",
      }}
    >
      <div
        className="text-[9px] font-mono uppercase tracking-widest mb-1"
        style={{ color: "var(--color-muted)" }}
      >
        Speaker notes
      </div>
      <div style={{ whiteSpace: "pre-wrap" }}>{notes}</div>
    </motion.div>
  );
}

function MiniSlidePreview({ slide }: { slide: UnifiedSlide | undefined }) {
  if (!slide) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-muted)",
          fontSize: 11,
          background: "var(--color-bg)",
        }}
      >
        End
      </div>
    );
  }

  if (slide.kind === "code") {
    return (
      <SlideShell>
        <slide.component isActive={false} />
      </SlideShell>
    );
  }
  return slide.kind === "html" ? (
    <SlideShell>
      <HtmlSlideRenderer html={slide.html} title={slide.title} />
    </SlideShell>
  ) : (
    <DbSlideRenderer background={slide.background} blocks={slide.blocks} theme={slide.theme} />
  );
}

function RenderSlide({
  feedbackEnabled,
  isActive,
  onCloseFeedback,
  presentationId,
  slide,
}: {
  feedbackEnabled: boolean;
  isActive: boolean;
  onCloseFeedback: () => void;
  presentationId: number;
  slide: UnifiedSlide;
}) {
  if (slide.kind === "code") {
    return (
      <SlideShell>
        <slide.component isActive={isActive} />
        <SlideFeedbackInspector
          enabled={feedbackEnabled}
          onClose={onCloseFeedback}
          presentationId={presentationId}
          slide={slide}
        />
      </SlideShell>
    );
  }
  return slide.kind === "html" ? (
    <SlideShell>
      <HtmlSlideRenderer html={slide.html} title={slide.title} />
      <SlideFeedbackInspector
        enabled={feedbackEnabled}
        onClose={onCloseFeedback}
        presentationId={presentationId}
        slide={slide}
      />
    </SlideShell>
  ) : (
    <DbSlideRenderer
      animateBlocks={isActive}
      background={slide.background}
      blocks={slide.blocks}
      interactiveLinks={isActive}
      theme={slide.theme}
    />
  );
}

function PresenterHud({
  elapsedSeconds,
  nextSlide,
  onResetTimer,
}: {
  elapsedSeconds: number;
  nextSlide: UnifiedSlide | undefined;
  onResetTimer: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="rounded-xl border border-(--color-border)"
      style={{
        position: "absolute",
        top: 18,
        right: 24,
        zIndex: 20,
        width: 210,
        padding: 10,
        background: "color-mix(in srgb, var(--color-surface) 94%, transparent)",
        boxShadow: "0 8px 32px rgba(0,0,0,.35)",
        color: "var(--color-text-dim)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Clock3 size={14} />
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 18,
            color: "var(--color-text)",
          }}
        >
          {formatElapsed(elapsedSeconds)}
        </span>
        <button
          type="button"
          onClick={onResetTimer}
          title="Reset timer"
          style={{
            marginLeft: "auto",
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: "var(--color-muted)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RotateCcw size={13} />
        </button>
      </div>
      <div
        className="text-[9px] font-mono uppercase tracking-widest mb-2"
        style={{ color: "var(--color-muted)" }}
      >
        Next
      </div>
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          overflow: "hidden",
          borderRadius: 7,
          border: "1px solid var(--color-border)",
          background: "var(--color-bg)",
        }}
      >
        <MiniSlidePreview slide={nextSlide} />
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 11,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          color: "var(--color-text-dim)",
        }}
        title={nextSlide?.title ?? "End"}
      >
        {nextSlide?.title ?? "End of deck"}
      </div>
    </motion.div>
  );
}

export function PresentationView({
  presentationId,
  slides,
  activeIndex,
  onExit,
  onNavigate,
  onGoHome,
  onEnterFullscreen,
  showOverviewButton = true,
  showCounter = true,
  externalDisplayUrl,
}: PresentationViewProps) {
  const directionRef = useRef(1);
  const isTransitioning = useRef(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!showShortcuts) setControlsVisible(false);
    }, 3000);
  }, [showShortcuts]);

  useEffect(() => {
    resetHideTimer();
    const onMove = () => resetHideTimer();
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  useEffect(() => {
    if (showShortcuts) {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
  }, [showShortcuts]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?" && (e.target as HTMLElement).tagName !== "INPUT") {
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback(
    (next: number) => {
      if (isTransitioning.current) return;
      if (next < 0 || next >= slides.length) return;
      if (next === activeIndex) return;
      directionRef.current = next > activeIndex ? 1 : -1;
      isTransitioning.current = true;
      onNavigate(next);
      resetHideTimer();
    },
    [activeIndex, slides.length, onNavigate, resetHideTimer],
  );

  const prev = useCallback(() => go(activeIndex - 1), [go, activeIndex]);
  const next = useCallback(() => go(activeIndex + 1), [go, activeIndex]);

  const activeSlide = slides[activeIndex];
  const feedbackAvailable =
    Boolean(presentationId) && (activeSlide?.kind === "code" || activeSlide?.kind === "html");
  const openExternalDisplay = useCallback(() => {
    if (!externalDisplayUrl) return;
    window.open(externalDisplayUrl, "llm-intro-display")?.focus();
  }, [externalDisplayUrl]);

  useEffect(() => {
    setFeedbackEnabled(false);
  }, [activeSlide?.id]);

  if (!activeSlide) {
    return (
      <div
        className="h-screen w-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
      >
        <div style={{ fontSize: 14 }}>This deck has no slides yet.</div>
        <button
          onClick={onExit}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-dim)",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Back to overview
        </button>
      </div>
    );
  }

  const progress = slides.length > 1 ? ((activeIndex + 1) / slides.length) * 100 : 100;
  const speakerNotes = activeSlide.notes.trim();
  const nextSlide = slides[activeIndex + 1];

  return (
    <motion.div
      key="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="h-screen w-screen relative"
      style={{ background: "var(--color-bg)", cursor: controlsVisible ? "default" : "none" }}
      onMouseMove={resetHideTimer}
    >
      {/* Progress bar — floats over top edge so controls show/hide never reflows the slide */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "var(--color-muted)",
          zIndex: 10,
        }}
      >
        <motion.div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            background: "var(--color-accent)",
            transformOrigin: "left",
          }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>

      {/* Slide area — fills the viewport, 16:9 centered */}
      <div
        className="absolute inset-0 overflow-hidden flex items-center justify-center"
        style={{ padding: "16px 24px" }}
      >
        <div style={{ width: "100%", maxWidth: "calc(100vh * 16/9)" }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              paddingBottom: "56.25%",
              overflow: "hidden",
              borderRadius: 8,
            }}
          >
            <SlideTransitionStage
              activeKey={activeIndex}
              item={activeSlide}
              direction={directionRef.current}
              transition={activeSlide.transition ?? undefined}
              onTransitionEnd={() => {
                isTransitioning.current = false;
              }}
              renderItem={(slide, isActive) => (
                <RenderSlide
                  feedbackEnabled={feedbackEnabled && isActive}
                  isActive={isActive}
                  onCloseFeedback={() => setFeedbackEnabled(false)}
                  presentationId={presentationId ?? 0}
                  slide={slide}
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* Speaker notes — presenter mode only */}
      <AnimatePresence>
        {controlsVisible && speakerNotes && <SpeakerNotesPanel notes={speakerNotes} />}
      </AnimatePresence>

      {/* Presenter HUD — presenter mode only */}
      <AnimatePresence>
        {controlsVisible && (
          <PresenterHud
            elapsedSeconds={elapsedSeconds}
            nextSlide={nextSlide}
            onResetTimer={() => setElapsedSeconds(0)}
          />
        )}
      </AnimatePresence>

      {/* Bottom bar — auto-hides after 3s of inactivity */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-4 px-6 py-3 border-t border-(--color-border)"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "var(--color-surface)",
              height: 56,
              cursor: "default",
              zIndex: 20,
            }}
          >
            {/* Home */}
            {onGoHome && (
              <button
                onClick={onGoHome}
                aria-label="Home"
                className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
                style={{ color: "var(--color-text-dim)" }}
                title="Home"
              >
                <Home size={14} />
              </button>
            )}

            {/* Back to overview */}
            {showOverviewButton && (
              <button
                onClick={onExit}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
                style={{ color: "var(--color-text-dim)" }}
              >
                <Grid2X2 size={13} />
                <span className="hidden sm:inline">Overview</span>
                <span className="text-[10px] opacity-50 hidden sm:inline">ESC</span>
              </button>
            )}

            {/* Prev */}
            <button
              onClick={prev}
              disabled={activeIndex === 0}
              className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border) disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ color: "var(--color-text-dim)" }}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5 flex-1 justify-center overflow-hidden">
              {slides.length <= 20 ? (
                slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => go(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className="rounded-full transition-all flex-shrink-0"
                    style={{
                      width: i === activeIndex ? 20 : 6,
                      height: 6,
                      background: i === activeIndex ? "var(--color-accent)" : "var(--color-muted)",
                    }}
                  />
                ))
              ) : (
                <span className="text-xs font-mono" style={{ color: "var(--color-text-dim)" }}>
                  {activeSlide.title}
                </span>
              )}
            </div>

            {/* Next */}
            <button
              onClick={next}
              disabled={activeIndex === slides.length - 1}
              className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border) disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ color: "var(--color-text-dim)" }}
            >
              <ChevronRight size={16} />
            </button>

            {/* Counter + slide title */}
            {showCounter && (
              <div className="flex flex-col items-end" style={{ minWidth: "4.5rem" }}>
                <span className="text-xs font-mono" style={{ color: "var(--color-text-dim)" }}>
                  {activeIndex + 1} / {slides.length}
                </span>
                {activeSlide.title && (
                  <span
                    className="text-[10px] truncate max-w-[6rem]"
                    style={{ color: "var(--color-muted)" }}
                    title={activeSlide.title}
                  >
                    {activeSlide.title}
                  </span>
                )}
              </div>
            )}

            {feedbackAvailable && (
              <button
                onClick={() => setFeedbackEnabled((value) => !value)}
                className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
                style={{
                  color: feedbackEnabled ? "var(--color-accent)" : "var(--color-text-dim)",
                }}
                title="Slide feedback"
              >
                <MessageSquare size={14} />
              </button>
            )}

            {/* Keyboard shortcuts toggle */}
            <button
              onClick={() => setShowShortcuts((v) => !v)}
              className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
              style={{ color: showShortcuts ? "var(--color-accent)" : "var(--color-text-dim)" }}
              title="Keyboard shortcuts (?)"
            >
              <Keyboard size={14} />
            </button>

            {/* External display */}
            {externalDisplayUrl && (
              <button
                onClick={openExternalDisplay}
                className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
                style={{ color: "var(--color-text-dim)" }}
                title="Open audience display"
              >
                <MonitorUp size={14} />
              </button>
            )}

            {/* Fullscreen */}
            {onEnterFullscreen && (
              <button
                onClick={onEnterFullscreen}
                className="p-1.5 rounded-lg transition-colors hover:bg-(--color-border)"
                style={{ color: "var(--color-text-dim)" }}
                title="Fullscreen (F)"
              >
                <Maximize2 size={14} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcuts overlay */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-16 right-6 rounded-xl border border-(--color-border) p-4"
            style={{
              background: "var(--color-surface)",
              zIndex: 50,
              boxShadow: "0 8px 32px rgba(0,0,0,.5)",
              minWidth: 200,
            }}
          >
            <div
              className="text-[9px] font-mono uppercase tracking-widest mb-3"
              style={{ color: "var(--color-muted)" }}
            >
              Keyboard shortcuts
            </div>
            <div className="flex flex-col gap-2">
              {SHORTCUTS.map(({ key, desc }) => (
                <div key={key} className="flex items-center justify-between gap-6">
                  <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: "var(--color-muted)",
                      color: "var(--color-text)",
                      fontSize: 10,
                    }}
                  >
                    {key}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>
                    {desc}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
