# SortableList

A controlled vertical list backed by dnd-kit PointerSensor and KeyboardSensor with sortable keyboard coordinates. Supply unique, nonempty stable string IDs; array indices are not identities. `onReorder(ids, details)` requests an order, and the host must reorder `items` accordingly. No local or remote persistence is performed.

The named handle supports pointer dragging, Space/Enter pickup/drop, arrow movement and Escape cancellation. Explicit Move up/down buttons provide another accessible path and disable at their boundaries. The default sensor supplies screen-reader announcements and focus restoration. Touch scrolling remains available outside the handle; the handle reserves touch gestures for dragging.

The component rejects duplicate IDs. If IDs or their order change during a drag, dropping requests no reorder; the user can start again with the new list. Disabled state prevents reorder callbacks. Content changes with the same IDs do not invalidate a drag. Custom content must keep its own accessible names and avoid replacing the separate drag handle.

Inline transforms come from measured drag geometry, not design constants. Sorting uses no animation transition, so it does not impose motion on reduced-motion users. This version supports one vertical list, not cross-list transfers, grids, virtualized rows, nesting or tree reparenting.

List layout consumes data-display tokens. Nested IconButtons retain trigger styling. Verify pointer, keyboard, cancellation, narrow fit and host order acceptance in the consuming workflow.
