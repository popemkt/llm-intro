# Specs

This directory is the repo's source of truth for behavior, implementation
mapping, and engineering harness rules.

## Spec Types

| Path | Purpose |
|---|---|
| `functional/` | User-visible behavior and product capability specs. These describe what the app does without requiring a reader to know the code. |
| `bridging/` | Code-to-behavior specs. These map functional areas to routes, actions, services, components, state, and tests. |
| `harness.md` | Dev/test/agent harness, commands, validation map, and imported Draiver rules. |
| `code-unit-cohesion.md` | Code-unit cohesion rubric and structural rules. |
| `slide-scaling.md` | Slide canvas and scaling constraints. |

Functional specs should change when product behavior changes. Bridging specs
should change when implementation responsibility, framework wiring, or file
ownership changes.
