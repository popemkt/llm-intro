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
| App shell | Local shell with Agent-Native `AssistantChat`, `AgentTerminal`, local toggle, and product rail | `apps/slides/src/components/AppShell.tsx` |
| Application state | Minimal route for sidebar URL/app-state sync | `apps/slides/server/routes/application-state.ts` |
| Route state and navigation | Local React Router bridge writes `__url__`/`navigation` and consumes `navigate` commands | `apps/slides/src/components/AppShell.tsx`, `apps/slides/actions/app-context.ts` |
| Browser selection context | Shell writes selected browser text to `pending-selection-context` for app-context reads | `apps/slides/src/components/AppShell.tsx` |
| Active deck context | Route-aware read action returns deck metadata, slides, and groups | `apps/slides/actions/active-deck-context.ts` |
| Framework core probes | Local defaults plus deck resource, mode, provider, terminal, and status probes | `apps/slides/server/routes/framework-core.ts` |
| Local Code Mode terminal | Local PTY WebSocket bridge for known authenticated CLIs | `apps/slides/server/agent-terminal.ts`, `apps/slides/server/index.ts` |
| Local App Mode runtime | Deck-scoped HTTP chat runtime backed by the action registry | `apps/slides/server/routes/app-agent-runtime.ts`, `apps/slides/src/agent/appAgentRuntime.ts` |
| App Mode manifest | Shared local capability manifest for server probes and shell suggestions | `apps/slides/shared/app-agent-manifest.ts` |
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
| Duplicate slide | `duplicate-slide` copies editable manual and HTML slide content through `slidesService.create`, preserving notes/background/transition metadata while assigning a fresh slide id; `PresentationPage` and `OverviewGrid` expose the action from editable slide thumbnail controls | Vitest/API, typecheck |
| Create manual slide | `create-manual-slide` action validates typed editable blocks, including manual appearance fields for text, image, iframe, shape, line, table, and chart blocks | Vitest/API |
| Fine-grained manual block actions | `add-manual-block`, `update-manual-block`, `update-manual-blocks`, `delete-manual-block`, `group-manual-blocks`, and `ungroup-manual-blocks` reuse server block validation and `slidesService.update` so agents can safely edit manual slides incrementally. Batch updates validate all merged block patches before persisting, reject duplicate targets, and refuse locked target blocks. | Vitest/API |
| Manual block layout actions | `arrange-manual-blocks`, `transform-manual-blocks`, `snap-manual-blocks-to-grid`, `duplicate-manual-blocks`, and `move-manual-block-layer` mirror visual editor alignment, distribution, match width/height/size, relative move/resize, proportional selection scaling, grid quantization, duplication, and layer ordering behavior for agents | Vitest/API |
| Manual block locking action | `set-manual-block-lock` updates the shared typed block `locked` field; destructive/layout actions reject locked blocks while update can still unlock them | Vitest/API |
| Manual block visibility action | `set-manual-block-visibility` updates the shared typed block `hidden` field so agents can suppress blocks without deleting them | Vitest/API |
| Manual block flip action | `set-manual-block-flip` updates shared `flipX`/`flipY` fields and rejects locked target blocks | Vitest/API |
| Manual format painter action | `apply-manual-block-format` copies the same common and type-specific appearance fields as `SlideEditorPage` format paste, while preserving target content, geometry, display names, grouping, lock state, and IDs | Vitest/API, typecheck |
| Manual style preset action | `apply-manual-block-style-preset` applies named reusable patches from `apps/slides/shared/manual-style-presets.ts` to unlocked manual blocks through the same format-painter application helper | Vitest/action, typecheck |
| Manual preset actions | `create-manual-preset-slide` creates a manual slide from shared preset blocks, while `insert-manual-preset` appends the same preset blocks to an existing manual slide; `shared/manual-presets` seeds semantic `displayName` values so agents and the visual editor use the same reusable layouts | Vitest/API |
| Create HTML slide | `create-html-slide` action persists `kind: "html"` slides with authored HTML source | Vitest/API plus renderer tests |
| Create normal slide | `create-normal-slide` action maps reference layouts to typed DB blocks | Vitest/API plus browser flow |
| Quick normal slide UI | Overview add tile exposes title, bullets, two-column, quote, and metrics layout creation | Browser smoke plus action tests |
| Quick manual preset slide UI | `PresentationPage` calls `create-manual-preset-slide` from overview quick-add buttons, and `OverviewGrid` exposes common manual preset layouts beside normal quick layouts | Browser smoke plus typecheck |
| Create normal slide sequence | `create-normal-slides` action maps a structured outline to multiple typed DB slides | Vitest/API |
| Create deck from outline | `create-deck-from-outline` action creates a deck and typed normal slides from an outline | Vitest/API plus App Mode and Home UI smoke |
| Create deck from prompt | `draft-deck-from-prompt`, `create-deck-from-prompt`, Home prompt mode, and App Mode prompt routing | Vitest/API plus browser smoke |
| Local model prompt drafting | `get-local-model-status` reports OpenAI-compatible local harness availability; `draft-deck-from-prompt` and `create-deck-from-prompt` use `local-model-provider` when configured and deterministic drafting otherwise | Vitest/API plus provider-off smoke |
| Stream prompt deck creation | `/_agent-native/prompt-deck-stream` emits draft/deck/slide/done NDJSON events while creating typed normal slides | Vitest/API plus browser smoke |
| Rename slide | `update-slide` action | Browser flow or focused smoke |
| Delete slide | `delete-slide` action and service rules | Vitest/API plus browser flow |
| Reorder slides/groups | `update-deck-layout` action, slide service validation | Vitest/API plus Playwright |
| Code slide rendering | `apps/slides/src/slides/registry.ts` and `SlideShell` | build, visual inspection when changed |
| HTML slide rendering/editing | `HtmlSlideRenderer` renders `kind: "html"` slides in a sandboxed full-canvas iframe, reused by presentation, fullscreen, overview, export viewer, and the HTML source editor branch in `SlideEditorPage` | Vitest renderer tests, build, browser smoke |
| Per-slide transitions | `slides.transition_json`, `ApiSlide.transition`, `update-slide` action, `SlideTransitionEditor` preset/custom keyframe controls, reusable custom transition templates, inline previews through `resolveSlideTransition`, shared transition layer ordering, server transition validation, and `SlideTransitionStage` in presentation/fullscreen/export paths | Vitest/API, typed JSON round-trip, browser smoke |
| Deck default transitions | `presentations.default_transition_json`, `ApiPresentation.defaultTransition`, `create-deck`/`update-deck` actions, `SettingsPage`, and `toUnifiedSlide` inheritance for presentation/fullscreen/audience/export playback | Vitest/API, typecheck |
| Source-linked slide feedback | Shared `ApiSlideFeedback` contract, `source-feedback-markers` parser/serializer, `createSlideFeedbackService`, `slide-feedback` REST route, `list-slide-feedback`/`create-slide-feedback`/`resolve-slide-feedback` actions, and `SlideFeedbackInspector` overlay in `PresentationView` for code-backed and HTML slides | Vitest/API, typecheck; WIP browser smoke for inspector UX |

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
| Insert primitive blocks | `SlideBlockInsertPanel` adds text, image, embed, shape, line, table, and chart blocks | Browser smoke |
| Insert content presets | `shared/manual-presets` defines reusable typed block sets; `SlideBlockInsertPanel` renders that catalog for title, bullets, quote, metric, two-column, comparison, timeline, image-left, process, dashboard, decision matrix, architecture map, callout stack, and section-divider layouts. Timeline, process, architecture, and callout presets use editable line blocks for connectors, while dashboard and decision presets use editable chart/table blocks. | Browser smoke |
| Slash insert commands | `SlideBlockInsertPanel` maps primitive commands and preset aliases such as `/line`, `/arrow`, `/connector`, `/table`, `/chart`, `/comparison`, `/timeline`, `/image-left`, `/process`, `/dashboard`, `/decision`, `/architecture`, `/callouts`, and `/section` to the same typed block creation paths | Browser smoke |
| Inline text editing | `InlineTextBlockEditor` edits selected text blocks directly on the canvas and writes markdown back to the typed block | Browser smoke, typecheck |
| Markdown formatting controls | `MarkdownFormatToolbar` applies headings, bold, italic, quote, and bullet markdown in inline and side-panel text editors | Browser smoke, typecheck |
| Selected block menu | `BlockBubbleMenu` exposes edit, duplicate, layer order, and delete actions on selected canvas blocks | Browser smoke, typecheck |
| Multi-select editing | `SlideEditorPage` tracks primary and multi-selection state, supports modifier selection from canvas/layers, group drag, proportional corner resize, duplicate/delete selection, keyboard nudging, selection-bound alignment, horizontal/vertical distribution, and match width/height/size controls | Browser smoke, typecheck |
| Block object grouping | `BlockPos` carries optional `groupId`/`groupName`, server block validation preserves those fields, and `SlideEditorPage` groups/ungroups selected blocks while selecting, dragging, deleting, and duplicating grouped blocks together | Vitest/API, browser smoke, typecheck |
| Block display names | `BlockPos` carries optional `displayName`, server block validation preserves it, and `CommonAppearanceEditor` edits it while the layer list uses it before content-derived labels | Vitest/API, browser smoke, typecheck |
| Block object locking | `BlockPos` carries optional `locked`, server block validation preserves it, `BlockBubbleMenu` and `CommonAppearanceEditor` toggle it, and `SlideEditorPage` prevents locked blocks from drag, resize, delete, nudge, arrange, layer, and numeric geometry edits | Vitest/API, browser smoke, typecheck |
| Block object visibility | `BlockPos` carries optional `hidden`, server block validation preserves it, `DbSlideRenderer` filters hidden blocks, and `SlideEditorPage` toggles visibility from Layers, selected block menu, and inspector while showing selected hidden blocks as translucent editor ghosts | Vitest/API, browser smoke, typecheck |
| Block object animations | `BlockPos` carries optional `animation` preset metadata, server block validation preserves and bounds it, `set-manual-block-animation` exposes it to agents, `BlockAnimationEditor` edits it from the inspector, and `DbSlideRenderer` plays presets through WAAPI only when presentation/fullscreen enables block playback | Vitest/API, browser smoke, typecheck |
| Block object links | `BlockPos` carries optional `linkUrl`/`linkTitle`/`linkTarget`, server validation rejects unsafe protocols, `set-manual-block-link` exposes link updates to agents, `BlockLinkEditor` edits links from the inspector, and `DbSlideRenderer` activates anchors only when presentation/fullscreen/export playback opts into interactive links | Vitest/API, renderer tests, typecheck |
| Snapping and live guides | `SlideEditorPage` snaps pointer drag/resize operations to slide edges, centerlines, neighboring block edges/centers, and opt-in configurable percentage grid lines; active guide overlays render in the fixed canvas, Alt temporarily disables snapping, and Shift-constrained corner resize preserves the selected block aspect ratio | Browser smoke, typecheck |
| Inspector arrange controls | `SlideEditorPage` aligns selected blocks and fits them to slide width/height through the same typed percentage geometry used by drag, resize, and numeric fields | Browser smoke, typecheck |
| Inspector appearance controls | `SlideEditorPage` edits typed block appearance fields: rotation, horizontal/vertical flip, opacity, shadow, animation preset/timing, block links, text font family/size/weight/style/line-height/color/background/alignment/padding, image fit/position/radius, shape border/label typography/text color, line connector/stroke/dash/endpoint/arrowhead fields, table rows/header/styling fields, and chart type/data/legend/value/color fields | Vitest/API, renderer tests, typecheck |
| Shape catalog | `ShapeBlock.shape` supports rect, pill, circle, triangle, diamond, parallelogram, hexagon, and arrow-right; server validation preserves the catalog, `DbSlideRenderer` and `CanvasShapeBlock` render polygon shapes as SVG, and shape inspectors expose the full set | Vitest/API, renderer tests, typecheck |
| Image crop controls | `ImageBlock` carries optional `cropX`/`cropY`/`cropW`/`cropH` percentages; server validation bounds those fields, `DbSlideRenderer` and `CanvasImageBlock` map the crop rectangle into the image frame, and `ImageAppearanceEditor` exposes numeric crop controls plus reset | Vitest/API, browser smoke, typecheck |
| Format painter | `SlideEditorPage` keeps a local `BlockFormatClipboard`; selected block header controls copy common and type-specific appearance fields, then paste them onto unlocked selected blocks without mutating content, geometry, display names, grouping, lock state, or IDs. Cross-type paste still applies common opacity, rotation, shadow, and animation fields. | Browser smoke, typecheck |
| Manual undo/redo | `SlideEditorPage` records local `SlideHistorySnapshot` entries before manual edit operations, exposes toolbar undo/redo buttons plus Cmd/Ctrl-Z and redo shortcuts, and restores title, notes, blocks, transition, and background state without overriding native input undo | Browser smoke, typecheck |
| Manual clipboard | `SlideEditorPage` keeps a local `BlockClipboard`; toolbar buttons and Cmd/Ctrl-C/X/V copy, cut, and paste selected blocks with fresh block IDs, fresh copied group IDs, offset placement, history integration, and native input clipboard preservation | Browser smoke, typecheck |
| Slide backgrounds | `ApiSlideBackground` persists as `slides.background_json`; create/update actions and editor controls set fill/image fields, and `DbSlideRenderer` applies them in editor, overview, presentation, fullscreen, snapshots, and export resolution paths | Vitest/API, renderer tests, browser smoke, typecheck |
| Line block controls | `LineBlock` stores straight, elbow, or curved connector kind plus stroke color, width, dash style, endpoint coordinates, and arrowheads; `DbSlideRenderer` and `SlideEditorPage` render straight connectors as SVG lines and routed connectors as SVG paths, while `LinePropEditor` edits their fields | Vitest/API, renderer tests, browser smoke, typecheck |
| Table block controls | `TableBlock` stores rows, header row count, typography, border, alignment, and fill fields; `DbSlideRenderer` and `SlideEditorPage` render tables with native table layout and `TablePropEditor` edits rows as tab-separated text | Vitest/API, renderer tests, browser smoke, typecheck |
| Chart block controls | `ChartBlock` stores chart type, categories, series values/colors, title, legend/value flags, and colors; `ChartBlockView` renders bar, line, and pie charts as SVG for editor and presentation/export, and `ChartPropEditor` edits data as tab-separated text | Vitest/API, renderer tests, browser smoke, typecheck |
| Deck asset manager | `DeckAssetPanel` searches SVGL, imports deck-local SVG assets, lists imported assets with content, deletes assets, and inserts SVG assets into the manual slide canvas as image blocks | Vitest/API, browser smoke, typecheck |
| Edit speaker notes | `slides.notes`, `update-slide`, and `SlideEditorPage` notes field | Vitest/API plus browser smoke |
| Display speaker notes | `PresentationView` renders active slide notes above controls outside fullscreen | Browser smoke |
| Presenter timer and next preview | `PresentationView` renders elapsed time and a compact next-slide preview in presenter mode only | Browser smoke |

