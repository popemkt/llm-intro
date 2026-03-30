# llm-intro

Interactive slide deck app for teaching LLM and agent concepts.

The app has two presentation modes:

- A built-in, read-only system deck seeded from code-backed slides.
- User-created decks backed by SQLite and editable in the browser.

## Stack

- Vite 6 + React 19 + TypeScript
- Express 5 + better-sqlite3
- Playwright + Vitest
- Tailwind CSS v4 and `motion`

## Architecture

### Shared contract

`shared/api.ts` is the API boundary shared by client and server. It defines:

- presentation types
- slide block types
- theme names

### Server

The backend is intentionally split into layers:

- `server/db.ts`: database bootstrap, migrations, and system deck seeding
- `server/repositories/*`: raw SQL/data access
- `server/services/*`: business rules and invariants
- `server/routes/*`: HTTP adapters and request parsing
- `server/app.ts`: Express app construction
- `server/runtime.ts`: production/test wiring
- `server/index.ts`: process entrypoint

Key rules:

- Built-in presentations are identified by `system_key`, not by mutable names.
- Built-in presentations are read-only for slide mutations.
- Slide reorder validates that every slide ID is present exactly once.

### Client

The React app is route-split and lazy-loaded from `src/main.tsx`.

Main areas:

- `src/pages/HomePage.tsx`: deck list and creation
- `src/pages/PresentationPage.tsx`: overview/presentation/fullscreen shell
- `src/pages/SlideEditorPage.tsx`: DB slide editor
- `src/pages/SettingsPage.tsx`: per-deck settings
- `src/components/*`: overview grid, presentation views, DB slide renderer

Client themes are split in two:

- app-shell theme via `data-app-theme` on `<html>`
- slide content theme via `data-theme` on slide containers

## Data model

### presentations

- `id`
- `name`
- `theme`
- `system_key` nullable unique key for built-in decks
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
pnpm build
pnpm test
pnpm test:e2e
```

## Testing

The repo has two test layers:

- `pnpm test`: unit/API coverage with Vitest
- `pnpm test:e2e`: browser coverage with Playwright

The Playwright suite covers:

- home page and built-in deck visibility
- built-in deck read-only behavior
- user deck creation
- slide creation, rename, edit, reorder, theme update, and deletion
- deck deletion

## Notes

- The built-in deck is seeded automatically at startup.
- User decks can be fully edited in the overview and editor flows.
- The initial route bundle is split, but the presentation chunk still contains the code-backed slide modules.
