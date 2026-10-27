import { componentToken } from '@/lib/component-design-tokens';
import { useId, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { CheckCheck, ChevronDown, ChevronUp, X } from '@/components/icon';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { Notification } from '@/components/notification';
import { ProgressBar } from '@/components/progress-bar';
import { Skeleton } from '@/components/skeleton';
import { cn } from '@/lib/utils';
import './onboarding-checklist.css';

export interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  optional?: boolean;
  disabled?: boolean;
  actionLabel?: string;
  /** The application owns side effects and marks completion through controlled items. */
  onAction?: () => void | Promise<void>;
}
export interface OnboardingChecklistProps extends Omit<
  ComponentProps<'section'>,
  'title' | 'onChange' | 'onError'
> {
  items: readonly OnboardingStep[];
  title?: string;
  description?: string;
  onCompletedChange?: (id: string, completed: boolean) => void | Promise<void>;
  onDismiss?: () => void;
  onReset?: () => void;
  defaultCollapsed?: boolean;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  completionMessage?: string;
}
/** A controlled setup checklist with visible progress and guarded async actions. */
export function OnboardingChecklist({
  items,
  title = 'Set up your workspace',
  description = 'Complete these steps to get your team ready.',
  onCompletedChange,
  onDismiss,
  onReset,
  defaultCollapsed = false,
  loading = false,
  error,
  onRetry,
  completionMessage = 'Your workspace is ready.',
  className,
  ...props
}: OnboardingChecklistProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [pending, setPending] = useState<string>();
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const id = useId();
  const completed = items.filter((item) => item.completed).length;
  const done = items.length > 0 && completed === items.length;
  async function perform(key: string, action: () => void | Promise<void>, success: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(key);
    setActionError('');
    try {
      await action();
      setMessage(success);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'This step could not be updated. Try again.',
      );
    } finally {
      busy.current = false;
      setPending(undefined);
    }
  }
  return (
    <section
      {...props}
      className={cn('aegis-onboarding-checklist', className)}
      aria-labelledby={`${id}-title`}
      aria-busy={loading || !!pending || undefined}
    >
      <header className="aegis-onboarding-heading">
        <div>
          <h3 id={`${id}-title`}>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        <div className="aegis-onboarding-header-actions">
          <IconButton
            emphasis="ghost"
            size="sm"
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} checklist`}
            aria-expanded={!collapsed}
            aria-controls={`${id}-steps`}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <ChevronDown size={componentToken('workflow.icon-md')} />
            ) : (
              <ChevronUp size={componentToken('workflow.icon-md')} />
            )}
          </IconButton>
          {onDismiss && (
            <IconButton
              emphasis="ghost"
              size="sm"
              aria-label="Dismiss checklist"
              onClick={onDismiss}
            >
              <X size={componentToken('workflow.icon-md')} />
            </IconButton>
          )}
        </div>
      </header>
      <div className="aegis-onboarding-progress">
        <span>
          {done ? (
            <>
              <CheckCheck size={componentToken('workflow.icon-inline')} aria-hidden="true" /> All
              steps complete
            </>
          ) : (
            `${completed} of ${items.length} steps complete`
          )}
        </span>
        <ProgressBar
          label="Workspace setup"
          value={completed}
          max={items.length || 1}
          intent={done ? 'success' : 'function'}
          size="sm"
        />
      </div>
      <div id={`${id}-steps`} hidden={collapsed}>
        {actionError && (
          <Notification
            intent="destroy"
            description={actionError}
            onDismiss={() => setActionError('')}
          />
        )}
        {loading ? (
          <div className="aegis-onboarding-loading" role="status" aria-label="Loading checklist">
            {[0, 1, 2].map((item) => (
              <div key={item}>
                <Skeleton width={componentToken('onboarding-skeleton-title-width')} />
                <Skeleton width={componentToken('onboarding-skeleton-body-width')} />
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            compact
            preset="error"
            title="Checklist unavailable"
            description={error}
            action={
              onRetry && (
                <Button size="sm" onClick={onRetry}>
                  Try again
                </Button>
              )
            }
          />
        ) : items.length ? (
          <ol className="aegis-onboarding-steps">
            {items.map((item, index) => (
              <li key={item.id} data-completed={item.completed || undefined}>
                <span className="sr-only">
                  Step {index + 1} of {items.length}
                </span>
                <Checkbox
                  checked={item.completed}
                  disabled={item.disabled || !!pending}
                  readOnly={!onCompletedChange}
                  label={
                    <span>
                      {item.title}
                      {item.optional && <small>Optional</small>}
                    </span>
                  }
                  description={item.description}
                  onCheckedChange={(checked) =>
                    void perform(
                      item.id,
                      () => onCompletedChange?.(item.id, checked === true),
                      `${item.title} marked ${checked === true ? 'complete' : 'incomplete'}.`,
                    )
                  }
                />
                {item.onAction && item.actionLabel && (
                  <Button
                    size="sm"
                    emphasis="tertiary"
                    loading={pending === `action-${item.id}`}
                    disabled={item.disabled || !!pending}
                    onClick={() =>
                      void perform(
                        `action-${item.id}`,
                        () => item.onAction!(),
                        `${item.title} action completed.`,
                      )
                    }
                  >
                    {item.actionLabel}
                  </Button>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            compact
            title="No setup steps"
            description="There is nothing to complete right now."
          />
        )}
        {done && !loading && !error && (
          <footer className="aegis-onboarding-complete">
            <p>{completionMessage}</p>
            {onReset && (
              <Button size="sm" emphasis="ghost" disabled={!!pending} onClick={onReset}>
                Start again
              </Button>
            )}
          </footer>
        )}
      </div>
      <p className="sr-only" role="status">
        {message}
      </p>
    </section>
  );
}
