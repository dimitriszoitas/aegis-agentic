import type { CSSProperties } from 'react';
import '@/components/tag/tag.css';
export type RecordStatus = 'new' | 'in-review' | 'in-progress' | 'completed' | 'cancelled';
export const statusLabels: Record<RecordStatus, string> = {
  new: 'New',
  'in-review': 'In review',
  'in-progress': 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const statusColors: Record<RecordStatus, string> = {
  new: 'var(--group-data-display-tag-color-function-fg)',
  'in-review': 'var(--group-data-display-tag-color-status-review-fg)',
  'in-progress': 'var(--group-data-display-tag-color-warning-fg)',
  completed: 'var(--group-data-display-tag-color-success-fg)',
  cancelled: 'var(--group-data-display-tag-color-content-secondary)',
};
export interface StatusDotProps {
  status: RecordStatus;
  label?: boolean;
}
export function StatusDot({ status, label = true }: StatusDotProps) {
  return (
    <span
      className="status-dot"
      role={label ? 'img' : undefined}
      aria-label={label ? statusLabels[status] : undefined}
      aria-hidden={!label || undefined}
      style={{
        color:
          status === 'cancelled'
            ? 'var(--group-data-display-tag-color-text-tertiary)'
            : statusColors[status],
      }}
    />
  );
}
export interface StatusBadgeProps {
  status: RecordStatus;
}
export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className="status-badge"
      style={
        {
          '--status-fg': statusColors[status],
        } as CSSProperties
      }
    >
      <StatusDot status={status} label={false} />
      {statusLabels[status]}
    </span>
  );
}
