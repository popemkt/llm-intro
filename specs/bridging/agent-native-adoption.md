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
- Theme metadata is shared through `@llm-intro/api-contract`, and Agent-Native
  actions expose the theme catalog plus a queued app-shell-theme command.
- The root is wrapped in a local `AppShell` that ports the useful shell shape
  from the Agent-Native Slides app: left product rail, agent toggle, App mode
  `AssistantChat`, and Code mode `AgentPanel`. The panel starts closed; local
  `/_agent-native/agent-chat` compatibility is action-backed with process-local
  thread probes, while full hosted chat remains out of scope for the local
  adoption path.
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
- The shell publishes selected browser text into `pending-selection-context`,
  so app agents can inspect what the user highlighted without filesystem or
  shell access.
- The embedded `AgentPanel` has a local App Mode runtime at
  `/_agent-native/app-agent`. It receives the current deck scope and maps simple
  product prompts to the same action registry used by the UI: slide/group
  listing, normal slide creation, multi-slide outline creation, group creation,
  deck theme changes, theme catalog/app-shell changes, HTML export links,
  active deck summaries, and deck snapshot capture/listing/restore.
- Local App Mode exposes a shared capability manifest through
  `/_agent-native/app-agent` and `/_agent-native/app-agent/capabilities`. The
  shell imports the same manifest for starter suggestions, so the UI and
  protocol surface describe the same prompt families and local-only tool
  boundary.
- Framework compatibility probes expose local model/provider status, product
  deck resources, a local `slides-actions` MCP server, and the same public
  action tools available through `/_agent-native/actions/mcp`, OpenAPI, and A2A.
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
| create deck from prompt | `draft-deck-from-prompt` and `create-deck-from-prompt` actions generating typed normal-slide drafts from a freeform prompt |
| patch slide | `update-slide` mutating action, mounted and used by client |
| delete slide | `delete-slide` mutating action, mounted and used by client |
| create/update/delete groups | `create-group`, `update-group`, `delete-group`, mounted and used by client |
| reorder slides/groups | `update-deck-layout` mutating action, mounted and used by client |
| read current app context | `get-current-app-context` read action over Agent-Native app state |
| read active deck context | `get-active-deck-context` read action over route state plus deck, slide, and group services |
| read theme catalog | `get-theme-catalog` read action over shared `ThemeName` metadata |
| change app shell theme | `set-app-theme` mutating action that queues a browser-local app theme command |
| navigate the open app | `navigate-app` mutating action that queues a one-shot route command |
| export HTML | `get-deck-export` read action returns the existing `/api` download URL |
| export/import typed JSON | `export-deck-json` and `import-deck-json` actions over typed deck, group, and DB slide data |
| export/import Markdown | `export-deck-markdown` and `import-deck-markdown` actions over readable deck Markdown |
| create/list/read/restore snapshots | `create-deck-snapshot`, `list-deck-snapshots`, `get-deck-snapshot`, `restore-deck-snapshot` actions over captured typed deck state |

## Features To Borrow From The Reference Slides App

- hosted LLM-backed prompt-to-deck generation; local prompt drafting can use the
  app-safe OpenAI-compatible harness when configured and deterministic drafting
  otherwise;
- richer visual slide editing refinements after the core formatting controls;
- further design-system management refinements, while preserving this app's
  existing `ThemeName` and slide theme model;
- an Agent-Native frame/panel experience that supports App mode for product
  actions and Code mode for trusted repo self-modification through local CLIs,
  Desktop, or a Builder-hosted frame;
- additional fullscreen/presenter refinements beyond the current local audience
  display route;
- further import/export expansion beyond HTML, typed JSON, and readable
  Markdown after the core action surface is stable.

## Ported From Agent-Native Slides

Taken now:

- Product shell pattern: left navigation rail plus right `AgentPanel`.
- Agent sidebar prompt suggestions scoped to deck creation/editing.
- Local App Mode chat runtime that can list deck slides and create normal
  slides, groups, multi-slide outlines, and theme changes through product
  actions without hosted Builder.io auth. It can also list and apply built-in
  design systems through the same action registry.
- Normal slide layout vocabulary and outline creation: title, section, bullets,
  two-column, quote, metrics, closing, and multi-slide sequence creation.
- Deck-level outline creation through `create-deck-from-outline`, which borrows
  the reference app's prompt-to-deck direction while preserving this app's typed
  DB slide blocks and theme model.
- Deck-level prompt creation through `create-deck-from-prompt`, which creates a
  typed local draft through the local model harness when configured, then falls
  back to deterministic drafting without hosted LLM credentials or raw HTML
  slide storage.
