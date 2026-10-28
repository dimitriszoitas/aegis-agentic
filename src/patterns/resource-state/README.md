# ResourceState

A common boundary for loading, retained refresh, stale results, error and empty presentation.

Select status from a host resource state machine.
Use refreshing to keep current content visible and stale when the last successful data remains useful.
Provide onRetry and drive retrying from the actual retry operation.

The host owns fetching and request cancellation, state selection and data freshness, retry behavior and retrying state. The pattern owns explicit state presentation, retained content identity, shared feedback and retry controls.

Implementation boundaries:

- No fetching, caching, authentication, freshness timestamps or automatic state transitions.
- Switching to initial-loading/empty/error intentionally unmounts retained children.
- retrying is caller-controlled and must reflect the actual operation.

Owned styles consume only the `feedback` group. Real nested shared components retain their existing token owners. Geometry does not branch on theme or mode.

Playground uses the actual public API. Interaction stories exercise local behavior; Anatomy uses actual DOM targets. Focused tests and `scripts/verify-complete-patterns-source.mjs` provide bounded checks, not certification of arbitrary application integrations.
