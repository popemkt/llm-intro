import { describe, expect, it } from "vitest";
import {
  getTransitionLayerZIndex,
  getTransitionPhaseTiming,
  resolveSlideTransition,
} from "../slideTransitions";

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
    const cover = resolveSlideTransition({ name: "cover", duration: 300 }, 1);
    const reveal = resolveSlideTransition({ name: "reveal", duration: 300 }, -1);
    const wipe = resolveSlideTransition({ name: "wipe", duration: 300 }, 1);
    const flip = resolveSlideTransition({ name: "flip", duration: 300 }, -1);

    expect(fade.enter.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(scale.exit.keyframes).toEqual([
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(1.025)" },
    ]);
    expect(cover.enter.keyframes[0]).toMatchObject({
      opacity: 1,
      transform: "translate3d(100%, 0, 0)",
    });
    expect(reveal.exit.keyframes[1]).toMatchObject({
      opacity: 1,
      transform: "translate3d(100%, 0, 0)",
    });
    expect(wipe.enter.keyframes).toEqual([
      { opacity: 1, clipPath: "inset(0 100% 0 0)" },
      { opacity: 1, clipPath: "inset(0)" },
    ]);
    expect(flip.enter.keyframes[0]).toMatchObject({
      opacity: 0,
      transform: "perspective(1400px) rotateY(-82deg) scale(0.96)",
    });
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

  it("puts reveal exits above entering slides", () => {
    const reveal = resolveSlideTransition({ name: "reveal", duration: 300 }, 1);
    const fade = resolveSlideTransition({ name: "fade", duration: 300 }, 1);

    expect(getTransitionLayerZIndex(reveal, "exit")).toBeGreaterThan(
      getTransitionLayerZIndex(reveal, "enter"),
    );
    expect(getTransitionLayerZIndex(fade, "enter")).toBeGreaterThan(
      getTransitionLayerZIndex(fade, "exit"),
    );
  });
});
