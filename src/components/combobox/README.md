# Combobox

Search and choose one stable option ID while preserving independent query and selected value state.

## Usage and ownership

Pass selected value/defaultValue and query inputValue/defaultInputValue independently to Base UI; selected value is string or null. A typed query is not a free-form submitted selection.

Pass value, input-value, open and open-completion callbacks without dropping primitive details or cancellation. Delegate list navigation, selection, dismissal and focus to Base UI.

Cancelling a selection preserves the selected ID. The active search query stays visible while the popup remains open; dismissal requests restoration of the selected label through the input-value callback. A host controlling `inputValue` owns accepting that callback, and the host may also cancel an input-value change to retain its query. Keep the `options` identity stable between real dataset changes; Aegis preserves the derived item collection across unrelated rerenders.

Local matching searches option labels, descriptions and keywords. filterOptions=false delegates the result set to the host. loading announces status and disables current result selection; the component issues no network requests.

Require unique nonempty option IDs. selectedLabel supplies a display fallback when a remote selected ID is absent from the current result list; the underlying selected ID remains unchanged.

Use Field association on the visible input and pass name/form/required/disabled/readOnly to Base UI. Its associated form control submits the selected ID once; the forwarded ref targets the visible input.

Own request debouncing, cancellation, races, caching, loading/error recovery and durable selection labels. Keep controlled query and selected value updates separate and inspect callback reasons before issuing requests.

Supply a visible standalone label, an enclosing Field label, or an accessible name. Field associates help/error text. Use the input ref for deliberate focus handoffs; do not fabricate roles for native controls. Default values initialize state; these wrappers do not add native form-reset synchronization.

## Boundaries

Single selection only; use MultiCombobox for multiple values. No free-solo creation or virtualized remote dataset is provided.

No asynchronous fetching, server validation or automatic error recovery. Remote selected labels must remain available through options or selectedLabel.

## Styling and verification

Owned styles use only input group tokens; actual nested shared components retain their own group. Stories include an args-driven Playground, populated annotated Anatomy and interaction examples. Unit tests cover parsing/render invariants. `scripts/fixtures/complete-inputs/verify.mjs` exercises actual browser input behavior and eight theme/mode/width combinations; consult its generated report for the result rather than assuming the script passes. Native OS picker/autofill services are not automated by that fixture.
