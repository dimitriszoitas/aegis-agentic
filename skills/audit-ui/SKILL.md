---
name: audit-ui
description: Audit or remediate Aegis Agentic interfaces using reproducible evidence and bounded repair authority.
---

# Audit and remediate

Read [the agentic contract](../references/agentic-contract.md). Include its [product pattern decisions](../references/agentic-contract.md#product-pattern-decisions) when comparing related pages. Record kit/profile/registry versions and the failing scenario before changing anything.

Use [page acceptance guidance](../references/page-composition.md#verify-the-result-at-three-levels) for composition audits. Check long values, readable content widths and responsive column behavior alongside implementation reuse.

1. Check contract validity, token graph/ownership, expected variants, required anatomy and behavior. Inspect both light/dark and both presentations at relevant widths.
2. Classify findings as derived drift, implementation defect, missing capability, design-language change or uncertain diagnosis. Distinguish observed failure from a fixture scenario.
3. Run the kit maintenance scan. Automatic repair may restore only known derived files when the approved profile and compiler lock still match. Keep the returned evidence/backup.
4. For behavior, API, dependency, profile or contract changes, prepare an isolated proposal with a reproduction and fix. Do not change tests, baselines, contracts or thresholds just to obtain a pass.
5. Validate the combined result against current shared source and existing regressions. Stop at the attempt budget or if scope expands. Report human review needed for semantic or visual judgments.

Do not run indefinite repair loops, install unattended schedules or publish updates without the project's explicit maintenance/release policy. Consumer updates remain pinned and deliberate.

For an infrastructure project, inspect `infrastructure/cli.mjs status --project <directory>` and `inventory` first. Separate finite configuration estimates from verified configurations; zero verification is not full coverage. `plan` writes reviewable proposals; remote AI requires explicit project opt-in, server credentials and a model. `reconcile` restores derived artifacts only after pinned-source integrity passes. Preserve failed state, audit history and backups. Never delete a lock until its owning process is confirmed stopped. Consult the infrastructure API contract for request shapes; do not send component content, user identifiers or arbitrary prop values as usage evidence.
