import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { Database, SearchX, ShieldAlert } from '@/components/icon';
import { cn } from '@/lib/utils';
import './empty-state.css';

export interface EmptyStateProps extends Omit<ComponentProps<'section'>, 'title'> {
  preset?: 'no-results' | 'no-data' | 'error';
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  compact?: boolean;
}
const presets = {
  'no-results': {
    icon: SearchX,
    title: 'No records match your filters',
    description: 'Try another search or clear a filter to see more records.',
  },
  'no-data': {
    icon: Database,
    title: 'Your data will appear here',
    description: 'Add your first record or connect a data source to get started.',
  },
  error: {
    icon: ShieldAlert,
    title: 'We couldn’t load these records',
    description: 'Check your connection and try loading the data again.',
  },
};
export function EmptyState({
  preset = 'no-results',
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className,
  children,
  ...props
}: EmptyStateProps) {
  const tokens = useComponentTokenNumbers(['feedback.icon-stroke-thin']);
  const titleId = useId();
  const descriptionId = useId();
  const defaults = presets[preset];
  const Icon = defaults.icon;
  return (
    <section
      className={cn('aegis-empty-state', className)}
      data-preset={preset}
      data-compact={compact}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      {...props}
    >
      <div className="aegis-empty-state-icon" aria-hidden="true">
        {icon ?? (
          <Icon
            size={componentToken('feedback.icon-empty')}
            strokeWidth={tokens['feedback.icon-stroke-thin']}
          />
        )}
      </div>
      <div className="aegis-empty-state-copy">
        <h3 id={titleId}>{title ?? defaults.title}</h3>
        <p id={descriptionId}>{description ?? defaults.description}</p>
      </div>
      {(action || secondaryAction) && (
        <div className="aegis-empty-state-actions">
          {action}
          {secondaryAction}
        </div>
      )}
      {children}
    </section>
  );
}
