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

Agent-Native exposes client shell components such as `AgentSidebar`,
`AgentToggleButton`, `AgentPanel`, `AgentChatSurface`, and `AgentTerminal`.
They should be introduced only after the server side has matching production
agent/chat or terminal endpoints for this app. A visual sidebar without working
agent transport is not considered adopted.

The current bridge exposes every slide/deck/group action through the shared
action registry for HTTP, generic invoke, MCP-shaped tools, OpenAPI discovery,
and A2A discovery. These endpoints intentionally call the same `run()`
functions used by the UI action hooks, so reads and writes stay on one
validated service path. The MCP and A2A surfaces are protocol-compatible
discovery/invocation adapters; they are not yet a full authenticated hosted
agent runtime with chat state, approvals, memory, or streaming.
