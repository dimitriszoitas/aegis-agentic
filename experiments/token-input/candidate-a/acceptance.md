# TokenInput — independent candidate A

Status: experimental behavioral proposal, **not approved production code**. Author: Independent agent A. Candidate: `candidate-a-token-input`. Proposed canonical responsibility: `token-input`. No rendered UI, CSS, React component, browser run, screen-reader review or visual verification is included.

## Responsibility and discovery

Allow a person to enter, validate and remove multiple project labels without losing an unfinished or rejected draft. The host owns label policy, persistence and optional suggestions. The portable kit has canonical Field (label, description and validation association) and Button (activation and disabled behavior), but neither owns a collection of editable values. Dataset filtering applies queries; it does not manage a label collection. This is one new coherent responsibility composed with Field and Button, not an extension of filtering.

The kit's TokenInput contract is a candidate, and its two bundled registry proposals are explicitly illustrative fixtures. They are discovery material, not independent test evidence. No original application source, outside registry, or peer candidate was inspected. No shared registry was written, submitted, consolidated or promoted.

## Decisions and rationale

| Decision | Contract and reason |
| --- | --- |
| Explicit commitment | Enter or a visible “Add labels” button commits. Comma is literal label content, allowing names such as “Design, research”. Shift+Enter inserts a line. |
| No commit on blur | Moving to another control is navigation rather than consent to add an unfinished label. Blur preserves draft and existing errors; it never validates or commits. |
| Reject duplicates | A duplicate is an actionable error; silent ignoring makes a paste appear successful when its contents were not accepted. Reject against committed values and within the current batch. Preserve all draft text. |
| Duplicate identity | Compare trimmed NFC-normalized strings using JavaScript `toLowerCase()`, with no locale dependency. Preserve normalized display spelling and case. This is intentionally not full Unicode case folding; for example ß and ss remain different. |
| Transactional paste | Newline, CRLF, CR and tab separate labels. Blank segments are skipped. Commas remain text. A paste containing a separator attempts to add the full resulting draft as one transaction. One invalid or duplicate item rejects every item, reports all errors and retains exact raw text. No CSV quoting or comma splitting is implied. |
| Editable batch recovery | Use a native textarea as the input slot, so pasted newlines and tabs survive errors exactly and users can edit the failed batch. A single-line paste edits the draft without committing. Paste replaces the current selection before parsing. |
| Suggestions | Optional, visibly labelled group of ordinary buttons, with native Tab/Enter/Space behavior. No bespoke combobox or popup navigation is claimed. A suggestion is subject to the same validation and duplicate rules and does not replace an unrelated draft. Free text remains available even when suggestions exist. |
| Validation | Trim and normalize before calling the host's synchronous `validate(value)`; null, undefined or empty string accepts, a nonempty message rejects. Thrown errors or non-string results fail closed. Async validators are outside this candidate's API. No project-specific content rule is built in. |
| Controlled changes | The model emits a request and retains the submitted draft and authoritative old value until the host explicitly accepts or rejects. A request identifier prevents stale acknowledgments from overwriting newer state. |

## Proposed public contract and model adapter

The model exports `createState`, `reduce`, `accessibility`, `normalize`, `identity` and the default `behavior`. It uses no UI framework and performs no side effects. A call returns `{ state, effects, preventDefault? }`; effects are declarative data for a host adapter, not callbacks executed by the model.

Creation accepts `value: string[]`, `controlled: boolean`, `disabled: boolean`, a required nonempty visible `label` (default “Project labels”) and stable `id` (default “project-labels”). Committed initial/external values must be unique, nonempty trimmed NFC strings. Invalid host values fail explicitly rather than being silently changed. The host supplies `validate` and `suggestions: string[]` to transitions. Suggestions must be static valid strings at the adapter boundary; user selection is validated before addition. This candidate does not invent custom visual props, asynchronous fetching or persistence.

Events: `input`, `paste` (text and selection start/end), `commit`, `key`, `composition-start`, `composition-end`, `blur`, `focus-input`, `focus-remove`, `remove`, `suggest`, `disabled`, `sync`, `reject`. Character editing, Tab navigation and Shift+Enter remain native. The adapter sends an `input` event after native editing and uses `preventDefault` where returned. Render the visible Add button as `commit`, suggestion button as `suggest` and token removal button as `remove`. Avoid binding both the reducer's explicit key activation and the browser's synthesized click for the same action; prevent the handled key's default. Model indexes refer to the current rendered value array.

An uncontrolled transition updates the model's `value` directly. A controlled transition emits `change-request {requestId, value, reason}` without changing its authoritative `value`. The adapter forwards this as the host's `onValueChange(nextValues, details)` request. The host must then send `sync {value: nextValues, requestId}` to acknowledge or `reject {requestId, message?}` to decline, even if its old value is unchanged. This explicit protocol is a proposed adapter requirement, **not a claim of compatibility with an existing React API**. An uncorrelated external update uses `sync {value}` and cancels an in-flight transaction with a conflict message while retaining the draft. An acknowledgment with different values also preserves the draft and reports a conflict. No draft is discarded because a request merely fired.

Only one controlled mutation may be pending. Add, remove and suggestion actions are blocked while pending; the draft remains editable. A matching acknowledgment clears only an unchanged submitted draft. Edits made after submission survive. Rejection unlocks retry. A late acknowledgment does not request focus after the user has left the control or disabled it. A production adapter must settle requests; unresolved parent requests remain visibly pending and must not be treated as successful.

## Anatomy, keyboard and styling obligations

