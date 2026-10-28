# TimePicker

Enter a standalone local time through the native browser time input without attaching a date or time zone.

## Usage and ownership

Use a native time input. Values are offset-free HH:mm or HH:mm:ss strings; empty remains an empty string. Add no Date object, midnight fallback or timezone conversion.

Pass min/max and step directly to the input; step defaults to 60 seconds. The browser owns segment editing, localized presentation, picker availability and native validity.

Preserve TextInput controlled/defaultValue behavior, both change callbacks, forwarded input ref, name/form and Field labeling/descriptions. Disabled and readOnly retain native behavior.

Supply valid native time values, meaningful constraints and an appropriate seconds step. Own scheduling rules, server validation and any interpretation with a date or time zone.

Supply a visible standalone label, an enclosing Field label, or an accessible name. Field associates help/error text. Use the input ref for deliberate focus handoffs; do not fabricate roles for native controls. Default values initialize state; these wrappers do not add native form-reset synchronization.

## Boundaries

Native picker appearance and available controls vary by browser and platform.

No custom clock dial, timezone conversion, duration arithmetic, range selection or scheduling validation.

## Styling and verification

Owned styles use only input group tokens; actual nested shared components retain their own group. Stories include an args-driven Playground, populated annotated Anatomy and interaction examples. Unit tests cover parsing/render invariants. `scripts/fixtures/complete-inputs/verify.mjs` exercises actual browser input behavior and eight theme/mode/width combinations; consult its generated report for the result rather than assuming the script passes. Native OS picker/autofill services are not automated by that fixture.
