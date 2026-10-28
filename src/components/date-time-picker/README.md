# DateTimePicker

Edit a local date/time string with an explicit displayed interpretation zone while leaving instant resolution to the host.

## Usage and ownership

Keep offset-free local date/time strings such as 2027-04-12T09:30 in a native datetime-local input. Never convert them to Date objects, offsets or UTC instants.

Require timeZone as local or an Intl-supported named zone; reject empty, unsupported and numeric-offset identifiers. Display the policy in a description associated with the input. timeZoneLabel can localize the entire explanation.

Pass min/max/step and inherited TextInput native props, value callbacks, ref, disabled/readOnly and name/form through. Merge the visible zone description with explicit and enclosing Field descriptions.

Resolve the entered wall time with the declared zone, including ambiguous or nonexistent daylight-saving times. Own zone changes, instant conversion, validation, storage and scheduling semantics; local explicitly means the device zone.

Supply a visible standalone label, an enclosing Field label, or an accessible name. Field associates help/error text. Use the input ref for deliberate focus handoffs; do not fabricate roles for native controls. Default values initialize state; these wrappers do not add native form-reset synchronization.

## Boundaries

Zone identifier support depends on the runtime Intl data. Displaying a zone does not make the native picker timezone-aware.

No calendar range, instant conversion or DST gap/overlap resolution is provided. Native presentation varies by browser.

## Styling and verification

Owned styles use only input group tokens; actual nested shared components retain their own group. Stories include an args-driven Playground, populated annotated Anatomy and interaction examples. Unit tests cover parsing/render invariants. `scripts/fixtures/complete-inputs/verify.mjs` exercises actual browser input behavior and eight theme/mode/width combinations; consult its generated report for the result rather than assuming the script passes. Native OS picker/autofill services are not automated by that fixture.
