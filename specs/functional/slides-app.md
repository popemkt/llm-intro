# Slides App Functional Spec

## Purpose

The app is an interactive slide-deck workspace for teaching LLM and agent
concepts. It supports a seeded instructional deck, user-created decks, browser
editing, themed presentation playback, and HTML export.

## Decks

- Users can view all available decks from the home screen.
- The seeded deck is always available after server bootstrap.
- Users can create decks with a name and slide theme.
- Users can delete user-created decks.
- System decks are protected by server rules; protected content cannot be
  removed through normal user flows.

## Slides

- A deck contains ordered slides.
- Slides can be code-backed, HTML-authored, or manual database-backed.
- Code-backed slides render registered React modules and can be renamed or
  reordered, but their content cannot be edited in the browser slide editor.
- HTML slides store authored HTML/CSS/JS source as deck slide content and
  render in a sandboxed full-canvas iframe without requiring a custom React
  module.
- Users can edit HTML slide source in the browser slide editor with a live
  full-canvas preview and speaker notes.
- Users can toggle a source-linked feedback inspector in presentation mode for
  code-backed and HTML slides, click rendered content, and add feedback that is
  persisted as Open Slide-style source markers.
- Agents can list and resolve source-linked slide feedback through product
  actions. Code-backed feedback writes markers into local TSX source files;
  HTML feedback writes markers into the slide's authored HTML source.
- Manual database-backed slides contain editable block data.
- Users can create, duplicate, rename, reorder, edit, and delete manual slides.
- Reorder operations preserve every slide exactly once.

## Groups And Overview

- Users can organize slides into groups from the overview grid.
- Groups can be created, renamed, collapsed, expanded, reordered, and deleted.
- Deleting a group moves its slides back to the ungrouped area.
- Overview edits use optimistic interaction where practical, then reconcile
  with persisted server state.

## Presentation Modes

- Overview mode shows the deck structure and editing controls.
- Presentation mode shows one slide at a time and supports keyboard navigation.
- Fullscreen mode presents one slide at a time in a focused view.
- Keyboard navigation supports next, previous, escape back to overview, and
  fullscreen entry from presentation mode.

## Slide Editor

- Users can edit database-backed slide titles and blocks.
- Supported block types are text, image, iframe, and shape.
- Blocks can be positioned and resized on a fixed 16:9 slide canvas.
- Blocks support typed appearance fields that persist through app actions:
  common rotation and opacity; text font size, color, background, alignment,
  and padding; image fit and corner radius; shape border, label color, and fill
  styling.
- Users can search SVGL logo candidates, import them into the deck asset
  library, and insert imported SVG assets into manual slides from the visual
  editor.
- Imported visual assets are deck-scoped and keep source, license, usage, and
  metadata for agent and export workflows.
- The editor auto-saves after changes and supports explicit save-and-exit.
- The editor preserves slide theme rendering while editing.

## Themeability

- App shell theme and slide content theme are separate.
- App shell theme controls workspace chrome.
- Slide content theme controls rendered slide backgrounds, text, surfaces,
  borders, and accents.
- Agents can list the supported theme catalog and can apply the app shell theme
  in the open browser session through a queued, product-safe command.
- Agents can list built-in design systems and apply one to a deck theme, the
  open app shell theme, or both while preserving the existing `ThemeName` model.
- Framework adoption must not collapse existing `ThemeName` behavior into a
  fixed reference-app palette.

## Export

- Decks can be exported as standalone HTML.
- Export preserves deck metadata, slide order, groups, themes, and renderable
  slide content.
- Export uses an Agent-Native namespaced file route while keeping the legacy
  REST download route for compatibility.
- Agents can prepare an HTML export for the active deck through a product-safe
  action that returns the Agent-Native download URL.
- Agents can export a deck as portable typed JSON and import that JSON into a
  new deck. Portable JSON preserves DB-backed slides, HTML slides, blocks, HTML
  source, notes, groups, layout, and theme; code-backed slides are exported as
  metadata and skipped on import because their source modules are not portable
  user content.
- Local App Mode can summarize typed JSON exports and direct automation clients
  to `export-deck-json` for the full payload.

## Snapshots

- Agents can save a deck snapshot that captures deck metadata, slide list, slide
  blocks, and slide groups.
- Agents can list, inspect, and restore saved deck snapshots. Restore is a
  consequential deck replacement action and requires an explicit snapshot id.
- Users can save, browse, and restore deck snapshots from deck settings. Restore
  asks for confirmation before replacing the current deck state.

