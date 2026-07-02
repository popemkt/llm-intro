# Specs

This directory holds implementation-mapping and engineering harness rules.
**Behaviour/intent is no longer specced here** — it lives in the approved plan for
each change (the Phase-4 gate of the OpenLore workflow; see
`bridging/openlore-adoption.md`). Data-model + API contracts live in
`openspec/specs/` (generated).

## Spec Types

| Path | Purpose |
|---|---|
| `functional/` | **OBSOLETE — frozen reference, not maintained.** Old hand-written capability catalogue. Behaviour intent now lives in per-change plans, not here. |
| `bridging/` | Code-to-behavior specs. These map functional areas to routes, actions, services, components, state, and tests. |
| `harness.md` | Dev/test/agent harness, commands, validation map, and imported Draiver rules. |
| `principles.md` | Cross-cutting engineering principles that hold across all features. |
| `code-unit-cohesion.md` | Code-unit cohesion rubric and structural rules. |
| `slide-scaling.md` | Slide canvas and scaling constraints. |
| `bridging/openlore-adoption.md` | How OpenLore (code graph + MCP tools + generated contract specs) is wired and operated in this harness. |

Bridging specs should change when implementation responsibility, framework
wiring, or file ownership changes. (Functional specs are frozen — see above.)

The OpenLore-generated `openspec/specs/` tree (repo root, outside this folder) is
a separate **data-model + API-contract** layer and drift target — not the functional
source of truth. See `bridging/openlore-adoption.md` for the layer split.
