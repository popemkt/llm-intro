import { useEffect, useRef, useState } from "react";
import type { UnifiedSlide } from "@/types";
import { DbSlideRenderer } from "./DbSlideRenderer";
import { HtmlSlideRenderer } from "./HtmlSlideRenderer";

// Slides author at a fixed logical 16:9 canvas and are scaled with
// transform: scale(...) to fill whatever box they're dropped into — the same
// approach OverviewGrid uses, extracted so the slide dock and deck cards render
// previews identically across all slide kinds.
const LOGICAL_W = 1000;
const LOGICAL_H = 562.5;

export function SlidePreview({ slide }: { slide: UnifiedSlide }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setScale(width / LOGICAL_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={outerRef}
      style={{ position: "relative", width: "100%", paddingBottom: "56.25%", overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: LOGICAL_W,
          height: LOGICAL_H,
          transform: `scale(${scale ?? 0})`,
          transformOrigin: "top left",
          pointerEvents: "none",
          visibility: scale === null ? "hidden" : undefined,
        }}
      >
        {slide.kind === "code" ? (
          <slide.component isActive={false} />
        ) : slide.kind === "html" ? (
          <HtmlSlideRenderer html={slide.html} title={slide.title} />
        ) : (
          <DbSlideRenderer
            background={slide.background}
            blocks={slide.blocks}
            theme={slide.theme}
          />
        )}
      </div>
    </div>
  );
}
