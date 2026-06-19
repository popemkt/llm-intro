import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { cn } from "@/lib/utils";

interface SlideShellProps {
  children: React.ReactNode;
  className?: string;
}

// Logical canvas size. Code slides render into a fixed 1000×562.5 viewport
// (16:9) and are scaled with `transform: scale(...)` to fill the parent, so
// layout stays pixel-identical across overview, presentation, and fullscreen
// modes. The parent must already be 16:9 (both PresentationView and
// FullscreenView wrap SlideShell in a 16:9 box); the shell just measures
// width and scales.
export const SLIDE_CANVAS_WIDTH = 1000;
export const SLIDE_CANVAS_HEIGHT = 562.5;

/**
 * A 16:9 canvas wrapper. Children are rendered at a fixed 1000×562.5 logical
 * size and scaled to fill the parent, matching how OverviewGrid renders
 * thumbnails. Authors code slides assume a 1000×562.5 coordinate system.
 */
export function SlideShell({ children, className }: SlideShellProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const scaledCanvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      setScale(Math.min(width / SLIDE_CANVAS_WIDTH, height / SLIDE_CANVAS_HEIGHT));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const measuredScale = scale ?? 1;
  const scaledWidth = SLIDE_CANVAS_WIDTH * measuredScale;
  const scaledHeight = SLIDE_CANVAS_HEIGHT * measuredScale;

  // Framer Motion uses getBoundingClientRect for layout animations. Inside
  // our transform: scale() canvas, those rects are in post-transform
  // coordinates, which makes layoutId deltas wrong. transformPagePoint
  // converts page points back into the canvas's logical coordinate system.
  const transformPagePoint = useCallback(
    ({ x, y }: { x: number; y: number }) => {
      const el = scaledCanvasRef.current;
      if (!el || measuredScale === 0) return { x, y };
      const rect = el.getBoundingClientRect();
      return {
        x: (x - rect.left) / measuredScale + rect.left,
        y: (y - rect.top) / measuredScale + rect.top,
      };
    },
    [measuredScale],
  );

  return (
    <MotionConfig transformPagePoint={transformPagePoint}>
      <div
        ref={outerRef}
        className={cn("relative w-full h-full overflow-hidden bg-(--color-bg)", className)}
      >
        <div
          ref={scaledCanvasRef}
          className="absolute overflow-hidden"
          style={{
            width: scaledWidth,
            height: scaledHeight,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            visibility: scale === null ? "hidden" : undefined,
          }}
        >
          <div
            style={{
              width: SLIDE_CANVAS_WIDTH,
              height: SLIDE_CANVAS_HEIGHT,
              transform: `scale(${measuredScale})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
