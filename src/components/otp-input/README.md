# OtpInput

Edit a bounded complete one-time code in one native input with paste, autocomplete and native form participation.

## Usage and ownership

Render one real native input with autocomplete one-time-code, numeric or text inputMode, length constraints and one optional form name. Do not create separate character cells with fabricated accessibility semantics.

Numeric mode keeps ASCII digits; alphanumeric mode uppercases ASCII letters and keeps ASCII digits. Paste normalizes the full clipboard text before length truncation and replaces the current selection through an ordinary native input event.

Require an integer length from 1 through 32. Empty is an empty string; leading zeroes are retained. Apply normalization to initial, controlled and edited candidates.

Call onComplete for a changed candidate whose normalized length is complete. It does not submit a form, authenticate a person, verify a code or mark a code consumed.

Preserve native TextInput ref, name/form, change callbacks, readOnly/disabled, required and Field association. masked changes only text visibility.

Own code verification, expiry, retry limits, resend flow, authentication, secure handling and error feedback. Treat one-time-code as an autofill hint whose actual support depends on browser/platform.

Supply a visible standalone label, an enclosing Field label, or an accessible name. Field associates help/error text. Use the input ref for deliberate focus handoffs; do not fabricate roles for native controls. Default values initialize state; these wrappers do not add native form-reset synchronization.

## Boundaries

ASCII numeric/alphanumeric codes only; localized numerals and arbitrary Unicode code alphabets are not supported.

No operating-system SMS retrieval, automatic submission, authentication or code security policy.

## Styling and verification

Owned styles use only input group tokens; actual nested shared components retain their own group. Stories include an args-driven Playground, populated annotated Anatomy and interaction examples. Unit tests cover parsing/render invariants. `scripts/fixtures/complete-inputs/verify.mjs` exercises actual browser input behavior and eight theme/mode/width combinations; consult its generated report for the result rather than assuming the script passes. Native OS picker/autofill services are not automated by that fixture.