Use Field for visible label, help and error associations; use native textarea and ordinary buttons for their native behavior. Committed labels are a named list. Every remove button is named “Remove label {value}”; every suggestion button “Add suggested label {value}”. Use `type="button"` to avoid accidental form submission. The textarea has an explicit label association, hint description, and `aria-invalid` plus error description when invalid. Use one polite status region to announce action results and validation errors; avoid duplicate live announcements. Show error text and pending status visually as well. When suggestions are omitted, omit their group entirely.

Backspace while editing text remains native and never deletes a label. With an empty draft, the first Backspace focuses the last remove button without deleting. Enter, Space, Delete or another Backspace on that explicitly focused remove button removes its label. After removal, focus the next surviving remove button at the same position, otherwise the previous one, otherwise the textarea. Native Tab and Shift+Tab traverse controls. IME composition Enter never commits; Shift+Enter remains available for a new draft line. Disabled state blocks all user edits and actions; external controlled updates remain possible.

TokenInput owns the **input group**. Real nested Field/Button implementations retain their own owning group tokens. Production styling must consume group tokens and follow Primitive → Semantic → Group → Consumer, with all four Fundamental/Fundamental Floating × light/dark semantic mappings. No new tokens, raw colors, geometry defaults or profile overrides are introduced by this behavior-only model. Profile/density changes must preserve draft, committed values, pending state and focus. Focus indicators must be keyboard-visible, long labels and failed batches must wrap without clipping, and controls must remain usable at narrow widths. These are review obligations, not model test claims.

## Executable acceptance scenarios

`model.test.mjs` provides concrete positive and negative assertions, including:

| Scenario | Expected result |
| --- | --- |
| Enter `  Project Phoenix  ` | Add `Project Phoenix`; clear draft only on local/acknowledged success. |
| Enter empty or whitespace text | No empty token; preserve raw text; show actionable error. |
| Host validator rejects `  Bad!  ` | Existing values unchanged; exact draft retained; no value-change request. |
| Correct `Bad!` to `Good` | Clear obsolete validation errors while editing; retry adds `Good`. |
| Existing `Design`; enter ` DESIGN ` | Reject duplicate; retain input and existing value. |
| Existing `Café`; enter decomposed `Café` | Reject equivalent Unicode value. |
| Type/paste `Design, research` | Keep comma in one label; comma key does not commit. |
| Blur valid or invalid draft | No commit, no loss of draft/error. |
| Paste ` Alpha\r\n\r\nBeta\t Gamma\n` | Atomically add Alpha, Beta, Gamma in order. |
| Paste into selected text | Replace exactly the selection, then parse the resulting draft. |
| Paste `Good\r\nBad!\tOther ` | Add nothing; preserve exact text; identify invalid second item. |
| Paste `Alpha\nALPHA` | Reject entire batch as duplicate. |
| Existing Alpha; paste `Beta\nalpha` | Reject entire batch; Beta is not partially added. |
| Two invalid pasted values | Return both errors with positions, not just the first. |
| Fix a failed batch and press Enter | Add corrected batch once without duplicating valid siblings. |
| Single-line paste | Edit draft only; Enter later commits. |
| Backspace with nonempty input | Native text edit; no token removal. |
| Backspace with empty input | First key focuses last removal control; explicit next activation removes. |
| Remove first/middle/last label | Preserve unrelated draft; focus next, previous or input as appropriate. |
| Invalid removal index | No mutation. |
| IME Enter / Shift+Enter | No accidental commit; composition end then Enter can add. |
| Paste while composing | Preserve draft; do not auto-commit. |
| Select valid suggestion | Add it while preserving unrelated draft. |
| Select invalid/duplicate suggestion | Apply ordinary validation/duplicate error; preserve draft. |
| Value absent from suggestions | Ignore forged suggestion activation, but permit it as typed free text. |
| Disabled user interaction | No input, paste, commit, removal or suggestion mutation. |
| Controlled commit | Emit request; retain old values and raw draft until matching acknowledgment. |
| Controlled rejection | Retain draft, show host message and permit retry with new request id. |
| Edit draft while awaiting acknowledgment | Keep newer draft after acceptance. |
| Second mutation while pending | No duplicate request; ordinary draft editing remains available. |
| Unrelated external value update | Adopt host values; cancel pending transaction; retain draft and report conflict. |
| Stale acknowledgment/rejection | Ignore it; never roll back the value. |
| Controlled remove | Retain old values until acceptance; retain input throughout. |
| Host update while disabled | Accept authoritative values without requesting focus. |
| Acceptance after blur | Preserve external focus. |
| Accessibility descriptors | Match visible label/input id, describe invalid input, and name every button. |
| Validator throws or returns a Promise | Fail closed; no change request or data loss. |
| Invalid host values, blank label/id | Throw explicit contract errors. |
| Frozen prior state | Reducer produces result without mutating old state or event. |

The test validator rejects `!` and labels over 32 Unicode code points solely as a concrete application policy fixture. The reusable model does not impose that policy.

## Required review before promotion

Automated model tests validate state transitions and emitted accessibility descriptors. They do not establish DOM semantics, screen-reader announcements, real keyboard/focus behavior, pointer interactions, touch operation, clipboard differences, native IME ordering, profile switching, visual layout or contrast. Those must be implemented and reviewed in the consuming UI across empty/populated/invalid/disabled/focus-visible/pending states, both densities and all four presentation/mode combinations. Canonical owner acceptance and reviewed implementation are required before promotion. No approval, production readiness or visual verification is claimed here.

Exact kit, profile, registry and compiler versions, commands and actual results are recorded in `evidence.json`; the original test output is `model-tests.tap`.
