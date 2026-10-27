import { componentToken } from '@/lib/component-design-tokens';
import type { ReactNode, CSSProperties } from 'react';
import { X } from '@/components/icon';
import type { Intent } from '@/components/button';
import { cn } from '@/lib/utils';
import './tag.css';
export interface TagProps {
  children: ReactNode;
  variant?: 'static' | 'removable' | 'interactive' | 'counter' | 'status';
  size?: 'sm' | 'md';
  intent?: Intent | 'success' | 'warning';
  /** Optional semantic CSS color for a status dot, independent of action intent. */
  dotColor?: CSSProperties['color'];
  count?: number;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  onRemove?: () => void;
  removeLabel?: string;
  disabled?: boolean;
  className?: string;
}
const intentStyles: Record<
  NonNullable<TagProps['intent']>,
  { '--group-data-display-tag-tag-fg': string }
> = {
  default: { '--group-data-display-tag-tag-fg': 'var(--semantic-color-content-secondary)' },
  function: { '--group-data-display-tag-tag-fg': 'var(--semantic-color-action-foreground)' },
  destroy: { '--group-data-display-tag-tag-fg': 'var(--semantic-color-danger-foreground)' },
  ai: { '--group-data-display-tag-tag-fg': 'var(--semantic-color-ai-foreground)' },
  success: { '--group-data-display-tag-tag-fg': 'var(--semantic-color-success-foreground)' },
  warning: { '--group-data-display-tag-tag-fg': 'var(--semantic-color-caution-foreground)' },
};
export function Tag({
  children,
  variant = 'static',
  size = 'md',
  intent = 'default',
  dotColor,
  count,
  selected = false,
  onSelectedChange,
  onRemove,
  removeLabel = 'Remove filter',
  disabled,
  className,
}: TagProps) {
  const selectedStyle = intentStyles[intent];
  const style = {
    ...(intent !== 'default' && selectedStyle),
    ...(variant === 'status' && {
      '--group-data-display-tag-tag-fg':
        dotColor ?? selectedStyle['--group-data-display-tag-tag-fg'],
      '--status-fg': 'var(--group-data-display-tag-tag-fg)',
    }),
  } as CSSProperties;
  const props = {
    className: cn('tag', variant === 'status' && 'status-badge', className),
    style,
    'data-size': size,
    'data-variant': variant,
    'data-intent': intent,
    'data-selected': selected,
  };
  if (variant === 'interactive')
    return (
      <button
        {...props}
        type="button"
        disabled={disabled}
        aria-pressed={selected}
        onClick={() => onSelectedChange?.(!selected)}
      >
        {intent !== 'default' && <span className="tag-dot" aria-hidden />}
        {children}
      </button>
    );
  return (
    <span {...props}>
      {(intent !== 'default' || variant === 'status') && <span className="tag-dot" aria-hidden />}
      {children}
      {variant === 'counter' && <span className="tag-count">{count ?? 0}</span>}
      {variant === 'removable' && (
        <button
          type="button"
          className="tag-remove"
          aria-label={removeLabel}
          disabled={disabled}
          onClick={onRemove}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' || e.key === 'Delete') {
              e.preventDefault();
              onRemove?.();
            }
          }}
        >
          <X size={componentToken('data-display.icon-xs')} />
        </button>
      )}
    </span>
  );
}
export { Tag as Chip };
export type ChipProps = TagProps;
