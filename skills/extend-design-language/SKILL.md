---
name: extend-design-language
description: Propose and reconcile missing components or capabilities using the shared Aegis Agentic registry and contract-first contribution workflow.
---

# Extend the design language

Read `../references/agentic-contract.md`. Search approved and proposed registry entries by name, alias and capability. Compare purpose and behavior, not just appearance.

1. Decide reuse, extension or a new responsibility. Record why alternatives do not fit.
2. Write a proposal against the current registry revision: stable candidate ID, purpose, family, anatomy, capabilities, behavior decisions, public API, test expectations and owner.
3. Submit to the shared project registry. A stale revision requires a refresh and reconciliation; do not overwrite another contribution. Draft proposals reduce duplicate work but do not guarantee exclusivity.
4. Implement the candidate locally with existing group roles and approved primitives. Add required behavioral and visual evidence.
5. Compare overlapping proposals. Merge requirements and behavior decisions before code. Conflicting defaults need an explicit resolution or separate patterns. Do not mechanically union APIs.
6. Produce one consolidation plan, combined capability tests, consumer migration and version impact. Owner acceptance promotes the canonical entry. Publish only through the project's release workflow.

Generated code does not automatically become a standard. Similarity scores are review aids, not proof of equivalent functionality. Independent projects converge only through an agreed upstream registry.
