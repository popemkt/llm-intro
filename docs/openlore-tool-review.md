# OpenLore — Tool Review

Evaluation of [OpenLore](https://github.com/clay-good/OpenLore) v2.1.3 as a code-intelligence
layer for coding agents in this repo. Written from a real test-drive, not the marketing.

## TL;DR

**Keep it, as a navigation/triangulation layer — not as a spec generator.** The graph
tools (`orient`, `search_code`, `analyze_impact`, `suggest_insertion_points`) genuinely cut
blind file-reading and add call-topology that grep can't. The generated OpenSpec layer is a
useful *data-model + API contract* artifact but does **not** capture product behaviour. Two
fixable issues materially limit quality today: no embedding endpoint (BM25 fallback) and an
easily-stale spec index. Verdict: **worth adopting; ~70% of its value is the graph, ~30% the
specs, and embeddings would lift the graph from "useful" to "trustworthy".**

## How it was evaluated

Real feature as the probe: *"back the in-app product chat (AgentPanel) with the pi agent
SDK."* Drove the MCP tools directly over JSON-RPC (`orient`, `search_code`,
`suggest_insertion_points`, `search_specs`) against the live index (208 files, 1578
functions, 97 routes, 56 UI components). Also ran `analyze`, `generate`, `doctor`.

## Scorecard

| Capability | Rating | Note |
|---|---|---|
| Install / footprint | ★★★★★ | WASM tree-sitter + `node:sqlite`, **no native build**; clean on Node 25 |
| Graph build (`analyze`) | ★★★★★ | 208 files in ~35s, zero network; route/UI/env inventories included |
| `orient` | ★★★☆☆ | Right neighbourhood, but BM25 ranked config/manifest above the actual handler |
| `search_code` | ★★★★☆ | Surfaced the real backend (`app-agent-runtime.ts`, `provider.chat`) the others missed |
| `suggest_insertion_points` | ★★★★☆ | Ranked orchestrators with `role` + `insertionStrategy` + reason — genuinely actionable |
| `search_specs` / drift | ★★★☆☆ | Works, but silently depends on a fresh spec index (see Gotchas) |
| `generate` (OpenSpec) | ★★☆☆☆ | Entity/route archaeology; missed ~80% of product behaviour; skew + 1 hallucination |
| Graph metadata | ★★★★★ | `fanIn/fanOut`, `callers/callees`, `isHub`, `expand` handles — the real edge over grep |
| Agent ergonomics | ★★★★☆ | MCP + 8 skills + per-hit `expand` for lazy bodies; arg schemas vary slightly |

## Strengths

- **Topology over text.** Every result carries fan-in/out, hub flags, and caller/callee
  lists. `suggest_insertion_points` returned `createAgentNativeActionsRouter` (orchestrator,
  fanOut 8) with `insertionStrategy: add_orchestration_step` and a plain-English reason — that
  is design-useful, not just a file locator.
- **Token-efficient.** Results carry `expand` handles so an agent pulls a function body only
  when needed (`tokenBudget` caps result size). Fits the "stop re-reading files" thesis.
- **Local + fast + private.** Sub-second tool calls, zero network on the BM25 baseline,
  SQLite/LanceDB on disk.
- **Triangulation works.** No single tool nailed the target, but `orient` + `search_code` +
  `suggest_insertion_points` together pinpointed the chat backend (client `AppShell` →
  `app-agent-manifest` → `agent-native-actions` router → `app-agent-runtime.ts` →
  `local-model-provider.provider.chat`).

## Weaknesses & gotchas (with evidence)

1. **BM25 fallback by default.** No embedding endpoint → keyword matching. Every call warned.
   Concretely, `orient` for the chat-backend task ranked `APP_AGENT_MANIFEST`/`SUGGESTIONS`
   (config constants) **above** `app-agent-runtime.ts` (the actual handler), because the
   query words appear literally in the manifest. Lesson: under BM25, cross-check `orient` with
   `search_code`; don't trust ranking alone. Fix: enable embeddings (below).
2. **Spec index goes stale silently.** `search_specs` returned *"No spec index found"* and all
   `linkedSpecs` were empty — because `generate` ran *after* `analyze`, so the new specs were
   never indexed. Re-running `analyze` fixed it (40 sections). **Always `analyze` after
   `generate`.** This is now a hard rule in `CLAUDE.md`.
3. **`generate` is entity-biased.** On `domains: auto` it produced data-model schemas + the
   slide-feedback API and documented **3 of 97 routes**. It missed the entire action surface,
   editor behaviours, export, themeability, and the agent-native layer. It also skewed 3/5
   specs to the small feedback subsystem and hallucinated the product name ("OpenSpec",
   hand-corrected). Treat generated specs as a contract layer, not a behaviour spec.
4. **MCP needs a fresh session.** Tools attach at agent startup. Mid-session you must use the
   `pnpm exec openlore` CLI or drive the stdio server directly (as this review did).
5. **Minor:** arg schemas vary (`task` vs `description`); `tools/list` is authoritative.
   The `setup` decisions-gate hook blocks every commit out of the box — we removed it.

## Setup reality in this repo

- Provider `claude-code` (zero key, runs on the `claude` CLI). **codex is not a generate
  provider**; codex-via-Headroom is blocked (`uvx` absent). See `openlore-adoption.md`.
- Embeddings **not yet enabled** — no local embedding server present. Enable with:
  `ollama pull nomic-embed-text` then
  `EMBED_BASE_URL=http://localhost:11434/v1 EMBED_MODEL=nomic-embed-text pnpm exec openlore analyze --embed`.
- `generate` took ~9 min via the claude CLI for this codebase.

## Recommendations

1. **Enable embeddings.** Biggest single quality lever; turns BM25 guesses into semantic hits.
2. **Wire the analyze-after-change / analyze-after-generate rule** (done in `CLAUDE.md`).
3. **Keep `specs/functional/` hand-written.** OpenLore can't reverse-engineer capability prose.
4. Optionally re-run `generate --domains actions,editor,export,presentation,agent-native` to
   deepen contract coverage, accepting the entity bias.
5. Use it as the **front of every change** (orient-first), which is where the round-trip
   savings actually land.

## Archon-readiness

The 9-phase loop in `CLAUDE.md` (orient → locate → impact → plan → implement → verify → sync
→ analyze → record) is deliberately tool-per-phase so it can be lifted into a programmatic
[Archon](https://archon.diy) workflow: each phase = a node calling the matching MCP tool, with
gates (drift clean, tests green, graph fresh) between nodes. The manual discipline now is the
spec for that automation later.

## Related feature finding (pi → product chat)

Agent-Native already supports **harness agents** (Claude Code, Codex, **Pi**) as the chat
backend — so this is plumbing, not new architecture. Implement an `AgentHarnessAdapter`
(`name`, `capabilities`, `createSession` → session exposing `streamTurn`), register via
`registerAgentHarness`, resolve via `resolveAgentHarness`. Do **not** wrap Pi as an
`AgentEngine` (it owns its own loop). Ref: https://www.agent-native.com/docs/harness-agents.
