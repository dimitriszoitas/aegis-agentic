import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { Button } from '@/components/button';
import { Link } from '@/components/link';
import { SideSheet } from '@/components/side-sheet';
import { useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { cn } from '@/lib/utils';
import './app-shell.css';

export interface AppShellNavigationContext {
  compact: boolean;
  /** Call after host navigation succeeds; closing does not itself change routes. */
  closeNavigation: () => void;
}
export interface AppShellProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  brand: ReactNode;
  header?: ReactNode;
  navigation: (context: AppShellNavigationContext) => ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  navigationLabel?: string;
  openNavigationLabel?: string;
  closeNavigationLabel?: string;
  skipLabel?: string;
  mainId?: string;
}
/** Responsive application landmarks; the host owns destinations, route state and content. */
export function AppShell({
  brand,
  header,
  navigation,
  children,
  footer,
  navigationLabel = 'Main navigation',
  openNavigationLabel = 'Open navigation',
  closeNavigationLabel = 'Close navigation',
  skipLabel = 'Skip to content',
  mainId: suppliedMainId,
  className,
  ...props
}: AppShellProps) {
  const generatedId = useId();
  const mainId = suppliedMainId ?? `aegis-app-main-${generatedId}`;
  const root = useRef<HTMLDivElement>(null);
  const desktopNavigation = useRef<HTMLElement>(null);
  const mobileTrigger = useRef<HTMLSpanElement>(null);
  const main = useRef<HTMLElement>(null);
  const mobileNavigation = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const mode = useRef(false);
  const moveFocus = useRef(false);
  const tokens = useComponentTokenNumbers(['application.breakpoint-compact']);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const next = element.getBoundingClientRect().width < tokens['application.breakpoint-compact'];
      if (next === mode.current) return;
      const active = document.activeElement;
      moveFocus.current = !!(
        desktopNavigation.current?.contains(active) ||
        mobileNavigation.current?.closest('[role=dialog]')?.contains(active) ||
        mobileTrigger.current?.contains(active)
      );
      mode.current = next;
      setOpen(false);
      setCompact(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [tokens]);
  useLayoutEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    if (compact) mobileTrigger.current?.querySelector('button')?.focus();
    else
      (
        desktopNavigation.current?.querySelector<HTMLElement>(
          'a[href], button:not(:disabled), [tabindex="0"]',
        ) ?? main.current
      )?.focus();
  }, [compact]);
  const closeNavigation = () => setOpen(false);
  return (
    <div {...props} ref={root} className={cn('aegis-app-shell', className)} data-compact={compact}>
      <div className="aegis-app-shell-skip">
        <Link
          href={`#${mainId}`}
          onClick={(event) => {
            event.preventDefault();
            main.current?.focus();
          }}
        >
          {skipLabel}
        </Link>
      </div>
      <header className="aegis-app-shell-header" data-app-shell-slot="header">
        {compact && (
          <span ref={mobileTrigger}>
            <SideSheet
              title={navigationLabel}
              closeLabel={closeNavigationLabel}
              open={open}
              onOpenChange={setOpen}
              size="sm"
              trigger={<Button emphasis="secondary">{openNavigationLabel}</Button>}
            >
              <nav ref={mobileNavigation} aria-label={navigationLabel}>
                {navigation({ compact: true, closeNavigation })}
              </nav>
            </SideSheet>
          </span>
        )}
        <div className="aegis-app-shell-brand">{brand}</div>
        {header && <div className="aegis-app-shell-header-actions">{header}</div>}
      </header>
      <div className="aegis-app-shell-workspace">
        {!compact && (
          <nav
            ref={desktopNavigation}
            className="aegis-app-shell-navigation"
            aria-label={navigationLabel}
            data-app-shell-slot="navigation"
          >
            {navigation({ compact: false, closeNavigation })}
          </nav>
        )}
        <main
          ref={main}
          id={mainId}
          tabIndex={-1}
          className="aegis-app-shell-main"
          data-app-shell-slot="main"
        >
          {children}
        </main>
      </div>
      {footer && (
        <footer className="aegis-app-shell-footer" data-app-shell-slot="footer">
          {footer}
        </footer>
      )}
    </div>
  );
}
