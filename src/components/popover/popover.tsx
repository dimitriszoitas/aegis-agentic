import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import {
  useId,
  useRef,
  forwardRef,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Popover as Primitive } from '@base-ui/react/popover';
import { X } from '@/components/icon';
import { cn } from '../../lib/utils';
import './popover.css';

export interface PopoverProps extends Omit<
  ComponentPropsWithoutRef<typeof Primitive.Root>,
  'children' | 'onOpenChange'
> {
  onOpenChange?: (open: boolean) => void;
  trigger: ReactElement;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Keep the accessible title while hiding the visible header. */
  showHeader?: boolean;
  footer?: ReactNode;
  density?: 'regular' | 'tight';
  label?: string;
  side?: ComponentPropsWithoutRef<typeof Primitive.Positioner>['side'];
  align?: ComponentPropsWithoutRef<typeof Primitive.Positioner>['align'];
  className?: string;
  width?: number | string;
  showClose?: boolean;
}
export function Popover({
  trigger,
  children,
  title,
  description,
  showHeader = true,
  footer,
  density = 'regular',
  label = 'Details',
  side = 'bottom',
  align = 'start',
  className,
  width,
  showClose = false,
  ...rootProps
}: PopoverProps) {
  const tokens = useComponentTokenNumbers(['popover-offset', 'overlay-collision-padding']);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const hasHeader = showHeader && !!(title || description || showClose);
  return (
    <Primitive.Root {...rootProps}>
      <Primitive.Trigger render={trigger} />
      <Primitive.Portal>
        <Primitive.Positioner
          side={side}
          align={align}
          sideOffset={tokens['popover-offset']}
          collisionPadding={tokens['overlay-collision-padding']}
          className="aegis-popover-positioner"
        >
          <Primitive.Popup
            ref={contentRef}
            initialFocus={() => {
              const control = [
                ...(contentRef.current?.querySelectorAll<HTMLElement>(
                  'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]:not(.aegis-popover-body)',
                ) ?? []),
              ].find(
                (element) =>
                  element.getClientRects().length > 0 &&
                  !element.closest('[hidden], [inert], [aria-hidden="true"]'),
              );
              return control ?? true;
            }}
            finalFocus={() => {
              const active = document.activeElement;
              if (active && active !== document.body && !contentRef.current?.contains(active))
                return false;
              return true;
            }}
            className={cn('aegis-popover', className)}
            style={{ width }}
            data-density={density}
            data-header={hasHeader}
            data-close={showClose}
            aria-label={title ? undefined : label}
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
          >
            {hasHeader ? (
              <header className="aegis-popover-header">
                <div className="aegis-popover-heading">
                  <div className="aegis-popover-heading-copy">
                    {title && <h3 id={titleId}>{title}</h3>}
                    {description && (
                      <p id={descriptionId} className="aegis-popover-description">
                        {description}
                      </p>
                    )}
                  </div>
                  {showClose && (
                    <Primitive.Close className="aegis-popover-close" aria-label="Close popover">
                      <X size={componentToken('surface.icon-md')} />
                    </Primitive.Close>
                  )}
                </div>
              </header>
            ) : (
              <>
                {title && (
                  <h3 id={titleId} className="sr-only">
                    {title}
                  </h3>
                )}
                {description && (
                  <p id={descriptionId} className="sr-only">
                    {description}
                  </p>
                )}
                {showClose && (
                  <Primitive.Close
                    className="aegis-popover-close aegis-popover-close-floating"
                    aria-label="Close popover"
                  >
                    <X size={componentToken('surface.icon-md')} />
                  </Primitive.Close>
                )}
              </>
            )}
            <div
              className="aegis-popover-body"
              tabIndex={0}
              role="region"
              aria-labelledby={title ? titleId : undefined}
              aria-label={title ? undefined : label}
            >
              {children}
            </div>
            {footer && <footer className="aegis-popover-footer">{footer}</footer>}
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
export type PopoverCloseProps = ComponentPropsWithoutRef<typeof Primitive.Close> & {
  /** @deprecated Use render={<Button />} for headless composition. */
  asChild?: boolean;
};
export const PopoverClose = forwardRef<HTMLButtonElement, PopoverCloseProps>(function PopoverClose(
  { asChild, children, render, ...props },
  ref,
) {
  if (asChild && !isValidElement(children))
    throw new Error('PopoverClose asChild requires one React element.');
  return (
    <Primitive.Close {...props} ref={ref} render={asChild ? (children as ReactElement) : render}>
      {asChild ? undefined : children}
    </Primitive.Close>
  );
});
