# ColorPicker

Choose a hexadecimal RGB color, optionally with alpha, using editable text, named swatches and a native RGB picker.

## Usage and ownership

Accept #RGB/#RRGGBB, plus #RGBA/#RRGGBBAA only when alpha is enabled. Canonicalize accepted values to uppercase six/eight hex digits; RGB with alpha enabled receives FF. Reject unsupported committed values and swatches rather than evaluating arbitrary CSS.

Keep incomplete/invalid editable draft locally without replacing the committed color; expose parse feedback and aria-invalid. A valid changed draft commits on blur or non-composing Enter. Host controlled value changes replace stale drafts.

The native color picker edits RGB only and preserves the current alpha. Optional NumberInput maps a clamped 0–100 percentage to a rounded 8-bit alpha channel; this quantization is explicit, not arbitrary precision.

Render named actual Buttons with pressed state and safe decorative chips. The chip background is validated user-provided hexadecimal data; nested shared controls retain their own styling tokens.

Keep the optional form name on the hex text input only. Its native pattern blocks unsupported drafts on native validated submission. Auxiliary RGB and opacity controls have no duplicate name; opacity has a separate id inside Field.

Own palette policy, contrast evaluation, accessible color combinations, theme token mapping, persistence and consistent controlled alpha configuration. A parseable color is not an accessible theme certification.

Supply a visible standalone label, an enclosing Field label, or an accessible name. Field associates help/error text. Use the input ref for deliberate focus handoffs; do not fabricate roles for native controls. Default values initialize state; these wrappers do not add native form-reset synchronization.

## Boundaries

RGB hexadecimal only; no HSL/HSV/Lab/OKLCH gamut tools, eyedropper or gradient editing. The browser owns the native chooser UI.

Invalid draft text stays on the named input until corrected; host code that bypasses native validation must validate its payload. Disabling alpha requires a compatible RGB controlled value.

## Styling and verification

Owned styles use only input group tokens; actual nested shared components retain their own group. Stories include an args-driven Playground, populated annotated Anatomy and interaction examples. Unit tests cover parsing/render invariants. `scripts/fixtures/complete-inputs/verify.mjs` exercises actual browser input behavior and eight theme/mode/width combinations; consult its generated report for the result rather than assuming the script passes. Native OS picker/autofill services are not automated by that fixture.
