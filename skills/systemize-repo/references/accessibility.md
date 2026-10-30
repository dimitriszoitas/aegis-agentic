# Accessibility targets

Use this when selecting the systemization target or assessing a design change. These are workflow targets stored in the project record. They are not a new Aegis profile field, an automatic high-contrast mode, or evidence of conformance merely because a target was selected.

| Target            | Text                                                                                                                                                                             | Borders and other requirements                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `normal` (Normal) | Require readable text at 4.5:1, or 3:1 for large text, including placeholders and disabled text. Correct failing text while preserving the language where possible. | Preserve subtle border treatments. Record insufficient essential-boundary/state contrast as a gap; do not call it AA compliant. Retain keyboard access, visible focus and accessible names. |
| `AA`              | Minimum AA text contrast.                                                                                                                                                        | Target all applicable WCAG 2.2 A and AA criteria. Essential component/state cues and meaningful graphics need 3:1 against adjacent colors. Decorative borders may remain subtle.            |
| `AAA`             | Enhanced text contrast: 7:1, or 4.5:1 for large text, with the criterion's actual exceptions.                                                                                    | Target applicable A, AA and AAA criteria, including additional focus, target-size and interaction requirements where relevant. AAA does not mean every border must reach 7:1.               |

The text thresholds and exceptions come from [Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [Contrast (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html). Large text is at least 18pt, or 14pt bold. Measure rendered styles and composited backgrounds, including opacity, gradients, overlays, hover, focus and selected states. Do not round a failing ratio up to a threshold.

The product rule that text stays readable applies to all three targets. It is deliberately stronger than the WCAG exemption for inactive controls: disabled labels and placeholders still meet the Normal text baseline, and stronger project targets remain in force. Express disabled state through behavior, semantics and supported visual treatments without fading the entire control below the text threshold. Test inherited and whole-control opacity, not just the uncomposited foreground/background tokens. Keep decorative icon treatments separate from readable text roles, and report remaining consumer opacity overrides as open work.

## Classify the border's role

[Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) concerns information needed to identify controls, states and meaningful graphics. An input boundary may be essential if it is the only cue that makes the input identifiable. A divider between already distinct content groups may be decorative. A control with sufficient identifying text, icon or surface contrast does not automatically need a stronger border.

Record the actual role, adjacent colors and alternative identifying cues before changing a border. Check marks and selection indicators carry state; do not treat them as decoration. Normal permits subtle essential borders but records their failure explicitly. Never describe a sub-threshold essential cue as “slightly AA” or “borderline compliant.” Decorative borders can remain low contrast at every target when they are not needed to convey information.

## Apply the target without erasing design intent

The selected target authorizes necessary contrast and accessibility corrections within the migration scope. Record each intentional difference from the baseline and its criterion. Preserve anatomy, indicator placement, meaning and existing API contracts while changing the owning tokens or semantic implementation. Do not replace a trailing-check selector with leading checkboxes as an accessibility shortcut.

Keep targets independent of light/dark, Fundamental/Floating, density and responsive choices. Verify each supported combination and relevant state. Do not silently override a stronger existing project requirement with Normal, or downgrade a target to make checks pass. Where accessibility and preserved behavior conflict, fix semantics while retaining the intended task; record unresolved product decisions.

## Verification and claims

Build a criterion-level checklist from [WCAG 2.2](https://www.w3.org/TR/WCAG22/), scoped to the full pages and complete workflows being evaluated. Contrast is only one part. Include applicable structure/naming, keyboard, focus, reflow/zoom, text spacing, errors, status announcements, pointer targets, dragging alternatives, timing, motion, authentication and media obligations. Host content and workflows may require checks that a component library cannot supply.

Record `passed`, `failed`, `not-run` or `not-applicable`, with the criterion ID, affected scope, method, evidence and reason for any exclusion. Missing browser, screen-reader or other manual evidence remains not-run. Automated scans supplement manual interaction and assistive-technology review; a zero-issue scan is not full conformance.

Report the selected target separately from achieved results, for example “AA target; text checks passed in the inspected states; focus and complete-process review pending.” Only make a conformance claim when the [conformance requirements](https://www.w3.org/TR/WCAG22/#conformance-reqs) are met for the stated scope. Normal intentionally makes no WCAG level claim. A shared component cannot certify an entire consuming application, and AAA may require content/workflow changes beyond the available scope.
