# Specs

This directory is the repo's source of truth for behavior, implementation
mapping, and engineering harness rules.

## Spec Types

| Path | Purpose |
|---|---|
| `functional/` | User-visible behavior and product capability specs. These describe what the app does without requiring a reader to know the code. |
| `bridging/` | Code-to-behavior specs. These map functional areas to routes, actions, services, components, state, and tests. |
| `harness.md` | Dev/test/agent harness, commands, validation map, and imported Draiver rules. |
| `principles.md` | Cross-cutting engineering principles that hold across all features. |
| `code-unit-cohesion.md` | Code-unit cohesion rubric and structural rules. |
| `slide-scaling.md` | Slide canvas and scaling constraints. |
| `bridging/openlore-adoption.md` | How OpenLore (code graph + MCP tools + generated contract specs) is wired and operated in this harness. |

Functional specs should change when product behavior changes. Bridging specs
should change when implementation responsibility, framework wiring, or file
ownership changes.

The OpenLore-generated `openspec/specs/` tree (repo root, outside this folder) is
a separate **data-model + API-contract** layer and drift target — not the functional
source of truth. See `bridging/openlore-adoption.md` for the layer split.
