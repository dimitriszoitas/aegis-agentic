import { componentToken } from '@/lib/component-design-tokens';
import { useRef, useState, type ComponentProps } from 'react';
import {
  CheckCheck,
  ChevronDown,
  Sparkles,
  UserRoundCheck,
  UserRoundMinus,
  X,
} from '@/components/icon';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { DropdownMenu } from '@/components/dropdown-menu';
import { IconButton } from '@/components/icon-button';
import { Separator } from '@/components/separator';
import { StatusDot, statusLabels, type RecordStatus } from '@/components/status-badge';
import { cn } from '@/lib/utils';
import './bulk-actions-bar.css';

export interface BulkActionOwner {
  id: string;
  name: string;
  initials?: string;
}
export interface BulkActionsBarProps extends Omit<ComponentProps<'section'>, 'onError'> {
  selectedCount: number;
  owners: readonly BulkActionOwner[];
  onAssign: (ownerId: string | null) => void | Promise<void>;
  onStatusChange: (status: RecordStatus) => void | Promise<void>;
  onSummarize: () => void | Promise<void>;
  onClear: () => void;
  loading?: boolean;
  position?: 'fixed' | 'inline';
}
/** Floating selection actions. Async callbacks remain guarded until completion. */
export function BulkActionsBar({
  selectedCount,
  owners,
  onAssign,
  onStatusChange,
  onSummarize,
  onClear,
  loading = false,
  position = 'fixed',
  className,
  onKeyDown,
  ...props
}: BulkActionsBarProps) {
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState('');
  const pendingRef = useRef(false);
  const busy = loading || pending !== undefined;
  const count = Number.isFinite(selectedCount) ? Math.max(0, Math.floor(selectedCount)) : 0;
  async function perform(action: string, callback: () => void | Promise<void>) {
    if (pendingRef.current || loading) return;
    pendingRef.current = true;
    setPending(action);
    setError('');
    try {
      await callback();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The selected records could not be updated. Try again.',
      );
    } finally {
      pendingRef.current = false;
      setPending(undefined);
    }
  }
  if (count === 0) return null;
  return (
    <section
      {...props}
      className={cn('aegis-bulk-actions', className)}
      data-position={position}
      role="region"
      aria-label="Bulk record actions"
      aria-busy={busy || undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented && !busy) {
          event.preventDefault();
          event.stopPropagation();
          onClear();
        }
        onKeyDown?.(event);
      }}
    >
      <div className="aegis-bulk-actions-row">
        <div className="aegis-bulk-selection" aria-live="polite">
          <span className="aegis-bulk-count">{count.toLocaleString()}</span>
          <span>selected</span>
        </div>
        <Separator orientation="vertical" />
        <DropdownMenu
          label="Assign selected records"
          trigger={
            <Button
              size="sm"
              emphasis="ghost"
              leadingIcon={<UserRoundCheck size={componentToken('data-display.icon-inline')} />}
              trailingIcon={<ChevronDown size={componentToken('data-display.icon-xs')} />}
              disabled={busy}
              loading={pending === 'assign'}
            >
              Assign
            </Button>
          }
          items={[
            {
              type: 'group',
              id: 'owners',
              label: 'Assign to member',
              items: owners.map((owner) => ({
                id: owner.id,
                label: owner.name,
                icon: <Avatar name={owner.name} initials={owner.initials} size="sm" />,
                onSelect: () => {
                  void perform('assign', () => onAssign(owner.id));
                },
              })),
            },
            { type: 'separator', id: 'separator' },
            {
              id: 'unassign',
              label: 'Remove assignee',
              icon: <UserRoundMinus size={componentToken('data-display.icon-inline')} />,
              onSelect: () => {
                void perform('assign', () => onAssign(null));
              },
            },
          ]}
        />
        <DropdownMenu
          label="Change status of selected records"
          trigger={
            <Button
              size="sm"
              emphasis="ghost"
              leadingIcon={<CheckCheck size={componentToken('data-display.icon-inline')} />}
              trailingIcon={<ChevronDown size={componentToken('data-display.icon-xs')} />}
              disabled={busy}
              loading={pending === 'status'}
            >
              Change status
            </Button>
          }
          items={(Object.entries(statusLabels) as [RecordStatus, string][]).map(
            ([status, label]) => ({
              id: status,
              label,
              icon: <StatusDot status={status} label={false} />,
              onSelect: () => {
                void perform('status', () => onStatusChange(status));
              },
            }),
          )}
        />
        <Button
          size="sm"
          emphasis="secondary"
          intent="ai"
          leadingIcon={<Sparkles size={componentToken('data-display.icon-inline')} />}
          disabled={busy}
          loading={pending === 'summarize'}
          onClick={() => {
            void perform('summarize', onSummarize);
          }}
        >
          Summarize with AI
        </Button>
        <Separator orientation="vertical" />
        <IconButton
          size="sm"
          emphasis="ghost"
          aria-label="Clear selected records"
          disabled={busy}
          onClick={onClear}
        >
          <X size={componentToken('data-display.icon-inline')} />
        </IconButton>
      </div>
      {error && (
        <p className="aegis-bulk-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
