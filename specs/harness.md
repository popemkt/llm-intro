# Harness

This document records the dev/test/agent harness for `llm-intro`, adapted from
Draiver.Application's harness discipline to this repo's smaller Vite + Express
shape.

## Workspace Shape

The repo uses Draiver-style package-based Nx:

```text
apps/
  slides/              React slide app, Express API, Vite/Vitest config
libs/
  api-contract/        shared client/server API contract
```

The root package is the workspace orchestrator. `apps/slides` is the actual app
package and owns the browser source, Express server, Vite/Vitest config, local
SQLite data directory, and app-level TypeScript references.

## Purpose

The harness keeps four loops explicit:

1. **App loop** — run the deck and API together with `pnpm dev`.
2. **Persistence loop** — prove SQLite-backed deck, slide, and group behavior
   with API/unit tests.
3. **Browser loop** — prove user-visible deck flows with Playwright.
4. **Agent loop** — preserve local env, checkpoint agent work, and route
   historical searches through Entire.

## Current Workings

| Surface | Contract |
|---|---|
| `libs/api-contract` | Shared client/server boundary for presentations, slides, blocks, groups, and themes. |
| `apps/slides/shared/api.ts` | Compatibility re-export for legacy imports while the repo moves to Nx libs. |
| `apps/slides/server/db.ts` | SQLite bootstrap, migrations, and seeded system deck setup. |
| `apps/slides/server/repositories/*` | SQL/data access only. No HTTP behavior and no UI policy. |
| `apps/slides/server/services/*` | Business rules: built-in deck protection, reorder validation, not-found/forbidden decisions, and mutation invariants. |
| `apps/slides/server/routes/*` | HTTP adapters: parse params/body, call services, map results/errors to responses. |
| `apps/slides/server/app.ts`, `apps/slides/server/runtime.ts`, `apps/slides/server/index.ts` | App construction, environment wiring, and process entrypoint. |
| `apps/slides/src/api/client.ts` | Browser API client. Keep request/response shapes aligned with `apps/slides/shared/api.ts`. |
| `apps/slides/src/pages/*` + `apps/slides/src/components/*` | Route-level UI and reusable deck/presentation/editor components. |
| `apps/slides/src/slides/*` + `apps/slides/src/slides/registry.ts` | Code-backed slide modules keyed by registry ID. |
| `demos/*` | Model/tool-calling demonstration harness. `demos/_model.ts` is the demo provider boundary; `demos/.env.template` declares local env. |
| `apps/slides/server/local-model-provider.ts` | App-safe local model provider boundary for prompt deck drafting. It may read the same local OpenAI-compatible env values as demos, but app runtime must not import demo scripts. |
| `playwright/e2e.spec.ts` | Browser flow harness for seeded deck visibility and user deck create/edit/reorder/theme/delete behavior. |
| `.github/workflows/ci.yml` | CI runs unit/API tests, production build, and Playwright e2e. |
| `specs/code-unit-cohesion.md` | Structural rule for keeping source units cohesive and reviewable. |
| `nx.json` + `pnpm-workspace.yaml` | Draiver-style package workspace and task graph. |
| `specs/functional/slides-app.md` | Functional behavior spec for the slide app. |
| `specs/bridging/slides-app-implementation.md` | Code-to-behavior bridge for the slide app. |
| `specs/bridging/agent-native-adoption.md` | Framework adoption map and guardrails. |

## Motion & Animation References (to study)

Interactive slides are React + `motion/react` today, but the slide model should
stay **framework-agnostic**: a slide is fundamentally HTML/visuals that React can
mount — any renderer that produces that is fair game.

**HyperFrames** (`https://hyperframes.heygen.com`, installed `hyperframes-*` skills)
is a deterministic HTML→video renderer — *not* a runtime-interactive framework, so
it does not host our live interactions (drag scrubbers, click reveals, shared-layout
morphs). But its **motion craft is worth mining**: study and reuse its patterns —
scene blueprints, easing libraries, scene-transition recipes, and its 7 animation
adapters (GSAP, Lottie, Three.js, Anime.js, CSS, WAAPI, TypeGPU) — as a reference
for our slide animations. Two concrete future uses: (1) a pattern source to elevate
slide motion; (2) an optional deck→MP4 export path for sharing finished decks.
Keep the live deck in React; borrow the patterns, don't port the runtime.

