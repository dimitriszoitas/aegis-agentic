import { componentToken } from '@/lib/component-design-tokens';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import './scroll-area.css';
export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  maxHeight?: number | string;
  label?: string;
}
export function ScrollArea({
  children,
  maxHeight = componentToken('scroll-area-max-height'),
  label = 'Scrollable content',
  className,
  style,
  ...props
}: ScrollAreaProps) {
  return (
    <div
      {...props}
      className={cn('aegis-scroll-area', className)}
      role="region"
      aria-label={label}
      tabIndex={0}
      style={{ maxHeight, ...style }}
    >
      {children}
    </div>
  );
}
