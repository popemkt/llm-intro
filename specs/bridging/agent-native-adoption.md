# Agent-Native Adoption Bridge

This repo is adopting the Agent-Native framework without replacing the product
with the reference Slides app. Existing deck, theme, export, overview, editor,
and code-slide behavior stays intact unless a slice explicitly migrates it.

Reference documentation:

- https://www.agent-native.com/docs/template-slides
- https://www.agent-native.com/docs/client
- https://www.agent-native.com/docs/server
- https://www.agent-native.com/docs/actions
- https://www.agent-native.com/docs/frames

## Adopted In This Slice

- App source now lives under `apps/slides`, so the Nx app boundary matches
  Agent-Native template shape.
- The React root uses Agent-Native's shared `AppProviders`.
- The app uses `createAgentNativeQueryClient()` so future action hooks share the
  framework's cache defaults.
- Agent-Native global styles remain behind a TODO because the reset/token layer
  collides with the existing deck CSS. Local theme variables and slide
  themeability remain authoritative during the shell migration.
- The root is wrapped in a local `AppShell` that ports the useful shell shape
  from the Agent-Native Slides app: left product rail, deck-scoped
  `AgentSidebar`, and an agent toggle. The sidebar starts closed while the full
  production chat handler is still pending.
- A minimal `/_agent-native/application-state/:key` route supports the
  framework sidebar's URL/application-state polling. It is intentionally narrow
  and in-memory until the full Agent-Native server plugin is adopted.
- `GET /_agent-native/actions/list-decks` is mounted as the first framework-style
  action bridge, backed by the existing presentation service.
- Deck, slide, group, and layout JSON operations are available through
  `/_agent-native/actions/*` and the browser API client calls those actions.

## Migration Direction

Agent-Native's Slides template exposes deck operations as actions mounted under
`/_agent-native/actions/:name`, with UI code using `useActionQuery`,
`useActionMutation`, or `callAction`. This app still uses `/api/*` REST routes
for now. The migration should replace one workflow at a time:

| Current workflow | Target Agent-Native action shape |
|---|---|
| list presentations | `list-decks` read action, mounted and used by client |
| get presentation | `get-deck` read action, mounted and used by client |
| create presentation | `create-deck` mutating action, mounted and used by client |
| update presentation theme/name | `update-deck` mutating action, mounted and used by client |
| list slides/groups | `list-slides` and `list-groups` read actions, mounted and used by client |
| create slide | `create-slide` mutating action, mounted and used by client |
| create normal slide | `create-normal-slide` mutating action translating reference layouts to typed blocks |
| patch slide | `update-slide` mutating action, mounted and used by client |
| delete slide | `delete-slide` mutating action, mounted and used by client |
| create/update/delete groups | `create-group`, `update-group`, `delete-group`, mounted and used by client |
| reorder slides/groups | `update-deck-layout` mutating action, mounted and used by client |
| export HTML | keep `/api` route until file/download handling moves to an action-safe endpoint |

## Features To Borrow From The Reference Slides App

- prompt-to-deck generation that streams slides one by one;
- richer visual slide editing: inline text edit, block bubble menu, slash menu;
- design-system storage and apply action, while preserving this app's existing
  `ThemeName` and slide theme model;
- an Agent-Native frame/panel experience that supports App mode for product
  actions and Code mode for trusted repo self-modification through Desktop or a
  Builder-hosted frame;
- deck version snapshots;
- speaker notes/fullscreen presentation refinements;
- import/export expansion after the core action surface is stable.

## Ported From Agent-Native Slides

Taken now:

- Product shell pattern: left navigation rail plus right `AgentSidebar`.
- Agent sidebar prompt suggestions scoped to deck creation/editing.
- Normal slide layout vocabulary: title, section, bullets, two-column, quote,
  metrics, and closing.
- Application-state endpoint shape needed by the sidebar's URL sync.

Translated rather than copied:

- Reference Slides stores slide content as raw HTML. This app keeps its typed
  block model so themeability, the existing editor, code slides, and HTML export
  continue to work.
- Reference template design systems remain out of scope; current app themes are
  still the design contract.

## Non-Goals

- Do not wholesale copy the reference app routes or data model.
- Do not remove existing code-backed slides.
- Do not collapse this repo's themeability into the reference template palette.
- Do not migrate from SQLite repositories to Drizzle until the action boundary
  is already working and covered by tests.

## Current Slice

Port the reference Slides shell and normal-slide creation shape without
wholesale replacement: `AppShell`, minimal application-state routing, and
`create-normal-slide` are adopted while raw-HTML slides, design systems,
comments, collaboration, and production chat remain separate slices.
