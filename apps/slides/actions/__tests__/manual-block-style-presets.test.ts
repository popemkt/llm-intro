import type { Block } from "@llm-intro/api-contract";
import { describe, expect, it } from "vitest";

import { createApplyManualBlockStylePresetAction } from "../manual-block-style-presets.js";

function createTextBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "text",
    type: "text",
    x: 10,
    y: 10,
    w: 30,
    h: 10,
    text: "Manual block",
    color: "#111827",
    background: "transparent",
    ...overrides,
  } as Block;
}

function createSlidesService(blocks: Block[]) {
  return {
    list: async () => [{ id: 10, blocks }],
    update: async (_pid: number, _sid: number, input: { blocks: Block[] }) => ({
      id: 10,
      blocks: input.blocks,
    }),
  };
}

describe("manual block style presets action", () => {
  it("applies a named appearance preset to selected unlocked blocks", async () => {
    const action = createApplyManualBlockStylePresetAction(
      createSlidesService([createTextBlock()]),
    );

    const result = await action.run({
      pid: 1,
      sid: 10,
      blockIds: ["text"],
      presetId: "accent-card",
    });

    expect(result.slide.blocks[0]).toMatchObject({
      id: "text",
      text: "Manual block",
      background: "#1d4ed8",
      color: "#ffffff",
      radius: 12,
    });
  });

  it("rejects locked target blocks", async () => {
    const action = createApplyManualBlockStylePresetAction(
      createSlidesService([createTextBlock({ locked: true })]),
    );

    await expect(
      action.run({
        pid: 1,
        sid: 10,
        blockIds: ["text"],
        presetId: "soft-note",
      }),
    ).rejects.toThrow("block is locked: text");
  });
});
