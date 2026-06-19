---
name: code-slide-patterns
description: Use when creating, editing, or reviewing code-backed slides in apps/slides/src/slides. Captures patterns reverse-engineered from this repo's existing code slides.
---

# Code Slide Patterns

Use this after `slide-authoring` whenever a slide is implemented as React code under `apps/slides/src/slides`.

## Source Model

- Code-backed slides are React components registered in `apps/slides/src/slides/registry.ts`.
- Each component accepts `SlideProps`; at minimum use `isActive` to gate entrances, timers, loops, and reset behavior.
- The rendered stage is the fixed `1000 x 562.5` logical canvas from `SlideShell`.
- Prefer self-contained slide modules. Extract helpers only for repeated patterns, as with `apps/slides/src/design/*`.

## Existing Families

- `01-opener`: cinematic title card, background motion, staggered text reveal.
- `02-linear-regression`: full interactive teaching app with parts, SVG chart, dragging, model fitting, and tab-like navigation.
- `03-context`: compact interactive model/context selector with progressive layers.
- `04-tool-use`: timeline simulation with chat/status derivation, drag-scrolled context lane, and SVG flow diagram.
- `05-claude-desktop`: clickable app-shell mock with tooltips.
- `06-browser-control`: auto-advancing procedural demo with flow diagram.
- `07-workspace-setup`: file-tree explainer with staggered rows.
- `08-workspace-concepts`: hover/click concept cards with code/text detail panes.
- `09-appendix`: clickable flowchart appendix.
- `10-word-dimensions`: tabbed interactive mini-app for embeddings, similarity, and word arithmetic.

## Visual Language

- Default visual system is dark, precise, and technical: `T.bg`, `T.surface`, `T.border`, `T.text`, `T.textDim`, `T.accent`, `T.highlight`.
- Use `apps/slides/src/design/tokens.ts`:
  - `T` for inline styles, SVG, canvas, and code-backed slide visuals.
  - `C` for CSS variable references in app-shell UI.
- Accent green marks the core idea or active object. Yellow/orange/purple/blue are secondary semantic colors, not broad palettes.
- Use `Inter` for prose/UI labels and `JetBrains Mono` for code, command, counters, protocol labels, and machine output.
- Prefer small, crisp radii around `4-10px` for cards, controls, mock windows, and diagram nodes.
- Build visual explanations with SVG, lucide icons, chips, miniature UI mockups, charts, and flow nodes rather than large text blocks.

## Layout Patterns

- Root element fills the slide: `width: "100%"`, `height: "100%"`, `background: T.bg`, `boxSizing: "border-box"`, usually `overflow: "hidden"`.
- Common frame: title at top, dense teaching artifact below, footnote/instruction at bottom.
- Common content layouts:
  - two-column explainer with diagram on one side and controls/steps on the other;
  - centered cinematic title composition;
  - full-slide mini-app with tabs or internal parts;
  - SVG flowchart with a compact status/detail panel.
- Use logical px for stable slide geometry. Existing older slides use some `clamp(...)`; new slides should prefer fixed logical sizes plus flex/grid within the canvas unless there is a specific fit reason.
- Avoid scroll except inside deliberately framed panes such as chat logs or long context lanes.

## Motion Patterns

- Use `motion/react` for slide-local choreography.
- Standard entrance: `{ opacity: 0, y: 12-24 }` to `{ opacity: 1, y: 0 }`, duration `0.35-0.5`, ease `[0.22, 1, 0.36, 1]`.
- Stagger rows/cards with small delays, usually `0.08-0.18s`.
- Use `AnimatePresence` for part/tab swaps, tooltip panels, and status bubbles.
- Looping background or cursor animations must stop or settle when `isActive` is false.
- Prefer path-length animation for SVG arrows/lines and scale/opacity for nodes.

## Interaction Patterns

- Interactive slides should feel like tiny deterministic teaching tools: click, drag, hover, tab, step, reset.
- Keep state local unless the app product model needs to persist it.
- Reset or pause transient state when `isActive` becomes false.
- Stop propagation for nested controls when the slide root also handles clicks.
- For SVG pointer interactions, convert client coordinates through `createSVGPoint()` and `getScreenCTM().inverse()`.
- Use pointer capture for drag controls and release/reset drag state on pointer up/cancel.
- Provide visible instructions only as compact in-slide labels where they are part of the teaching artifact.

## Reusable Pieces

Prefer existing helpers before adding new ones:

- `T`/`C` from `@/design/tokens`;
- `AnimBox` for repeated entrance boxes;
- `FlowNode`, `FlowArrow`, and `ArrowDefs` for SVG process diagrams;
- lucide icons for controls, diagrams, and UI mocks.

## Authoring Checklist

- Registered in `codeSlideRegistry` with a stable code id.
- Uses `SlideProps` and gates motion/timers with `isActive`.
- Fits the `1000 x 562.5` canvas with no accidental page/body dependencies.
- No network calls during render.
- No global CSS for one-off visuals.
- Uses local data constants for teaching examples.
- Interactive state is deterministic and reviewable.
- Export/presenter/fullscreen paths still render the slide without depending on hover-only information.
