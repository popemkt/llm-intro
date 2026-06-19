# Slides App Implementation Bridge

This bridge maps the functional app spec to the current implementation. Update
it when a functional behavior moves files, changes ownership, or crosses a new
framework boundary.

## Workspace Boundary

| Functional area | Implementation |
|---|---|
| App package | `apps/slides` |
| Shared contract | `libs/api-contract/src/index.ts` |
| App-local compatibility contract | `apps/slides/shared/api.ts` |
| Browser entry | `apps/slides/src/main.tsx` |
| Server entry | `apps/slides/server/index.ts` |
| Build/test orchestration | `nx.json`, `pnpm-workspace.yaml`, root `package.json` |

## Framework Bridge

| Functional behavior | Agent-Native/action bridge | Current code |
|---|---|---|
| App providers and query cache | `AppProviders`, `createAgentNativeQueryClient()` | `apps/slides/src/main.tsx` |
| App shell | Local shell with `AgentPanel`, local toggle, and product rail | `apps/slides/src/components/AppShell.tsx` |
| Application state | Minimal route for sidebar URL/app-state sync | `apps/slides/server/routes/application-state.ts` |
| Route state and navigation | Local React Router bridge writes `__url__`/`navigation` and consumes `navigate` commands | `apps/slides/src/components/AppShell.tsx`, `apps/slides/actions/app-context.ts` |
| Browser selection context | Shell writes selected browser text to `pending-selection-context` for app-context reads | `apps/slides/src/components/AppShell.tsx` |
| Active deck context | Route-aware read action returns deck metadata, slides, and groups | `apps/slides/actions/active-deck-context.ts` |
| Framework core probes | No-op or local defaults for Agent-Native panel/status/resource probes | `apps/slides/server/routes/framework-core.ts` |
| Local Code Mode terminal | Local PTY WebSocket bridge for known authenticated CLIs | `apps/slides/server/agent-terminal.ts`, `apps/slides/server/index.ts` |
| Local App Mode runtime | Deck-scoped HTTP chat runtime backed by the action registry | `apps/slides/server/routes/app-agent-runtime.ts`, `apps/slides/src/agent/appAgentRuntime.ts` |
| Action HTTP mount | `/_agent-native/actions/:name` | `apps/slides/server/routes/agent-native-actions.ts`, `apps/slides/server/app.ts` |
| Action definitions | `defineAction` wrappers over existing services | `apps/slides/actions/*.ts` |
| Action discovery | `GET /_agent-native/actions`, `GET /_agent-native/openapi.json` | `apps/slides/server/routes/agent-native-actions.ts` |
| Generic agent invocation | `POST /_agent-native/actions/invoke`, `POST /_agent-native/actions/invoke/:name` | `apps/slides/server/routes/agent-native-actions.ts` |
| MCP-compatible tool calls | `POST /_agent-native/actions/mcp`, `GET /_agent-native/actions/mcp/tools` | `apps/slides/server/routes/agent-native-actions.ts` |
| A2A discovery card | `GET /_agent-native/a2a/agent-card` | `apps/slides/server/routes/agent-native-actions.ts` |
| Browser action transport | `callAction`, `useActionQuery`, `useActionMutation` | `apps/slides/src/api/client.ts`, route pages |
| Legacy REST API | Kept for compatibility and export/download behavior | `apps/slides/server/routes/*` |

## Decks

| Functional behavior | Code implementation | Validation |
|---|---|---|
| List decks | `list-decks` action, `HomePage` query | `apps/slides/server/__tests__/api.test.ts`, browser smoke |
| Create deck | `create-deck` action, presentation service | Vitest API tests |
| Create deck from Home outline | `DeckCreatePanel` parses one-slide-per-line input and calls `create-deck-from-outline` | Browser smoke plus action tests |
| Delete deck | `delete-deck` action, presentation service protection rules | Vitest API tests |
| Deck settings | `SettingsPage`, `update-deck` action/client helper | Vitest/API plus browser flow when UI changes |

## Slides And Layout

