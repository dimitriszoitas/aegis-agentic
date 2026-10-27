import { readComponentTokenNumber, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import {
  Toaster as SonnerToaster,
  toast as sonnerToast,
  type ToasterProps as SonnerToasterProps,
} from 'sonner';
import { cn } from '@/lib/utils';
import { Notification, type NotificationProps } from './notification';

export type NotificationViewportProps = SonnerToasterProps;
/** Mount once per application shell; inherits the shell's color and UI approach tokens. */
export function NotificationViewport({
  className,
  toastOptions,
  ...props
}: NotificationViewportProps) {
  const tokens = useComponentTokenNumbers(['notification-gap']);
  return (
    <SonnerToaster
      position="bottom-right"
      offset={tokens['notification-gap']}
      gap={tokens['notification-gap']}
      visibleToasts={4}
      className={cn('aegis-notification-viewport', 'aegis-toaster', className)}
      {...props}
      toastOptions={{
        ...toastOptions,
        unstyled: true,
        classNames: { toast: 'aegis-sonner-toast', ...toastOptions?.classNames },
      }}
    />
  );
}
export interface ShowNotificationOptions extends Pick<
  NotificationProps,
  'title' | 'description' | 'children' | 'intent' | 'icon' | 'action' | 'actions' | 'dismissLabel'
> {
  id?: string | number;
  duration?: number;
  toasterId?: string;
}
/** Loading notifications persist until replaced using their id or explicitly dismissed. */
export function showNotification({
  intent = 'info',
  action,
  duration = readComponentTokenNumber('notification-duration'),
  id,
  toasterId,
  ...content
}: ShowNotificationOptions) {
  return sonnerToast.custom(
    (notificationId) => (
      <Notification
        {...content}
        variant="floating"
        intent={intent}
        role="presentation"
        action={
          action
            ? {
                label: action.label,
                onClick: () => {
                  action.onClick();
                  sonnerToast.dismiss(notificationId);
                },
              }
            : undefined
        }
        onDismiss={() => sonnerToast.dismiss(notificationId)}
      />
    ),
    { id, duration: intent === 'loading' ? Infinity : duration, toasterId },
  );
}
export const dismissNotification = sonnerToast.dismiss;