## Agent-Native Adoption

- The app adopts Agent-Native framework primitives without replacing the product
  with the Agent-Native reference Slides app.
- Existing functionality remains intact during adoption.
- Framework actions become the shared surface for UI, future agent tools, and
  future CLI/MCP access.
- Agents can read the active deck context, including deck metadata, slide list,
  group list, and current navigation state, without shell or filesystem access.
- Agents can read the current highlighted browser text through app context when
  the user selects text in the open app.
- Theme metadata is shared between UI and agent actions so agents use the same
  theme names, labels, and descriptions users see in settings.
- Borrowed reference-app features are limited to capabilities that improve this
  product, especially advanced slide creation and stronger shell/agent UX.
- The app shell includes an Agent-Native-style product rail and a real
  agent toggle. The panel starts closed, uses Agent-Native `AssistantChat` for
  deck-scoped App Mode prompts, and uses Agent-Native `AgentTerminal` for local
  Code Mode.
- In App Mode, agents can use product-safe deck actions without shell or
  filesystem access. The current local runtime can list slides and create
  standard normal slides, multi-slide outlines, slide groups, and deck theme
  changes, slide title/speaker-note edits, HTML export links, and active deck
  summaries in the active deck from simple prompts. It can also list available
  themes and change the app shell theme, list and apply design systems, and
  create/list/restore deck snapshots.
- Local App Mode is action-backed and does not require Builder.io auth or a
  hosted model provider. The shell should show this as runtime status so users
  do not confuse product-safe App Mode with hosted Code Mode or provider-backed
  chat.
- Framework auth/org probes expose a local non-hosted session so local App Mode
  does not prompt for Builder.io login.
- The local `agent-chat` compatibility adapter keeps process-local chat threads
  so the framework thread probes can list and inspect recent local App Mode
  exchanges. This is not hosted memory and does not survive a server restart.
- Agents can read local model harness status through `get-local-model-status`.
  When configured, prompt deck creation can use the same local harness through
  the existing action, MCP-shaped, and A2A-discovered action surfaces. Code Mode
  can still run raw demo scripts and CLIs, but product prompt generation should
  go through app actions.
- Agents can read optional external local harness discovery through
  `get-local-harness-status`. This reports configured HTTP, OpenAPI, and MCP
  endpoints without granting shell or filesystem access.
- When `LOCAL_HARNESS_MCP_URL` is configured, agents can list MCP tools through
  `list-local-harness-tools` and call a specific tool through
  `call-local-harness-tool`. HTTP and OpenAPI harness entries remain
  discovery-only until their concrete contract is selected.
- Framework model/provider probes expose the same local model harness status so
  Agent-Native shells can distinguish local App Mode and local Code Mode from a
  hosted provider requirement.
- Framework engine/status probes expose local App Mode and local Code Mode
  availability even when Builder.io cloud auth is not configured.
- Framework local-runtime protocol discovery lists the available local app,
  action, MCP, model-harness, and terminal paths so shells can choose App Mode
  or trusted Code Mode without assuming hosted infrastructure.
- Optional external local harness endpoints can be advertised as HTTP, OpenAPI,
  and MCP transports. These endpoints are discovery-only until a concrete
  harness adapter grants specific invocation rights. MCP harnesses use the
  standard MCP contract, so tool listing and calls are available through
  product actions, and the same status is part of the App Mode manifest's
  discoverable prompt surface.
- Framework environment status exposes local model configured/fallback state
  without returning secret values.
- Local App Mode exposes a manifest and compact capabilities endpoint so shells
  can discover prompt families, starter suggestions, local-only tool boundaries,
  and action protocol URLs without relying on hard-coded UI copy.
- Framework resource probes expose local deck, slide, and group resources with
  product-safe action/navigation metadata, not filesystem paths, so shells can
  render app context inside the App Mode permission boundary.
- Deck-local assets can be searched/imported/listed/updated/deleted through
  product actions. Imported assets store local content plus source, license,
  usage, and metadata, and appear in framework resources as
  `slides://deck/:deckId/asset/:assetId`.
- The manual slide editor exposes a visible deck asset manager backed by those
  same actions. Users can import SVGs from SVGL search, a direct SVG URL, or
  pasted inline SVG content, then insert imported assets as local image blocks
  with first-class `assetId` references. Live rendering uses the local deck
  asset content URL, and HTML export rewrites asset references to data URLs so
  single-file decks remain self-contained.
