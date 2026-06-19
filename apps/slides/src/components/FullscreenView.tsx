import { useEffect, useRef, useCallback } from "react";
import type { UnifiedSlide } from "@/types";
import { SlideShell } from "./SlideShell";
import { DbSlideRenderer } from "./DbSlideRenderer";
import { HtmlSlideRenderer } from "./HtmlSlideRenderer";
import { SlideTransitionStage } from "./SlideTransitionStage";

interface Props {
  slides: UnifiedSlide[];
  activeIndex: number;
  onNavigate: (index: number) => void;
  onExit: () => void;
  allowKeyboardNavigation?: boolean;
  requestFullscreen?: boolean;
}

function RenderSlide({ slide, isActive }: { slide: UnifiedSlide; isActive: boolean }) {
  if (slide.kind === "code") {
    return (
      <SlideShell>
        <slide.component isActive={isActive} />
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

export function FullscreenView({
  slides,
  activeIndex,
  onNavigate,
  onExit,
  allowKeyboardNavigation = true,
  requestFullscreen = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const directionRef = useRef(1);
  const transitioning = useRef(false);

  useEffect(() => {
    if (!requestFullscreen) return;
    containerRef.current?.requestFullscreen().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [requestFullscreen]);

  useEffect(() => {
    if (!requestFullscreen) return;
    const onFSChange = () => {
      if (!document.fullscreenElement) onExit();
    };
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, [onExit, requestFullscreen]);

  const go = useCallback(
    (next: number) => {
      if (transitioning.current) return;
      if (next < 0 || next >= slides.length) return;
      if (next === activeIndex) return;
      directionRef.current = next > activeIndex ? 1 : -1;
      transitioning.current = true;
      onNavigate(next);
    },
    [activeIndex, slides.length, onNavigate],
  );

  useEffect(() => {
    if (!allowKeyboardNavigation) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        go(activeIndex + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        go(activeIndex - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, allowKeyboardNavigation, go]);

  const slide = slides[activeIndex];

  if (!slide) {
    return (
      <div
        ref={containerRef}
        style={{
          width: "100vw",
          height: "100vh",
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        No slides available.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", maxWidth: "calc(100vh * 16/9)" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingBottom: "56.25%",
            overflow: "hidden",
          }}
        >
          <SlideTransitionStage
            activeKey={activeIndex}
            item={slide}
            direction={directionRef.current}
            transition={slide.transition ?? undefined}
            onTransitionEnd={() => {
              transitioning.current = false;
            }}
            renderItem={(layerSlide, isActive) => (
              <RenderSlide slide={layerSlide} isActive={isActive} />
            )}
          />
        </div>
      </div>
    </div>
  );
}
