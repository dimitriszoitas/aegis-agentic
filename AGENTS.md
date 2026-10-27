# Repository workflows

Use the relevant repository skill when changing the design system:

- Component creation or extension: read `skills/create-component/SKILL.md`.
- Token creation, naming, mappings, or migration: read `skills/create-token/SKILL.md`.
- Layouts and composed application patterns: read `skills/create-layout/SKILL.md`.

Each skill references `skills/references/design-contract.md`. Follow its strict Primitive → Semantic → Group dependency rules, four semantic theme/mode mappings, and family-relative naming conventions. Component styling consumes group tokens. Keep Base UI behavior independent of styling.

Storybook renders the skill files directly under Agentic Skills. Edit the source skill and shared contract rather than creating a separate copy of the instructions.
