import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { Dialog as Primitive } from '@base-ui/react/dialog';
import { ChevronLeft, ChevronRight, X } from '@/components/icon';
import { cn } from '../../lib/utils';
import { useInputFocusModality } from '@/lib/use-input-focus';
import './side-sheet.css';

export interface SideSheetProps extends Omit<
  ComponentPropsWithoutRef<typeof Primitive.Root>,
  'children' | 'modal' | 'onOpenChange'
> {
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  trigger?: ReactElement;
  children?: ReactNode;
  footer?: ReactNode;
  /** Optional calls to action below the title row, alongside result navigation. */
  headerActions?: ReactNode;
  /** Backward-compatible alias for headerActions. */
  actions?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  docked?: boolean;
  /** Allow pointer and keyboard resizing from the left edge on desktop. */
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  /** One-based position within the current filtered result set. */
  position?: number;
  total?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  closeLabel?: string;
}

function SheetResizeHandle({
  docked,
  minWidth,
  maxWidth,
  widthRef,
  panelId,
}: {
  docked: boolean;
  minWidth: number;
  maxWidth: number;
  widthRef: RefObject<number | null>;
  panelId: string;
}) {
  const handle = useRef<HTMLDivElement>(null);
  const tokens = useComponentTokenNumbers([
    'side-sheet-workspace-min-width',
    'side-sheet-resize-step',
    'side-sheet-resize-step-large',
  ]);
  const panel = useRef<HTMLElement | null>(null);
  const limits = useRef({ min: minWidth, max: maxWidth });
  const drag = useRef<{ pointerId: number; x: number; width: number } | null>(null);
  const [size, setSize] = useState({ width: minWidth, min: minWidth, max: maxWidth });
  const resize = useCallback(
    (next: number) => {
      const element = panel.current;
      if (!element) return;
      const width = Math.round(Math.max(limits.current.min, Math.min(limits.current.max, next)));
      widthRef.current = width;
      element.style.setProperty('--sheet-resized-width', `${width}px`);
      element.dataset.resized = 'true';
      setSize((current) =>
        current.width === width &&
        current.min === limits.current.min &&
        current.max === limits.current.max
          ? current
          : { width, ...limits.current },
      );
    },
    [widthRef],
  );
  useLayoutEffect(() => {
    const element = handle.current?.closest<HTMLElement>('.aegis-sheet');
    if (!element) return;
    panel.current = element;
    const parent = element.parentElement;
    const flexibleSiblings =
      docked && parent
        ? [...parent.children].filter(
            (child): child is HTMLElement =>
              child instanceof HTMLElement &&
              child !== element &&
              Number(getComputedStyle(child).flexGrow) > 0,
          )
        : [];
    function measure() {
      if (!element) return;
      const style = getComputedStyle(element);
      const inset =
        Number.parseFloat(style.getPropertyValue('--group-surface-overlay-chrome-inset')) || 0;
      const viewportWidth = document.documentElement.clientWidth - 2 * inset;
      const available = flexibleSiblings.length
        ? element.getBoundingClientRect().width +
          flexibleSiblings.reduce((sum, sibling) => sum + sibling.getBoundingClientRect().width, 0)
        : (parent?.clientWidth ?? viewportWidth);
      // Keep a useful workspace beside a docked sheet; overlays use the viewport.
      const maximum = Math.max(
        1,
        Math.min(
          maxWidth,
          viewportWidth,
          docked
            ? Math.min(
                available,
                Math.max(minWidth, available - tokens['side-sheet-workspace-min-width']),
              )
            : viewportWidth,
        ),
      );
      limits.current = { min: Math.min(minWidth, maximum), max: maximum };
      resize(widthRef.current ?? element.getBoundingClientRect().width);
    }
    measure();
    const observer = new ResizeObserver(measure);
    if (parent) observer.observe(parent);
    for (const sibling of flexibleSiblings) observer.observe(sibling);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      panel.current = null;
    };
  }, [docked, minWidth, maxWidth, widthRef, resize, tokens]);
  function finishResize() {
    drag.current = null;
    if (panel.current) delete panel.current.dataset.resizing;
  }
  return (
    <div
      ref={handle}
      className="aegis-sheet-resize-handle"
      role="separator"
      tabIndex={0}
      aria-label="Resize side panel"
      aria-controls={panelId}
      aria-orientation="vertical"
      aria-valuemin={Math.round(size.min)}
      aria-valuemax={Math.round(size.max)}
      aria-valuenow={size.width}
      aria-valuetext={`${size.width} pixels wide`}
      onPointerDown={(event) => {
        if (event.button !== 0 || !panel.current) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          width: panel.current.getBoundingClientRect().width,
        };
        panel.current.dataset.resizing = 'true';
      }}
      onPointerMove={(event) => {
        if (drag.current?.pointerId === event.pointerId)
          resize(drag.current.width + drag.current.x - event.clientX);
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
        finishResize();
      }}
      onPointerCancel={finishResize}
      onLostPointerCapture={finishResize}
      onKeyDown={(event) => {
        const current = widthRef.current ?? size.width;
        const step = event.shiftKey
          ? tokens['side-sheet-resize-step-large']
          : tokens['side-sheet-resize-step'];
        const next =
          event.key === 'ArrowLeft'
            ? current + step
            : event.key === 'ArrowRight'
              ? current - step
              : event.key === 'Home'
                ? limits.current.min
                : event.key === 'End'
                  ? limits.current.max
                  : undefined;
        if (next === undefined) return;
        event.preventDefault();
        resize(next);
      }}
    />
  );
}
export interface SideSheetSectionProps {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}
export function SideSheetSection({ title, children, className }: SideSheetSectionProps) {
  return (
    <section className={cn('aegis-sheet-section', className)}>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}
export interface SideSheetFieldProps {
  label: ReactNode;
  children: ReactNode;
}
export function SideSheetField({ label, children }: SideSheetFieldProps) {
  return (
    <div className="aegis-sheet-field">
      <div className="aegis-sheet-field-label">{label}</div>
      <div className="aegis-sheet-field-value">{children}</div>
    </div>
  );
}

function SheetHeader({
  title,
  description,
  actions,
  position,
  total,
  onPrevious,
  onNext,
  onClose,
  titleId,
  descriptionId,
  docked,
  closeLabel = 'Close detail panel',
}: Pick<
  SideSheetProps,
  | 'title'
  | 'description'
  | 'actions'
  | 'position'
  | 'total'
  | 'onPrevious'
  | 'onNext'
  | 'docked'
  | 'closeLabel'
> & { onClose: () => void; titleId: string; descriptionId: string }) {
  return (
    <header className="aegis-sheet-header">
      <div className="aegis-sheet-heading-row">
        <div className="aegis-sheet-heading">
          {docked ? (
            <h2 id={titleId} className="aegis-sheet-title">
              {title}
            </h2>
          ) : (
            <Primitive.Title id={titleId} className="aegis-sheet-title">
              {title}
            </Primitive.Title>
          )}
          {description &&
            (docked ? (
              <p id={descriptionId} className="aegis-sheet-description">
                {description}
              </p>
            ) : (
              <Primitive.Description id={descriptionId} className="aegis-sheet-description">
                {description}
              </Primitive.Description>
            ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="aegis-sheet-icon-button"
          aria-label={closeLabel}
        >
          <X size={componentToken('surface.icon-lg')} />
        </button>
      </div>
      {((position !== undefined && total !== undefined) || actions) && (
        <div className="aegis-sheet-toolbar">
          {position !== undefined && total !== undefined && (
            <div className="aegis-sheet-navigation" aria-label="Record navigation">
              <button
                type="button"
                className="aegis-sheet-icon-button"
                onClick={onPrevious}
                disabled={!onPrevious || position <= 1}
                aria-label="Previous record"
              >
                <ChevronLeft size={componentToken('surface.icon-md')} />
              </button>
              <span aria-live="polite">
                {position} of {total}
              </span>
              <button
                type="button"
                className="aegis-sheet-icon-button"
                onClick={onNext}
                disabled={!onNext || position >= total}
                aria-label="Next record"
              >
                <ChevronRight size={componentToken('surface.icon-md')} />
              </button>
            </div>
          )}
          {actions && <div className="aegis-sheet-actions">{actions}</div>}
        </div>
      )}
    </header>
  );
}

function OverlayContent({
  children,
  className,
  titleId,
  descriptionId,
  panelId,
}: {
  children: ReactNode;
  className: string;
  trigger?: ReactElement;
  titleId: string;
  descriptionId?: string;
  panelId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Primitive.Popup
      ref={ref}
      id={panelId}
      className={className}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      initialFocus={() =>
        ref.current?.querySelector<HTMLButtonElement>('.aegis-sheet-icon-button') ?? ref.current
      }
      finalFocus={() => {
        const current = document.activeElement;
        return !(current && current !== document.body && !ref.current?.contains(current));
      }}
    >
      {children}
    </Primitive.Popup>
  );
}

function DockedContent({
  children,
  className,
  titleId,
  descriptionId,
  panelId,
  onClose,
}: {
  children: ReactNode;
  className: string;
  titleId: string;
  descriptionId?: string;
  panelId: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [previousFocus] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const active = document.activeElement;
    const opener =
      active instanceof HTMLElement && !panel.contains(active) ? active : previousFocus;
    return () => {
      if (!panel.contains(document.activeElement) || !opener) return;
      requestAnimationFrame(() => {
        const current = document.activeElement;
        // Preserve focus when the user or the next view has already moved it elsewhere.
        if (opener.isConnected && (current === document.body || panel.contains(current))) {
          opener.focus({ preventScroll: true });
        }
      });
    };
  }, [previousFocus]);
  return (
    <aside
      ref={ref}
      id={panelId}
      className={className}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      {children}
    </aside>
  );
}

export function SideSheet({
  open,
  defaultOpen = false,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  headerActions,
  actions,
  size = 'md',
  className,
  docked = false,
  resizable = false,
  minWidth: requestedMinWidth,
  maxWidth: requestedMaxWidth,
  position,
  total,
  onPrevious,
  onNext,
  closeLabel,
  ...rootProps
}: SideSheetProps) {
  useInputFocusModality();
  const tokens = useComponentTokenNumbers(['side-sheet-min-width', 'side-sheet-max-width']);
  const minWidth = requestedMinWidth ?? tokens['side-sheet-min-width'];
  const maxWidth = requestedMaxWidth ?? tokens['side-sheet-max-width'];

  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const titleId = useId();
  const descriptionId = useId();
  const panelId = useId();
  const widthRef = useRef<number | null>(null);
  function changeOpen(next: boolean) {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }
  const contents = (
    <>
      {resizable && (
        <SheetResizeHandle
          docked={docked}
          minWidth={minWidth}
          maxWidth={maxWidth}
          widthRef={widthRef}
          panelId={panelId}
        />
      )}
      <SheetHeader
        title={title}
        description={description}
        actions={headerActions ?? actions}
        position={position}
        total={total}
        onPrevious={onPrevious}
        onNext={onNext}
        onClose={() => changeOpen(false)}
        titleId={titleId}
        descriptionId={descriptionId}
        docked={docked}
        closeLabel={closeLabel}
      />
      <div className="aegis-sheet-body" tabIndex={0} role="region" aria-labelledby={titleId}>
        {children}
      </div>
      {footer && <footer className="aegis-sheet-footer">{footer}</footer>}
    </>
  );
  const classes = cn(
    'aegis-sheet',
    `aegis-sheet-${size}`,
    docked && 'aegis-sheet-docked',
    resizable && 'aegis-sheet-resizable',
    className,
  );
  return (
    <Primitive.Root
      {...rootProps}
      open={isOpen}
      onOpenChange={changeOpen}
      modal={!docked}
      disablePointerDismissal={docked || rootProps.disablePointerDismissal}
    >
      {trigger && <Primitive.Trigger render={trigger} />}
      {docked ? (
        isOpen && (
          <DockedContent
            className={classes}
            titleId={titleId}
            panelId={panelId}
            descriptionId={description ? descriptionId : undefined}
            onClose={() => changeOpen(false)}
          >
            {contents}
          </DockedContent>
        )
      ) : (
        <Primitive.Portal>
          <Primitive.Backdrop data-aegis-overlay className="aegis-sheet-overlay" />
          <OverlayContent
            className={classes}
            trigger={trigger}
            titleId={titleId}
            panelId={panelId}
            descriptionId={description ? descriptionId : undefined}
          >
            {contents}
          </OverlayContent>
        </Primitive.Portal>
      )}
    </Primitive.Root>
  );
}
