import type { ComponentProps, ReactNode } from 'react';
import { Notification } from '@/components/notification';

/** Compatibility alias for an inline Notification. */
export interface BannerProps extends Omit<ComponentProps<'div'>, 'title'> {
  intent?: 'info' | 'success' | 'warning' | 'destroy' | 'ai';
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}
export function Banner({ action, ...props }: BannerProps) {
  return <Notification {...props} variant="inline" actions={action} />;
}
export type CalloutProps = BannerProps;
/** Compatibility alias for an inline Notification. */
export function Callout(props: CalloutProps) {
  return <Banner {...props} />;
}
