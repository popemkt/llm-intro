import type {
  ApiSlideTransition,
  SlideTransitionEngine,
  SlideTransitionPhase,
} from "@llm-intro/api-contract";

export type SlideTransition = ApiSlideTransition;
export type { SlideTransitionPhase };

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

function coverPreset(direction: number): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  const enterX = direction > 0 ? "100%" : "-100%";
  return {
    enter: {
      keyframes: [
        { opacity: 1, transform: `translate3d(${enterX}, 0, 0)` },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
    },
    exit: { keyframes: [{ opacity: 1 }, { opacity: 1 }] },
  };
}

function revealPreset(direction: number): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  const exitX = direction > 0 ? "-100%" : "100%";
  return {
    enter: { keyframes: [{ opacity: 1 }, { opacity: 1 }] },
    exit: {
      keyframes: [
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
        { opacity: 1, transform: `translate3d(${exitX}, 0, 0)` },
      ],
    },
  };
}

function wipePreset(direction: number): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  const enterStart = direction > 0 ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)";
  const exitEnd = direction > 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";
  return {
    enter: {
      keyframes: [
        { opacity: 1, clipPath: enterStart },
        { opacity: 1, clipPath: "inset(0)" },
      ],
    },
    exit: {
      keyframes: [
        { opacity: 1, clipPath: "inset(0)" },
        { opacity: 1, clipPath: exitEnd },
      ],
    },
  };
}

function flipPreset(direction: number): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  const enterRotation = direction > 0 ? "rotateY(82deg)" : "rotateY(-82deg)";
  const exitRotation = direction > 0 ? "rotateY(-82deg)" : "rotateY(82deg)";
  return {
    enter: {
      keyframes: [
        { opacity: 0, transform: `perspective(1400px) ${enterRotation} scale(0.96)` },
        { opacity: 1, transform: "perspective(1400px) rotateY(0deg) scale(1)" },
      ],
    },
    exit: {
      keyframes: [
        { opacity: 1, transform: "perspective(1400px) rotateY(0deg) scale(1)" },
        { opacity: 0, transform: `perspective(1400px) ${exitRotation} scale(0.96)` },
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
  if (name === "cover") return coverPreset(direction);
  if (name === "reveal") return revealPreset(direction);
  if (name === "wipe") return wipePreset(direction);
  if (name === "flip") return flipPreset(direction);
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
