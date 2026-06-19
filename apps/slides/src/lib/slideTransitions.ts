export type SlideTransitionEngine = "waapi" | "css" | "motion" | "three" | "custom";

export type SlideTransitionPreset = "slide" | "fade" | "scale" | "none";

export interface SlideTransitionPhase {
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  duration?: number;
  easing?: string;
  delay?: number;
}

export interface SlideTransition {
  engine?: SlideTransitionEngine;
  name?: SlideTransitionPreset | string;
  duration: number;
  easing?: string;
  enter?: SlideTransitionPhase;
  exit?: SlideTransitionPhase;
  params?: Record<string, unknown>;
}

export interface ResolvedSlideTransition {
  engine: SlideTransitionEngine;
  name: string;
  duration: number;
  easing: string;
  enter: SlideTransitionPhase;
  exit: SlideTransitionPhase;
}

export const DEFAULT_SLIDE_TRANSITION: SlideTransition = {
  engine: "waapi",
  name: "slide",
  duration: 350,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
};

function slidePreset(direction: number): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  const enterX = direction > 0 ? "100%" : "-100%";
  const exitX = direction > 0 ? "-100%" : "100%";
  return {
    enter: {
      keyframes: [
        { opacity: 0, transform: `translate3d(${enterX}, 0, 0)` },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
    },
    exit: {
      keyframes: [
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
        { opacity: 0, transform: `translate3d(${exitX}, 0, 0)` },
      ],
    },
  };
}

function fadePreset(): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  return {
    enter: { keyframes: [{ opacity: 0 }, { opacity: 1 }] },
    exit: { keyframes: [{ opacity: 1 }, { opacity: 0 }] },
  };
}

function scalePreset(): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  return {
    enter: {
      keyframes: [
        { opacity: 0, transform: "scale(0.96)" },
        { opacity: 1, transform: "scale(1)" },
      ],
    },
    exit: {
      keyframes: [
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(1.025)" },
      ],
    },
  };
}

function nonePreset(): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  return {
    enter: { keyframes: [{ opacity: 1 }] },
    exit: { keyframes: [{ opacity: 1 }] },
  };
}

function resolvePreset(
  name: SlideTransition["name"],
  direction: number,
): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  if (name === "fade") return fadePreset();
  if (name === "scale") return scalePreset();
  if (name === "none") return nonePreset();
  return slidePreset(direction);
}

export function resolveSlideTransition(
  transition: SlideTransition | undefined,
  direction: number,
): ResolvedSlideTransition {
  const base = { ...DEFAULT_SLIDE_TRANSITION, ...transition };
  const preset = resolvePreset(base.name, direction);

  return {
    engine: base.engine ?? "waapi",
    name: base.name ?? "slide",
    duration: base.duration,
    easing: base.easing ?? "ease",
    enter: base.enter ?? preset.enter,
    exit: base.exit ?? preset.exit,
  };
}

export function getTransitionPhaseTiming(
  resolved: ResolvedSlideTransition,
  phase: SlideTransitionPhase,
): KeyframeAnimationOptions {
  return {
    duration: phase.duration ?? resolved.duration,
    easing: phase.easing ?? resolved.easing,
    delay: phase.delay ?? 0,
    fill: "both",
  };
}
