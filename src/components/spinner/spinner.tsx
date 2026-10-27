import type { ComponentProps } from 'react';
import { componentToken } from '@/lib/component-design-tokens';
import { cn } from '@/lib/utils';
import './spinner.css';

export interface SpinnerProps extends ComponentProps<'span'> {
  size?: 'sm' | 'md' | 'lg';
  /** Omit the label when the containing button or status already describes loading. */
  label?: string;
}
export function Spinner({ size = 'md', label, className, ...props }: SpinnerProps) {
  return (
    <span
      className={cn('aegis-spinner', className)}
      data-size={size}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth={componentToken('feedback.icon-stroke-strong')}
          opacity={componentToken('spinner-track-opacity')}
        />
        <path
          d="M12 3a9 9 0 0 1 9 9"
          stroke="currentColor"
          strokeWidth={componentToken('feedback.icon-stroke-strong')}
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