- Local prompt deck streaming through `/_agent-native/prompt-deck-stream`, which
  drafts the deck, creates the deck, then emits each typed slide creation event
  as NDJSON for the Home prompt UI.
- Home deck creation UI exposes the same action-backed deck creation modes:
  blank deck creation through `create-deck`, outline deck creation through
  `create-deck-from-outline`, and prompt deck creation through
  `create-deck-from-prompt`.
- HTML export exposure through `get-deck-export`, keeping the existing file
  response route while making export discoverable to App Mode and external
  action clients.
- Typed JSON export/import through `export-deck-json` and `import-deck-json`,
  preserving DB-backed slide blocks, notes, groups, layout, and theme while
  treating code-backed slides as non-portable source-module metadata.
- Application-state endpoint shape needed by the sidebar's URL sync.
- Semantic route-state bridge for current app context and product-safe
  navigation commands.
- Browser selection context bridge that writes highlighted text plus route state
  into `pending-selection-context`.
- Active deck context exposure through `get-active-deck-context`, which lets
  agents inspect the current deck, slides, groups, and navigation state without
  code-mode access.
- Theme catalog and app-shell-theme command exposure through `get-theme-catalog`
  and `set-app-theme`, preserving this app's existing `ThemeName` model while
  giving agents design context.
- Built-in design-system catalog and apply actions through `list-design-systems`
  and `apply-design-system`, mapping reference-style design-system choices to
  the existing `ThemeName` deck/app-shell model.
- Deck snapshot capture, inspection, and restore through
  `create-deck-snapshot`, `list-deck-snapshots`, `get-deck-snapshot`, and
  `restore-deck-snapshot`; restore is consequential and requires an explicit
  snapshot id.
- Deck settings version-history UI that creates, lists, and restores snapshots
  through the same Agent-Native action surface.
- Visual editor insertion presets for title, bullets, quote, and metric content
  that compile back to typed blocks instead of raw reference-app HTML.
- Visual editor slash insertion through `SlideBlockInsertPanel`, mapping `/title`,
  `/bullets`, `/quote`, `/metric`, and primitive commands to this app's typed
  block model.
- Visual editor inline text editing and selected-block menus through
  `SlideEditorPage`, keeping updates in the existing typed block model while
  adding edit, duplicate, layer, and delete controls on the canvas.
- Markdown formatting controls in the canvas and side-panel text editors,
  preserving the typed text block model and markdown rendering path.
- Speaker-note persistence on slides through the existing slide model, update
  action, snapshots, and export payloads.
- Presenter-mode speaker-note display for the active slide, while fullscreen
  stays audience-only.
- Presenter-mode timer and next-slide preview through `PresentationView`, while
  fullscreen stays audience-only.
- Local CLI discovery and PTY terminal endpoint shape used by the Agent-Native
  terminal surface.
- Local model/provider discovery through `get-local-model-status`,
  `/_agent-native/agent-model-defaults`, and
  `/_agent-native/actions/manage-agent-engine`, all reporting local
  OpenAI-compatible provider state without implying hosted requirements.
- Local App Mode capability discovery through `/_agent-native/app-agent` and
  `/_agent-native/app-agent/capabilities`.
- Product-safe deck resource discovery through `/_agent-native/resources` and
  `/_agent-native/resources/tree`, using `slides://deck/:id` URIs and action
  URLs rather than filesystem paths.
- Local action MCP discovery through `/_agent-native/mcp/servers` and
  `/_agent-native/mcp/builtin`, backed by the same public action registry as
  `/_agent-native/actions/mcp`.

Translated rather than copied:

- Reference Slides stores slide content as raw HTML. This app keeps its typed
  block model so themeability, the existing editor, code slides, and HTML export
  continue to work.
- Reference template design systems remain out of scope; current app themes are
  still the design contract. The action bridge exposes these themes rather than
  replacing them.

## Non-Goals

- Do not wholesale copy the reference app routes or data model.
- Do not remove existing code-backed slides.
- Do not collapse this repo's themeability into the reference template palette.
- Do not migrate from SQLite repositories to Drizzle until the action boundary
  is already working and covered by tests.

## Current Slice

Port the reference Slides shell, normal-slide creation shape, local App Mode,
local Code Mode, and framework discovery probes without wholesale replacement:
`AppShell`, application-state routing, action-backed deck/slide/group
operations, prompt deck creation, local model provider discovery, local chat
compatibility threads, deck resource probes, MCP/A2A/OpenAPI discovery, and
local terminal bridging are adopted. Raw-HTML slide storage, comments,
collaboration, durable hosted chat memory, hosted model streaming, approvals,
and team collaboration remain separate non-local adoption slices.
