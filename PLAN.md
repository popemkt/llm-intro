# Technical Notes

## Current shape

This project is a slide presentation app with a SQLite-backed editing workflow and a built-in system deck.

### Client entrypoints

- `src/main.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/PresentationPage.tsx`
- `src/pages/SlideEditorPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/AppSettingsPage.tsx`

### Server entrypoints

- `server/index.ts`
- `server/runtime.ts`
- `server/app.ts`

## Layering rules

### Shared types

Put request/response and persisted slide block types in `shared/api.ts`.

### Repositories

Repositories own SQL only. They should not contain HTTP concerns or UI-driven validation.

### Services

Services own business rules such as:

- built-in deck protection
- slide reorder validation
- 404/403 domain decisions

### Routes

Routes should stay thin:

- parse params/body
- call service
- map to HTTP response

## Product rules

- Built-in decks use `system_key`.
- Built-in slides are code-backed and read-only.
- User slides are DB-backed and editable.
- Reorder requests must include the exact full slide set.
- Empty decks should not crash presentation/fullscreen views.

## Testing rules

- API behavior belongs in `server/__tests__/api.test.ts`.
- UI/browser behavior belongs in `playwright/e2e.spec.ts`.
- If a UI flow changes, update Playwright in the same change.

## Known future work

- Split the presentation chunk further if slide payload size becomes a problem.
- Add richer editor validation for URLs and content sanitization if external embeds become user-facing.
