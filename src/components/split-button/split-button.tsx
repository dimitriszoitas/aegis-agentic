import { componentToken } from '@/lib/component-design-tokens';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/button';
import { DropdownMenu, type DropdownMenuActionItem } from '@/components/dropdown-menu';
import { ChevronDown } from '@/components/icon';
import { cn } from '@/lib/utils';
import './split-button.css';

export interface SplitButtonAction {
  id: string;
  label: ReactNode;
  onSelect: () => void | Promise<void>;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  intent?: 'default' | 'destroy';
}
export interface SplitButtonProps {
  children: ReactNode;
  onAction: () => void | Promise<void>;
  actions: readonly SplitButtonAction[];
  size?: ButtonProps['size'];
  intent?: ButtonProps['intent'];
  emphasis?: ButtonProps['emphasis'];
  leadingIcon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  menuLabel?: string;
  groupLabel?: string;
  errorMessage?: string;
  onActionError?: (error: unknown) => void;
  className?: string;
}

/** A default action with an adjacent menu of alternatives. */
export function SplitButton({
  children,
  onAction,
  actions,
  size = 'md',
  intent = 'default',
  emphasis = 'primary',
  leadingIcon,
  disabled = false,
  loading = false,
  menuLabel = 'More actions',
  groupLabel = 'Action options',
  errorMessage = 'The action could not be completed. Try again.',
  onActionError,
  className,
}: SplitButtonProps) {
  const root = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const restore = useRef<'primary' | 'menu' | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const errorId = useId();
  const unavailable = disabled || loading || pending;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useLayoutEffect(() => {
    if (pending || !restore.current || !root.current) return;
    const element = root.current;
    const target = element.querySelector<HTMLButtonElement>(
      `[data-split-action="${restore.current}"]`,
    );
    const active = element.ownerDocument.activeElement;
    restore.current = null;
    if (
      target &&
      !target.disabled &&
      (active === element.ownerDocument.body || element.contains(active))
    ) {
      target.focus({ preventScroll: true });
    }
  }, [pending]);

  async function run(action: () => void | Promise<void>, source: 'primary' | 'menu') {
    if (busy.current || unavailable) return;
    busy.current = true;
    restore.current = source;
    setError(false);
    setOpen(false);
    setPending(true);
    try {
      await action();
    } catch (caught) {
      if (mounted.current) setError(true);
      onActionError?.(caught);
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }
  const items: DropdownMenuActionItem[] = actions.map((action) => ({
    id: action.id,
    label: action.label,
    icon: action.icon,
    shortcut: action.shortcut,
    disabled: unavailable || action.disabled,
    intent: action.intent,
    onSelect: () => {
      void run(action.onSelect, 'menu');
    },
  }));

  return (
    <div ref={root} className={cn('aegis-split-button', className)} data-size={size}>
      <div className="aegis-split-button-controls" role="group" aria-label={groupLabel}>
        <Button
          data-split-action="primary"
          size={size}
          intent={intent}
          emphasis={emphasis}
          leadingIcon={leadingIcon}
          disabled={disabled}
          loading={loading || pending}
          aria-describedby={error ? errorId : undefined}
          onClick={() => {
            void run(onAction, 'primary');
          }}
        >
          {children}
        </Button>
        <DropdownMenu
          items={items}
          label={menuLabel}
          align="end"
          open={open && !unavailable}
          onOpenChange={(next) => {
            if (!unavailable) setOpen(next);
          }}
          trigger={
            <Button
              data-split-action="menu"
              className="aegis-split-button-menu"
              size={size}
              intent={intent}
              emphasis={emphasis}
              aria-label={menuLabel}
              aria-describedby={error ? errorId : undefined}
              disabled={unavailable || actions.length === 0}
            >
              <ChevronDown size={componentToken('trigger.icon-md')} aria-hidden="true" />
            </Button>
          }
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="aegis-split-button-error">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
