# NumberInput

Use NumberInput when people enter a numeric quantity and stepping or locale-aware formatting helps. Use TextInput for numeric identifiers such as account numbers, phone numbers or postal codes: their leading zeroes and exact text matter.

```tsx
const [seats, setSeats] = useState<number | null>(4);
<Field label="Seats" helpText="Between 1 and 50 seats.">
  <NumberInput name="seats" min={1} max={50} step={1} value={seats} onValueChange={setSeats} />
</Field>;
```

`value` selects controlled behavior; update it from `onValueChange`. `defaultValue` initializes uncontrolled state. Empty is `null`, never an implicit zero. External controlled updates replace the displayed number. Treat `defaultValue` as initialization; this wrapper does not add a native form-reset listener.

`onValueChange(value, details)` and `onValueCommitted(value, details)` preserve the Base UI event details. Change details include a reason and cancellation method. Committing typically happens on blur after typing, immediately for keyboard steps, or at the end of a stepper press. A commit callback is an interaction signal, not proof of application validation or persistence. Avoid canceling a change and then updating controlled state to the canceled value.

Arrow Up/Down use `step`; Shift uses `largeStep`, Alt uses `smallStep`. Home and End use bounds when supplied. `step="any"` disables native step validation; interactive stepping uses Base UI's base amount of 1. `snapOnStep` enables step snapping. If form step validation is needed, supply an explicit `min` along with `step`. Pointer/touch step buttons are optional with `showSteppers` and remain outside the Tab sequence. Localize their names with `decrementLabel` and `incrementLabel` when necessary. The visible input is a text input with Base UI's number-field role description; do not override its role to advertise unsupported spinbutton attributes.

`min` and `max` bound stepping. By default Base UI also clamps parsed entry; the uncommitted text can temporarily differ from the numeric state until formatting on blur. `allowOutOfRange` permits direct entry outside bounds for native validity handling while stepping remains bounded. It does not create error text. `invalid` and `Field.error` are host-supplied presentation and description state. Decide when to validate and provide a helpful recovery message.

`locale` and `format` use `Intl.NumberFormat`; choose an explicit locale when server and client defaults may differ. The visible localized string is separate from the raw numeric form value. Set `name` and optionally `form` for Base UI's associated numeric input; do not add a second named input. A forwarded ref targets the visible input, while `hiddenInputRef` accesses the form-associated input. Formatting options that specify precision can round committed values. Currency/percent formatting does not provide decimal accounting, exchange conversion, financial validation or arbitrary-precision arithmetic. Choose valid finite bounds, positive step amounts and valid Intl options. Avoid compact notation when values must round-trip through editing.

`readOnly` preserves focus and value inspection while preventing editing; `disabled` makes the field unavailable. Use a visible `label`, an enclosing Field, or an accessible name. Field help and error descriptions merge with an explicit `aria-describedby` value. Placeholder text is not a label.

Owned layout and input styling consume `--group-input-*`. Actual nested IconButton components keep `--group-trigger-*`; NumberInput does not restyle their internals. Sizes remain consistent across both themes and modes, with keyboard-only focus treatment and forced-colors support. The local anatomy specimen identifies rendered parts and host-owned help/error text. Stories exercise keyboard bounds, nullable controlled state, callbacks, locale/form submission, locked states and callback cancellation; a linked story is not itself a current passing browser report.
