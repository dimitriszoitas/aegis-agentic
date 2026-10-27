import { useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { Tooltip as Primitive } from '@base-ui/react/tooltip';
import { Button, type ButtonProps } from '@/components/button';
import { cn } from '@/lib/utils';
import './icon-button.css';
export interface IconButtonProps extends Omit<ButtonProps, 'leadingIcon' | 'trailingIcon'> {
  'aria-label': string;
  tooltip?: boolean;
}
export function IconButton({
  'aria-label': label,
  tooltip = true,
  className,
  children,
  ...props
}: IconButtonProps) {
  const tokens = useComponentTokenNumbers(['trigger.icon-tooltip-delay', 'trigger.overlay-offset']);
  const button = (
    <Button aria-label={label} {...props} className={cn('aegis-icon-button', className)}>
      {children}
    </Button>
  );
  return tooltip ? (
    <Primitive.Provider delay={tokens['trigger.icon-tooltip-delay']}>
      <Primitive.Root>
        <Primitive.Trigger render={button} />
        <Primitive.Portal>
          <Primitive.Positioner
            className="icon-button-tooltip-positioner"
            sideOffset={tokens['trigger.overlay-offset']}
          >
            <Primitive.Popup role="tooltip" className="icon-button-tooltip">
              {label}
            </Primitive.Popup>
          </Primitive.Positioner>
        </Primitive.Portal>
      </Primitive.Root>
    </Primitive.Provider>
  ) : (
    button
  );
}
