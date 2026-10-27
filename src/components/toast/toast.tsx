import type { ReactNode } from 'react';
import {
  Notification,
  NotificationViewport,
  showNotification,
  dismissNotification,
  type NotificationProps,
  type NotificationIntent,
  type NotificationAction,
  type NotificationViewportProps,
  type ShowNotificationOptions,
} from '@/components/notification';
import './toast.css';

export type ToastIntent = NotificationIntent;
export type ToastAction = NotificationAction;
export interface ToastProps extends Omit<NotificationProps, 'variant' | 'title'> {
  title: ReactNode;
}
/** Compatibility alias for a floating Notification. */
export function Toast(props: ToastProps) {
  return <Notification {...props} variant="floating" />;
}
export type ToasterProps = NotificationViewportProps;
export const Toaster = NotificationViewport;
export interface ShowToastOptions extends ShowNotificationOptions {
  title: ReactNode;
}
export function showToast(options: ShowToastOptions) {
  return showNotification(options);
}
export const dismissToast = dismissNotification;
