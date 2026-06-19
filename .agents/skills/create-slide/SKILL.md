---
name: create-slide
description: Use when the user asks to create, draft, generate, or substantially expand a slide deck in this repo.
---

# Create Slides

This workflow adapts Open Slide's agent-first deck creation to this app's product model.

## 1. Clarify Before Writing

If the request is under-specified, ask for:

- topic, audience, and goal;
- rough page count;
- text density;
- aesthetic direction;
- motion level: static, subtle, rich, or interactive.

Recommend options tailored to the topic. Do not offer generic style buckets without concrete visual cues.

## 2. Choose Output Type

Prefer normal DB slides when the deck can be represented with blocks, images, notes, and theme tokens.

Use code-backed slides when the user needs:

- custom interaction;
- interactive apps, tools, or calculators embedded in a slide;
- games, quizzes, sandboxes, or playable learning moments;
- complex animation/choreography;
- bespoke data visualization;
- teaching simulations;
- visuals that normal blocks cannot express.

Mixed decks are allowed.

## 3. Plan The Deck

For multistep or complex concepts, prefer a progressive explanation across multiple slides instead of one overloaded slide. Use the existing LLM intro deck as the pattern: first build intuition, then isolate the mechanism, then add interactivity or examples, then close with implications.

Draft page roles before implementation:

- cover;
- agenda or framing;
- section divider;
- content;
- comparison;
- process/flow;
- big number;
- demo/interactive page;
- app, game, quiz, or simulator;
- closing.

Keep one idea per slide. Split when vertical budget gets tight.

## 4. Apply Authoring Rules

Read the `slide-authoring` skill before writing slide source or mutating slide content.

Use existing product actions/API for DB slides. For code-backed slides, also read `code-slide-patterns` and register the slide through the registry.

## 5. Assets

If the deck needs logos, screenshots, or media, use the assets-management workflow:

- locate/import assets;
- store them deck-locally;
- document source/license;
- reference stable local paths in slide content.

## 6. Handoff

Report:

- deck id/name;
- slide count;
- code-backed files added, if any;
- assets added;
- validation run.