## Asset Bridge

| Functional behavior | Code implementation |
|---|---|
| Deck asset persistence | `deck_assets` migration plus `apps/slides/server/repositories/assets.ts` and `apps/slides/server/services/assets.ts` |
| Logo search | `search-logo-assets` action reads SVGL candidates from `https://api.svgl.app` |
| Import asset | `import-deck-asset` stores inline or fetched SVG content with source/license/usage metadata |
| List assets | `list-deck-assets` returns metadata by default and accepts `includeContent=true` for editor insertion flows |
| Manage assets | `update-deck-asset-metadata` and `delete-deck-asset` actions |
| Editor import/insertion | `DeckAssetPanel` in `SlideEditorPage` imports SVGL results, direct SVG URLs, or pasted inline SVG content, then inserts imported assets as image blocks with `assetId` plus the deck asset content URL |
| Agent resources | Framework resource routes expose deck assets as `slides://deck/:deckId/asset/:assetId` |

Manual image blocks can reference deck assets through `assetId`. Live app
rendering uses the deck asset content URL, while HTML export rewrites referenced
assets to data URLs so exported single-file decks remain self-contained.

## Manual Block Contract

| Contract field area | Code implementation |
|---|---|
| Shared slide/block fields | `libs/api-contract/src/index.ts` |
| Server validation and action persistence | `apps/slides/server/validation.ts`, `create-manual-slide`, `create-html-slide`, `create-slide`, `update-slide` |
| Presentation/export rendering | `apps/slides/src/components/DbSlideRenderer.tsx`, `apps/slides/src/components/HtmlSlideRenderer.tsx`, and export viewer reuse |
| Editor preview and controls | `apps/slides/src/pages/SlideEditorPage.tsx` |

