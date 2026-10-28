# FormErrorSummary

A linked, focusable form error summary. It accepts validation results rather than deciding form validity.

Supply stable error IDs, actual control IDs and concise messages.
After a failed submission, change focusRequestKey; keep it stable while typing.
Use focusField to reveal tabs or focus custom controls.

The host owns validation and stable error IDs, actual focusable field IDs, revealing hidden fields and custom control focus. The pattern owns summary structure, explicit summary focus requests, native field link and focus behavior.

Implementation boundaries:

- No validation engine, field mutation, router handling or automatic error dismissal.
- A field that is missing, disabled, hidden or not focusable needs host handling.
- Programmatic focus is an explicit caller request, not evidence that all assistive technologies announce identical text.

Owned styles consume only the `feedback` group. Real nested shared components retain their existing token owners. Geometry does not branch on theme or mode.

Playground uses the actual public API. Interaction stories exercise local behavior; Anatomy uses actual DOM targets. Focused tests and `scripts/verify-complete-patterns-source.mjs` provide bounded checks, not certification of arbitrary application integrations.
