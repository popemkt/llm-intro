import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  getTransitionPhaseTiming,
  resolveSlideTransition,
  type ResolvedSlideTransition,
  type SlideTransition,
  type SlideTransitionPhase,
} from "@/lib/slideTransitions";

type LayerPhase = "present" | "enter" | "exit";

interface SlideLayer<T> {
  key: string | number;
  item: T;
  phase: LayerPhase;
  direction: number;
}

interface SlideTransitionStageProps<T> {
  activeKey: string | number;
  item: T;
  direction: number;
  transition?: SlideTransition;
  onTransitionEnd?: () => void;
  renderItem: (item: T, isActive: boolean) => ReactNode;
}

interface AnimatedLayerProps {
  phase: LayerPhase;
  direction: number;
  transition?: SlideTransition;
  onDone: () => void;
  children: ReactNode;
}

function applyFinalKeyframe(el: HTMLElement, phase: SlideTransitionPhase) {
  const keyframes = Array.isArray(phase.keyframes) ? phase.keyframes : undefined;
  const finalFrame = keyframes?.[keyframes.length - 1];
  if (!finalFrame) return;
  for (const [property, value] of Object.entries(finalFrame)) {
    if (property === "offset" || property === "easing" || property === "composite") continue;
    if (value !== undefined && value !== null) {
      el.style.setProperty(property, String(value));
    }
  }
}

function runWaapiPhase(
  el: HTMLElement,
  resolved: ResolvedSlideTransition,
  phase: SlideTransitionPhase,
  onDone: () => void,
) {
  if (!el.animate || resolved.engine !== "waapi") {
    applyFinalKeyframe(el, phase);
    const timeout = window.setTimeout(onDone, phase.duration ?? resolved.duration);
    return () => window.clearTimeout(timeout);
  }

  const animation = el.animate(phase.keyframes, getTransitionPhaseTiming(resolved, phase));
  animation.finished.then(onDone).catch(() => {});
  return () => animation.cancel();
}

function AnimatedLayer({ phase, direction, transition, onDone, children }: AnimatedLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (phase === "present") return;
    const el = ref.current;
    if (!el) return;

    const resolved = resolveSlideTransition(transition, direction);
    const transitionPhase = phase === "enter" ? resolved.enter : resolved.exit;
    return runWaapiPhase(el, resolved, transitionPhase, () => onDoneRef.current());
  }, [direction, phase, transition]);

  return (
    <div
      ref={ref}
      data-transition-phase={phase}
      style={{
        position: "absolute",
        inset: 0,
        willChange: phase === "present" ? undefined : "opacity, transform, filter, clip-path",
      }}
    >
      {children}
    </div>
  );
}

export function SlideTransitionStage<T>({
  activeKey,
  item,
  direction,
  transition,
  onTransitionEnd,
  renderItem,
}: SlideTransitionStageProps<T>) {
  const [layers, setLayers] = useState<SlideLayer<T>[]>([
    { key: activeKey, item, phase: "present", direction },
  ]);
  const previousKeyRef = useRef(activeKey);

  useEffect(() => {
    if (previousKeyRef.current === activeKey) {
      setLayers((current) =>
        current.map((layer) =>
          layer.key === activeKey && layer.phase !== "exit" ? { ...layer, item } : layer,
        ),
      );
      return;
    }

    previousKeyRef.current = activeKey;
    setLayers((current) => [
      ...current
        .filter((layer) => layer.phase !== "exit")
        .map((layer) => ({ ...layer, phase: "exit" as const, direction })),
      { key: activeKey, item, phase: "enter", direction },
    ]);
  }, [activeKey, direction, item]);

  return (
    <>
      {layers.map((layer) => (
        <AnimatedLayer
          key={layer.key}
          phase={layer.phase}
          direction={layer.direction}
          transition={transition}
          onDone={() => {
            if (layer.phase === "exit") {
              setLayers((current) => current.filter((entry) => entry.key !== layer.key));
              return;
            }
            setLayers((current) =>
              current.map((entry) =>
                entry.key === layer.key && entry.phase === "enter"
                  ? { ...entry, phase: "present" }
                  : entry,
              ),
            );
            onTransitionEnd?.();
          }}
        >
          {renderItem(layer.item, layer.key === activeKey && layer.phase !== "exit")}
        </AnimatedLayer>
      ))}
    </>
  );
}
