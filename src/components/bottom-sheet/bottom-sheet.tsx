import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { IconButton } from '@/components/icon-button';
import { X } from '@/components/icon';
import { cn } from '@/lib/utils';
import './bottom-sheet.css';

export interface BottomSheetProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  headerActions?: ReactNode;
  footer?: ReactNode;
  height?: number;
  defaultHeight?: number;
  onHeightChange?: (height: number) => void;
  minHeight?: number;
  maxHeight?: number;
  /** Space preserved for the workspace above the panel. */
  workspaceMinHeight?: number;
  className?: string;
}

/** A nonmodal panel inside a bounded flex-column workspace, between navigation and the AI rail. */
export function BottomSheet({
  title,
  description,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  headerActions,
  footer,
  height,
  defaultHeight: requestedDefaultHeight,
  onHeightChange,
  minHeight: requestedMinHeight,
  maxHeight: requestedMaxHeight,
  workspaceMinHeight: requestedWorkspaceMinHeight,
  className,
}: BottomSheetProps) {
  const tokens = useComponentTokenNumbers([
    'sheet-size',
    'sheet-min-size',
    'sheet-max-size',
    'sheet-content-min-size',
    'sheet-resize-step',
    'sheet-resize-step-large',
  ]);
  const defaultHeight = requestedDefaultHeight ?? tokens['sheet-size'];
  const minHeight = requestedMinHeight ?? tokens['sheet-min-size'];
  const maxHeight = requestedMaxHeight ?? tokens['sheet-max-size'];
  const workspaceMinHeight = requestedWorkspaceMinHeight ?? tokens['sheet-content-min-size'];

  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const [localHeight, setLocalHeight] = useState<number>();
  const [availableHeight, setAvailableHeight] = useState(maxHeight);
  const [resizing, setResizing] = useState(false);
  const [pointerFocus, setPointerFocus] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const focusWithinRef = useRef(false);
  const restoreOnCloseRef = useRef(false);
  const drag = useRef<{ y: number; height: number } | null>(null);
  const stopDragRef = useRef<(() => void) | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const bodyId = useId();
  const isOpen = open ?? localOpen;
  const maximum = Math.max(0, Math.min(maxHeight, availableHeight));
  const minimum = Math.min(minHeight, maximum);
  const panelHeight = Math.max(minimum, Math.min(height ?? localHeight ?? defaultHeight, maximum));

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const parent = panel?.parentElement;
    if (!isOpen || !panel || !parent) return;
    const measure = () => {
      const styles = getComputedStyle(panel);
      const margin = parseFloat(styles.marginTop) + parseFloat(styles.marginBottom);
      setAvailableHeight(Math.max(0, parent.clientHeight - workspaceMinHeight - margin));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    // Switching between Floating and Fixed also changes the outer inset.
    observer.observe(panel);
    return () => observer.disconnect();
  }, [isOpen, workspaceMinHeight]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    restoreOnCloseRef.current = false;
    focusWithinRef.current = !!panel?.contains(document.activeElement);
    return () => {
      stopDragRef.current?.();
      // React can remove the panel before cleanup, so record focus while it is mounted.
      const shouldRestore =
        restoreOnCloseRef.current ||
        focusWithinRef.current ||
        panel?.contains(document.activeElement);
      restoreOnCloseRef.current = false;
      focusWithinRef.current = false;
      if (!shouldRestore || !opener) return;
      requestAnimationFrame(() => {
        if (opener.isConnected && document.activeElement === document.body)
          opener.focus({ preventScroll: true });
      });
    };
  }, [isOpen]);

  function changeHeight(next: number) {
    const clamped = Math.round(Math.max(minimum, Math.min(next, maximum)));
    if (height === undefined) setLocalHeight(clamped);
    onHeightChange?.(clamped);
  }
  function close() {
    restoreOnCloseRef.current = !!panelRef.current?.contains(document.activeElement);
    stopDragRef.current?.();
    if (open === undefined) setLocalOpen(false);
    onOpenChange?.(false);
  }
  function stopDrag() {
    if (!drag.current) return;
    drag.current = null;
    setResizing(false);
    document.documentElement.removeAttribute('data-bottom-sheet-resizing');
    window.removeEventListener('blur', stopDrag);
    stopDragRef.current = null;
  }

  if (!isOpen) return null;
  return (
    <section
      ref={panelRef}
      className={cn('aegis-bottom-sheet', className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      data-resizing={resizing || undefined}
      style={{ '--bottom-sheet-height': `${panelHeight}px` } as CSSProperties}
      onFocusCapture={() => {
        focusWithinRef.current = true;
      }}
      onBlurCapture={(event) => {
        focusWithinRef.current = !!event.currentTarget.contains(event.relatedTarget);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault();
          close();
        }
      }}
    >
      <div
        className="aegis-bottom-sheet-resizer"
        role="separator"
        aria-label="Resize bottom panel"
        aria-orientation="horizontal"
        aria-controls={bodyId}
        aria-valuemin={minimum}
        aria-valuemax={maximum}
        aria-valuenow={panelHeight}
        aria-valuetext={`${Math.round(panelHeight)} pixels high`}
        data-pointer-focus={pointerFocus || undefined}
        tabIndex={0}
        onFocus={() => setPointerFocus(false)}
        onBlur={() => setPointerFocus(false)}
        onPointerDown={(event) => {
          if (event.button !== 0 || drag.current) return;
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          setPointerFocus(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { y: event.clientY, height: panelHeight };
          setResizing(true);
          document.documentElement.setAttribute('data-bottom-sheet-resizing', '');
          stopDragRef.current = stopDrag;
          window.addEventListener('blur', stopDrag);
        }}
        onPointerMove={(event) => {
          if (drag.current) changeHeight(drag.current.height + drag.current.y - event.clientY);
        }}
        onPointerUp={() => stopDragRef.current?.()}
        onPointerCancel={() => stopDragRef.current?.()}
        onLostPointerCapture={() => stopDragRef.current?.()}
        onKeyDown={(event) => {
          setPointerFocus(false);
          const step = event.shiftKey
            ? tokens['sheet-resize-step-large']
            : tokens['sheet-resize-step'];
          if (event.key === 'ArrowUp') changeHeight(panelHeight + step);
          else if (event.key === 'ArrowDown') changeHeight(panelHeight - step);
          else if (event.key === 'Home') changeHeight(minimum);
          else if (event.key === 'End') changeHeight(maximum);
          else return;
          event.preventDefault();
        }}
      >
        <span />
      </div>
      <header className="aegis-bottom-sheet-header">
        <div className="aegis-bottom-sheet-heading">
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descriptionId}>{description}</p>}
        </div>
        <div className="aegis-bottom-sheet-actions">
          {headerActions}
          <IconButton emphasis="ghost" size="sm" aria-label="Close bottom panel" onClick={close}>
            <X size={componentToken('surface.icon-md')} />
          </IconButton>
        </div>
      </header>
      <div
        id={bodyId}
        className="aegis-bottom-sheet-body"
        tabIndex={0}
        role="region"
        aria-labelledby={titleId}
      >
        {children}
      </div>
      {footer && <footer className="aegis-bottom-sheet-footer">{footer}</footer>}
    </section>
  );
}
