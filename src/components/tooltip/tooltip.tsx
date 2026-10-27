import { useComponentTokenNumbers } from '@/lib/component-design-tokens';
import {
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Tooltip as Primitive } from '@base-ui/react/tooltip';
import { cn } from '../../lib/utils';
import './tooltip.css';

export interface TooltipProps {
  children: ReactElement;
  content: ReactNode;
  side?: ComponentPropsWithoutRef<typeof Primitive.Positioner>['side'];
  align?: ComponentPropsWithoutRef<typeof Primitive.Positioner>['align'];
  delayDuration?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'inverted';
}

export function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration,
  open,
  defaultOpen,
  onOpenChange,
  className,
  disabled = false,
  variant = 'default',
}: TooltipProps) {
  const tokens = useComponentTokenNumbers([
    'tooltip-delay',
    'feedback.overlay-offset',
    'feedback.overlay-collision-padding',
    'tooltip-arrow-width',
    'tooltip-arrow-height',
  ]);
  const id = useId();
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);
  const visible = open ?? internalOpen;
  const existingDescription = (children as ReactElement<{ 'aria-describedby'?: string }>).props[
    'aria-describedby'
  ];
  const description =
    [existingDescription, visible ? id : undefined].filter(Boolean).join(' ') || undefined;
  if (disabled || content === undefined || content === null) return children;
  return (
    <Primitive.Provider delay={delayDuration ?? tokens['tooltip-delay']}>
      <Primitive.Root
        open={visible}
        onOpenChange={(next) => {
          if (open === undefined) setInternalOpen(next);
          onOpenChange?.(next);
        }}
      >
        <Primitive.Trigger render={children} aria-describedby={description} />
        <Primitive.Portal>
          <Primitive.Positioner
            className="aegis-tooltip-positioner"
            side={side}
            align={align}
            sideOffset={tokens['feedback.overlay-offset']}
            collisionPadding={tokens['feedback.overlay-collision-padding']}
          >
            <Primitive.Popup
              id={id}
              role="tooltip"
              className={cn('aegis-tooltip', className)}
              data-variant={variant}
            >
              {content}
              <Primitive.Arrow className="aegis-tooltip-arrow-positioner">
                <svg
                  className="aegis-tooltip-arrow"
                  viewBox="0 0 12 6"
                  width={tokens['tooltip-arrow-width']}
                  height={tokens['tooltip-arrow-height']}
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M0 0H12L6 6Z" />
                  <path className="aegis-tooltip-arrow-outline" d="M0 0L6 6L12 0" />
                </svg>
              </Primitive.Arrow>
            </Primitive.Popup>
          </Primitive.Positioner>
        </Primitive.Portal>
      </Primitive.Root>
    </Primitive.Provider>
  );
}

export interface RichTooltipProps extends Omit<TooltipProps, 'content'> {
  title: ReactNode;
  description: ReactNode;
  shortcut?: ReactNode;
}
export function RichTooltip({
  title,
  description,
  shortcut,
  className,
  ...props
}: RichTooltipProps) {
  return (
    <Tooltip
      {...props}
      className={cn('aegis-tooltip-rich', className)}
      content={
        <>
          <div className="aegis-tooltip-heading">
            {title}
            {shortcut && <kbd>{shortcut}</kbd>}
          </div>
          <div className="aegis-tooltip-description">{description}</div>
        </>
      }
    />
  );
}
