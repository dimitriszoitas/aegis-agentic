import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ConfirmDialog } from '@/components/modal';
import './unsaved-navigation-guard.css';

export interface UnsavedNavigationGuardOptions {
  dirty: boolean;
  title?: ReactNode;
  description?: ReactNode;
  leaveLabel?: string;
  stayLabel?: string;
  /** Browser close/reload prompt only. Browsers choose the text and may suppress it. */
  beforeUnload?: boolean;
  /** Called after permission to leave, before the requested navigation. May reject to keep the dialog open. */
  onDiscard?: () => void | Promise<void>;
}
export interface UnsavedNavigationGuardController {
  /** The host must route every guarded transition through this function. Concurrent requests resolve false. */
  requestNavigation: (navigate: () => void | Promise<void>) => Promise<boolean>;
  pending: boolean;
  dialog: ReactNode;
}
interface Request {
  navigate: () => void | Promise<void>;
  resolve: (allowed: boolean) => void;
}
export function useUnsavedNavigationGuard({
  dirty,
  title = 'Discard unsaved changes?',
  description = 'Your changes have not been saved.',
  leaveLabel = 'Discard and leave',
  stayLabel = 'Keep editing',
  beforeUnload = true,
  onDiscard,
}: UnsavedNavigationGuardOptions): UnsavedNavigationGuardController {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const request = useRef<Request | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.resolve(false);
      request.current = null;
    };
  }, []);
  useEffect(() => {
    if (!dirty || !beforeUnload) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, beforeUnload]);
  async function execute(discard: boolean, guarded = true) {
    const active = request.current;
    if (!active || busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      if (discard) await onDiscard?.();
      if (!mounted.current || request.current !== active) return;
      await active.navigate();
      active.resolve(true);
      if (request.current === active) request.current = null;
      if (mounted.current) setOpen(false);
    } catch (error) {
      // ConfirmDialog displays this rejection and retains the same requested transition for retry.
      if (!guarded) {
        active.resolve(false);
        request.current = null;
      }
      throw error;
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }
  function requestNavigation(navigate: () => void | Promise<void>): Promise<boolean> {
    if (request.current || busy.current || !mounted.current) return Promise.resolve(false);
    return new Promise((resolve) => {
      request.current = { navigate, resolve };
      if (dirty) setOpen(true);
      else
        void execute(false, false).catch(() => {
          /* Rejection resolves false for an unguarded transition. Host reports route failures. */
        });
    });
  }
  return {
    requestNavigation,
    pending,
    dialog: (
      <ConfirmDialog
        open={open}
        title={title}
        description={description}
        confirmLabel={leaveLabel}
        cancelLabel={stayLabel}
        loading={pending}
        onOpenChange={(next) => {
          if (busy.current) return;
          setOpen(next);
          if (!next) {
            request.current?.resolve(false);
            request.current = null;
          }
        }}
        onConfirm={() => execute(dirty)}
      />
    ),
  };
}
export interface UnsavedNavigationGuardProps extends UnsavedNavigationGuardOptions {
  children: (controller: Omit<UnsavedNavigationGuardController, 'dialog'>) => ReactNode;
}
/** Router-neutral adapter. It does not intercept links, history changes, or router APIs by itself. */
export function UnsavedNavigationGuard({ children, ...options }: UnsavedNavigationGuardProps) {
  const { dialog, ...controller } = useUnsavedNavigationGuard(options);
  return (
    <div className="aegis-unsaved-navigation-guard">
      {children(controller)}
      {dialog}
    </div>
  );
}
