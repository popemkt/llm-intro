import type { Block } from "@/types";

export const BLOCK_ANIMATION_TIMING: Partial<
  Record<NonNullable<Block["animation"]>["preset"], { duration: number; easing: string }>
> = {
  "blur-reveal": { duration: 720, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  "mask-up": { duration: 800, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
  "spring-up": { duration: 760, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  "tilt-in": { duration: 820, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
};

export function blockAnimationKeyframes(
  preset: NonNullable<Block["animation"]>["preset"],
  transform = "none",
): Keyframe[] {
  // Compose extra transforms onto the block's own transform. A literal "none"
  // prefix (`none translateY(...)`) is invalid CSS and the browser drops the
  // whole transform, collapsing every preset into a plain fade, so drop it.
  const base = transform && transform !== "none" ? `${transform} ` : "";
  switch (preset) {
    case "fade-in":
      return [
        { opacity: 0, transform },
        { opacity: 1, transform },
      ];
    case "rise":
      return [
        { opacity: 0, transform: `${base}translateY(22px)` },
        { opacity: 1, transform },
      ];
    case "scale-in":
      return [
        { opacity: 0, transform: `${base}scale(0.86)` },
        { opacity: 1, transform },
      ];
    case "slide-left":
      return [
        { opacity: 0, transform: `${base}translateX(40px)` },
        { opacity: 1, transform },
      ];
    case "slide-right":
      return [
        { opacity: 0, transform: `${base}translateX(-40px)` },
        { opacity: 1, transform },
      ];
    case "wipe-right":
      return [
        { clipPath: "inset(0 100% 0 0)", opacity: 1, transform },
        { clipPath: "inset(0 0 0 0)", opacity: 1, transform },
      ];
    case "blur-reveal":
      return [
        { filter: "blur(14px)", opacity: 0, transform: `${base}translateY(28px)` },
        { filter: "blur(0px)", opacity: 1, transform },
      ];
    case "mask-up":
      return [
        { clipPath: "inset(100% 0 0 0)", transform: `${base}translateY(40px)` },
        { clipPath: "inset(0 0 0 0)", transform },
      ];
    case "spring-up":
      return [
        { offset: 0, opacity: 0, transform: `${base}translateY(60px) scale(0.96)` },
        { offset: 0.7, opacity: 1, transform: `${base}translateY(-8px) scale(1.01)` },
        { offset: 1, opacity: 1, transform },
      ];
    case "tilt-in":
      return [
        { opacity: 0, transform: `${base}perspective(1200px) rotateX(28deg) translateY(40px)` },
        { opacity: 1, transform },
      ];
    case "pulse":
      return [{ transform }, { transform: `${base}scale(1.04)` }, { transform }];
  }
}
