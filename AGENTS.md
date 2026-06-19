# Agent Instructions

This repo is an interactive LLM intro slide-deck app. Keep changes grounded in
the current app harness:

- read `README.md`, `PLAN.md`, and `specs/harness.md` before design-affecting
  edits;
- update `specs/functional/slides-app.md` when user-visible behavior changes;
- update `specs/bridging/slides-app-implementation.md` when implementation
  ownership or framework bridging changes;
- keep shared API contracts in `libs/api-contract`; `apps/slides/shared/api.ts`
  is only a compatibility re-export;
- keep app/server source under `apps/slides`;
- keep server layering intact: `db` -> `repositories` -> `services` ->
  `routes` -> `app/runtime/index`;
- update Playwright when a browser flow changes;
- update Vitest/API tests when persistence, service rules, or shared contracts
  change;
- apply the code-unit cohesion rule in `specs/code-unit-cohesion.md` when a
  change touches source structure or crosses module boundaries;
- use `pnpm dev`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` as the
  registered entrypoints.

## Harness Surfaces

- `.emdash.json` defines worktree preservation and runs `pnpm setup:worktree`.
- `scripts/setup-worktree.mjs` bootstraps linked worktrees and copies local env
  files from the main worktree when a tracked env template declares the contract.
- `.claude/settings.json` and `.codex/hooks.json` integrate Entire checkpoint
  hooks when the `entire` CLI is installed, and fail open otherwise.
- `.archon/workflows/change-check.yaml` is an advisory workflow for scoping a
  change and choosing validation commands.
- `.archon/workflows/cohesion-review.yaml` and
  `.claude/commands/cohesion-review.md` run the advisory KEEP/PROMOTE/SPLIT/MERGE
  cohesion review from `specs/code-unit-cohesion.md`.
- `.claude/agents/entire-search.md` and `.codex/agents/entire-search.toml`
  search historical checkpoints with `entire search --json`.

## Code Unit Cohesion

Use `specs/code-unit-cohesion.md` as the source of truth. The key boundary rules:

- routes parse HTTP and call services;
- services own business invariants and call repositories;
- repositories own SQL only;
- browser code calls `apps/slides/src/api/client.ts`, not server modules;
- app and server code import shared contract types from
  `@llm-intro/api-contract`;
- code-backed slides stay inside the `SlideShell` canvas contract.

For structural changes, run or emulate `/cohesion-review` before finalizing.
Run `pnpm lint` when changing source boundaries, Nx package tags, or lint rules.

## Slide Authoring

Use `.agents/skills/slide-authoring/SKILL.md` and
`.claude/skills/slide-authoring.md` for slide work. The invariant is a fixed
1000 x 562.5 logical canvas rendered through `SlideShell`; avoid viewport units
inside slides. Use `.agents/skills/create-slide/SKILL.md` for deck creation,
`.agents/skills/apply-slide-feedback/SKILL.md` for inspector/review feedback,
and `.agents/skills/assets-management/SKILL.md` for deck assets and SVGL-style
logo import workflows.