- Framework MCP probes advertise the local slides action server and its
  product-safe tools while keeping invocation on the existing
  `/_agent-native/actions/mcp` route.
- Agents can create standard themeable DB-backed slide layouts through
  `create-normal-slide`: title, section, bullets, two-column, quote, metrics,
  and closing.
- Agents can create a sequence of standard DB-backed slides from a structured
  outline through `create-normal-slides`.
- Agents can duplicate editable manual and HTML slides through
  `duplicate-slide`, preserving slide content, notes, background, and transition
  metadata with a fresh slide id.
- Agents can create fully manual, PowerPoint-style editable slides through
  `create-manual-slide` by providing typed text, image, iframe, shape, line,
  table, and chart blocks with geometry and appearance fields.
- Agents can refine manual slides without replacing the whole block array via
  `add-manual-block`, `update-manual-block`, `delete-manual-block`,
  `group-manual-blocks`, and `ungroup-manual-blocks`.
- Agents can apply multiple manual block content, geometry, and appearance
  patches atomically through `update-manual-blocks`. The action validates every
  merged block before persisting, rejects duplicate targets, and refuses locked
  target blocks.
- Agents can perform PowerPoint-style manual layout operations via
  `arrange-manual-blocks`, `duplicate-manual-blocks`, and
  `move-manual-block-layer`, including multi-block alignment/distribution,
  match width/height/size, block duplication with fresh ids, and layer stack
  changes.
- Agents can move or resize one or more manual blocks by relative percentage
  deltas through `transform-manual-blocks`. The action can either apply the
  same deltas to each target block or proportionally scale the whole selected
  bounds while preserving relative block placement. The visual editor uses the
  same proportional bounds model when a user corner-resizes a multi-selection.
  It clamps geometry to the
  normalized slide canvas and rejects locked target blocks.
- Agents can apply named manual block style presets through
  `apply-manual-block-style-preset`. Presets update reusable appearance fields
  such as fill, border, radius, shadow, text color, and media fit while
  preserving content, geometry, grouping, lock state, and block IDs.
- Agents can snap one or more manual blocks to a configurable percentage grid
  through `snap-manual-blocks-to-grid`, including optional size snapping. The
  action clamps geometry to the normalized slide canvas and rejects locked
  target blocks.
- Agents can lock or unlock manual slide blocks through
  `set-manual-block-lock`; locked blocks stay selectable but reject destructive
  or layout-changing actions such as delete, arrange, duplicate, and layer
  moves.
- Agents can show or hide manual slide blocks through
  `set-manual-block-visibility`. Hidden blocks remain in the editable block
  list for later revision but are omitted from normal presentation rendering.
- Agents can flip manual slide blocks horizontally or vertically through
  `set-manual-block-flip`; locked blocks reject flip changes.
- Agents can set or clear per-block manual animation metadata through
  `set-manual-block-animation`. Supported presets include fade-in, rise,
  scale-in, side slides, wipe-right, and pulse, with optional duration, delay,
  easing, and repeat fields; locked blocks reject animation changes.
- Agents can set or clear hyperlink metadata on manual slide blocks through
  `set-manual-block-link`, including URL, accessible title, and same-tab/new-tab
  target. Unsafe script/data-style protocols are rejected, and locked blocks
  reject link changes.
- Agents can copy appearance formatting from one manual block to other blocks
  through `apply-manual-block-format`. The action preserves target content,
  geometry, display names, grouping, lock state, and IDs, while applying common
  opacity/rotation/shadow and matching block-type appearance fields.
- Agents can create a complete editable manual slide from reusable layout
  presets through `create-manual-preset-slide`, or append those same presets to
  an existing slide through `insert-manual-preset`; presets resolve to ordinary
  typed blocks and can be edited by later block actions.
- Agents can create full-canvas HTML slides through `create-html-slide` by
  providing authored HTML/CSS/JS source.
- Agents can create, list, and resolve source-linked feedback for code-backed
  and HTML slides through `create-slide-feedback`, `list-slide-feedback`, and
  `resolve-slide-feedback`. The first adapter uses source markers so local CLI
  agents can read unresolved comments without a hosted service. A later adapter
  should support external/session-backed feedback to avoid Vite refreshes when
  code-backed TSX files are touched.
- Local App Mode can list source-linked feedback for the active deck. Applying
  feedback remains a Code Mode workflow because it may edit local TSX, HTML,
  CSS, tests, or specs; the agent skill/command documents that workflow.
