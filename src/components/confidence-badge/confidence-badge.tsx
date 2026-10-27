import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import './confidence-badge.css';

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export interface ConfidenceBadgeProps extends ComponentProps<'span'> {
  confidence: ConfidenceLevel;
}
/** Confidence describes evidence strength; it is not an approval or a final verdict. */
export function ConfidenceBadge({ confidence, className, ...props }: ConfidenceBadgeProps) {
  const activeBars = { low: 1, medium: 2, high: 3 }[confidence];
  return (
    <span
      {...props}
      className={cn('aegis-confidence-badge', className)}
      data-confidence={confidence}
    >
      <span className="aegis-confidence-bars" aria-hidden="true">
        {[1, 2, 3].map((bar) => (
          <i key={bar} data-active={bar <= activeBars} />
        ))}
      </span>
      <span>{confidence[0].toUpperCase() + confidence.slice(1)} confidence</span>
    </span>
  );
}
