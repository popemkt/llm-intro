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
- Slides can be code-backed or database-backed.
- Code-backed slides render registered React modules and can be renamed or
  reordered, but their content cannot be edited in the browser slide editor.
- Database-backed slides contain editable block data.
- Users can create, rename, reorder, edit, and delete database-backed slides.
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
- The editor auto-saves after changes and supports explicit save-and-exit.
- The editor preserves slide theme rendering while editing.

## Themeability

- App shell theme and slide content theme are separate.
- App shell theme controls workspace chrome.
- Slide content theme controls rendered slide backgrounds, text, surfaces,
  borders, and accents.
- Agents can list the supported theme catalog and can apply the app shell theme
  in the open browser session through a queued, product-safe command.
- Framework adoption must not collapse existing `ThemeName` behavior into a
  fixed reference-app palette.

## Export

- Decks can be exported as standalone HTML.
- Export preserves deck metadata, slide order, groups, themes, and renderable
  slide content.
- Export keeps the existing REST download route until the file/download flow is
  intentionally migrated.
- Agents can prepare an HTML export for the active deck through a product-safe
  action that returns the existing download URL.

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
  deck-scoped App Mode prompts, and keeps `AgentPanel` for local Code Mode.
- In App Mode, agents can use product-safe deck actions without shell or
  filesystem access. The current local runtime can list slides and create
  standard normal slides, multi-slide outlines, slide groups, and deck theme
  changes, HTML export links, and active deck summaries in the active deck from
  simple prompts. It can also list available themes and change the app shell
  theme, and it can create/list/restore deck snapshots.
- Agents can create standard themeable DB-backed slide layouts through
  `create-normal-slide`: title, section, bullets, two-column, quote, metrics,
  and closing.
- Agents can create a sequence of standard DB-backed slides from a structured
  outline through `create-normal-slides`.
- Users can create a new deck from Home in either blank mode or outline mode.
  Outline mode parses one slide per line into standard themeable DB-backed
  layouts and uses `create-deck-from-outline`.
- Users can create common normal slide layouts from the overview add tile
  without opening the manual editor first.
- In local development, trusted maintainers can use local authenticated coding
  CLIs such as Codex or Claude Code through the Agent-Native terminal bridge.
  This is a Code Mode capability and must not imply production shell access.
  It also does not require Builder.io auth because the CLI uses the local
  user's existing authentication.

## Candidate Reference Features

- Prompt-to-deck generation that streams usable slides into the current deck
  model.
- Richer visual slide editing controls, such as inline text editing, block
  menus, and slash-style block insertion.
- Speaker notes and improved presenter controls.
- Full production agent chat wiring. The current app has the shell surface,
  application-state route, action/MCP/A2A endpoints, local App Mode runtime, and
  local-development terminal bridge; hosted production chat remains a separate
  adoption slice.