- Users can create a new deck from Home in either blank mode or outline mode.
  Outline mode parses one slide per line into standard themeable DB-backed
  layouts and uses `create-deck-from-outline`.
- Users can create a new deck from Home with a freeform prompt. Prompt mode uses
  a local streaming prompt deck route to draft the deck, create the deck, and
  add typed, themeable normal slides incrementally. The draft step can use a
  local OpenAI-compatible model harness when configured, and falls back to
  deterministic local drafting when no local model is available.
- Users can create common normal slide layouts from the overview add tile
  without opening the manual editor first.
- Users can create common editable manual preset slides from the overview add
  tile, then refine the resulting typed blocks in the visual editor.
- Users can duplicate editable manual and HTML slides from the overview hover
  controls, preserving slide content, notes, backgrounds, and transitions.
- Users can insert primitive blocks and common content presets in the visual
  slide editor. Presets still write ordinary typed blocks so themes, export, and
  agent actions keep using the same slide model.
- Users and agents can create editable manual line blocks for straight, elbow,
  and curved connectors, arrows, dashed or dotted rules, and process/timeline
  diagrams.
- Users and agents can create editable manual table blocks for comparison
  matrices, schedules, scorecards, and structured summaries.
- Users and agents can create editable manual chart blocks for bar, line, and
  pie charts from structured categories and series data.
- Users and agents can create common editable manual shapes: rectangles, pills,
  circles, triangles, diamonds, parallelograms, hexagons, and right arrows.
- The manual preset catalog includes title, bullets, quote, metric, two-column,
  comparison, timeline, image-left, process, dashboard, decision matrix,
  architecture map, callout stack, and section-divider layouts.
  Preset-created blocks include semantic display names so the layer list and
  agent follow-up edits can target them without inferring labels from content.
- Users can insert visual editor blocks from the keyboard with slash commands:
  `/title`, `/bullets`, `/quote`, `/metric`, `/text`, `/image`, `/iframe`,
  `/embed`, `/shape`, `/line`, `/arrow`, `/connector`, `/table`, `/chart`, and
  preset aliases such as `/comparison`, `/timeline`, `/image-left`, `/process`,
  `/dashboard`, `/decision`, `/architecture`, `/callouts`, and `/section`.
- Users can edit text blocks directly on the slide canvas and use the selected
  block menu to edit text, duplicate blocks, move layer order, and delete blocks.
- Users can multi-select manual slide blocks from the canvas or layer list,
  drag the selected blocks as a group, duplicate or delete the selection, and
  nudge selected blocks with the keyboard.
- Users can group and ungroup selected manual slide blocks. Grouped blocks keep
  `groupId`/`groupName` metadata in the typed block model, select together,
  drag together, duplicate with a fresh copied group id, and can be created or
  updated through the same agent action block payloads.
- Users can assign a human-readable display name to each manual slide block.
  The layer list prefers that name, making dense slides easier to inspect and
  giving agents a stable semantic label alongside the block id.
- Image blocks can store an optional percentage crop rectangle. The editor,
  presentation, fullscreen, snapshot, and export renderers preserve that crop
  while keeping existing image fit, position, and radius behavior for uncropped
  images.
- Users can lock manual slide blocks from the selected block menu or inspector.
  Locked blocks remain selectable and unlockable, but resist drag, resize,
  keyboard nudge, delete, arrange, layer, and numeric geometry edits.
- Users can hide manual slide blocks from the layer list, selected block menu,
  or inspector. Hidden blocks remain selectable from Layers and appear as a
  translucent editor ghost when selected, but do not render in presentation or
  export output.
- Users can flip selected manual slide blocks horizontally or vertically from
  the inspector. Flip metadata composes with rotation and persists through
  presentation, fullscreen, snapshots, export, and format painter.
- Users can set per-block manual animation presets from the inspector. Animation
  metadata is preserved with the block model, copied by format painter, and
  plays through WAAPI in presentation and fullscreen while editor thumbnails stay
  static.
- Users can assign hyperlinks to manual slide blocks from the inspector.
  Links remain inert while editing and in overview thumbnails, but become
  clickable in presentation, fullscreen, and exported playback.
- Dragging and resizing manual slide blocks snaps to slide edges, centerlines,
  and neighboring block edges/centers, with visible guide lines during pointer
  interaction. Holding Alt bypasses snapping for fine placement, while holding
  Shift during corner resize preserves the block's current aspect ratio.
- Users can enable a visible manual editor grid with configurable percentage
  spacing. When enabled, dragging and resizing blocks snaps to grid lines in
  addition to slide and block guides.
