# OpenLore Adoption Bridge

This repo adopts [OpenLore](https://github.com/clay-good/OpenLore) as a local-first
code-intelligence layer for coding agents (Claude Code, Codex). OpenLore builds a
queryable call/architecture graph from static analysis and exposes it to agents over
MCP, plus a reverse-engineered OpenSpec spec layer. This document records how it fits
our harness, what it does and does not own, and how to operate it.

Reference documentation:

- https://github.com/clay-good/OpenLore
- https://github.com/Fission-AI/OpenSpec (the spec format OpenLore emits)

## Why we adopted it

The prize is the **graph + MCP tools**, not the generated specs:

- `orient`, `search_code`, `analyze_impact`, `suggest_insertion_points`,
  `get_subgraph`, `trace_execution_path` — cut repetitive file re-reads when an agent
  scopes a change.
- `search_specs` / `check_spec_drift` — find requirements by meaning and flag
  code/spec divergence.
- 1500+ functions, ~97 routes, and the UI/route/env inventories are indexed locally.

## Embeddings (enabled)

Semantic search runs on local **ollama** + `nomic-embed-text`. The `EMBED_*` env is needed
in **two** places: at index time (`pnpm exec openlore analyze --embed`) and in the MCP
server env (set in `.mcp.json`) so it can embed queries at runtime. With ollama up,
`searchMode: hybrid`; with it down, search **gracefully falls back to BM25** (no error).
Keep the ollama service on `:11434`.

## Harness agents (product chat backend)

Agent-Native ships built-in harness agents (Claude Code, Codex, **Pi**) that own their own
loop, distinct from the deterministic local App Mode runtime. The product chat can run
through one:
- Packages: `@ai-sdk/harness` + `@ai-sdk/harness-pi` (the `ai-sdk-harness:pi` runtime).
- Plumbing: `apps/slides/server/agent/pi-harness.ts` + an opt-in branch in
  `POST /_agent-native/agent-chat`. Enable with `SLIDES_AGENT_HARNESS=ai-sdk-harness:pi`;
  default stays deterministic. The runtime needs an LLM provider to actually chat. Don't
  wrap Pi as an `AgentEngine` — it owns its loop. Ref:
  https://www.agent-native.com/docs/harness-agents

## The spec layer split (important)

OpenLore's `generate` is **entity/route-oriented code archaeology**. On our codebase
(`domains: auto`) it produced data-model schemas (`Slide`, `Block`, `Presentation`,
`SlideGroup`, `DeckAsset`, `DeckSnapshot`, `SlideFeedback` + validation) and the
slide-feedback REST surface — **not** our capability/behaviour catalogue. Of ~97
analyzed routes it documented 3.

So the layers do **not** collapse into one. They sit on different axes and do not
duplicate each other:

| Layer | Path | Owner | Content |
|-------|------|-------|---------|
| Capabilities / behaviour | `specs/functional/` | hand-written | What users and agents can *do* (the ~150 action/editor behaviours) |
| Data model + API contracts | `openspec/specs/` | OpenLore `generate` (drift-checked) | Typed entities, validation rules, endpoint contracts |
| Intent / migration | `specs/bridging/`, `specs/principles.md`, `specs/harness.md` | hand-written | Why, adoption constraints, roadmap |

`openspec/specs/` is the **contract/data layer and drift target**, not the functional
source of truth. Do not retire `specs/functional/` in favour of it.

When editing generated specs, **keep the OpenSpec skeleton** (`### Requirement:`,
`#### Scenario:`, Given/When/Then). `orient`/`drift` parse those anchors; reshaping the
structure breaks detection.

## How it is wired in this repo

- **Dependency**: `openlore` is a workspace dev dependency. Runs on Node >= 22.5 with
  no native build (WASM tree-sitter + built-in `node:sqlite`). The
  `ExperimentalWarning: SQLite is experimental` line on every run is cosmetic.
- **Config**: `.openlore/config.json` is committed and shared. Analysis artifacts under
  `.openlore/` are gitignored (`!.openlore/config.json` keeps the config tracked).
- **Provider**: `generation.provider = "claude-code"` — generation runs through the
  local `claude` CLI with **no API key and no proxy**. See provider notes below.
- **MCP**: registered in the repo-root `.mcp.json` as `openlore` (`npx openlore mcp`).
  MCP servers attach at session start, so a **fresh agent session is required** to pick
  up the 62 tools.
- **Skills**: `.claude/skills/openlore-*` (brainstorm, debug, plan/execute-refactor,
  implement-story, write-tests, analyze-codebase, generate).
- **Decision gate hooks removed**: `openlore setup` installs a `decisions --gate`
  pre-commit hook (+ post-commit bypass detector) that blocks every commit until
  architectural decisions are approved. We removed it to avoid gating routine commits;
  the canonical lint-staged pre-commit and the Entire post-commit hook are restored.
  Re-enable governance later with `pnpm exec openlore setup --tools claude`.

## Provider reality

- **codex is not a `generate` provider.** OpenLore's CLI providers are `claude-code`,
  `gemini-cli`, `mistral-vibe`, `cursor-agent`; OpenAI is API-key only. `codex` is
  supported as a *hook format* (`setup --hooks codex`), not a generation backend.
- **codex via Headroom is blocked locally**: `uvx` is not installed, so the Headroom
  proxy cannot start. If we want the codex *model* later, install `uv`/`uvx`, run
  `pnpm run proxy`, and point an `openai-compat` provider at `http://localhost:8787`.
- For now `claude-code` is the working, zero-secret route and spends Claude CLI usage,
  not API billing.

## Operating it

```bash
# Refresh the graph after meaningful code changes (no key, ~35s here)
pnpm exec openlore analyze

# Regenerate the contract specs (uses the claude CLI, ~9 min here)
pnpm exec openlore generate --force        # full reset; otherwise --merge / --no-overwrite

# Health + staleness
pnpm exec openlore doctor
pnpm exec openlore status

# Detect code/spec divergence
pnpm exec openlore drift

# Start the MCP server manually (normally launched by the agent via .mcp.json)
pnpm exec openlore mcp
```

Keep the graph fresh: re-run `openlore analyze` after large changes; `openlore status`
reports staleness. Treat `openspec/specs/` as regenerable — prefer fixing the generator
inputs (domains, `rules`/`context`) over hand-editing large swathes, but small content
corrections (like the product-name fix in `overview/spec.md`) are fine.

## Known rough edges (first generation pass)

- `domains: auto` skewed toward the high-cohesion feedback subsystem (3 of 5 specs) and
  under-covered the action surface.
- It hallucinated the product name as "OpenSpec" in `overview/spec.md` (corrected by
  hand). Re-check the product name and confidence (`> Confidence:`) on regeneration.
- A targeted `generate --domains <...>` run may improve capability coverage but the
  entity-bias is inherent; the functional layer stays hand-written regardless.
