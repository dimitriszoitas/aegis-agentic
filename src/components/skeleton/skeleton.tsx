import type { ComponentProps, CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import './skeleton.css';
export interface SkeletonProps extends ComponentProps<'div'> {
  variant?: 'text' | 'block' | 'avatar' | 'table-row';
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  /** The number of cells in a table-row preset. */
  columns?: number;
  animate?: boolean;
}
export function Skeleton({
  variant = 'text',
  width,
  height,
  columns = 5,
  animate = true,
  className,
  style,
  ...props
}: SkeletonProps) {
  const cellCount = Number.isFinite(columns) ? Math.max(1, Math.floor(columns)) : 5;
  return (
    <div
      aria-hidden="true"
      className={cn('aegis-skeleton', className)}
      data-variant={variant}
      data-animate={animate}
      style={{ width, height, ...style }}
      {...props}
    >
      {variant === 'table-row' &&
        Array.from({ length: cellCount }, (_, index) => (
          <span key={index} className="aegis-skeleton-cell" />
        ))}
    </div>
  );
}
