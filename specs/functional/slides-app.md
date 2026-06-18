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
- Framework adoption must not collapse existing `ThemeName` behavior into a
  fixed reference-app palette.

## Export

- Decks can be exported as standalone HTML.
- Export preserves deck metadata, slide order, groups, themes, and renderable
  slide content.
- Export keeps the existing REST download route until the file/download flow is
  intentionally migrated.

## Agent-Native Adoption

- The app adopts Agent-Native framework primitives without replacing the product
  with the Agent-Native reference Slides app.
- Existing functionality remains intact during adoption.
- Framework actions become the shared surface for UI, future agent tools, and
  future CLI/MCP access.
- Borrowed reference-app features are limited to capabilities that improve this
  product, especially advanced slide creation and stronger shell/agent UX.

## Candidate Reference Features

- Prompt-to-deck generation that streams usable slides into the current deck
  model.
- Richer visual slide editing controls, such as inline text editing, block
  menus, and slash-style block insertion.
- Deck snapshots or version history.
- Speaker notes and improved presenter controls.
- Agent sidebar or terminal shell after matching backend agent endpoints exist.
