import type { ReactNode } from 'react';
import { CountBadge } from '@/components/count-badge';
import './indicator.css';

export interface IndicatorProps {
  children: ReactNode;
  /** Accessible meaning of the marker, including the full count where relevant. */
  label: string;
  /** Omit for a dot. Non-finite values hide the marker; finite values are clamped to whole counts. */
  count?: number;
  max?: number;
  showZero?: boolean;
  hidden?: boolean;
  /** Use only when adjacent content already communicates the same information. */
  decorative?: boolean;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
}

/** Positioned information only: does not change the child's interaction or accessible name. */
export function Indicator({
  children,
  label,
  count,
  max = 99,
  showZero = false,
  hidden = false,
  decorative = false,
  placement = 'top-end',
}: IndicatorProps) {
  const value =
    count === undefined ? undefined : Number.isFinite(count) ? Math.max(0, Math.floor(count)) : NaN;
  const limit = Number.isFinite(max) ? Math.max(1, Math.floor(max)) : 99;
  const visible =
    !hidden && (value === undefined || (Number.isFinite(value) && (value > 0 || showZero)));
  return (
    <span className="aegis-indicator" data-placement={placement}>
      <span className="aegis-indicator-target">{children}</span>
      {visible && (
        <span
          className="aegis-indicator-marker"
          data-kind={value === undefined ? 'dot' : 'count'}
          role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : label}
          aria-hidden={decorative || undefined}
        >
          {value !== undefined && (
            <span aria-hidden="true">
              <CountBadge count={value} max={limit} size="sm" variant="inverted" />
            </span>
          )}
        </span>
      )}
    </span>
  );
}