## Registered Commands

| Command | Meaning |
|---|---|
| `pnpm dev` | `nx run llm-intro-slides:dev`; runs Vite and Express concurrently. Vite proxies `/api` to the Express server. |
| `pnpm server` | Builds dependent libs, then runs only the Express API through Nx. |
| `pnpm build` | Builds `@llm-intro/api-contract`, then builds the app through Nx. |
| `pnpm lint` | Runs Draiver-style Oxlint cohesion sensors plus Nx package boundary checks. |
| `pnpm lint:oxlint` | Runs the complexity, size, React hook, and TypeScript lint sensors. |
| `pnpm lint:boundaries` | Runs Nx package-boundary dependency checks over `apps/*` and `libs/*`. |
| `pnpm test` | Builds `@llm-intro/api-contract`, then runs Vitest unit/API coverage through Nx. |
| `pnpm test:e2e` | Run Playwright against isolated Vite + API servers and an isolated SQLite database. |
| `pnpm typecheck` | Typecheck `@llm-intro/api-contract`, then the app. |
| `pnpm archon:install` | Install the Archon CLI per machine. |
| `pnpm setup:worktree` | Bootstrap a fresh linked worktree. |

## Worktree Bootstrap

`.emdash.json` tells emdash to preserve local env files and run
`pnpm setup:worktree`. The setup script:

1. initializes submodules if this repo ever adds any;
2. runs `pnpm install`;
3. copies ignored `.env*` files from the main worktree for directories that
   commit an env contract file (`*.env.example` or `*.env.template`).

Today that primarily preserves `demos/.env`, derived from `demos/.env.template`.

## Validation Map

| Change area | Minimum validation |
|---|---|
| Server repositories/services/routes/db/shared API | `pnpm test` |
| React pages/components/slide shell/registry | `pnpm test` and, for user flows, `pnpm test:e2e` |
| Build config, routing, lazy loading, export pipeline | `pnpm build`; add `pnpm test:e2e` when user navigation changes |
| Code-backed slide content only | `pnpm build`; visually inspect when layout changes are non-trivial |
| Demos/model provider | run the touched `pnpm tsx demos/<file>.ts` script when credentials are available |
| App local model provider | run focused action/App Mode tests with provider disabled; run a manual prompt-deck smoke when local model credentials are available |
| Harness files | `pnpm lint` for rule/config edits; `pnpm test` for package/script edits; `git diff --check` for specs/config-only edits |
| Source-structure changes | Apply `specs/code-unit-cohesion.md`; use `/cohesion-review` when boundaries or responsibilities move |

## Agent Checkpoint Harness

Draiver's Entire integration is carried over with repo-local hook files:

- Claude Code reads `.claude/settings.json`.
- Codex reads `.codex/hooks.json`.
- Both hook sets fail open if `entire` is not installed.
- Historical transcript lookup must use the `entire-search` subagent and
  `entire search --json`.

## Archon Workflow

The Draiver workflow graph is adapted here as `.archon/workflows/change-check.yaml`.
It is advisory: it reads the harness specs, scopes the diff, and recommends the
smallest validation command set. It does not edit files and does not replace the
registered commands above.

The Draiver cohesion reviewer is adapted here as
`.archon/workflows/cohesion-review.yaml` and
`.claude/commands/cohesion-review.md`. It is also advisory. It applies the
KEEP/PROMOTE/SPLIT/MERGE rubric in `specs/code-unit-cohesion.md` and grounds
claims in imports, fan-in hints, and relevant tests.

## Imported From Draiver

The following harness elements were taken from Draiver.Application and adapted:

- emdash preservation/setup policy;
- package-based Nx workspace shape;
- Oxlint complexity/size thresholds and React hook checks;
- Nx package-boundary ESLint dep constraints;
- worktree setup script pattern;
- Archon installer script;
- Archon advisory workflow shape;
- code-unit cohesion rule, command, and advisory workflow;
- Entire hooks for Claude Code and Codex;
- Entire search subagents;
- `AGENTS.md` operating-surface convention;
- `_playground/wip/harness-model-graphs.html` as non-normative explanatory
  material.
