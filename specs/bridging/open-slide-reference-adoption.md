# Open Slide Reference Adoption

Open Slide is a useful reference, not a replacement foundation for this app.

Source inspected: `https://github.com/1weiho/open-slide`, cloned locally under `.references/open-slide` for manual review. The reference checkout is intentionally ignored by git.

## What We Are Taking

- Agent skills:
  - create slide workflow;
  - slide authoring rules;
  - apply inspector/comment feedback workflow;
  - current slide resolution;
  - theme creation workflow;
  - asset/logo management workflow.
- Canvas behavior:
  - fixed logical canvas;
  - fit by width and height;
  - centered scaled canvas;
  - no first-frame full-size flash.
- Product ideas:
  - inspector comments;
  - UI-triggered "apply fixes" loop;
  - deck-scoped assets panel;
  - SVGL-style logo search and import;
  - theme preview/demo workflow;
  - data-modeled slide transitions.

## What We Are Not Taking Wholesale

- `slides/<id>/index.tsx` as the primary source of truth.
- Open Slide's hidden Vite workspace model.
- Its full app shell/runtime.
- Its React 18 / Vite 5 dependency surface.

Our source of truth remains:

- normal slide/deck data in the app database;
- code-backed slides in `apps/slides/src/slides`;
- Agent Native actions/resources/app-state as the agent surface;
- existing themeability and export architecture.

## Skills Installation

Repo-local Agent/Codex-style skills live under `.agents/skills/*/SKILL.md`.

Claude Code entrypoint skill files live under `.claude/skills/*.md` and point to the shared `.agents` skill bodies, so both surfaces use the same operational guidance.

Installed skills:

- `slide-authoring`
- `code-slide-patterns`
- `create-slide`
- `apply-slide-feedback`
- `current-slide`
- `create-slide-theme`
- `assets-management`

## Feedback Workflow

Open Slide persists comments as source markers and expects an agent command to apply them. We should use the stronger product workflow:

1. User marks slide/element feedback in the UI.
2. Feedback is persisted as app data or Agent Native resources.
3. The UI exposes an "Apply fixes" action.
4. The action starts the product/code agent with structured context.
5. Agent applies edits, marks feedback resolved, and returns a reviewable diff.

This is closer to Plannotator-style review: the agent can still own the session, but the user should be able to continue it from the UI.

Vibe Kanban is a useful supporting reference for this direction: its README describes inline diff comments, a built-in browser with inspect mode/device emulation, and sending feedback directly to coding agents from the UI. We should borrow the product shape, not vendor its whole task/workspace manager.

### WIP: CLI Agent Session Survival

There is a fatal flaw if a CLI/code agent is owned by the Vite-rendered browser page: when the agent edits the app, Vite can refresh the page and kill the session exactly when the self-modification succeeds.

Target architecture:

- the backend/harness process owns Codex/Claude CLI sessions;
- the browser attaches as a reconnectable client over WebSocket/SSE;
- session ids, cwd, branch, mode, prompt state, and output buffers are stored server-side;
- after Vite refreshes, the UI reconnects to the same session and replays recent terminal/chat output;
- code mode is therefore a remote session surface, not an in-page worker.

This should be implemented before relying on app self-modification flows for serious work. Product-mode actions can continue separately because they do not require a long-lived local CLI process inside the browser.

## Assets And SVGL

Open Slide's asset manager and SVGL search are worth porting as product features.

Target behavior:

- per-deck asset library;
- local final assets for export stability;
- source/license metadata;
- SVG-first logo imports;
- Agent Native resource exposure so agents can reason about available assets;
- product actions for search/import/list/update/delete.

Initial action candidates:

- `search-logo-assets`
- `import-deck-asset`
- `list-deck-assets`
- `update-deck-asset-metadata`
- `delete-deck-asset`

First runtime slice:

- `deck_assets` stores deck-local assets with content, kind, MIME type, source URL/name, license, usage, and JSON metadata.
- The five product actions above are implemented and exposed through Agent Native HTTP/MCP/A2A discovery.
- `search-logo-assets` uses the public SVGL API (`https://api.svgl.app`) as a logo candidate source.
- `import-deck-asset` can import inline SVG content or fetch an SVG URL into the local deck asset library.
- Framework resource probes expose imported assets as `slides://deck/:deckId/asset/:assetId` resources under their deck.
- The visual slide editor includes a deck asset manager that searches SVGL,
  imports direct SVG URLs or pasted inline SVG content, lists deck assets,
  deletes assets, and inserts imported assets into manual slides as first-class
  `assetId` image blocks.
- `list-deck-assets` accepts `includeContent=true` so browser editor flows can
  fetch local SVG content for insertion without using a separate raw API route.

Still future work:

- richer provider adapters beyond SVGL/custom SVG import.

## Transitions

Open Slide models transitions as data with enter/exit phases and keyframes. We should adopt that shape, but not lock implementation to CSS.

Target transition model:

```ts
type SlideTransitionPhase = {
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  duration?: number;
  easing?: string;
  delay?: number;
};

type SlideTransition = {
  engine?: "waapi" | "css" | "motion" | "three" | "custom";
  name?: string;
  duration: number;
  easing?: string;
  enter?: SlideTransitionPhase;
  exit?: SlideTransitionPhase;
  params?: Record<string, unknown>;
};
```

WAAPI should be the default runtime engine for deck-level page transitions because it is data-driven, interruptible, and independent of slide implementation. CSS, Framer Motion, and custom engines can remain available for slide-local effects.

First runtime slice:

- `apps/slides/src/lib/slideTransitions.ts` defines the transition data shape,
  default WAAPI slide transition, and `slide` / `fade` / `scale` / `cover` /
  `reveal` / `wipe` / `flip` / `none` presets.
- `apps/slides/src/components/SlideTransitionStage.tsx` renders outgoing and incoming slide layers and runs enter/exit phases through WAAPI.
- `PresentationView` and `FullscreenView` now use the shared transition stage instead of duplicated Framer Motion page-swipe variants.

Persistence and product controls slice:

- `slides.transition_json` stores optional per-slide transition metadata.
- `create-slide`, `create-manual-slide`, `create-html-slide`, and
  `update-slide` accept transition data, so product agents can set transitions
  through the same action surface as UI edits.
- `SlideEditorPage` exposes preset and duration controls for editable manual
  and HTML slides.
- Custom transition authoring includes reusable keyframe templates plus direct
  enter/exit JSON editing.
- Typed JSON export/import and deck snapshots preserve slide transition data.
- Decks can store a default transition that slides inherit when they do not
  define their own transition.

Still future work:

- implement non-WAAPI engines, including a `three` overlay path for 3D transitions.

## Reference Project

An Open Slide sandbox belongs under `.references/open-slide-sandbox` and should be run independently from this app. It is not committed.

Use it to evaluate:

- inspector behavior;
- assets/SVGL UX;
- transitions;
- presenter/export polish;
- theme panel workflow.
