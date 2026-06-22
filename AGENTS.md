# Agent Instructions

> **OpenLore-first workflow is MANDATORY for every code change.** Orient with the
> code graph before blind-reading files: `orient → locate → impact → plan →
> implement → verify → sync specs → analyze → record`. Full table and rules in
> `CLAUDE.md`; operating guide in `specs/bridging/openlore-adoption.md`. Always run
> `pnpm exec openlore analyze` after changes (and after `generate`).

This repo is an interactive LLM intro slide-deck app. Keep changes grounded in
the current app harness:

- read `README.md`, `specs/harness.md`, and `specs/principles.md` before
  design-affecting edits;
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
inside slides. Use `.agents/skills/code-slide-patterns/SKILL.md` when creating
or modifying code-backed slides in `apps/slides/src/slides`. Use
`.agents/skills/create-slide/SKILL.md` for deck creation,
`.agents/skills/apply-slide-feedback/SKILL.md` for inspector/review feedback,
and `.agents/skills/assets-management/SKILL.md` for deck assets and SVGL-style
logo import workflows.

<!-- openlore-decisions-instructions -->
## Architectural decisions

When making a significant design choice, call `record_decision` **before** writing the code.

Significant choices: data structure, library/dependency, API contract, auth strategy,
module boundary, database schema, caching approach, error handling pattern.

```
record_decision({
  title: "Use JWTs for stateless auth",
  rationale: "Avoids session store in infra",
  consequences: "Tokens can't be revoked early",
  affectedFiles: ["src/auth/middleware.ts"],
  supersedes: "a1b2c3d4"  // 8-char ID of prior decision being reversed
})
```

Decisions are consolidated in the background immediately after `record_decision` is called — the pre-commit gate reads the already-consolidated store and adds no LLM latency.

**Performance note**: if you skip `record_decision`, the gate detects unrecorded source changes at commit time and triggers a slow LLM extraction on the *next* commit (~10-30s). Calling `record_decision` proactively keeps every commit instant.

## When git commit is blocked by the decisions gate

If `git commit` fails and the output is JSON with `"gated": true`, do NOT retry silently.
Check the `reason` field and act accordingly:

**`reason: "verified"` — decisions await review:**
Present each decision to the user:
> "The commit is blocked — I found N architectural decision(s) to validate:
> 1. **[id]** Title — rationale
Do you approve? (yes/no)"
For each approval call `approve_decision`, for rejections call `reject_decision`.
Then run `openlore decisions --sync` and retry `git commit`.

**`reason: "approved_not_synced"` — decisions approved but not written to specs:**
Run `openlore decisions --sync` then retry `git commit`. Do not skip this step.

**`reason: "drafts_pending_consolidation"` — drafts were recorded but not yet consolidated:**
Present to the user:
> "N decision draft(s) were recorded but never consolidated. Run consolidation now? (~10-30s)"
If yes: run `openlore decisions --consolidate --gate` and handle the result.
If no: retry with `git commit --no-verify` to skip the gate.

**`reason: "no_decisions_recorded"` — source files staged but nothing recorded:**
Present to the user:
> "Source files are staged but no architectural decisions were recorded. Run fallback extraction to check for undocumented decisions? (~10-30s)"
If yes: run `openlore decisions --consolidate --gate` and handle the result.
If no: retry with `git commit --no-verify` to skip the gate.
<!-- end-openlore-decisions-instructions -->
