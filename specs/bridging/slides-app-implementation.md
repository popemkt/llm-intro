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
| Delete deck | `delete-deck` action, presentation service protection rules | Vitest API tests |
| Deck settings | `SettingsPage`, `update-deck` action/client helper | Vitest/API plus browser flow when UI changes |

## Slides And Layout

| Functional behavior | Code implementation | Validation |
|---|---|---|
| List slides | `list-slides` action, slide service | Vitest API tests |
| Create slide | `create-slide` action, `PresentationPage` handlers | Vitest/API plus browser flow |
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
| Theme metadata | `apps/slides/src/lib/themeMeta.ts`, `ThemeName` contract |
| Per-deck theme persistence | presentation service, `update-deck` action/REST route |

## Export Bridge

| Functional behavior | Code implementation |
|---|---|
| Export deck as HTML | `apps/slides/server/routes/export.ts` |
| Export viewer bootstrap | `apps/slides/src/export-viewer.tsx` |
| Static data provider | `apps/slides/src/data/static-provider.ts` |

The export route remains on `/api` because it returns a downloadable HTML file.
Move it only when the Agent-Native action layer has an intentional file response
pattern in this repo.

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

### App Mode And Code Mode

The agent panel should support two tool modes:

| Mode | Capabilities | Intended audience |
|---|---|---|
| App mode | Uses only app tools: deck/slide/group actions, navigation, selection/context, and other product-safe actions. No filesystem or shell access. | End users and production product workflows. |
| Code mode | Adds coding tools on top of app tools: shell, file read/edit/write, database/workspace access, and coding CLI handoff. | Developers, trusted maintainers, local Desktop, or Builder-hosted code frames. |

Code mode is not the same as Vite dev mode or `NODE_ENV=development`. It is an
agent capability toggle. If a user asks for a code change from the in-app panel
and no code-capable frame is connected, the UI should explain that code changes
need Agent Native Desktop or a Builder cloud frame. If a code-capable frame is
connected, the request can be routed there while the app keeps showing the
normal agent/sidebar state.

For this repo, the ideal target is:

1. App mode inside the slides UI for normal product work: create/edit slides,
   change theme, reorganize deck structure, export, and later prompt-to-deck.
2. Code mode from the same UI when a maintainer asks to improve the app itself:
   inspect the current screen/state, edit repo files, run `pnpm typecheck`,
   `pnpm test`, and `pnpm lint`, then surface a diff/commit/PR.
3. A clear permission boundary so production users cannot accidentally gain
   shell or filesystem access.

The current bridge exposes every slide/deck/group action through the shared
action registry for HTTP, generic invoke, MCP-shaped tools, OpenAPI discovery,
and A2A discovery. These endpoints intentionally call the same `run()`
functions used by the UI action hooks, so reads and writes stay on one
validated service path. The MCP and A2A surfaces are protocol-compatible
discovery/invocation adapters; they are not yet a full authenticated hosted
agent runtime with chat state, approvals, memory, or streaming.

### Adoption Notes

- Do not build a visual-only sidebar. The panel should ship only when it is
  connected to real App mode chat/tool transport.
- Do not expose Code mode as plain app actions. Code mode needs a trusted
  frame/desktop/cloud runner because it can read and modify the repository.
- Product actions should stay deployable without a writable code workspace.
  Code modification is optional frame capability, not a dependency of the
  deployed slides app.
- Export architecture can stay file-response based. The agent should treat file
  download generation as a product action or route capability, while code-mode
  self-improvement remains a separate workspace/coding-agent capability.
