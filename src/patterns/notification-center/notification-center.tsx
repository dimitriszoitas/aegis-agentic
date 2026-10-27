import { componentToken } from '@/lib/component-design-tokens';
import { useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Bell, CheckCheck, CircleCheck, Info, Sparkles, TriangleAlert, X } from '@/components/icon';
import { Button } from '@/components/button';
import { CountBadge } from '@/components/count-badge';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { Notification } from '@/components/notification';
import { SideSheet } from '@/components/side-sheet';
import { RelativeTime } from '@/components/relative-time';
import { SearchInput } from '@/components/search-input';
import { Skeleton } from '@/components/skeleton';
import { Tabs } from '@/components/tabs';
import './notification-center.css';

export interface NotificationCenterItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string | Date | number;
  read: boolean;
  intent?: 'info' | 'success' | 'warning' | 'destroy' | 'ai';
}
export interface NotificationCenterProps {
  items: readonly NotificationCenterItem[];
  onReadChange?: (ids: string[], read: boolean) => void | Promise<void>;
  onDismiss?: (id: string) => void | Promise<void>;
  onOpenItem?: (item: NotificationCenterItem) => void | Promise<void>;
  title?: string;
  trigger?: ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Runs after the panel finishes opening or closing, for coordinated navigation. */
  onOpenChangeComplete?: (open: boolean) => void;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  now?: Date | number;
  emptyDescription?: string;
}
const icons = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  destroy: TriangleAlert,
  ai: Sparkles,
};
/** Controlled notification inbox. Read and dismissal changes are owned by the application. */
export function NotificationCenter({
  items,
  onReadChange,
  onDismiss,
  onOpenItem,
  title = 'Notifications',
  trigger,
  open,
  defaultOpen = false,
  onOpenChange,
  onOpenChangeComplete,
  loading = false,
  error,
  onRetry,
  now,
  emptyDescription = 'New updates will appear here.',
}: NotificationCenterProps) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState('all');
  const [pending, setPending] = useState<string>();
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const body = useRef<HTMLDivElement>(null);
  const unread = items.filter((item) => !item.read);
  const visible = items.filter(
    (item) =>
      (view !== 'unread' || !item.read) &&
      `${item.title} ${item.description ?? ''}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  const fallback = () =>
    body.current?.querySelector<HTMLInputElement>('input[type=search]')?.focus();
  async function perform(
    id: string,
    action: () => void | Promise<void>,
    success: string,
    restoreFocus = false,
  ) {
    if (busy.current) return;
    busy.current = true;
    // Move off a disappearing row before the dialog recovers focus from its removal.
    if (restoreFocus) fallback();
    setPending(id);
    setActionError('');
    try {
      await action();
      setMessage(success);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'The update could not be saved. Try again.',
      );
    } finally {
      busy.current = false;
      setPending(undefined);
    }
  }
  return (
    <SideSheet
      title={title}
      size="sm"
      closeLabel="Close notifications"
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
      trigger={
        trigger ?? (
          <IconButton
            aria-label={`${title}${unread.length ? `, ${unread.length} unread` : ''}`}
            emphasis="ghost"
            tooltip={false}
          >
            <Bell size={componentToken('communication.icon-lg')} />
            {unread.length > 0 && (
              <span className="aegis-notification-center-count">
                <CountBadge count={unread.length} max={99} variant="inverted" size="sm" />
              </span>
            )}
          </IconButton>
        )
      }
    >
      <div ref={body} className="aegis-notification-center aegis-notification-center-body">
        <SearchInput
          aria-label="Search notifications"
          placeholder="Search notifications"
          value={query}
          onValueChange={setQuery}
        />
        <div className="aegis-notification-center-tools">
          <span>{unread.length} unread</span>
          {onReadChange && (
            <Button
              size="sm"
              emphasis="ghost"
              leadingIcon={<CheckCheck size={componentToken('communication.icon-sm')} />}
              disabled={!unread.length || !!pending || loading}
              loading={pending === 'all'}
              onClick={() =>
                void perform(
                  'all',
                  () =>
                    onReadChange(
                      unread.map((item) => item.id),
                      true,
                    ),
                  'All notifications marked read.',
                  view === 'unread',
                )
              }
            >
              Mark all read
            </Button>
          )}
        </div>
        {actionError && (
          <Notification
            intent="destroy"
            description={actionError}
            onDismiss={() => setActionError('')}
          />
        )}
        <Tabs
          label="Notification views"
          value={view}
          onValueChange={setView}
          items={[
            { value: 'all', label: 'All', count: items.length, content: null },
            { value: 'unread', label: 'Unread', count: unread.length, content: null },
          ]}
          sharedContent={
            loading ? (
              <div
                className="aegis-notification-center-loading"
                role="status"
                aria-label="Loading notifications"
              >
                {[0, 1, 2].map((item) => (
                  <div key={item}>
                    <Skeleton
                      width={componentToken('communication.notification-skeleton-title-width')}
                    />
                    <Skeleton
                      width={componentToken('communication.notification-skeleton-body-width')}
                    />
                    <Skeleton
                      width={componentToken('communication.notification-skeleton-time-width')}
                    />
                  </div>
                ))}
              </div>
            ) : error ? (
              <EmptyState
                preset="error"
                compact
                title="Notifications unavailable"
                description={error}
                action={
                  onRetry && (
                    <Button size="sm" onClick={onRetry}>
                      Try again
                    </Button>
                  )
                }
              />
            ) : visible.length ? (
              <ul className="aegis-notification-center-list">
                {visible.map((item) => {
                  const Icon = icons[item.intent ?? 'info'];
                  return (
                    <li
                      key={item.id}
                      data-unread={!item.read || undefined}
                      data-intent={item.intent ?? 'info'}
                    >
                      <span className="aegis-notification-center-icon" aria-hidden="true">
                        <Icon size={componentToken('communication.icon-navigation')} />
                      </span>
                      <div className="aegis-notification-center-copy">
                        {onOpenItem ? (
                          <button
                            type="button"
                            className="aegis-notification-center-title"
                            disabled={!!pending}
                            onClick={() =>
                              void perform(
                                item.id,
                                async () => {
                                  await onOpenItem(item);
                                  if (!item.read) await onReadChange?.([item.id], true);
                                },
                                `${item.title} opened.`,
                                view === 'unread',
                              )
                            }
                          >
                            {item.title}
                          </button>
                        ) : (
                          <strong>{item.title}</strong>
                        )}
                        {item.description && <p>{item.description}</p>}
                        <RelativeTime value={item.timestamp} now={now} />
                        {onReadChange && (
                          <Button
                            size="sm"
                            emphasis="ghost"
                            className="aegis-notification-center-read"
                            disabled={!!pending}
                            onClick={() =>
                              void perform(
                                item.id,
                                () => onReadChange([item.id], !item.read),
                                `${item.title} marked ${item.read ? 'unread' : 'read'}.`,
                                view === 'unread' && !item.read,
                              )
                            }
                          >
                            Mark {item.read ? 'unread' : 'read'}
                          </Button>
                        )}
                      </div>
                      {onDismiss && (
                        <IconButton
                          aria-label={`Dismiss ${item.title}`}
                          size="sm"
                          emphasis="ghost"
                          disabled={!!pending}
                          onClick={() =>
                            void perform(
                              item.id,
                              () => onDismiss(item.id),
                              `${item.title} dismissed.`,
                              true,
                            )
                          }
                        >
                          <X size={componentToken('communication.icon-sm')} />
                        </IconButton>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                compact
                title={
                  query
                    ? 'No matching notifications'
                    : view === 'unread'
                      ? 'You are all caught up'
                      : 'No notifications yet'
                }
                description={
                  query ? 'Try another search or clear the current query.' : emptyDescription
                }
                action={
                  query && (
                    <Button
                      size="sm"
                      emphasis="secondary"
                      onClick={() => {
                        setQuery('');
                        fallback();
                      }}
                    >
                      Clear search
                    </Button>
                  )
                }
              />
            )
          }
        />
        <p className="sr-only" role="status">
          {message}
        </p>
      </div>
    </SideSheet>
  );
}