Manual slide blocks are still persisted as DB-backed `kind: "db"` slides. The
product language now treats them as manual slides because their data model is a
PowerPoint-style editable canvas. A later schema slice can rename or alias the
storage kind without changing the user-facing concept.

This boundary follows **parse, don't validate** (see
[`../principles.md`](../principles.md)): `apps/slides/server/validation.ts`
parses a raw request body into the typed `libs/api-contract` shape once, and
every downstream service, renderer, and editor consumes the typed value without
re-checking field shapes or preset names.

HTML slides are persisted as first-class `kind: "html"` slides with an `html`
source field. The first implementation supports action creation, update,
presentation/fullscreen/overview/export rendering, snapshots, typed JSON
round-trips, and browser source editing with live preview.

## Presentation And Editor UI

| Functional behavior | Code implementation | Validation |
|---|---|---|
| Overview mode | `apps/slides/src/components/OverviewGrid.tsx` | Playwright for deck flows |
| Presentation mode | `apps/slides/src/components/PresentationView.tsx` | Browser smoke for navigation |
| Fullscreen mode | `apps/slides/src/components/FullscreenView.tsx` | Browser smoke for keyboard navigation |
| Slide editor | `apps/slides/src/pages/SlideEditorPage.tsx` | Playwright for edit/save flows |
| Block rendering | `apps/slides/src/components/DbSlideRenderer.tsx` and editor canvas rendering | Vitest regression tests |
| Source feedback inspector | `apps/slides/src/components/SlideFeedbackInspector.tsx` runs inside `SlideShell` for presentation-mode code/html slides, captures DOM path, element label, and logical 1000 x 562.5 rect, then calls feedback actions | Vitest/API plus manual browser smoke |

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
| Export deck as HTML | `apps/slides/server/routes/export.ts`, mounted at `/_agent-native/export/presentations/:pid` and legacy `/api/presentations/:pid/export` |
| Agent export action | `get-deck-export` action returns the POST `/_agent-native/export/presentations/:pid` file route |
| Export deck as typed JSON | `export-deck-json` action returns versioned deck, group, and slide data |
| Import deck from typed JSON | `import-deck-json` action creates a new deck from portable DB-backed slide data and reapplies group layout |
| Export viewer bootstrap | `apps/slides/src/export-viewer.tsx` |
| Static data provider | `apps/slides/src/data/static-provider.ts` |

