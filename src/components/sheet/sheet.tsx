import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { IconButton } from '@/components/icon-button';
import { X } from '@/components/icon';
import { cn } from '@/lib/utils';
import {
  clampSheetSize,
  sheetBounds,
  sheetKeyboardSize,
  sheetPointerSize,
  type SheetPlacement,
} from './sheet-state';
import './sheet.css';

export type { SheetPlacement } from './sheet-state';

export interface SheetProps {
  /** The workspace content that the sheet pushes within this container. */
  content: ReactNode;
  title: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  placement?: SheetPlacement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Thickness in CSS pixels: height for bottom, width for left/right. */
  size?: number;
  defaultSize?: number;
  onSizeChange?: (size: number) => void;
  minSize?: number;
  maxSize?: number;
  /** Minimum space reserved for the main content on the resizing axis. */
  contentMinSize?: number;
  headerActions?: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
}

/** A nonmodal sheet that pushes its own bounded workspace, without a viewport portal. */
export function Sheet({
  content,
  title,
  children,
  description,
  placement = 'bottom',
  open,
  defaultOpen = false,
  onOpenChange,
  size,
  defaultSize: requestedDefaultSize,
  onSizeChange,
  minSize: requestedMinSize,
  maxSize: requestedMaxSize,
  contentMinSize: requestedContentMinSize,
  headerActions,
  footer,
  closeLabel = 'Close sheet',
  restoreFocusRef,
  className,
  style,
}: SheetProps) {
  const tokens = useComponentTokenNumbers([
    'sheet-size',
    'sheet-min-size',
    'sheet-max-size',
    'sheet-content-min-size',
    'sheet-resize-step',
    'sheet-resize-step-large',
  ]);
  const defaultSize = requestedDefaultSize ?? tokens['sheet-size'];
  const minSize = requestedMinSize ?? tokens['sheet-min-size'];
  const maxSize = requestedMaxSize ?? tokens['sheet-max-size'];
  const contentMinSize = requestedContentMinSize ?? tokens['sheet-content-min-size'];

  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const [localSize, setLocalSize] = useState<number>();
  const [available, setAvailable] = useState(maxSize + contentMinSize);
  const [resizing, setResizing] = useState(false);
  const [pointerFocus, setPointerFocus] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const focusedRef = useRef(false);
  const dragRef = useRef<{
    coordinate: number;
    size: number;
    pointerId: number;
    handle: HTMLElement;
  } | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const wasOpenRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const panelId = useId();
  const isOpen = open ?? localOpen;
  const horizontal = placement === 'bottom';
  const bounds = sheetBounds(available, contentMinSize, minSize, maxSize);
  const panelSize = clampSheetSize(size ?? localSize ?? defaultSize, bounds);
  const locked = bounds.max === bounds.min;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const styles = getComputedStyle(root);
      const padding = horizontal
        ? parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom)
        : parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const gap = parseFloat(horizontal ? styles.rowGap : styles.columnGap) || 0;
      setAvailable(
        Math.max(0, (horizontal ? root.clientHeight : root.clientWidth) - padding - gap),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [horizontal]);

  useLayoutEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const active = document.activeElement;
      openerRef.current =
        restoreFocusRef?.current ??
        (active instanceof HTMLElement && active !== document.body ? active : null);
      focusedRef.current = false;
    }
    if (!isOpen && wasOpenRef.current) {
      stopRef.current();
      const target = restoreFocusRef?.current ?? openerRef.current;
      if (focusedRef.current && target?.isConnected) {
        requestAnimationFrame(() => {
          if (document.activeElement === document.body) target.focus({ preventScroll: true });
        });
      }
      focusedRef.current = false;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, restoreFocusRef]);

  useLayoutEffect(() => {
    stopRef.current();
  }, [placement]);

  useLayoutEffect(() => () => stopRef.current(), []);

  function changeSize(next: number) {
    const value = clampSheetSize(next, bounds);
    if (size === undefined) setLocalSize(value);
    onSizeChange?.(value);
  }

  function stopDrag() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (drag.handle.hasPointerCapture(drag.pointerId))
      drag.handle.releasePointerCapture(drag.pointerId);
    window.removeEventListener('blur', stopDrag);
    setResizing(false);
  }

  function close() {
    focusedRef.current = !!panelRef.current?.contains(document.activeElement);
    stopRef.current();
    if (open === undefined) setLocalOpen(false);
    onOpenChange?.(false);
  }

  return (
    <div
      ref={rootRef}
      className={cn('aegis-contained-sheet', className)}
      data-placement={placement}
      data-resizing={resizing || undefined}
      style={style}
    >
      <div className="aegis-contained-sheet-content">{content}</div>
      {isOpen && (
        <section
          ref={panelRef}
          id={panelId}
          className="aegis-contained-sheet-panel"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          style={{ '--sheet-size': `${panelSize}px` } as CSSProperties}
          onFocusCapture={() => {
            focusedRef.current = true;
          }}
          onBlurCapture={(event) => {
            // Removal may report no related target; retain the last focused state for close restoration.
            if (event.relatedTarget)
              focusedRef.current = event.currentTarget.contains(event.relatedTarget);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !event.defaultPrevented) {
              event.preventDefault();
              close();
            }
          }}
        >
          <div
            className="aegis-contained-sheet-resizer"
            role="separator"
            aria-label={`Resize ${placement} sheet`}
            aria-orientation={horizontal ? 'horizontal' : 'vertical'}
            aria-controls={panelId}
            aria-valuemin={bounds.min}
            aria-valuemax={bounds.max}
            aria-valuenow={panelSize}
            aria-valuetext={`${panelSize} pixels ${horizontal ? 'high' : 'wide'}`}
            aria-disabled={locked || undefined}
            data-pointer-focus={pointerFocus || undefined}
            tabIndex={0}
            onFocus={() => setPointerFocus(false)}
            onBlur={() => setPointerFocus(false)}
            onPointerDown={(event) => {
              if (event.button !== 0 || locked || dragRef.current) return;
              event.preventDefault();
              event.currentTarget.focus({ preventScroll: true });
              setPointerFocus(true);
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = {
                coordinate: horizontal ? event.clientY : event.clientX,
                size: panelSize,
                pointerId: event.pointerId,
                handle: event.currentTarget,
              };
              stopRef.current = stopDrag;
              window.addEventListener('blur', stopDrag);
              setResizing(true);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || event.pointerId !== drag.pointerId) return;
              event.preventDefault();
              const coordinate = horizontal ? event.clientY : event.clientX;
              changeSize(sheetPointerSize(placement, drag.size, coordinate - drag.coordinate));
            }}
            onPointerUp={() => stopRef.current()}
            onPointerCancel={() => stopRef.current()}
            onLostPointerCapture={() => stopRef.current()}
            onKeyDown={(event) => {
              setPointerFocus(false);
              const next = sheetKeyboardSize(
                placement,
                panelSize,
                event.key,
                event.shiftKey,
                bounds,
                { regular: tokens['sheet-resize-step'], large: tokens['sheet-resize-step-large'] },
              );
              if (next === null || locked) return;
              event.preventDefault();
              changeSize(next);
            }}
          >
            <span aria-hidden="true" />
          </div>
          <header className="aegis-contained-sheet-header">
            <div className="aegis-contained-sheet-heading">
              <h2 id={titleId}>{title}</h2>
              {description && <p id={descriptionId}>{description}</p>}
            </div>
            <div className="aegis-contained-sheet-actions">
              {headerActions}
              <IconButton size="sm" emphasis="ghost" aria-label={closeLabel} onClick={close}>
                <X size={componentToken('surface.icon-md')} />
              </IconButton>
            </div>
          </header>
          <div
            className="aegis-contained-sheet-body"
            tabIndex={0}
            role="region"
            aria-label="Sheet contents"
          >
            {children}
          </div>
          {footer && <footer className="aegis-contained-sheet-footer">{footer}</footer>}
        </section>
      )}
    </div>
  );
}
