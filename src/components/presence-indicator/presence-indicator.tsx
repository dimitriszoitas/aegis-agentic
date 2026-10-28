import './presence-indicator.css';
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';
export interface PresenceIndicatorProps {
  status: PresenceStatus;
  /** Localized accessible and visible text. Defaults to the status name. */
  label?: string;
  showLabel?: boolean;
  /** Use only when another accessible label already conveys presence. */
  decorative?: boolean;
  size?: 'sm' | 'md';
}
const labels: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
};
export function PresenceIndicator({
  status,
  label = labels[status],
  showLabel = true,
  decorative = false,
  size = 'md',
}: PresenceIndicatorProps) {
  return (
    <span
      className="aegis-presence-indicator"
      data-status={status}
      data-size={size}
      role={!decorative && !showLabel ? 'img' : undefined}
      aria-label={!decorative && !showLabel ? label : undefined}
      aria-hidden={decorative || undefined}
    >
      <span className="aegis-presence-dot" aria-hidden="true" />
      {showLabel && <span className="aegis-presence-label">{label}</span>}
    </span>
  );
}
