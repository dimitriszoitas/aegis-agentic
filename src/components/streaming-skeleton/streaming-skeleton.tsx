import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import './streaming-skeleton.css';

export interface StreamingSkeletonProps extends ComponentProps<'div'> {
  lines?: number;
  variant?: 'text' | 'card';
  label?: string;
}
export function StreamingSkeleton({
  lines = 3,
  variant = 'text',
  label = 'Generating AI response',
  className,
  ...props
}: StreamingSkeletonProps) {
  const count = Number.isFinite(lines) ? Math.min(12, Math.max(1, Math.floor(lines))) : 3;
  return (
    <div
      role="status"
      aria-label={label}
      {...props}
      className={cn('aegis-streaming-skeleton', className)}
      data-variant={variant}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <span aria-hidden="true" key={i} className="aegis-streaming-line" />
      ))}
    </div>
  );
}
