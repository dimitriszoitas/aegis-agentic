---
name: compose-pattern
description: Select and configure canonical Aegis Agentic patterns while preserving structural and behavioral invariants.
---

# Compose a pattern

Read [the agentic contract](../references/agentic-contract.md) and discover the applicable pattern in the kit registry. Resolve the [product pattern decisions](../references/agentic-contract.md#product-pattern-decisions) before selecting page-specific variants.

1. Specify the task, state owner, loading/empty/error handling and content constraints.
2. Separate invariants from allowed variants. For filtering, identify immediate versus explicit application, draft/applied state, clear-all behavior and result synchronization.
3. Select explicit approved defaults. Validate the full specification, including cross-field constraints and pinned registry revision, using the kit CLI.
4. Use the canonical renderer or implementation. Persist the spec alongside the app so other agents reuse the accepted structure.
5. Exercise transitions, not just screenshots: edit, apply, clear, switch density, change mode, narrow viewport and restore. Test controlled input and focus behavior.

A valid variation need not be visually identical. Exact consistency requires the same accepted spec, data/context and versioned implementation. Unsupported behavior is an extension proposal.
