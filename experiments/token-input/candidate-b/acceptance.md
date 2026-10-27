# Independent candidate B: TokenInput

Status: experimental candidate evidence only; not an approved component, production implementation, or accessibility certification. Author: Independent agent B. Proposal: `candidate-b-token-input`; intended canonical responsibility: `token-input`.

## Need and discovery

A project editor needs to enter several free-text labels, validate each value, correct failures without losing input, remove labels, paste batches, and optionally pick suggestions. Committed labels form the primary data; draft text is transient and must survive blur, validation failures, and delayed parent responses. The portable kit's `build-ui` and `extend-design-language` skills and shared Agentic contract were read. Discovery searched name, aliases, and responsibilities in the kit registry. Field supplies label/description/error association and Button supplies native action behavior; neither owns a multiple-value draft, batch validation, or duplicate rules. Dialog, Card, and dataset filtering have different responsibilities. The kit's two existing TokenInput entries are explicitly illustrative fixtures, not approved implementations or independent evidence. This candidate follows the existing candidate TokenInput contract and proposes a coherent new control responsibility; it does not create a new visual token family.

Inputs are pinned to kit `0.1.0-experiment.0`, registry revision `1`, compiler version `1`, kit baseline `12e4f6b218c6cc68aba303feec211ba91aaeb20a`, and target profile `aegis` (Aegis Original), profile version `1`, manifest fingerprint `v1-638d0fd6`. The model has no visual output and does not compile or render the target profile.

## Decisions and rationale

- **Commit:** Enter explicitly commits. A typed comma separates values but does not commit on its own. Commas, line breaks, and tabs delimit pasted or Enter-submitted batches; empty segments are ignored. The entire resulting pasted draft, including edits at the input selection, is validated immediately. The adapter supplies that resulting draft as `nextDraft`.
- **Blur:** `commitOnBlur: false`. Tab, clicking elsewhere, and moving to removal controls preserve the draft and errors. This lets users inspect other fields or select a suggestion without accidentally accepting an unfinished label. Explicit Enter and paste are the commit actions.
- **Duplicates:** `duplicatePolicy: ignore`, with a polite status explaining the count skipped. Equality uses trim, Unicode NFC, then locale-independent JavaScript lowercase; the first accepted spelling is retained. Re-pasting labels is idempotent. Ignoring duplicates avoids making existing labels block a useful batch, while reporting skipped values prevents silent uncertainty. Unicode case folding is intentionally limited to JavaScript lowercase, not language-specific collation.
- **Validation:** Run the caller's synchronous validator on every normalized nonempty candidate. Any invalid entry or validator exception rejects the entire batch, retains its exact draft, reports each failure, and emits no value change. Atomic rejection makes correction predictable and avoids a mixed committed/uncommitted paste. Exceptions surface a retry message; asynchronous validators are outside this API.
- **Controlled state:** The parent owns `value`. A successful change emits a request containing `nextValue`; the model does not change committed values until `sync-value`. The draft clears only when the parent supplies the requested values and it has not been edited since the request. A parent refusal or substitution preserves the draft. One value request can be pending at a time; draft editing remains available. The parent must acknowledge even a refused request with a synchronization event. External parent values must already be normalized, nonempty, delimiter-free, and unique.
- **Free text and suggestions:** Suggestions are optional and never form an allowlist. With no active suggestion, Enter accepts any valid new text. ArrowUp/ArrowDown selects a suggestion; Enter or an explicit selection requests it. Escape closes suggestions and keeps text. Selecting an invalid suggestion preserves the user's actual typed draft and identifies the rejected suggestion in the error.
- **Scope:** Commas, tabs, and line breaks are reserved delimiters and cannot occur inside a single label. Quoted CSV, asynchronous validation, editing a committed token in place, and uncontrolled values are outside this candidate's API. Those changes require an explicit reviewed extension.

## Public interface and implementation boundary

The proposed future view takes `value: string[]`, `onValueChange(nextValue, details)`, required stable `id` and visible `label`, `disabled?: boolean`, `suggestions?: string[]`, and `validateValue?: (normalizedValue) => string | null`. The validator returns a message for invalid values and null for valid values. Native input and native remove buttons provide ordinary behavior; a real suggestion view must use an applicable approved composite primitive and its accessibility APIs. This model specifies interactions without replacing that behavior provider.