- Users can align multi-selected manual slide blocks to their shared selection
  bounds, distribute selected blocks horizontally or vertically, and match
  selected block width, height, or full size to the primary selected block.
- Text block editors include markdown formatting controls for headings, bold,
  italic, quotes, and bullet lists while preserving plain markdown storage.
- The selected block inspector can align blocks left, center, right, top,
  middle, and bottom, and can fit blocks to slide width, height, or both while
  preserving typed percentage geometry.
- The selected block inspector can edit common appearance, including rotation,
  opacity, and shadow presets/freeform CSS shadow, plus text appearance
  including font family, size, weight, style, and line height, image
  fitting/position/radius, and shape kind, border, fill, and label typography
  styling using the same typed block fields available to agent actions.
- Users can copy appearance formatting from the selected manual block and paste
  it onto another selected block. Format paste copies common opacity/rotation/
  shadow/animation and matching block-type appearance fields, including text
  typography, without copying content, geometry, display names, group
  membership, lock state, or IDs. Agents can perform the same operation through
  `apply-manual-block-format`.
- Users can undo and redo manual slide edits from toolbar controls or keyboard
  shortcuts. The local history covers title, speaker notes, blocks, transition,
  and background metadata while preserving native text-field undo inside inputs.
- Users can copy, cut, and paste selected manual slide blocks from toolbar
  controls or keyboard shortcuts. Paste creates fresh block IDs, fresh copied
  group IDs, and offset placement while preserving the original typed block
  content and appearance fields.
- Users can write speaker notes for each editable slide. Notes are slide
  metadata and persist through the same slide actions, snapshots, and export
  payloads as the rest of the slide model.
- Users and agents can set an optional per-slide background. Backgrounds can
  define a theme-overriding fill and optional image URL with fit/position
  metadata, and render consistently in editor, overview, presentation,
  fullscreen, snapshots, and export paths.
- Users and agents can set per-slide transition metadata. The editor exposes
  slide, fade, scale, cover, reveal, wipe, flip, none, and default presets with
  timing controls; actions accept the same transition field for manual, HTML,
  and code-backed slide metadata, and presentation/fullscreen/export playback
  uses it through the shared transition stage.
- Users and agents can set a deck default transition from deck settings or deck
  actions. Slides without their own transition inherit that deck default in
  presentation, fullscreen, audience display, and exported playback.
- Users can author custom transition keyframes for editable slides. Custom
  transitions store engine, easing, duration, and JSON enter/exit keyframe
  arrays in the same transition metadata used by agent actions. The editor also
  offers reusable custom keyframe templates as starting points and an inline
  preview using the same runtime transition resolver as presentation playback.
- Users and agents can export and import readable Markdown through
  `export-deck-markdown` and `import-deck-markdown`. The export includes deck
  metadata, slide titles, text blocks, image/embed references, shape labels,
  code-slide identifiers, and speaker notes. The importer creates typed DB
  slides from Markdown headings, body text, known theme metadata, and speaker
  note sections.
- Presenter mode displays the active slide's speaker notes above the controls
  when notes are present. Fullscreen mode remains audience-only.
- Presenter mode displays an elapsed timer and compact next-slide preview while
  controls are visible. Fullscreen mode remains audience-only.
- Presenter mode can open a separate audience display window at
  `/p/:id/display`. The presenter window publishes the active slide locally, and
  the display window follows it without showing notes, HUD controls, or app
  shell chrome.
- In local development, trusted maintainers can use local authenticated coding
  CLIs such as Codex or Claude Code through the Agent-Native terminal bridge.
  This is a Code Mode capability and must not imply production shell access.
  It also does not require Builder.io auth because the CLI uses the local
  user's existing authentication.

## Candidate Reference Features

- Hosted LLM-backed prompt-to-deck streaming. The current local stream is
  action-backed and can use the local OpenAI-compatible model harness when
  configured, with deterministic fallback when no local model is available.
- Additional visual editor refinements beyond formatting, arrange controls,
  multi-select, initial asset insertion, transition presets, and first-class
  HTML slide authoring, including masters/templates and custom transition
  authoring.
- Additional non-JSON import/export formats beyond HTML, typed JSON, and
  readable Markdown.
- Full production agent chat wiring. The current app has the shell surface,
  application-state route, action/MCP/A2A endpoints, local App Mode runtime,
  process-local `agent-chat` compatibility, and local-development terminal
  bridge; hosted production chat remains a separate adoption slice.