| Functional behavior | Code implementation | Validation |
|---|---|---|
| List slides | `list-slides` action, slide service | Vitest API tests |
| Create slide | `create-slide` action, `PresentationPage` handlers | Vitest/API plus browser flow |
| Create normal slide | `create-normal-slide` action maps reference layouts to typed DB blocks | Vitest/API plus browser flow |
| Quick normal slide UI | Overview add tile exposes title, bullets, two-column, quote, and metrics layout creation | Browser smoke plus action tests |
| Create normal slide sequence | `create-normal-slides` action maps a structured outline to multiple typed DB slides | Vitest/API |
| Create deck from outline | `create-deck-from-outline` action creates a deck and typed normal slides from an outline | Vitest/API plus App Mode and Home UI smoke |
| Create deck from prompt | `draft-deck-from-prompt`, `create-deck-from-prompt`, Home prompt mode, and App Mode prompt routing | Vitest/API plus browser smoke |
| Stream prompt deck creation | `/_agent-native/prompt-deck-stream` emits draft/deck/slide/done NDJSON events while creating typed normal slides | Vitest/API plus browser smoke |
| Rename slide | `update-slide` action | Browser flow or focused smoke |
| Delete slide | `delete-slide` action and service rules | Vitest/API plus browser flow |
| Reorder slides/groups | `update-deck-layout` action, slide service validation | Vitest/API plus Playwright |
| Code slide rendering | `apps/slides/src/slides/registry.ts`, `DbSlideRenderer` fallback rules | build, visual inspection when changed |

## Groups

| Functional behavior | Code implementation | Validation |
|---|---|---|
| List groups | `list-groups` action | Vitest/API tests |
| Create group | `create-group` action, group service | Vitest/API tests |
| Rename/collapse group | `update-group` action | Browser flow when UI changes |
| Delete group | `delete-group` action, slide regroup reconciliation | Vitest/API plus browser flow |

## Snapshots

| Functional behavior | Code implementation | Validation |
|---|---|---|
| Persist deck snapshots | `deck_snapshots` migration, snapshot repository/service | Vitest/API |
| Create snapshot | `create-deck-snapshot` action captures deck, slides, and groups | Vitest/API plus App Mode smoke |
| List/read snapshots | `list-deck-snapshots`, `get-deck-snapshot` actions | Vitest/API plus App Mode smoke |
| Restore snapshot | `restore-deck-snapshot` action replaces the live deck from a snapshot id | Vitest/API |
| Version-history UI | `SnapshotHistory` in deck settings calls snapshot actions | Browser smoke |

## Visual Editor

| Functional behavior | Code implementation | Validation |
|---|---|---|
| Insert primitive blocks | `SlideBlockInsertPanel` adds text, image, embed, and shape blocks | Browser smoke |
| Insert content presets | `SlideBlockInsertPanel` adds title, bullets, quote, and metric typed block sets | Browser smoke |
| Slash insert commands | `SlideBlockInsertPanel` maps `/title`, `/bullets`, `/quote`, `/metric`, and primitive commands to the same typed block creation paths | Browser smoke |
| Inline text editing | `InlineTextBlockEditor` edits selected text blocks directly on the canvas and writes markdown back to the typed block | Browser smoke, typecheck |
| Markdown formatting controls | `MarkdownFormatToolbar` applies headings, bold, italic, quote, and bullet markdown in inline and side-panel text editors | Browser smoke, typecheck |
| Selected block menu | `BlockBubbleMenu` exposes edit, duplicate, layer order, and delete actions on selected canvas blocks | Browser smoke, typecheck |
| Edit speaker notes | `slides.notes`, `update-slide`, and `SlideEditorPage` notes field | Vitest/API plus browser smoke |
| Display speaker notes | `PresentationView` renders active slide notes above controls outside fullscreen | Browser smoke |
| Presenter timer and next preview | `PresentationView` renders elapsed time and a compact next-slide preview in presenter mode only | Browser smoke |

## Presentation And Editor UI

| Functional behavior | Code implementation | Validation |
|---|---|---|
| Overview mode | `apps/slides/src/components/OverviewGrid.tsx` | Playwright for deck flows |
| Presentation mode | `apps/slides/src/components/PresentationView.tsx` | Browser smoke for navigation |
| Fullscreen mode | `apps/slides/src/components/FullscreenView.tsx` | Browser smoke for keyboard navigation |
| Slide editor | `apps/slides/src/pages/SlideEditorPage.tsx` | Playwright for edit/save flows |
| Block rendering | `apps/slides/src/components/DbSlideRenderer.tsx` and editor canvas rendering | Vitest regression tests |

