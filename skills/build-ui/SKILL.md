---
name: build-ui
description: Build a React interface from an installed Aegis Agentic kit using a locked profile, canonical contracts and existing behavioral primitives.
---

# Build UI

Read [the agentic contract](../references/agentic-contract.md), including its [product pattern decisions](../references/agentic-contract.md#product-pattern-decisions), before composing pages. Locate `kit.json`, the selected profile and registry in the installed kit. Run its CLI help rather than guessing command flags.

For page structure, read [Constructing a page](../references/page-composition.md). Select a task-appropriate archetype, reuse the product's chosen patterns, and distinguish enforceable rules from project defaults and visual judgments.

1. Record the task, main action, information hierarchy, states and responsive requirements. Resolve ambiguous behavior through approved defaults or a concise product question.
2. Load the product’s saved project recipes when present; validate and resolve its archetype using `project-recipes validate` and `project-recipes resolve`. Use `discover behavior` for intended interaction, including whether a panel must push results or act as a modal. Respect the resolved host state, import bindings and allowed variants. Search the registry for the task/capabilities. Inspect the matching catalogue entry with `contracts get`, then load relevant contracts and examples. Apply its component, host and design responsibilities as described in the shared agentic contract. Use `reference-api/ai/index.json` for source-derived API discovery and follow its component links; these facts do not certify runtime behavior. Reuse canonical components, especially complex interactions.
3. Choose and validate a composition specification. Pin profile, registry and compiler versions. The same prompt is not a reproducibility artifact; the accepted spec is.
4. Generate normal application code referencing shared styles, recipes and public implementations. Keep API data, routing and persistence explicit. Load the compiled profile after base Aegis styles and apply its profile attribute to the root so portals inherit it.
5. If a capability is missing, follow `../extend-design-language/SKILL.md` before adding a public entry. Local candidates remain experimental.
6. Validate types, tier ownership, states, keyboard/focus and responsive behavior; inspect both modes and both presentations. Keep drafts unchanged through theme switches. Report evidence and limitations.

Do not execute arbitrary model output inside the playground. Do not present fixture output as live AI generation or claim that automated checks establish complete design quality.

Infrastructure consumers also pin their project release and approved profile. Application rendering does not require the project service or an AI provider. Add usage instrumentation only under an explicit project policy: the client is disabled by default, records allowlisted component facts, and flushes only when called. Keep content, URLs, user identity and unrestricted prop values out of events. Check service health before interpreting usage or update recommendations; local file coordination is not hosted multi-user authorization.
