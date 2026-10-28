# Independent Relay page experiment

Two agents independently implemented only the Requests page from the same brief, project patterns, local dataset and installed kit. The shell, Customers page and package were supplied. Both original candidates passed the measured checks; A was selected as the default because the evidence did not favor B. This is a bounded consumer experiment, not proof that arbitrary generated screens are correct.

| Original candidate | Source SHA-256 | Type check / installed pattern policy | Browser / axe |
| --- | --- | --- | --- |
| A | `258da17c7a7a772381cad5f298cc2749c3559022ba99c2503a35c58413991288` | Passed / passed | Passed; 10 scans, 0 violations |
| B | `1606a84c92b84e7f8919be308b3b782b83111a91101d5f41216576b512a67fe3` | Passed / passed | Passed; 10 scans, 0 violations |

Browser coverage includes matching header/search geometry and typography across Requests/Customers in light/dark at 1440px and 390px, page containment, combined filters, empty results, page size, mode-preserved state, keyboard details and focus return, duplicate-label feedback, label persistence, invalid creation, customer selection, cancellation and persisted creation. These checks do not establish complete visual quality or accessibility.

The initial sidebar contrast failures sampled a running theme/route transition. Waiting for fonts and finite animations removed the sampling race; axe rules and thresholds were retained. The open-modal test also needed to inspect the background grid with `includeHidden`, because the modal correctly hides it from the accessibility tree. [The investigation](contrast-investigation.json) preserves before/after observations.

Visual inspection found the same two shortcomings in both originals: header metadata showed a bare count, and long Request titles clipped without ellipsis. B changed ID/title order, priority styling and description length, but did not fix those shortcomings. After preserving the original sources and selecting A, the final example gained a shared visible count label and constrained title ellipsis while retaining full text in the accessible row name, hover title and detail dialog. [Post-selection changes](post-selection.json) record the new source hashes separately; the final installed-kit runner writes `final-consumer-report.json` after successful verification.

Cancellation revealed an underspecified product decision: A clears an abandoned draft; B retains it on reopen. Both close without creating a record, as required. A's discard behavior remains in the selected example; future product policy should explicitly choose retention, discard or an unsaved-work confirmation.

Original sources are preserved as `candidate-a/requests.tsx.txt` and `candidate-b/requests.tsx.txt`. Each folder includes its static checks, browser report and screenshots. [Comparison](comparison.json) records observations and limits; [immutable inputs](inputs/independent-inputs.json) and [integrity metadata](inputs/integrity.json) identify the exact kit, brief, policy, shared sources and tested distribution assets. `inputs/verify-relay.mjs.txt` is the frozen original verification harness. The current harness adds an explicit `--review-presentation` mode for the final example without changing that archived harness.

The original kit tarball SHA-256 is `65d0d66bb7649998ab0a31ed8b2567ef5ff45f329f86943595cc791e70a27d31`; kit integrity SHA-256 is `52c5d4692b35c587bb553af15a9b1ed6de05547d5d6fca2abfb5abde24dc8b5a`. The profile is Atlas `v1-b1dee001`, registry revision 2. A local dependency snapshot was copied, so a clean registry installation is unverified. Screenshots are evidence, not approved visual regression baselines. The demo has no backend, live telemetry or production integration.
