# CLAUDE.md

Instructions for coding agents (Claude Code, Codex) working in this repo.

---

## ⚠ MANDATORY: OpenLore-first workflow for every code change

This repo runs on [OpenLore](https://github.com/clay-good/OpenLore) — a local code
graph + 62 MCP tools. **Before touching code, orient with the graph instead of
blind-reading files.** This is not optional; it is how we work here. Full rationale
and operating guide: `specs/bridging/openlore-adoption.md`.

The loop (each phase maps to an OpenLore tool — these become the steps of a future
[Archon](https://archon.diy) programmatic workflow, so keep them explicit):

| # | Phase | Do this | Tool (MCP) / CLI |
|---|-------|---------|------------------|
| 1 | **Orient** | Start every non-trivial task by asking the graph where the work lives | `orient({task})` · skill `openlore-brainstorm` |
| 2 | **Locate** | Find the code and the relevant spec sections by meaning | `search_code` · `search_specs` |
| 3 | **Impact** | Map blast radius and check layering before editing | `analyze_impact` · `get_subgraph` · `check_architecture` |
| 4 | **Plan** | Find where the change should be inserted | `suggest_insertion_points` · skill `openlore-plan-refactor` |
| 5 | **Implement** | Make the change | skills `openlore-implement-story`, `openlore-write-tests` |
| 6 | **Verify** | Run tests; confirm code still matches specs | `check_spec_drift` · `openlore drift` |
| 7 | **Sync specs** | Behaviour → `specs/functional/`; contracts → `openspec/specs/` (regen) | `openlore generate` (see below) |
| 8 | **Refresh** | Re-index so the graph + spec index stay current | `pnpm exec openlore analyze` |
| 9 | **Record** | Capture significant architectural decisions | `record_decision` |

**Hard rules:**
- Phase 1 (`orient`) before reading more than ~2 files for a task. Cite what the graph
  returned in your plan.
- Phase 8 (`analyze`) **after** any change that adds/moves/renames functions, routes,
  or specs — a stale graph gives wrong answers. **Always `analyze` after `generate`**
  (generate writes specs that only get indexed on the next analyze).
- MCP tools attach at session start. If they are absent (fresh adoption, or running
  outside a wired agent), use the `pnpm exec openlore <command>` CLI equivalents, or
  the `.claude/skills/openlore-*` skills.

### Spec layers — don't conflate them
- `specs/functional/` — **capabilities/behaviour** (hand-written, source of truth).
- `openspec/specs/` — **data-model + API contracts** (OpenLore-generated, drift target).
  Regenerate with `pnpm exec openlore generate --force`; keep the OpenSpec heading
  skeleton intact or drift detection breaks.
- `specs/bridging/`, `specs/principles.md` — intent/migration.

### Embeddings (optional, sharpens every tool)
Search currently runs **BM25 keyword fallback** (no embedding endpoint configured),
which over-ranks keyword-dense files. To enable semantic search: run a local
OpenAI-compatible embeddings server (e.g. `ollama pull nomic-embed-text`), then
`EMBED_BASE_URL=http://localhost:11434/v1 EMBED_MODEL=nomic-embed-text pnpm exec openlore analyze --embed`.

---

## Repo conventions

See `AGENTS.md` for the full list. Key points:
- Read `README.md`, `specs/harness.md`, `specs/principles.md` before design-affecting edits.
- Server layering: `db` → `repositories` → `services` → `routes` → `app/runtime/index`.
- Shared API contracts live in `libs/api-contract`.
- App/server source under `apps/slides`.
- Update Playwright (browser flows), Vitest/API tests (persistence/service/contract changes).
- Apply `specs/code-unit-cohesion.md` when a change touches structure or crosses modules.
