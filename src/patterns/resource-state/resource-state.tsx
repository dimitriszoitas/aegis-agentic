import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Notification } from '@/components/notification';
import { Banner } from '@/components/banner';
import { Spinner } from '@/components/spinner';
import { cn } from '@/lib/utils';
import './resource-state.css';

interface ResourceStateCommonProps extends Omit<
  ComponentPropsWithoutRef<'section'>,
  'children' | 'title'
> {
  label: string;
  message?: ReactNode;
  loadingLabel?: string;
  retryLabel?: string;
  onRetry?: () => void;
  /** Host-owned retry state; no promise or request lifecycle is inferred. */
  retrying?: boolean;
}
export type ResourceStateProps = ResourceStateCommonProps &
  (
    | {
        status: 'ready' | 'refreshing' | 'stale';
        children: ReactNode;
        loadingContent?: never;
        emptyAction?: never;
      }
    | {
        status: 'initial-loading';
        children?: never;
        loadingContent?: ReactNode;
        emptyAction?: never;
      }
    | { status: 'empty'; children?: never; loadingContent?: never; emptyAction?: ReactNode }
    | { status: 'error'; children?: never; loadingContent?: never; emptyAction?: never }
  );
/** Explicit presentation of host resource state. Retained data stays mounted during refresh/staleness. */
export function ResourceState({
  label,
  status,
  message,
  loadingLabel = 'Loading…',
  retryLabel = 'Try again',
  onRetry,
  retrying = false,
  children,
  loadingContent,
  emptyAction,
  className,
  ...props
}: ResourceStateProps) {
  const retained = status === 'ready' || status === 'refreshing' || status === 'stale';
  const retry = onRetry && (
    <Button type="button" emphasis="secondary" loading={retrying} onClick={onRetry}>
      {retryLabel}
    </Button>
  );
  return (
    <section
      {...props}
      className={cn('aegis-resource-state', className)}
      aria-label={label}
      aria-busy={status === 'initial-loading' || status === 'refreshing' || retrying}
      data-resource-state={status}
    >
      <div key="feedback" data-resource-slot="feedback">
        {status === 'initial-loading' && (
          <>
            <p role="status" className="aegis-resource-state-loading">
              <Spinner />
              {message ?? loadingLabel}
            </p>
            {loadingContent}
          </>
        )}
        {status === 'refreshing' && (
          <Notification intent="loading" title={message ?? 'Updating results…'} />
        )}
        {status === 'stale' && (
          <Banner
            intent="warning"
            title={message ?? 'Showing previously loaded data.'}
            action={retry}
          />
        )}
        {status === 'error' && <EmptyState preset="error" description={message} action={retry} />}
        {status === 'empty' && (
          <EmptyState preset="no-data" description={message} action={emptyAction} />
        )}
      </div>
      {retained && (
        <div key="content" data-resource-slot="content">
          {children}
        </div>
      )}
    </section>
  );
}
