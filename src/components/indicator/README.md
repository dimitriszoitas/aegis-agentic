# Indicator

Position a dot or CountBadge on a child without changing its interaction or name. Supply `label` with the complete accessible meaning, including the full count if needed. Use `decorative` only when another accessible label already provides that information. For actionable notifications, name the child button independently.

`count` omitted displays a dot. Zero is hidden unless `showZero`; negative values normalize to zero, fractions to whole counts, and non-finite values hide the marker. `max` caps the displayed count, not the supplied accessible label. `hidden` removes only the marker. Logical corner placement follows writing direction.

The marker is not focusable, does not intercept pointer events, and is not a live region. The host owns notification data and announcement policy. Preserve the wrapper's reserved space in dense containers. CountBadge retains its own styles.
