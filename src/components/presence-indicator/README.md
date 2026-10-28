# PresenceIndicator

Display online, away, busy, or offline availability supplied by the host. The default visible label avoids relying on color. Supply a localized `label` as needed. With `showLabel={false}`, the dot has an image role and accessible name; `decorative` suppresses semantics only when another label conveys the same status.

This component does not infer availability, poll a server, or announce status changes. The host owns freshness, privacy, localization and announcement policy. Use StatusBadge for record workflow status and Indicator for positioned notification counts. Avatar's existing status API remains available.
