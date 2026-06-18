# Code Unit Cohesion

Adapted from Draiver.Application's code-unit cohesion rule. The goal is the
same, but the units are this repo's Vite + Express slide-deck units rather than
Draiver swimlanes.

## Principle

A code unit should do one thing at one clear level of abstraction. A reviewer
should be able to name the unit's responsibility without listing unrelated
exceptions.

This applies at three radii:

| Radius | Question | Examples in this repo |
|---|---|---|
| Cohesion | Does this unit have one responsibility? | `apps/slides/server/services/slides.ts` owns slide rules; `apps/slides/server/routes/slides.ts` owns HTTP adaptation. |
| Abstraction | Is the body written at one level? | A route parses and delegates; a service names business steps; a repository owns SQL. |
| Boundary | Is the unit reaching into another unit's internals? | UI code should call `apps/slides/src/api/client.ts`; route code should call services, not repositories directly. |

## Unit Map

| Unit family | Owns | Must not own |
|---|---|---|
| `libs/api-contract` | Transport/domain shapes shared by browser and server | SQL, UI-only state, server-only helpers |
| `apps/slides/shared/api.ts` | Compatibility re-export for older imports | New contract definitions |
| `apps/slides/server/db.ts` | SQLite bootstrap, migrations, seeded data | HTTP parsing, React concerns |
| `apps/slides/server/repositories/*` | SQL statements and row mapping | Business policy, response codes |
| `apps/slides/server/services/*` | Deck/slide/group invariants and decisions | Raw HTTP request parsing, JSX |
| `apps/slides/server/routes/*` | Request parsing, status mapping, response shape | SQL, deep business branching |
| `apps/slides/src/api/client.ts` | Browser transport wrapper | Presentation UI decisions |
| `apps/slides/src/pages/*` | Route-level composition | Low-level rendering primitives |
| `apps/slides/src/components/*` | Reusable UI behavior | API mutation policy beyond callback props |
| `apps/slides/src/slides/*` | Code-backed slide content | App routing, DB mutation |
| `demos/*` | Isolated model/tool-call examples | App runtime behavior |

## Enforcement Layers

### L1 - Structural Gates

Nx and ESLint enforce package-level dependency direction for `apps/*` and
`libs/*`:

- `scope:app` packages may depend on `scope:app` and `scope:shared`;
- `scope:shared` packages may depend only on `scope:shared`.

Run `pnpm lint:boundaries` to check package imports. App source now lives under
`apps/slides`, so Nx can see app-to-lib dependency direction. Fine-grained
route/service/repository import fences remain review rules until we add
path-level restrictions.

The hard boundary rule is:

- routes may import services, not repositories;
- services may import repositories and shared types, not Express;
- React components/pages may import the API client and shared types, not server
  modules;
- slides may import design primitives and types, not app pages or server code;
- demos may import their own `_model.ts`, not app runtime modules.
- app/server code imports shared transport types from `@llm-intro/api-contract`.

Nx now models the first hard boundary: `llm-intro-slides` depends on
`@llm-intro/api-contract`. Future extractions should follow the same pattern:
create a package under `libs/*`, tag it in `package.json` `nx.tags`, then import
it by package name instead of relative paths.

### L2 - Size And Shape Sensors

Oxlint carries Draiver's warn-only complexity and size thresholds:

| Sensor | Threshold | Level |
|---|---:|---|
| Function length | 120 lines | warn |
| Parameters | 5 | warn |
| Cyclomatic complexity | 20 | warn |
| Nested block depth | 5 | warn |
| Nested callbacks | 4 | warn |
| File length | 900 lines | warn |
| Explicit `any` | any occurrence | warn |
| Unused TypeScript variables | any occurrence | error |

React hook rules run on `*.tsx`: `rules-of-hooks` is an error,
`exhaustive-deps` is a warning, and `only-export-components` is an error with
constant exports allowed.

Run `pnpm lint:oxlint` for these sensors, or `pnpm lint` for both Oxlint and
Nx package-boundary checks.

Treat these as review sensors:

- deep nested branching in a route or service;
- route handlers that contain policy rather than delegation;
- repositories with non-SQL business rules;
- components that both fetch data and implement unrelated rendering rules;
- slide files that use viewport units or window measurements instead of the
  `SlideShell` canvas contract;
- demo scripts that start depending on app internals.

### L3 - Advisory Cohesion Reviewer

Use the `/cohesion-review` command or `.archon/workflows/cohesion-review.yaml`.
The reviewer is advisory; it never edits files and never gates by itself.

Verdicts:

| Verdict | Meaning | Follow-up |
|---|---|---|
| `KEEP` | Unit is cohesive at its current level. | No action. |
| `PROMOTE` | Unit is cohesive but deserves a stronger public boundary. | Extract helper/module or formalize API. |
| `SPLIT` | Unit has multiple responsibilities. | Split by named responsibility. |
| `MERGE` | Unit is fragmentation caused by over-extraction. | Fold into the caller or neighboring unit. |

Report format:

```text
COHESION REVIEW
<file> — <KEEP|PROMOTE|SPLIT|MERGE> (<confidence>)
  evidence: <imports, callers, touched responsibilities>
  action: <concrete next step>

counts: KEEP=<n> PROMOTE=<n> SPLIT=<n> MERGE=<n>
COHESION_STATUS: CLEAN | ISSUES(<n>)
```

Lead with `COHESION_STATUS: ISSUES(<n>)` when any verdict is `SPLIT`, `MERGE`,
or a boundary leak. Lead with `COHESION_STATUS: CLEAN` when all touched units are
`KEEP` or non-blocking `PROMOTE`.

## Grounding

Every cohesion claim should cite evidence:

- changed files from `git diff --name-only <base>...HEAD`;
- direct imports from the file;
- grep fan-in for who imports the file or its exported symbols;
- relevant tests that cover the unit;
- for UI changes, whether the browser flow is covered by Playwright.

Do not use vague "feels coupled" language without a file/import/test anchor.
