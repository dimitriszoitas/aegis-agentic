# UnsavedNavigationGuard

A router-neutral adapter for explicitly guarded navigation and a best-effort unload warning.

Route relevant navigation through requestNavigation(() => router.navigate(...)).
Keep dirty state and draft recovery in the host.
Use onDiscard for explicit cleanup; make callbacks safe to retry.

The host owns dirty state and edited data, routing every guarded transition through the adapter, discard callback and navigation effects, route failure presentation outside a dirty confirmation. The pattern owns explicit request queue, confirmation and pending state, beforeunload listener lifecycle.

Implementation boundaries:

- No universal interception of router events, browser history or links.
- Browser unload prompts may be suppressed and cannot show custom application text reliably.
- An already running callback cannot be canceled or undone by unmount.
- A retry may invoke onDiscard again; host callbacks must tolerate retries.

Owned styles consume only the `workflow` group. Real nested shared components retain their existing token owners. Geometry does not branch on theme or mode.

Playground uses the actual public API. Interaction stories exercise local behavior; Anatomy uses actual DOM targets. Focused tests and `scripts/verify-complete-patterns-source.mjs` provide bounded checks, not certification of arbitrary application integrations.
