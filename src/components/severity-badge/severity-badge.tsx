import type { CSSProperties } from 'react';
import '@/components/tag/tag.css';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export interface SeverityBadgeProps {
  severity: Severity;
  compact?: boolean;
  className?: string;
}
export const severityLabels: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};
const severityStyles: Record<
  Severity,
  CSSProperties & Record<'--severity-fg' | '--severity-border', string>
> = {
  critical: {
    '--severity-fg': 'var(--group-data-display-tag-color-severity-critical-fg)',
    '--severity-border': 'var(--group-data-display-tag-color-severity-critical-border)',
  },
  high: {
    '--severity-fg': 'var(--group-data-display-tag-color-severity-high-fg)',
    '--severity-border': 'var(--group-data-display-tag-color-severity-high-border)',
  },
  medium: {
    '--severity-fg': 'var(--group-data-display-tag-color-severity-medium-fg)',
    '--severity-border': 'var(--group-data-display-tag-color-severity-medium-border)',
  },
  low: {
    '--severity-fg': 'var(--group-data-display-tag-color-severity-low-fg)',
    '--severity-border': 'var(--group-data-display-tag-color-severity-low-border)',
  },
  info: {
    '--severity-fg': 'var(--group-data-display-tag-color-severity-info-fg)',
    '--severity-border': 'var(--group-data-display-tag-color-severity-info-border)',
  },
};
export function SeverityBadge({ severity, compact = false, className = '' }: SeverityBadgeProps) {
  return (
    <span
      className={`severity-badge ${className}`}
      data-compact={compact}
      role={compact ? 'img' : undefined}
      aria-label={compact ? `${severityLabels[severity]} severity` : undefined}
      title={compact ? `${severityLabels[severity]} severity` : undefined}
      style={severityStyles[severity]}
    >
      {compact ? <span className="severity-dot" aria-hidden /> : severityLabels[severity]}
    </span>
  );
}
