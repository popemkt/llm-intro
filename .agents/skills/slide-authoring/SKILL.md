---
name: slide-authoring
description: Use when creating, editing, or reviewing slides in this repo. Covers code-backed slides, normal DB slides, the fixed canvas contract, interaction rules, motion, assets, and themeability.
---

# Slide Authoring

This repo is an interactive slide app, not a pure file-based slide framework. Use the existing product model:

- code-backed slides live in `apps/slides/src/slides/` and are registered in `apps/slides/src/slides/registry.ts`;
- normal slides live in the app database and are edited through product actions/API;
- all rendered slides must obey the shared canvas contract.

## Canvas Contract

Slides render in a fixed 16:9 logical canvas: `1000 x 562.5`.

- Author code slides as if the stage is exactly `1000 x 562.5`.
- Use `px`, `%`, flex, grid, and SVG coordinates inside the canvas.
- Do not use `vh`, `vw`, `vmin`, `vmax`, `position: fixed`, or portals to `document.body` inside a slide.
- Root element should fill the canvas: `width: "100%"`, `height: "100%"`.
- Heavy animation should run only when `isActive` is true.
- Test overview, presentation, fullscreen, and export paths when changing slide rendering.

The shell is in `apps/slides/src/components/SlideShell.tsx`. It scales and centers the logical canvas to the available viewport.

## Code-Backed Slides

1. Create `apps/slides/src/slides/NN-name.tsx`.
2. Export a React component accepting `SlideProps`.
3. Register it in `apps/slides/src/slides/registry.ts`.
4. Add seed/system deck references only when the slide should ship as built-in content.

Keep code-backed slides self-contained unless there is a repeated local pattern worth extracting. Do not add global CSS for a one-off slide.

## Normal Slides

Use actions and API routes rather than writing DB rows directly. Preserve:

- deck themeability;
- slide/group ordering;
- notes and export behavior;
- undo/snapshot expectations where applicable.

When generating content, prefer product actions that create normal slides unless the user explicitly asks for custom code-backed interactivity.

## Interactive Slides

Interactive slides are valid when interaction teaches the concept. This includes mini-apps, games, quizzes, calculators, simulations, sandboxes, and guided demos. Keep them deterministic and presenter-safe:

- no network calls from slide render;
- no persistent side effects except through app actions;
- keyboard and pointer states must reset predictably when leaving/re-entering a slide;
- use `isActive` to pause timers, loops, and expensive visual work.

## Motion And Transitions

Do not lock the app to one animation technology. Use the smallest fit:

- CSS keyframes for simple looping or entrance animation;
- Framer Motion for React state-driven choreography already local to a slide;
- Web Animations API for page transitions and runtime-controlled effects;
- canvas/WebGL only when the visual genuinely needs it.

Transitions should be modeled as data: duration, easing, enter keyframes, exit keyframes, and optional direction. That keeps CSS, WAAPI, Motion, and future engines interchangeable.

## Assets And Logos

Assets should become deck-scoped product resources, not ad hoc imports scattered across the app.

- Use local assets for final decks.
- Track source, license, and intended slide/deck usage.
- For logos, prefer an SVGL-style search/import workflow and store the chosen SVG under the deck asset set.
- Do not hotlink production slide assets unless the user explicitly wants that.

## Self-Review

Before finishing slide work:

- no viewport units inside code slides;
- content fits the logical canvas without scroll;
- theme tokens are respected;
- interactive state is gated by `isActive`;
- assets are local or explicitly documented;
- export and presenter paths are not broken.
