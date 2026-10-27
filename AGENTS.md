# Repository workflows

This is the isolated **Aegis Agentic experiment**. The upstream Aegis checkout is not a work directory for this project. Read `docs/PRD.md` for accepted scope and `skills/references/agentic-contract.md` for portable consumer rules.

- Agent consumption: `skills/build-ui/SKILL.md`.
- Canonical composition: `skills/compose-pattern/SKILL.md`.
- Missing capabilities and concurrent contributions: `skills/extend-design-language/SKILL.md`.
- Evidence, audits and bounded repair: `skills/audit-ui/SKILL.md`.

Run `npm run check` for the initial experiment and the relevant token/headless checks for design changes. `npm run legacy:check` retains the inherited full Storybook pipeline. Generated `agent-kit/` and `lib-dist/` are outputs; modify their sources, not their copies. `npm run agentic:kit` distributes the same source skill files. Registry proposal fixtures remain illustrative; actual independent evaluation is recorded separately under `experiments/`.

Local creation and verification are authorized by the project task. Promoting shared behavior, changing design contracts, or publishing releases follows explicit owner policy. Do not fabricate owner approval, passing test evidence, or model-generated results. Automatic remediation is restricted to known derived outputs with unchanged approved inputs; never weaken an oracle to pass.

Use the relevant repository skill when changing the design system:

- Component creation or extension: read `skills/create-component/SKILL.md`.
- Token creation, naming, mappings, or migration: read `skills/create-token/SKILL.md`.
- Layouts and composed application patterns: read `skills/create-layout/SKILL.md`.

Each skill references `skills/references/design-contract.md`. Follow its strict Primitive → Semantic → Group dependency rules, four semantic theme/mode mappings, and family-relative naming conventions. Component styling consumes group tokens. Keep Base UI behavior independent of styling.

Storybook renders the skill files directly under Agentic Skills. Edit the source skill and shared contract rather than creating a separate copy of the instructions.

## Product pilot

For changes to the Forma product in `src/product`, read `src/product/pattern-policy.json` and follow the [product pattern decisions](skills/references/agentic-contract.md#product-pattern-decisions). Run `npm run product:patterns` and the relevant scenarios in `npm run product:browser` when editing the pilot. Keep its shared implementations, policy and verification aligned with the requested behavior.
