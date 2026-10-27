import '@/components/tag/tag.css';
import './count-badge.css';
export interface CountBadgeProps {
  count: number;
  max?: number;
  label?: string;
  variant?: 'default' | 'inverted';
  /** Compact counters for icon buttons and dense rows. */
  size?: 'sm' | 'md';
}
export function CountBadge({
  count,
  max = 99,
  label,
  variant = 'default',
  size = 'md',
}: CountBadgeProps) {
  return (
    <span className="count-badge" data-variant={variant} data-size={size} title={String(count)}>
      <span aria-hidden={label ? true : undefined}>
        {count > max ? `${max}+` : Math.max(0, count)}
      </span>
      {label && <span className="sr-only">{`${count} ${label}`}</span>}
    </span>
  );
}
