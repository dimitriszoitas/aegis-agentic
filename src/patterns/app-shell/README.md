# AppShell

An application shell with persistent page content, accessible landmarks and a shared mobile navigation sheet.

Supply navigation as a renderer of real links/actions and close after successful host navigation.
Place one page inside main and use PageLayout for its body.
Keep persistent navigation state above the shell because its responsive placement remounts the slot.

The host owns navigation destinations and route state, brand/header/footer content, main page content and route focus, state retained across navigation-slot remounts. The pattern owns application landmark structure, container-responsive navigation placement, mobile trigger and responsive focus handoff.

Implementation boundaries:

- No router, authorization, active-route matching, persisted preferences or page title management.
- Navigation content remounts when switching between desktop and mobile surfaces; main content remains mounted.
- The shell does not clamp overflowing arbitrary host widgets; wide tables should own their scroll region.

Owned styles consume only the `application` group. Real nested shared components retain their existing token owners. Geometry does not branch on theme or mode.

Playground uses the actual public API. Interaction stories exercise local behavior; Anatomy uses actual DOM targets. Focused tests and `scripts/verify-complete-patterns-source.mjs` provide bounded checks, not certification of arbitrary application integrations.
