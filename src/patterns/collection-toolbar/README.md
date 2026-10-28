# CollectionToolbar

Use this generic pattern for the search, criteria and actions above a collection. `FilterBar` remains the richer editor for Aegis `WorkRecord` filters. CollectionToolbar neither assumes that model nor replaces a DataGrid's density, column, selection or pagination toolbar.

`query`, `onQueryChange` and `resultCount` belong to the host. Search changes are immediate. Apply criteria to your data, then pass the resulting count. The pattern neither debounces application requests nor handles stale responses. It uses the actual shared SearchInput, so clearing follows that control's change and focus behavior.

Required props are `label` (the region name), `searchLabel`, `query`, `onQueryChange`, and a nonnegative safe-integer `resultCount`. `searchPlaceholder`, `resultsId`, and the complete localized `resultText` message are optional. There is no hidden query state, default query, form element or automatic submission.

The optional `filters` and `actions` render functions receive `{ busy, disabled }`. Apply disabled explicitly to the controls you render, including portaled choices; arbitrary React children cannot be disabled safely by cloning or styling them. `disabled` directly disables only the owned search. `busy` exposes `aria-busy` and a visible `busyLabel` (default “Updating results…”), while preserving editing and existing state. The caller decides whether a request also requires disabling controls.

The search uses one filtering-group token as its flex basis, with no growth when extra space is available. Search, filters and actions follow that DOM order and wrap naturally in a narrow container. The count follows the controls as an atomic status region. There is no ARIA toolbar keyboard model or extra Tab interception. Labels, individual control focus, loading/error results and application operations remain caller responsibilities.

Owned group: **filtering**. The transparent wrapper uses existing filtering tokens only. Nested SearchInput, Select and Button keep their own groups and behavior. No child-internal selectors or theme-dependent dimensions are introduced.

`Playground` exposes the public query/count/busy/disabled inputs and optional slot visibility. `LocalFiltering` demonstrates real local criteria and clearing. `src/stories/component-docs/anatomy/collection-toolbar.tsx` supplies selector-backed annotations for the four real regions. Focused structural tests and the browser fixture cover semantics, disabled boundaries, native query clearing, exact result counts and wrapping in all four theme/mode combinations. These checks do not certify arbitrary host controls or remote filtering.
