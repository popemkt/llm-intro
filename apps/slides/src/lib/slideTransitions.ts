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

function blurPreset(): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  return {
    enter: {
      keyframes: [
        { opacity: 0, transform: "scale(1.2)", filter: "blur(32px) brightness(1.4)" },
        { opacity: 1, transform: "scale(1)", filter: "blur(0px) brightness(1)" },
      ],
      duration: 780,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    },
    exit: {
      keyframes: [
        { opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
        { opacity: 0, transform: "scale(0.9)", filter: "blur(24px)" },
      ],
      duration: 460,
      easing: "cubic-bezier(0.7, 0, 0.84, 0)",
    },
  };
}

function risePreset(): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  return {
    enter: {
      keyframes: [
        {
          offset: 0,
          opacity: 0,
          transform: "translate3d(0, 110px, 0) scale(0.88)",
          filter: "blur(18px)",
        },
        {
          offset: 0.7,
          opacity: 1,
          transform: "translate3d(0, -10px, 0) scale(1.01)",
          filter: "blur(0px)",
        },
        { offset: 1, opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", filter: "blur(0px)" },
      ],
      duration: 860,
      easing: "cubic-bezier(0.34, 1.3, 0.5, 1)",
    },
    exit: {
      keyframes: [
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", filter: "blur(0px)" },
        { opacity: 0, transform: "translate3d(0, -70px, 0) scale(0.94)", filter: "blur(14px)" },
      ],
      duration: 480,
      easing: "cubic-bezier(0.7, 0, 0.84, 0)",
    },
  };
}

function glidePreset(direction: number): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  const enterX = direction > 0 ? "26%" : "-26%";
  const exitX = direction > 0 ? "-26%" : "26%";
  const enterRot = direction > 0 ? "-14deg" : "14deg";
  const exitRot = direction > 0 ? "14deg" : "-14deg";
  return {
    enter: {
      keyframes: [
        {
          opacity: 0,
          transform: `perspective(1600px) translate3d(${enterX}, 0, 0) rotateY(${enterRot}) scale(0.9)`,
          filter: "blur(10px)",
        },
        {
          opacity: 1,
          transform: "perspective(1600px) translate3d(0, 0, 0) rotateY(0deg) scale(1)",
          filter: "blur(0px)",
        },
      ],
      duration: 820,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    },
    exit: {
      keyframes: [
        {
          opacity: 1,
          transform: "perspective(1600px) translate3d(0, 0, 0) rotateY(0deg) scale(1)",
          filter: "blur(0px)",
        },
        {
          opacity: 0,
          transform: `perspective(1600px) translate3d(${exitX}, 0, 0) rotateY(${exitRot}) scale(0.9)`,
          filter: "blur(8px)",
        },
      ],
      duration: 540,
      easing: "cubic-bezier(0.7, 0, 0.84, 0)",
    },
  };
}

function zoomPreset(): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  return {
    enter: {
      keyframes: [
        { offset: 0, opacity: 0, transform: "scale(0.55)", filter: "blur(14px)" },
        { offset: 0.65, opacity: 1, transform: "scale(1.06)", filter: "blur(0px)" },
        { offset: 1, opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
      ],
      duration: 700,
      easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
    exit: {
      keyframes: [
        { opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
        { opacity: 0, transform: "scale(1.35)", filter: "blur(10px)" },
      ],
      duration: 420,
      easing: "cubic-bezier(0.7, 0, 0.84, 0)",
    },
  };
}

function swoopPreset(direction: number): Pick<ResolvedSlideTransition, "enter" | "exit"> {
  const enterX = direction > 0 ? "60%" : "-60%";
  const exitX = direction > 0 ? "-60%" : "60%";
  const enterRot = direction > 0 ? "38deg" : "-38deg";
  const exitRot = direction > 0 ? "-38deg" : "38deg";
  return {
    enter: {
      keyframes: [
        {
          opacity: 0,
          transform: `perspective(1400px) translate3d(${enterX}, 12%, 0) rotateY(${enterRot}) scale(0.82)`,
        },
        {
          opacity: 1,
          transform: "perspective(1400px) translate3d(0, 0, 0) rotateY(0deg) scale(1)",
        },
      ],
      duration: 840,
      easing: "cubic-bezier(0.22, 1.2, 0.36, 1)",
    },
    exit: {
      keyframes: [
        {
          opacity: 1,
          transform: "perspective(1400px) translate3d(0, 0, 0) rotateY(0deg) scale(1)",
        },
        {
          opacity: 0,
          transform: `perspective(1400px) translate3d(${exitX}, 12%, 0) rotateY(${exitRot}) scale(0.82)`,
        },
      ],
      duration: 520,
      easing: "cubic-bezier(0.7, 0, 0.84, 0)",
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
  if (name === "blur") return blurPreset();
  if (name === "rise") return risePreset();
  if (name === "glide") return glidePreset(direction);
  if (name === "zoom") return zoomPreset();
  if (name === "swoop") return swoopPreset(direction);
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

export function getTransitionLayerZIndex(
  resolved: Pick<ResolvedSlideTransition, "name">,
  phase: "enter" | "exit" | "present",
) {
  if (phase === "present") return 1;
  if (resolved.name === "reveal") return phase === "exit" ? 2 : 1;
  return phase === "enter" ? 2 : 1;
}