`model.mjs` exports `createState`, `reduce`, `visibleSuggestions`, `accessibility`, `normalize`, and `identity`. `reduce(state, event, { validate })` returns `{ state, effects, preventDefault }`. A `value-change-request` effect contains the proposed array, request id, and reason. `sync-value` applies parent data. Other events cover input, paste, removal, focus, blur, key presses, IME composition, disabled state, and suggestion updates. The adapter must compute `nextDraft` at the actual selection during paste, forward actual composition state, honor `preventDefault`, consume focus requests without stealing focus after blur, and connect effects to the controlled parent.

Anatomy: visible label, input, token list with named remove buttons, description, validation error, polite status, and optional listbox. Input and outer control styling consume the existing `input` group. A nested shared Button retains `trigger` group ownership. Existing Primitive → Semantic → Group mappings remain authoritative for all four theme/presentation mappings; no new tokens or hardcoded visual defaults are proposed. Token wrapping, narrow widths, focus rings, both modes, and both presentations require a later rendered implementation and inspection.

## Acceptance scenarios

These expectations were written with corresponding behavioral tests. They are model evidence, not browser execution.

| Scenario | Required positive or negative result |
| --- | --- |
| Enter `  Café  ` | Request `Café` once; retain original draft until parent acceptance; then show one normalized label and clear draft. |
| Enter whitespace only | Add no empty token and emit no change. |
| Type `alpha,beta` | A comma key alone does not commit; Enter requests two ordered labels. |
| Paste `alpha,\r\nbeta\tgamma,, ` | Request three labels in order, skipping empty pieces. |
| Paste over selected text in `project old` | Use the actual resulting text such as `project new, other`; never append to stale input. |
| Paste `valid, !bad\r\nanother` with `!` disallowed | Request no labels; preserve exact full draft; identify `!bad`; correcting it and pressing Enter retries the full batch. |
| Several invalid values | Evaluate every normalized candidate and report all invalid values. |
| Validator throws | Preserve draft and values; request no change; show retry feedback. |
| Existing `Café`, paste `CAFÉ, New, new, Other` | Keep existing spelling; request `New` and `Other` once; announce two skipped duplicates after acceptance. |
| Submit an existing label only | Emit no value request; clear submitted draft and announce one skipped duplicate. |
| Tab or blur on unfinished/invalid text | Do not commit, delete, or clear the error/draft. Allow normal Tab movement. |
| Backspace with nonempty input | Use native text editing; never request token removal. |
| Backspace with empty input | First focus the last remove control without deleting. Another explicit activation can request its removal. |
| Arrow navigation among remove controls | ArrowLeft/ArrowRight navigate tokens and return to input; Enter, Space, Delete, or Backspace activate a focused remove control. |
| Remove the only token while draft exists | Request removal without clearing the draft; after acceptance focus the input. |
| Disabled | Input, paste, removal, suggestion selection, and keyboard actions do nothing; native input and remove metadata are disabled; parent synchronization still applies. |
| IME Enter | While composition is active, `isComposing` is true, or key code is 229, do not commit or prevent native composition; Enter afterward can commit. |
| Parent refuses or replaces a requested value | Apply parent authority, preserve draft, clear pending request, and permit retry. |
| Parent response delayed | Do not emit duplicate requests; let the user continue typing; acceptance of the older request never clears newer draft text. |
| Blur/disable before delayed acceptance | Apply accepted values without moving focus back into the control. |
| Suggestions provided | Up/Down selects visible suggestions; Enter requests selection; a new free-text value not suggested is still permitted. |
| Escape while suggestions open | Close only suggestions, retain draft and tokens; subsequent Enter can commit free text. |
| Suggestion fails validation | Preserve actual typed input and report the selected invalid value. |
| Programmatic naming | Visible label points to input id; each native remove button says `Remove <value>`; error and hint ids are in `aria-describedby`. |
| Suggestion accessibility metadata | Combobox is present only when suggestions are configured; expanded, controls, listbox option ids, and active descendant agree. |
| Invalid controlled input array | Reject empty, untrimmed, unnormalized, delimiter-containing, or duplicate values immediately; never silently rewrite parent state. |
| Purity | Reducer leaves input state and parent arrays unchanged. |

## Required review before promotion

No registry submission, promotion, source change, or release was performed. The proposal schema cannot carry rationale or public API, so this document accompanies it rather than adding unsupported proposal fields. The portable runtime validates the proposal against registry revision 1. The executable behavioral tests cover state decisions, not a rendered control.

Unverified: browser focus execution and Tab order; browser paste selection integration; actual screen-reader announcements; actual Base UI integration; native form behavior; pointer/touch behavior; visual overflow and narrow widths; focus-visible rendering; contrast; all four theme/presentation combinations; theme changes preserving live UI draft/selection/focus. These require the production candidate and visual/accessibility review. Passing model tests or schema validation must not be used as proof of those properties.
