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
- Agent-Native global styles are loaded with an explicit token bridge in
  `themes.css`. Existing app and slide theme variables remain authoritative;
  Agent-Native HSL tokens are derived from them so framework components do not
  fight the deck CSS.
- The root is wrapped in a local `AppShell` that ports the useful shell shape
  from the Agent-Native Slides app: left product rail, agent toggle, App mode
  `AssistantChat`, and Code mode `AgentPanel`. The panel starts closed while
  the full hosted production chat handler is still pending.
- A minimal `/_agent-native/application-state/:key` route supports the
  framework sidebar's URL/application-state polling. It is intentionally narrow
  and in-memory until the full Agent-Native server plugin is adopted.
- `GET /_agent-native/actions/list-decks` is mounted as the first framework-style
  action bridge, backed by the existing presentation service.
- Deck, slide, group, and layout JSON operations are available through
  `/_agent-native/actions/*` and the browser API client calls those actions.
- The shell publishes the current URL and semantic route state into
  Agent-Native application state (`__url__`, `navigation`) and consumes
  product-safe `navigate` commands queued by the `navigate-app` action.
- The embedded `AgentPanel` has a local App Mode runtime at
  `/_agent-native/app-agent`. It receives the current deck scope and maps simple
  product prompts to the same action registry used by the UI: slide/group
  listing, normal slide creation, multi-slide outline creation, group creation,
  and deck theme changes.
- Local Code Mode can use Agent-Native's terminal protocol with local,
  authenticated CLIs. The Express server exposes `/_agent-native/available-clis`
  and `/_agent-native/agent-terminal-info`; in development it starts a PTY
  WebSocket bridge that prefers `codex`, then `claude`, then other known local
  CLIs. The sidebar Code tab renders Agent-Native `AgentTerminal` with an
  explicit `ws://127.0.0.1:<port>/ws` endpoint so HTTPS `portless` development
  does not mis-detect the local bridge as `wss`. This keeps local Code mode
  available without Builder.io auth.

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
| create normal slide sequence | `create-normal-slides` mutating action translating a structured outline into multiple typed DB slides |
| create deck from outline | `create-deck-from-outline` mutating action creating a deck plus typed normal slides |
| patch slide | `update-slide` mutating action, mounted and used by client |
| delete slide | `delete-slide` mutating action, mounted and used by client |
| create/update/delete groups | `create-group`, `update-group`, `delete-group`, mounted and used by client |
| reorder slides/groups | `update-deck-layout` mutating action, mounted and used by client |
| read current app context | `get-current-app-context` read action over Agent-Native app state |
| navigate the open app | `navigate-app` mutating action that queues a one-shot route command |
| export HTML | keep `/api` route until file/download handling moves to an action-safe endpoint |

## Features To Borrow From The Reference Slides App

- prompt-to-deck generation that streams slides one by one;
- richer visual slide editing: inline text edit, block bubble menu, slash menu;
- design-system storage and apply action, while preserving this app's existing
  `ThemeName` and slide theme model;
- an Agent-Native frame/panel experience that supports App mode for product
  actions and Code mode for trusted repo self-modification through local CLIs,
  Desktop, or a Builder-hosted frame;
- deck version snapshots;
- speaker notes/fullscreen presentation refinements;
- import/export expansion after the core action surface is stable.

## Ported From Agent-Native Slides

Taken now:

- Product shell pattern: left navigation rail plus right `AgentPanel`.
- Agent sidebar prompt suggestions scoped to deck creation/editing.
- Local App Mode chat runtime that can list deck slides and create normal
  slides, groups, multi-slide outlines, and theme changes through product
  actions without hosted Builder.io auth.
- Normal slide layout vocabulary and outline creation: title, section, bullets,
  two-column, quote, metrics, closing, and multi-slide sequence creation.
- Deck-level outline creation through `create-deck-from-outline`, which borrows
  the reference app's prompt-to-deck direction while preserving this app's typed
  DB slide blocks and theme model.
- Home deck creation UI exposes the same action-backed deck creation modes:
  blank deck creation through `create-deck` and outline deck creation through
  `create-deck-from-outline`.
- Application-state endpoint shape needed by the sidebar's URL sync.
- Semantic route-state bridge for current app context and product-safe
  navigation commands.
- Local CLI discovery and PTY terminal endpoint shape used by the Agent-Native
  terminal surface.

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
comments, collaboration, and hosted production chat remain separate slices. The
local App Mode runtime is now action-backed for basic deck prompts, but it is
not yet the full hosted Agent-Native chat runtime with streaming, memory,
approvals, or team collaboration.
