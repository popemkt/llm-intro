---
name: current-slide
description: Use when the user says "this slide", "this page", "this element", or references the currently visible deck content without naming it.
---

# Current Slide

Resolve deictic references through app state, not conversation memory.

Check these sources in order:

1. Agent Native application state under `/_agent-native/application-state/*`.
2. Selection context published by `AppShell`.
3. Current route: `/p/:deckId`, `/p/:deckId/slides/:slideId`, display/presenter routes.
4. Any future inspector selection resource.

If state is stale or missing, ask which deck/slide the user means.

Never guess from the most recently edited file when the user says "this".
