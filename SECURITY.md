# Security policy

Aegis Agentic is an experimental beta. The current `beta` branch receives fixes as a pet project; there is no guaranteed response time, supported production release or independent security certification.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/dimitriszoitas/aegis-agentic/security/advisories/new). Include the affected commit, reproduction steps and impact. Do not post credentials, private workspace data or exploitable security details in public issues. If a credential has leaked, revoke or rotate it; deleting a file does not remove it from Git history.

## Intended boundaries

- Storybook and Forma contain interactive demonstrations and local sample data. They do not provide production authentication, billing, payment processing or an application backend. Avoid entering sensitive information into public demos; browser-local persistence is visible to other code running on the same origin.
- Development previews and the single-project service default to loopback. Deliberately exposing a development server is separate from deploying a supported service. The shared workspace service requires authentication and additional configuration for non-loopback use; follow its operational guide and protect its signing keys.
- AI providers and usage collection are opt-in. Keep provider credentials server-side and out of browser bundles, prompts, screenshots, logs and Git. Inspect what evidence is sent before enabling a provider. No public repository credential or shared model account is supplied.
- Source repair is a bounded proposal workflow. Its current policy covers specific MetricCard/Sparkline CSS containment failures, with verification before review. It does not automatically merge, publish releases or update consumer projects. Broader edits need a separately scoped policy and acceptance evidence.
- Pin reviewed component, kit and profile versions. A content hash detects changed bytes; it does not establish trust, authorization, accessibility or safety. Verify signed releases against an explicitly trusted key.
- Local workspace state, signing keys, environment files and repair working directories are ignored by Git. Inspect staged files before every contribution; ignore rules alone cannot protect a credential already tracked in history.

GitHub security scanning and dependency alerts supplement review and tests. A passing scan is evidence within that tool's scope, not a guarantee that every vulnerability has been found.
