# FormSection

Use FormSection to group related individually labeled fields. It composes a native `fieldset`, its `legend`, an optional associated description, and the existing responsive `ContentGrid`. It renders no form and owns no field values, validation, reset, submission or persistence.

Required props are `legend` and `children`. `maxColumns` accepts the existing ContentGrid cap of 1–4 (default 1); `minItemWidth` accepts `small`, `regular`, or `large` (default regular). The cap is a maximum, not a fixed column count. Each direct child is a grid item. Wrap prose in a deliberate ReadingColumn outside this pattern when the page needs a reading measure; this pattern does not clamp the whole form to one.

`description` receives an id that is merged with any caller `aria-describedby`. Keep the legend meaningful and noninteractive. Field grouping does not label each child: compose `Field` with the actual control, and provide native names and constraints as appropriate.

`disabled` uses the native fieldset boundary. Native inputs and buttons inside the fieldset, including the optional `actions` region after the fields, inherit that state. Native rules exempt descendants of the first legend, and portaled or custom widgets may be outside this disabled boundary. Pass an explicit disabled prop to such widgets in the host; this pattern does not clone children or claim to lock every interaction.

The optional `actions` node belongs to the host. A submit button can submit the surrounding form; use `type="button"` for an ordinary action. There is no internal Save/Cancel behavior and no nested form. The host keeps controlled drafts and handles reset, validation, error messages and success feedback.

Owned group: **page-structure**. The fieldset is transparent and borderless. Legend/description/slot spacing use that group's existing tokens; ContentGrid and nested Field, TextInput and Button retain their own styles and semantics. The pattern never changes a child control's padding, typography or surface.

`Playground` is driven by the real public props. `NativeForm` exercises named native FormData submission, and `NativeDisabled` checks disabled descendants. `src/stories/component-docs/anatomy/form-section.tsx` supplies selectors for the actual legend, description, field grid and action region. Focused tests and the shared expansion browser fixture verify description association, form ownership, disabled boundaries and responsive columns. These checks do not establish that arbitrary forms or portaled controls are accessible.
