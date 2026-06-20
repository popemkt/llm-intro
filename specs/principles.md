# Engineering Principles

Cross-cutting rules that hold across the whole repo. Functional specs say *what*
the app does; bridging specs say *where* it lives; this file says *how* we build
it regardless of feature. When a principle and a feature spec disagree, fix one
of them — do not let them drift.

## Parse, Don't Validate

Turn untrusted input into a precise typed value **once**, at the boundary, and
pass the typed value inward. Do not re-check the same shape in every layer that
touches it.

- The boundary parser lives next to the contract: `libs/api-contract/src/index.ts`
  defines the shape, and `apps/slides/server/validation.ts` parses raw request
  bodies into those types before any service runs.
- A parser returns the narrowed type (or rejects). It does not return the raw
  input plus a boolean. Once parsed, downstream code trusts the type and never
  re-validates.
- Routes parse and map to HTTP. Services receive already-typed domain values and
  apply business rules — not field-shape checks.
- Reject at the edge with a specific error. Do not let a half-valid value travel
  inward and fail somewhere ambiguous.

Worked example — slide motion config (`SlideMotion`): the motion object is
parsed at the api-contract boundary into a typed `SlideMotion`, with unknown
preset names rejected there. `DbSlideRenderer` and the editor consume the typed
value directly and never re-parse the JSON or re-check preset names.

## Single Source Of Truth For Contracts

`libs/api-contract` is the one client/server boundary definition.
`apps/slides/shared/api.ts` is a compatibility re-export only — never a second
place to define types. Add or change a shared shape in `libs/api-contract`, then
let it flow outward.

## Layered Server, Thin Routes

Server dependencies flow one direction:

```
db -> repositories -> services -> routes -> app/runtime/index
```

- `repositories/*` own SQL only — no HTTP concerns, no UI policy.
- `services/*` own business rules and invariants (built-in deck protection,
  reorder validation, not-found/forbidden decisions).
- `routes/*` stay thin: parse params/body, call a service, map result/error to a
  response.

Never reach across a layer (a route running raw SQL, a repository deciding HTTP
status).

## Code-Unit Cohesion

Keep source units cohesive and reviewable. Apply the KEEP/PROMOTE/SPLIT/MERGE
rubric in [`code-unit-cohesion.md`](code-unit-cohesion.md) whenever a change
moves responsibilities or crosses a module boundary; run `/cohesion-review` when
boundaries shift.

## Agent-Native Parity

Any action a user can take in the UI, an agent can take through an action. When
you add a UI capability, add or confirm the matching action so the agent surface
stays at parity. The adoption map is
[`bridging/agent-native-adoption.md`](bridging/agent-native-adoption.md).
