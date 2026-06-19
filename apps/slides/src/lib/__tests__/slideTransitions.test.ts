import { describe, expect, it } from "vitest";
import { getTransitionPhaseTiming, resolveSlideTransition } from "../slideTransitions";

describe("slideTransitions", () => {
  it("resolves the default slide preset by direction", () => {
    const forward = resolveSlideTransition(undefined, 1);
    const backward = resolveSlideTransition(undefined, -1);

    expect(forward.engine).toBe("waapi");
    expect(forward.name).toBe("slide");
    expect(forward.enter.keyframes).toEqual([
      { opacity: 0, transform: "translate3d(100%, 0, 0)" },
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
    ]);
    expect(backward.exit.keyframes).toEqual([
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
      { opacity: 0, transform: "translate3d(100%, 0, 0)" },
    ]);
  });

  it("supports non-slide presets", () => {
    const fade = resolveSlideTransition({ name: "fade", duration: 200 }, 1);
    const scale = resolveSlideTransition({ name: "scale", duration: 250 }, 1);

    expect(fade.enter.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(scale.exit.keyframes).toEqual([
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(1.025)" },
    ]);
  });

  it("keeps custom enter and exit phases over preset phases", () => {
    const custom = resolveSlideTransition(
      {
        engine: "waapi",
        name: "fade",
        duration: 500,
        easing: "linear",
        enter: { keyframes: [{ opacity: 0, filter: "blur(8px)" }, { opacity: 1 }] },
        exit: { keyframes: [{ opacity: 1 }, { opacity: 0, filter: "blur(8px)" }] },
      },
      1,
    );

    expect(custom.enter.keyframes).toEqual([{ opacity: 0, filter: "blur(8px)" }, { opacity: 1 }]);
    expect(custom.exit.keyframes).toEqual([{ opacity: 1 }, { opacity: 0, filter: "blur(8px)" }]);
  });

  it("merges phase timing with transition defaults", () => {
    const transition = resolveSlideTransition(
      { name: "fade", duration: 300, easing: "ease-out" },
      1,
    );
    const timing = getTransitionPhaseTiming(transition, {
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      duration: 120,
      delay: 20,
    });

    expect(timing).toEqual({
      duration: 120,
      easing: "ease-out",
      delay: 20,
      fill: "both",
    });
  });
});
