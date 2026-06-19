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
- Manual database-backed slides contain editable block data.
- Users can create, rename, reorder, edit, and delete manual slides.
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
  same actions. Selecting an imported SVG inserts it as a local image block,
  currently using a `data:image/svg+xml` URL for export-stable rendering until
  slide blocks grow first-class asset references.
- Framework MCP probes advertise the local slides action server and its
  product-safe tools while keeping invocation on the existing
  `/_agent-native/actions/mcp` route.
- Agents can create standard themeable DB-backed slide layouts through
  `create-normal-slide`: title, section, bullets, two-column, quote, metrics,
  and closing.
- Agents can create a sequence of standard DB-backed slides from a structured
  outline through `create-normal-slides`.
- Agents can create fully manual, PowerPoint-style editable slides through
  `create-manual-slide` by providing typed text, image, iframe, and shape
  blocks with geometry and appearance fields.
- Agents can create full-canvas HTML slides through `create-html-slide` by
  providing authored HTML/CSS/JS source.
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
- Users can insert primitive blocks and common content presets in the visual
  slide editor. Presets still write ordinary typed blocks so themes, export, and
  agent actions keep using the same slide model.
- Users can insert visual editor blocks from the keyboard with slash commands:
  `/title`, `/bullets`, `/quote`, `/metric`, `/text`, `/image`, `/iframe`,
  `/embed`, and `/shape`.
- Users can edit text blocks directly on the slide canvas and use the selected
  block menu to edit text, duplicate blocks, move layer order, and delete blocks.
- Users can multi-select manual slide blocks from the canvas or layer list,
  drag the selected blocks as a group, duplicate or delete the selection, and
  nudge selected blocks with the keyboard.
- Dragging and resizing manual slide blocks snaps to slide edges, centerlines,
  and neighboring block edges/centers, with visible guide lines during pointer
  interaction. Holding Alt bypasses snapping for fine placement.
- Users can align multi-selected manual slide blocks to their shared selection
  bounds and distribute selected blocks horizontally or vertically.
- Text block editors include markdown formatting controls for headings, bold,
  italic, quotes, and bullet lists while preserving plain markdown storage.
- The selected block inspector can align blocks left, center, right, top,
  middle, and bottom, and can fit blocks to slide width, height, or both while
  preserving typed percentage geometry.
- The selected block inspector can edit common appearance, text appearance,
  image fitting/radius, and shape border/label styling using the same typed
  block fields available to agent actions.
- Users can write speaker notes for each editable slide. Notes are slide
  metadata and persist through the same slide actions, snapshots, and export
  payloads as the rest of the slide model.
- Users and agents can set per-slide transition metadata. The editor exposes
  slide, fade, scale, none, and default presets with timing controls; actions
  accept the same transition field for manual, HTML, and code-backed slide
  metadata, and presentation/fullscreen/export playback uses it through the
  shared transition stage.
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
  HTML slide authoring, including grouping, masters/templates, and custom
  transition authoring.
- Additional non-JSON import/export formats beyond HTML, typed JSON, and
  readable Markdown.
- Full production agent chat wiring. The current app has the shell surface,
  application-state route, action/MCP/A2A endpoints, local App Mode runtime,
  process-local `agent-chat` compatibility, and local-development terminal
  bridge; hosted production chat remains a separate adoption slice.
