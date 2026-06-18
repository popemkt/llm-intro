---
description: Advisory cohesion review of the current diff. KEEP/PROMOTE/SPLIT/MERGE per touched unit. Never edits files.
argument-hint: "[base ref, default: main]  (or a path/glob to scope)"
model: sonnet
---

You are running the L3 cohesion reviewer from `specs/code-unit-cohesion.md`.
This is advisory: produce a report, never edit files.

## Source Of Truth

Read, do not edit:

- `specs/code-unit-cohesion.md`
- `AGENTS.md`
- `specs/harness.md`

Apply the verdicts exactly: KEEP / PROMOTE / SPLIT / MERGE.

## Steps

1. Scope the diff. `BASE=${ARGUMENTS:-main}`. Run
   `git diff --name-only $BASE...HEAD` and fall back to
   `git diff --name-only $BASE`.
2. Keep changed source files under `server/`, `shared/`, `src/`, `demos/`,
   `.archon/`, `.claude/`, `.codex/`, `scripts/`, and `specs/`. Exclude
   generated output, lockfiles, and test artifacts.
3. For each touched unit, gather:
   - direct imports;
   - fan-in with `rg` for imports/callers;
   - relevant tests;
   - which responsibility from `specs/code-unit-cohesion.md` the unit owns.
4. Judge each unit. Boundary leaks are issues even when the file is small.
5. Emit the report in the format from `specs/code-unit-cohesion.md`, ending with
   `COHESION_STATUS: CLEAN` or `COHESION_STATUS: ISSUES(<n>)`.

Hard constraints:

- Never edit files.
- Every coupling claim cites file/import/test evidence.
- Do not treat size alone as a verdict. Size is only a prompt to inspect shape.
