# llm-intro

Interactive slide deck app for teaching LLM and agent concepts.

The app has two presentation modes:

- A seeded starter deck backed by code slides and SQLite metadata.
- User-created decks backed by SQLite and editable in the browser.

## Stack

- Vite 6 + React 19 + TypeScript
- Express 5 + better-sqlite3
- Playwright + Vitest
- Tailwind CSS v4 and `motion`
- Nx package workspace with `apps/*` and `libs/*`
- Agent-Native framework foundation

## Architecture

Functional behavior is specified in [`specs/functional/slides-app.md`](specs/functional/slides-app.md).
The code-to-behavior bridge is tracked in [`specs/bridging/slides-app-implementation.md`](specs/bridging/slides-app-implementation.md).
The dev/test/agent harness is specified in [`specs/harness.md`](specs/harness.md).
The Agent-Native adoption path is tracked in [`specs/bridging/agent-native-adoption.md`](specs/bridging/agent-native-adoption.md).

### Shared contract

`libs/api-contract` is the API boundary shared by client and server.
`apps/slides/shared/api.ts` remains as a compatibility re-export. The contract defines:

- presentation types
- slide block types
- theme names

### Server

The backend is intentionally split into layers:

- `apps/slides/server/db.ts`: database bootstrap, migrations, and system deck seeding
- `apps/slides/server/repositories/*`: raw SQL/data access
- `apps/slides/server/services/*`: business rules and invariants
- `apps/slides/server/routes/*`: HTTP adapters and request parsing
- `apps/slides/server/app.ts`: Express app construction
- `apps/slides/server/runtime.ts`: production/test wiring
- `apps/slides/server/index.ts`: process entrypoint

Key rules:

- The seeded presentation keeps a durable `system_key` so it can be re-bootstrapped without duplicating after rename.
- Code slides can be renamed and reordered, but their content cannot be edited or deleted.
- Slide reorder validates that every slide ID is present exactly once.

### Client

The React app is route-split and lazy-loaded from `apps/slides/src/main.tsx`.

Main areas:

- `apps/slides/src/pages/HomePage.tsx`: deck list and creation
- `apps/slides/src/pages/PresentationPage.tsx`: overview/presentation/fullscreen shell
- `apps/slides/src/pages/SlideEditorPage.tsx`: DB slide editor
- `apps/slides/src/pages/SettingsPage.tsx`: per-deck settings
- `apps/slides/src/components/*`: overview grid, presentation views, DB slide renderer

Client themes are split in two:

- app-shell theme via `data-app-theme` on `<html>`
- slide content theme via `data-theme` on slide containers

## Data model

### presentations

- `id`
- `name`
- `theme`
- `system_key` nullable unique key for built-in decks
- `system_key` nullable unique key for the seeded deck
- timestamps

### slides

- `id`
- `presentation_id`
- `position`
- `kind` = `code` or `db`
- `code_id` for code-backed slides
- `title`
- `blocks` JSON payload for DB slides
- timestamps

## Commands

```bash
pnpm dev
pnpm lint
pnpm build
pnpm test
pnpm test:e2e
```

## Testing

The repo has two test layers:

- `pnpm test`: unit/API coverage with Vitest
- `pnpm test:e2e`: browser coverage with Playwright

The Playwright suite covers:

- home page and seeded deck visibility
- user deck creation
- slide creation, rename, edit, reorder, export, theme update, and deletion
- deck deletion

## Notes

- The seeded deck is recreated automatically after deletion on the next server bootstrap.
- User decks can be fully edited in the overview and editor flows.
- The initial route bundle is split, but the presentation chunk still contains the code-backed slide modules.
- GitHub Actions runs `pnpm test`, `pnpm build`, and `pnpm test:e2e` on pull requests and pushes to `main`.
