# InlineEdit

Edit one short text value in place. `value` is the host's committed value; entering edit mode takes a local snapshot. Save runs synchronous validation before `onSave(draft, { previousValue })`. The host must update `value` when persistence succeeds and reject the promise when it fails. Supply a safe, localized error message; thrown server details are not rendered.

Enter saves and Escape cancels unless an IME composition is in progress. Blur does not save. Pending saves lock the draft and actions, prevent duplicate requests and cannot be cancelled; cancellation is not falsely presented as aborting a request. Rejections retain the draft. A changed committed value before Save is treated as a conflict. The host must still enforce concurrency on its server during an in-flight request.

Cancel discards the draft; reopening takes the latest committed value. Successful Save and Cancel return focus to the edit action when it remains available. Unmounting ignores late UI completions, without cancelling the host's request. No outer form submission is performed. `readOnly` hides the entry action; disabled state preserves an open draft but blocks edits/saves.

The wrapper consumes input-category tokens. Real nested Field, TextInput and Button retain their own behavior and token ownership. Keep application validation, persistence, permissions and localization in the host.
