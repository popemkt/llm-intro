---
name: apply-slide-feedback
description: Use when the user asks to apply visual feedback, inspector comments, review notes, or UI-marked fixes to slides.
---

# Apply Slide Feedback

This repo should prefer a UI-driven feedback loop: the user marks issues in the app, then presses an app control to ask the agent to fix them. Manual command triggering is acceptable as a fallback, but should not be the primary product workflow.

Use this skill when the user says to apply/fix inspector feedback, slide comments, review notes, visual annotations, or Open Slide-style markers.

## Feedback Sources

Accept feedback from:

- app inspector annotations;
- Agent Native resources/actions;
- future Plannotator-style review sessions;
- explicit user text in chat;
- source markers compatible with Open Slide's `@slide-comment` concept.

## Current Product Surface

The implemented feedback surface is source-linked and action-backed:

- `list-slide-feedback`: read feedback for a deck or slide.
- `create-slide-feedback`: create feedback for a code-backed or HTML slide.
- `resolve-slide-feedback`: mark one feedback item resolved after applying it.

The presentation UI exposes this through the message icon in presentation mode for code-backed and HTML slides. Manual slides are not part of this source-linked flow yet; they should continue through manual block actions and the slide editor.

The storage adapter is currently Open Slide-like:

- code-backed slides store JSX markers in `apps/slides/src/slides/**/*.tsx`;
- HTML slides store HTML comment markers in the slide's authored HTML source;
- resolved markers may remain in source with `status: "resolved"`.

This means applying code-backed feedback can trigger Vite refresh because TSX source changes. Treat that as a known WIP limitation until the app gets an external/session-backed feedback store.

## Action Usage

When the app server is running, prefer actions over ad hoc file scanning:

```bash
curl "http://localhost:3001/_agent-native/actions/list-slide-feedback?pid=<deckId>"
curl "http://localhost:3001/_agent-native/actions/list-slide-feedback?pid=<deckId>&slideId=<slideId>"
curl -X POST "http://localhost:3001/_agent-native/actions/resolve-slide-feedback" \
  -H "Content-Type: application/json" \
  -d '{"pid": <deckId>, "slideId": <slideId>, "feedbackId": "c-..."}'
```

Agents using the in-process action registry should call the same actions by name instead of hard-coding HTTP.

If the app server is not running, scan code-backed slide files for JSX markers:

```regex
\{\/\*\s*@slide-comment\s+id="(c-[a-f0-9]+)"\s+ts="([^"]+)"\s+text="([A-Za-z0-9_-]+={0,2})"\s*\*\/\}
```

Decode the `text` value as base64url JSON. The payload contains at least `note`; this repo's payload also includes `status`, deck/slide ids, slide title, and `location` metadata such as DOM path, element label, source path, and logical rect.

## Procedure

1. Resolve the target deck, slide, and element.
2. Read `slide-authoring`.
3. Run or emulate `list-slide-feedback` and group open feedback by slide.
4. For code-backed slides, edit the target TSX under `apps/slides/src/slides/` while preserving the fixed `1000 x 562.5` canvas contract.
5. For HTML slides, edit the slide source through product actions when possible. If working directly from DB/export source, preserve the sandboxed full-canvas assumptions.
6. Apply the smallest change that satisfies each note. Use `location.elementLabel`, `location.domPath`, and the marker's source line as hints, not as infallible truth.
7. After applying a note, call `resolve-slide-feedback` when the app server is running. If working offline against code markers, remove the marker only after the change is applied and mention that action resolution was unavailable.
8. Validate with tests or browser review when visual behavior changes.

## Code Mode vs App Mode

App Mode can list feedback because that is product-safe. Applying feedback is a Code Mode workflow because it may edit TSX, CSS, HTML source, tests, or specs. If the user asks the in-app product agent to apply comments, tell them to switch to Code Mode or local CLI and run the slide feedback command/skill.

## Product Direction

The app should expose actions like:

- `list-slide-feedback`;
- `resolve-slide-feedback`;
- `create-slide-feedback`.

Those actions let the UI start the agent workflow directly, rather than requiring the user to type a magic command.

`apply-slide-feedback` is intentionally a command/skill workflow for now, not a product action, because applying a comment requires source editing permissions.