## Theme Bridge

| Functional behavior | Code implementation |
|---|---|
| App shell theme | `data-app-theme` on `<html>`, app CSS tokens |
| Slide content theme | `data-theme` on slide containers, `apps/slides/src/themes.css` |
| Theme metadata | shared `THEME_META` and `ThemeName` contract in `libs/api-contract/src/index.ts` |
| Per-deck theme persistence | presentation service, `update-deck` action/REST route |
| Agent theme catalog | `get-theme-catalog` action returns shared theme metadata |
| Agent app-shell theme change | `set-app-theme` queues `app-theme-command`; `AppShell` applies it through `applyAppTheme` |
| Agent design-system catalog | `list-design-systems` action returns built-in design-system mappings over `ThemeName` |
| Agent design-system apply | `apply-design-system` updates deck theme and/or queues app shell theme through existing theme paths |

## Export Bridge

| Functional behavior | Code implementation |
|---|---|
| Export deck as HTML | `apps/slides/server/routes/export.ts` |
| Agent export action | `get-deck-export` action returns the POST `/api/presentations/:id/export` file route |
| Export deck as typed JSON | `export-deck-json` action returns versioned deck, group, and slide data |
| Import deck from typed JSON | `import-deck-json` action creates a new deck from portable DB-backed slide data and reapplies group layout |
| Export viewer bootstrap | `apps/slides/src/export-viewer.tsx` |
| Static data provider | `apps/slides/src/data/static-provider.ts` |

The export route remains on `/api` because it returns a downloadable HTML file.
`get-deck-export` exposes that capability to agents by returning the existing
download URL and method. The action itself is read-only; the returned file route
still uses POST because export mode and selected slide ids travel in the request
body. Move the file response only when the Agent-Native action layer has an
intentional file response pattern in this repo.

## Agent Shell Bridge

Agent-Native Frames define the shell that hosts both the app UI and the agent.
The important distinction is that code editing is a frame capability, not a
requirement of the product app itself.

| Frame / surface | Role for this app |
|---|---|
| Embedded agent panel | In-app sidebar rendered by the slides app. It should be available in development and production for product actions. |
| Local dev frame / Agent Native Desktop | Loads the running app and adds code-capable tooling such as terminal, file read/edit/write, and coding CLI integration. |
| Builder.io cloud frame | Hosted team frame with collaboration, visual editing, and parallel code-agent runs. |

The same app code should run inside every frame. The agent talks to the app
through the same action registry and application state regardless of which
frame hosts it.

Current implementation note: the app mounts `AgentSidebar` and the
Current implementation note: the app uses a local shell wrapper instead of the
framework `AgentSidebar` wrapper because this React Router app and
Agent-Native's bundled router do not share the same router context. App Mode
renders Agent-Native `AssistantChat` with a custom `AgentChatRuntime` wired to
`POST /_agent-native/app-agent` for local, deck-scoped product prompts. Code
Mode renders Agent-Native `AgentTerminal` against the local terminal bridge so
trusted local coding CLIs are available without Builder.io auth. For the same
router-context reason, route-state sync is implemented locally while preserving
the framework application-state keys: the shell writes `__url__` and
`navigation`, and consumes one-shot `navigate` commands.
Production `/_agent-native/agent-chat` streaming is not mounted yet, so hosted
chat persistence, approvals, memory, and streaming remain separate adoption
slices. Production shell access remains gated by the server-side terminal
policy.

### App Mode And Code Mode

The agent panel should support two tool modes:

| Mode | Capabilities | Intended audience |
|---|---|---|
| App mode | Uses only app tools: deck/slide/group actions, navigation, selection/context, and other product-safe actions. No filesystem or shell access. | End users and production product workflows. |
| Code mode | Adds coding tools on top of app tools: shell, file read/edit/write, database/workspace access, and coding CLI handoff. | Developers, trusted maintainers, local dev server, local Desktop, or Builder-hosted code frames. |

Code mode is not the same as Vite dev mode or `NODE_ENV=development`. It is an
agent capability toggle. In this repo's local development server, Code Mode can
be backed by the Agent-Native terminal protocol and a local authenticated CLI.
That path does not require a Builder.io login because `codex`, `claude`, or
another allowed CLI runs as the local user and reads its own local auth state. In
production, Code Mode must remain disabled unless a trusted authenticated frame
or server-side auth gate is added.

