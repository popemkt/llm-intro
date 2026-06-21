# Apply Slide Feedback

Use when the user asks to apply/fix slide inspector comments, visual feedback, review notes, or source-linked `@slide-comment` markers.

1. Read `.agents/skills/apply-slide-feedback/SKILL.md`.
2. Read `.agents/skills/slide-authoring/SKILL.md`.
3. If the app server is running and the target deck is known, call `list-slide-feedback` for the deck or slide. Otherwise scan code-backed slide files for `@slide-comment` markers.
4. Apply each open note as the smallest source or slide-data change that satisfies the feedback.
5. Prefer `resolve-slide-feedback` after applying each note. If the server is unavailable, remove the marker only after applying the change and state that action resolution was unavailable.
6. Validate with the narrowest relevant command: usually `pnpm typecheck` plus `pnpm test`; add browser review or `pnpm test:e2e` when presentation/editor behavior changes.

This is a Code Mode workflow. App Mode can list feedback, but applying it may edit TSX/HTML/CSS/specs and needs local source access.
