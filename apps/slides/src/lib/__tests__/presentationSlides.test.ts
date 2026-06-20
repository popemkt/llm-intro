import { describe, expect, it } from "vitest";
import type { ApiSlide, ApiSlideTransition } from "@/types";
import { toUnifiedSlide } from "../presentationSlides";

const baseSlide: ApiSlide = {
  id: 1,
  presentation_id: 2,
  position: 0,
  group_id: null,
  kind: "db",
  code_id: null,
  title: "Slide",
  blocks: [],
  html: "",
  notes: "",
  transition: null,
  background: null,
  created_at: "2026-06-20 00:00:00",
  updated_at: "2026-06-20 00:00:00",
};

describe("toUnifiedSlide", () => {
  it("inherits the deck default transition when the slide has no override", () => {
    const defaultTransition: ApiSlideTransition = {
      engine: "waapi",
      name: "flip",
      duration: 450,
    };

    expect(toUnifiedSlide(baseSlide, "dark-green", defaultTransition).transition).toEqual(
      defaultTransition,
    );
  });

  it("keeps a slide transition override ahead of the deck default", () => {
    const slideTransition: ApiSlideTransition = {
      engine: "waapi",
      name: "fade",
      duration: 250,
    };
    const defaultTransition: ApiSlideTransition = {
      engine: "waapi",
      name: "flip",
      duration: 450,
    };

    expect(
      toUnifiedSlide({ ...baseSlide, transition: slideTransition }, "dark-green", defaultTransition)
        .transition,
    ).toEqual(slideTransition);
  });
});
