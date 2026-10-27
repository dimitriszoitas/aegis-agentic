import { componentToken } from '@/lib/component-design-tokens';
import { useId, type ComponentProps, type ReactNode } from 'react';
import {
  CircleAlert,
  CircleCheck,
  Info,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  X,
} from '@/components/icon';
import { cn } from '@/lib/utils';
import './notification.css';

export type NotificationIntent = 'info' | 'success' | 'warning' | 'destroy' | 'ai' | 'loading';
export interface NotificationAction {
  label: string;
  onClick: () => void;
}
export interface NotificationProps extends Omit<ComponentProps<'div'>, 'title'> {
  variant?: 'inline' | 'floating';
  intent?: NotificationIntent;
  title?: ReactNode;
  description?: ReactNode;
  /** Set null to omit the leading icon. */
  icon?: ReactNode;
  action?: NotificationAction;
  /** Custom or multiple action controls. */
  actions?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}
const icons = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  destroy: CircleAlert,
  ai: Sparkles,
  loading: LoaderCircle,
};
/** Shared notice presentation. Use NotificationViewport/showNotification for floating lifecycle. */
export function Notification({
  variant = 'inline',
  intent = 'info',
  title,
  description,
  icon,
  action,
  actions,
  onDismiss,
  dismissLabel = 'Dismiss notification',
  children,
  className,
  role = variant === 'floating' || intent === 'loading'
    ? 'status'
    : intent === 'destroy'
      ? 'alert'
      : 'note',
  ...props
}: NotificationProps) {
  const titleId = useId();
  const Icon = icons[intent];
  const hasTitle = title !== undefined && title !== null;
  const hasIcon = icon !== null && icon !== false;
  const floating = variant === 'floating';
  const presentational = role === 'presentation' || role === 'none';
  const legacy = floating ? 'aegis-toast' : 'aegis-banner';
  return (
    <div
      {...props}
      className={cn('aegis-notification', legacy, floating && `aegis-toast-${intent}`, className)}
      data-variant={variant}
      data-intent={intent}
      data-has-icon={hasIcon || undefined}
      role={role}
      aria-label={presentational ? undefined : props['aria-label']}
      aria-labelledby={
        presentational ? undefined : (props['aria-labelledby'] ?? (hasTitle ? titleId : undefined))
      }
      aria-describedby={presentational ? undefined : props['aria-describedby']}
      aria-live={presentational ? undefined : props['aria-live']}
    >
      {hasIcon && (
        <span
          className={cn(
            'aegis-notification-icon',
            `${legacy}-icon`,
            intent === 'loading' && 'aegis-notification-spinning',
          )}
          aria-hidden="true"
        >
          {icon === undefined ? (
            <Icon
              size={
                floating
                  ? componentToken('feedback.icon-lg')
                  : componentToken('feedback.icon-notification')
              }
            />
          ) : (
            icon
          )}
        </span>
      )}
      <div
        className={cn(
          'aegis-notification-content',
          floating ? 'aegis-toast-body' : 'aegis-banner-content',
        )}
      >
        {hasTitle && (
          <div className={cn('aegis-notification-title', `${legacy}-title`)} id={titleId}>
            {title}
          </div>
        )}
        {description != null && (
          <div className={cn('aegis-notification-description', `${legacy}-description`)}>
            {description}
          </div>
        )}
        {children != null && (
          <div className={cn('aegis-notification-description', `${legacy}-description`)}>
            {children}
          </div>
        )}
      </div>
      {(action || actions) && (
        <div className={cn('aegis-notification-actions', !floating && 'aegis-banner-action')}>
          {action && (
            <button
              type="button"
              className="aegis-notification-action aegis-toast-action"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )}
          {actions}
        </div>
      )}
      {onDismiss && (
        <button
          className={cn('aegis-notification-dismiss', `${legacy}-dismiss`)}
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
        >
          <X
            size={
              floating ? componentToken('feedback.icon-sm') : componentToken('feedback.icon-md')
            }
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}
