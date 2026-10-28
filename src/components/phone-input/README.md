# PhoneInput

Edit raw telephone text with explicit country context and separate metadata-backed formatting/parse candidates.

## Usage and ownership

Keep controlled or uncontrolled raw telephone text while typing and by default on blur. The named tel input submits the displayed raw draft once; parsing does not silently replace it with E.164.

Maintain independent country/defaultCountry state (US by default). Limit choices to countries and require that list to include the selected country. Display localized region names and calling codes with a distinct control id. A country change does not rewrite the number.

Parse the entire draft with extract=false using the chosen default country; explicit international prefixes can resolve another country. Return raw, E.164 candidate, extension, resolved country, formatted text, possible and metadata-valid flags separately.

On editable input blur, invoke the caller blur handler first and respect preventDefault. Emit onValueCommit with the parsed raw candidate. Only when formatOnBlur is opted in and the parsed number is possible, request normalized national/international display through onValueChange.

Forward native input ref, name/form, change callbacks and TextInput Field association. The country Select has a separate id and no duplicate phone form name; disabled/readOnly applies to both controls.

Choose country coverage, metadata/update policy, accepted formats, extensions and storage representation. Metadata validity does not prove that a number is allocated, reachable or owned by the user. Own verification and consent flows.

Supply a visible standalone label, an enclosing Field label, or an accessible name. Field associates help/error text. Use the input ref for deliberate focus handoffs; do not fabricate roles for native controls. Default values initialize state; these wrappers do not add native form-reset synchronization.

## Boundaries

Uses the installed libphonenumber-js/max metadata snapshot, not a live numbering-plan service. It does not support every historical/future numbering exception.

E.164 excludes extensions; the callback reports extensions separately. No reachability, SMS delivery, identity verification or country auto-selection is supplied.

## Styling and verification

Owned styles use only input group tokens; actual nested shared components retain their own group. Stories include an args-driven Playground, populated annotated Anatomy and interaction examples. Unit tests cover parsing/render invariants. `scripts/fixtures/complete-inputs/verify.mjs` exercises actual browser input behavior and eight theme/mode/width combinations; consult its generated report for the result rather than assuming the script passes. Native OS picker/autofill services are not automated by that fixture.