The preferred export route is namespaced under `/_agent-native/export` because
it is the downloadable file response paired with the Agent-Native
`get-deck-export` discovery action. The legacy `/api` route remains mounted for
compatibility. The action itself is read-only; the returned file route still
uses POST because export mode and selected slide ids travel in the request body.

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
`GET /_agent-native/auth/session` and `GET /_agent-native/org/me` return local,
non-hosted identity metadata so framework shells do not prompt for Builder.io
login during local App Mode use.
`POST /_agent-native/agent-chat` is mounted as a local compatibility adapter
over the same App Mode prompt handler. It supports JSON responses, a one-shot
event-stream response, and process-local threads through
`GET /_agent-native/agent-chat/threads` and
`GET /_agent-native/agent-chat/threads/:threadId`. Those threads are in-memory
runtime compatibility state, not hosted memory or durable chat persistence.
Hosted chat persistence, approvals, memory, and hosted model streaming remain
separate adoption slices. The shell displays App Mode as local actions with no
hosted model requirement, and `GET /_agent-native/agent-chat/mode` exposes the
same `appMode` metadata for automation. The framework model probes
`GET /_agent-native/agent-model-defaults` and
`POST /_agent-native/actions/manage-agent-engine` report the same local
OpenAI-compatible provider status as `get-local-model-status`; this is provider
discovery for local prompt drafting, not a hosted engine dependency.
`GET /_agent-native/agent-engine/status` reports local App Mode and Code Mode
availability, while `GET /_agent-native/builder/status` keeps hosted Builder
cloud auth explicitly unconfigured. This prevents local shells from mistaking
missing Builder auth for missing local runtime.
`GET /_agent-native/local-runtime/protocols` consolidates the local adoption
paths into one discovery document: App Mode HTTP, direct action HTTP,
MCP-compatible action tools, optional OpenAI-compatible local prompt drafting,
and trusted local terminal Code Mode. App/action/MCP/model entries stay inside
the product-action boundary; terminal Code Mode is the only repo-modifying
path.
External local harness HTTP and OpenAPI endpoints are discovery-only in this
slice. Configure
`LOCAL_HARNESS_HTTP_URL`, `LOCAL_HARNESS_OPENAPI_URL`, or
`LOCAL_HARNESS_MCP_URL` (or the matching `AGENT_NATIVE_LOCAL_HARNESS_*` aliases)
to advertise local harness HTTP, OpenAPI, or MCP transports through
`local-runtime/protocols` and through the read-only `get-local-harness-status`
action. A configured MCP URL is also listed by `GET /_agent-native/mcp/servers`.
The local App Mode runtime can answer harness status questions through that
action. MCP harnesses use the standard MCP contract, so `list-local-harness-tools`
can enumerate connected tools and `call-local-harness-tool` can invoke one by
name.
Use MCP when the harness is primarily a tool/resource server, OpenAPI when the
harness already publishes REST operations, and direct HTTP only for a known
single-purpose endpoint. Local model serving is separate: prompt drafting uses
an OpenAI-compatible endpoint via `OPENAI_BASE_URL`, `OPENAI_API_KEY`, and
`OPENAI_MODEL`; MCP is not the model transport.
`GET /_agent-native/env-status` reports the same configured/fallback state with
redacted secret metadata. Production shell access remains gated by the
server-side terminal policy.
`GET /_agent-native/app-agent` exposes the full local App Mode manifest, and
`GET /_agent-native/app-agent/capabilities` exposes a compact view of the same
capabilities for framework shells. The frontend imports the same shared
manifest for starter suggestions so the UI and protocol surface stay aligned.
`GET /_agent-native/resources` and `GET /_agent-native/resources/tree` expose
local decks, slides, groups, and deck assets as `slides://...` resources with
product-safe action/navigation metadata for reading deck data, listing
slides/groups/assets, opening decks/slides through `navigate-app`, and managing
asset metadata through asset actions; they do not expose filesystem paths.
`GET /_agent-native/mcp/servers` advertises the local `slides-actions` MCP
server, and `GET /_agent-native/mcp/builtin` lists the same public action tools
that `/_agent-native/actions/mcp` can invoke.
`list-slide-feedback`, `create-slide-feedback`, and `resolve-slide-feedback`
expose the first source-linked review loop. The storage adapter writes Open
Slide-compatible JSX markers into code-backed slide source files and HTML
comments into authored HTML slide source. This is intentionally behind the
`ApiSlideFeedback` action model so a future external/session store can avoid
code-slide Vite refreshes while keeping the same UI and agent contract.

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
approvals, memory, or hosted model streaming. The local `agent-chat` adapter is
product-safe and action-backed; it stores only process-local compatibility
threads.

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
multi-slide normal outline, creating a group, changing the deck theme,
renaming a slide, updating slide speaker notes, preparing HTML export links,
typed JSON export summaries, readable Markdown export summaries, and pasted
Markdown deck imports. It can also summarize the active deck through
`get-active-deck-context`, list theme metadata through `get-theme-catalog`, and
queue app-shell theme changes through `set-app-theme`. It can list and apply
built-in design systems through `list-design-systems` and `apply-design-system`.
It can capture and list deck snapshots through `create-deck-snapshot` and
`list-deck-snapshots`, and restore a snapshot through `restore-deck-snapshot`
when the prompt includes an explicit snapshot id. This
gives the embedded panel a real product-safe tool path without requiring a
Builder.io login. Repository self-modification is still Code Mode and should go
through the local authenticated CLI bridge or a trusted hosted frame.

Prompt deck drafting can use a local OpenAI-compatible model provider through
`apps/slides/server/local-model-provider.ts`. The provider reads `OPENAI_API_KEY`,
`OPENAI_BASE_URL`, and `OPENAI_MODEL` from the local environment, including the
existing `demos/.env` harness file as a fallback source. The app runtime does
not import demo scripts. When the provider is unavailable or generation fails,
the prompt-deck actions fall back to deterministic local drafting and still
return typed normal-slide blocks.

Local harnesses and local models are intentionally exposed through different
boundaries. Harnesses extend App Mode with external tools and context, so they
belong in action/MCP/OpenAPI discovery. Models generate prompt-deck drafts, so
they belong behind the local OpenAI-compatible provider. Code Mode can also use
local authenticated CLIs such as `codex` or `claude`, but that path is for
trusted self-modification and should not be treated as the product App Mode
model runtime.

### Adoption Notes

- Treat the mounted sidebar shell as the local App Mode surface only while it
  stays connected to product-safe chat/tool transport. Full hosted chat memory,
  approvals, and team collaboration are separate hosted-runtime concerns.
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
