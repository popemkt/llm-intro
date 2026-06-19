---
name: apply-slide-feedback
description: Use when the user asks to apply visual feedback, inspector comments, review notes, or UI-marked fixes to slides.
---

# Apply Slide Feedback

This repo should prefer a UI-driven feedback loop: the user marks issues in the app, then presses an app control to ask the agent to fix them. Manual command triggering is acceptable as a fallback, but should not be the primary product workflow.

## Feedback Sources

Accept feedback from:

- app inspector annotations;
- Agent Native resources/actions;
- future Plannotator-style review sessions;
- explicit user text in chat;
- source markers compatible with Open Slide's `@slide-comment` concept.

## Procedure

1. Resolve the target deck, slide, and element.
2. Read `slide-authoring`.
3. Apply the smallest change that satisfies the note.
4. Remove or mark resolved any feedback marker/action item.
5. Validate with tests or browser review when visual behavior changes.

## Product Direction

The app should expose actions like:

- `list-slide-feedback`;
- `apply-slide-feedback`;
- `resolve-slide-feedback`;
- `create-slide-feedback`.

Those actions let the UI start the agent workflow directly, rather than requiring the user to type a magic command.
