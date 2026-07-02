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
| 4 | **Plan** | Write the concrete plan + insertion points. **HITL approval gate** — this is where the human commits to the plan before any edit (plan mode / `ExitPlanMode`) | `suggest_insertion_points` · skill `openlore-plan-refactor` |
| 5 | **Implement** | Execute the approved plan | skills `openlore-implement-story`, `openlore-write-tests` |
| 6 | **Verify** | Run tests; confirm code still matches the contract specs | `check_spec_drift` · `openlore drift` |
| 7 | **Sync specs** | Regenerate the contract/data layer only → `openspec/specs/`. Behaviour intent lives in the approved plan, not a maintained functional doc | `openlore generate` (see below) |
| 8 | **Refresh** | Re-index so the graph + spec index stay current | `pnpm exec openlore analyze` |
| 9 | **Record** | Capture significant architectural decisions | `record_decision` |

**Hard rules:**
- Phase 1 (`orient`) before reading more than ~2 files for a task. Cite what the graph
  returned in your plan.
- Phase 4 is the **only approval gate**: explore (1–4) freely without asking — nothing
  mutates — then present the concrete plan and get the human to commit before editing.
  Don't slide from exploration into edits without that approval.
- Phase 8 (`analyze`) **after** any change that adds/moves/renames functions, routes,
  or specs — a stale graph gives wrong answers. **Always `analyze` after `generate`**
  (generate writes specs that only get indexed on the next analyze).
- MCP tools attach at session start. If they are absent (fresh adoption, or running
  outside a wired agent), use the `pnpm exec openlore <command>` CLI equivalents, or
  the `.claude/skills/openlore-*` skills.

### Spec layers — plan-as-source
The **approved plan** is the source of truth for intent/behaviour. We do **not** maintain
a hand-written functional catalogue any more.
- **The plan** (per change, from the Phase-4 back-and-forth) — what we're building and
  why. Concrete, reviewed, committed-to before implementation. This replaces
  `specs/functional/`.
- `openspec/specs/` — **data-model + API contracts** (OpenLore-generated, drift target).
  Regenerate with `pnpm exec openlore generate --force`; keep the OpenSpec heading
  skeleton intact or drift detection breaks.
- `specs/bridging/`, `specs/principles.md` — intent/migration, durable engineering rules.
- `specs/functional/` — **OBSOLETE.** Frozen reference only; no longer maintained or
  treated as source of truth. Don't update it; don't cite it as current behaviour.

### Embeddings (enabled — keep ollama running)
Semantic search is wired via local **ollama** + `nomic-embed-text`. It needs the
`EMBED_*` env in **two** places:
- **Index time** — `EMBED_BASE_URL=http://localhost:11434/v1 EMBED_MODEL=nomic-embed-text pnpm exec openlore analyze --embed`
- **Query time** — the MCP server reads the same env (set in `.mcp.json`) to embed
  your query; without it, search silently drops to BM25 keyword `bm25_fallback`.

Setup once: install ollama, `ollama pull nomic-embed-text`, keep the service on
`:11434`. If ollama is down, every tool **gracefully falls back to BM25** — no error,
just keyword-quality results (`searchMode: "bm25_fallback"` in the output). With it up,
`searchMode: "hybrid"`.

---

## Repo conventions

See `AGENTS.md` for the full list. Key points:
- Read `README.md`, `specs/harness.md`, `specs/principles.md` before design-affecting edits.
- Server layering: `db` → `repositories` → `services` → `routes` → `app/runtime/index`.
- Shared API contracts live in `libs/api-contract`.
- App/server source under `apps/slides`.
- Update Playwright (browser flows), Vitest/API tests (persistence/service/contract changes).
- Apply `specs/code-unit-cohesion.md` when a change touches structure or crosses modules.
