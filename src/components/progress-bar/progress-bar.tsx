import { componentToken } from '@/lib/component-design-tokens';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import './progress-bar.css';
export interface ProgressBarProps extends Omit<ComponentProps<'div'>, 'children'> {
  value?: number;
  max?: number;
  label: string;
  showValue?: boolean;
  intent?: 'function' | 'success' | 'warning' | 'destroy' | 'ai';
  size?: 'sm' | 'md';
}
export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  intent = 'function',
  size = 'md',
  className,
  ...props
}: ProgressBarProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue =
    value === undefined || !Number.isFinite(value)
      ? undefined
      : Math.min(safeMax, Math.max(0, value));
  const percent = safeValue === undefined ? undefined : Math.round((safeValue / safeMax) * 100);
  return (
    <div
      className={cn('aegis-progress', className)}
      data-intent={intent}
      data-size={size}
      {...props}
    >
      {showValue && (
        <div className="aegis-progress-label" aria-hidden="true">
          <span>{label}</span>
          <span className="mono">{percent === undefined ? 'In progress' : `${percent}%`}</span>
        </div>
      )}
      <div
        className="aegis-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        data-indeterminate={percent === undefined}
      >
        <span
          className="aegis-progress-fill"
          style={{
            width:
              percent === undefined
                ? componentToken('progress-indeterminate-width')
                : `${percent}%`,
          }}
        />
      </div>
    </div>
  );
}
