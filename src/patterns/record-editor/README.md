# RecordEditor

A generic view/edit/save/cancel/delete workflow with explicit record versions and retained failure drafts.

Supply an independent createDraft function and equality comparator for your domain.
Resolve onSave with the authoritative saved record and new version; reject on validation or persistence failure.
Enforce expectedVersion atomically and honor AbortSignal where possible.
Guard recordId changes externally when an active draft must not be discarded.

The host owns record identity and authoritative version, clone and equality policy, atomic persistence and cancellation handling, field validation, routing and permissions. The pattern owns draft-session lifecycle, native form and pending presentation, conflict preservation and confirmation.

Implementation boundaries:

- No backend, authorization, autosave, undo, merge algorithm or automatic router guard.
- The host must enforce optimistic concurrency on the server or other authoritative persistence boundary.
- Record identity changes intentionally reset the session; same-version record changes violate the host version contract.
- Native fieldset disabling does not disable portaled controls; renderFields.disabled is provided for that boundary.

Owned styles consume only the `workflow` group. Real nested shared components retain their existing token owners. Geometry does not branch on theme or mode.

Playground uses the actual public API. Interaction stories exercise local behavior; Anatomy uses actual DOM targets. Focused tests and `scripts/verify-complete-patterns-source.mjs` provide bounded checks, not certification of arbitrary application integrations.

`defaultEditing` selects the initial mode only. `onSave(draft, {recordId, expectedVersion, signal})` resolves `{record, version}`. The editor displays that result while the host updates its source. Changes to `recordId` deliberately create a fresh session. Deletion captures the version when the confirmation opens; reopening is required after an intervening change.