The stock Agent-Native terminal UI lazy-loads xterm packages. Keep
`@xterm/xterm`, `@xterm/addon-fit`, and `@xterm/addon-web-links` installed with
`@agent-native/core`; otherwise the Code Mode terminal header can render while
the terminal body fails to mount.

When the app is served through the HTTPS `portless` hostname, the Code Mode UI
must pass an explicit `ws://127.0.0.1:<port>/ws` URL to `AgentTerminal`. Letting
the stock terminal infer the WebSocket URL from `location.protocol` produces a
`wss://...:<port>` URL, which cannot connect to the plain local PTY bridge and
causes the terminal to reconnect forever.

For this repo, the ideal target is:

1. App mode inside the slides UI for normal product work: create/edit slides,
   change theme, reorganize deck structure, export, and create prompt decks.
2. Code mode from the same UI when a maintainer asks to improve the app itself:
   inspect the current screen/state, hand off to a local CLI terminal or trusted
   frame, edit repo files, run `pnpm typecheck`, `pnpm test`, and `pnpm lint`,
   then surface a diff/commit/PR.
3. A clear permission boundary so production users cannot accidentally gain
   shell or filesystem access.

The current bridge exposes every slide/deck/group action through the shared
action registry for HTTP, generic invoke, MCP-shaped tools, OpenAPI discovery,
and A2A discovery. It also exposes product-safe app context and navigation
actions: `get-current-app-context` reads the current route state and highlighted
browser text, `get-active-deck-context` combines route state with deck, slide,
and group services, and `navigate-app` queues semantic route commands for the
open UI.
These endpoints intentionally call the same `run()` functions used by the UI
action hooks, so reads and writes stay on one validated service path. The MCP
and A2A surfaces are protocol-compatible discovery/invocation adapters; they
are not yet a full authenticated hosted agent runtime with chat state,
approvals, memory, or streaming.

Presenter mode includes a local external audience display. The presenter view
opens `/p/:id/display`, writes the active slide index to browser `localStorage`,
and the display route listens for storage changes from the presenter window. The
display route bypasses the app shell and renders the existing fullscreen slide
view without speaker notes or presenter HUD controls, so the audience screen
stays clean while the presenter keeps notes, timer, next preview, and controls.

The local App Mode runtime is intentionally narrower than the full hosted
runtime. It accepts a deck scope from the shell, maps simple prompts to existing
app actions, and returns plain chat text. Current supported prompt families
include listing slides, listing groups, creating one normal slide, creating a
multi-slide normal outline, creating a group, changing the deck theme, and
preparing HTML export links and typed JSON export summaries. It can also summarize the active deck through
`get-active-deck-context`, list theme metadata through `get-theme-catalog`, and
queue app-shell theme changes through `set-app-theme`. It can list and apply
built-in design systems through `list-design-systems` and `apply-design-system`.
It can capture and list deck snapshots through `create-deck-snapshot` and
`list-deck-snapshots`, and restore a snapshot through `restore-deck-snapshot`
when the prompt includes an explicit snapshot id. This
gives the embedded panel a real product-safe tool path without requiring a
Builder.io login. Repository self-modification is still Code Mode and should go
through the local authenticated CLI bridge or a trusted hosted frame.

### Adoption Notes

- Do not treat the mounted sidebar shell as complete App mode. The panel should
  become the primary agent surface only when connected to real App mode
  chat/tool transport.
- Do not expose Code mode as plain app actions. Code mode needs a trusted
  local terminal, frame, desktop, or cloud runner because it can read and modify
  the repository.
- Do not require Builder.io auth for local Code Mode. Builder-hosted frames are
  an optional team/cloud path; local development should prefer already-authenticated
  local CLIs.
- Do not require Builder.io auth for local App Mode either. Local App Mode can
  use `/_agent-native/app-agent` as long as it stays inside product actions and
  deck-scoped permissions.
- Product actions should stay deployable without a writable code workspace.
  Code modification is optional frame capability, not a dependency of the
  deployed slides app.
- Export architecture can stay file-response based. The agent should treat file
  download generation as a product action or route capability, while code-mode
  self-improvement remains a separate workspace/coding-agent capability.
