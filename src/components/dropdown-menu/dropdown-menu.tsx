import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { type ComponentPropsWithoutRef, type ReactElement, type ReactNode } from 'react';
import { Menu as Primitive } from '@base-ui/react/menu';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { Check, ChevronRight, Circle, Minus } from '@/components/icon';
import { cn } from '../../lib/utils';
import './dropdown-menu.css';

export interface DropdownMenuActionItem {
  type?: 'item';
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  intent?: 'default' | 'destroy';
  onSelect?: () => void;
}
export interface DropdownMenuCheckboxItem {
  type: 'checkbox';
  id: string;
  label: ReactNode;
  checked: boolean | 'indeterminate';
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  shortcut?: string;
}
export interface DropdownMenuRadioOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}
export interface DropdownMenuRadioGroup {
  type: 'radio-group';
  id: string;
  label?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  options: DropdownMenuRadioOption[];
}
export interface DropdownMenuSubmenu {
  type: 'submenu';
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  items: DropdownMenuEntry[];
}
export interface DropdownMenuGroup {
  type: 'group';
  id: string;
  label?: ReactNode;
  items: DropdownMenuEntry[];
}
export interface DropdownMenuSeparator {
  type: 'separator';
  id: string;
}
export type DropdownMenuEntry =
  | DropdownMenuActionItem
  | DropdownMenuCheckboxItem
  | DropdownMenuRadioGroup
  | DropdownMenuSubmenu
  | DropdownMenuGroup
  | DropdownMenuSeparator;
export interface DropdownMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  dir?: 'ltr' | 'rtl';
  trigger: ReactElement;
  items: DropdownMenuEntry[];
  align?: ComponentPropsWithoutRef<typeof Primitive.Positioner>['align'];
  side?: ComponentPropsWithoutRef<typeof Primitive.Positioner>['side'];
  className?: string;
  label?: string;
}

function MenuEntries({ items }: { items: DropdownMenuEntry[] }) {
  const tokens = useComponentTokenNumbers(['submenu-offset', 'trigger.overlay-collision-padding']);
  return items.map((item) => {
    switch (item.type) {
      case 'separator':
        return <Primitive.Separator key={item.id} className="aegis-menu-separator" />;
      case 'group':
        return (
          <Primitive.Group key={item.id}>
            {item.label && (
              <Primitive.GroupLabel className="aegis-menu-label">{item.label}</Primitive.GroupLabel>
            )}
            <MenuEntries items={item.items} />
          </Primitive.Group>
        );
      case 'checkbox':
        return (
          <Primitive.CheckboxItem
            key={item.id}
            checked={item.checked !== false}
            aria-checked={item.checked === 'indeterminate' ? 'mixed' : item.checked}
            onCheckedChange={(checked) =>
              item.onCheckedChange(item.checked === 'indeterminate' ? true : checked)
            }
            disabled={item.disabled}
            closeOnClick={false}
            className="aegis-menu-item aegis-menu-checkable"
          >
            <span className="aegis-menu-item-label">{item.label}</span>
            {item.shortcut && <kbd>{item.shortcut}</kbd>}
            <Primitive.CheckboxItemIndicator className="aegis-menu-indicator">
              {item.checked === 'indeterminate' ? (
                <Minus size={componentToken('trigger.icon-sm')} />
              ) : (
                <Check size={componentToken('trigger.icon-sm')} />
              )}
            </Primitive.CheckboxItemIndicator>
          </Primitive.CheckboxItem>
        );
      case 'radio-group':
        return (
          <Primitive.Group key={item.id}>
            {item.label && (
              <Primitive.GroupLabel className="aegis-menu-label">{item.label}</Primitive.GroupLabel>
            )}
            <Primitive.RadioGroup value={item.value} onValueChange={item.onValueChange}>
              {item.options.map((option) => (
                <Primitive.RadioItem
                  key={option.value}
                  value={option.value}
                  closeOnClick
                  disabled={option.disabled}
                  className="aegis-menu-item aegis-menu-checkable"
                >
                  <span className="aegis-menu-item-label">{option.label}</span>
                  <Primitive.RadioItemIndicator className="aegis-menu-indicator">
                    <Circle size={componentToken('trigger.icon-dot')} fill="currentColor" />
                  </Primitive.RadioItemIndicator>
                </Primitive.RadioItem>
              ))}
            </Primitive.RadioGroup>
          </Primitive.Group>
        );
      case 'submenu':
        return (
          <Primitive.SubmenuRoot key={item.id}>
            <Primitive.SubmenuTrigger disabled={item.disabled} className="aegis-menu-item">
              {item.icon && (
                <span className="aegis-menu-icon" aria-hidden>
                  {item.icon}
                </span>
              )}
              <span className="aegis-menu-item-label">{item.label}</span>
              <ChevronRight
                className="aegis-menu-sub-arrow"
                size={componentToken('trigger.icon-sm')}
              />
            </Primitive.SubmenuTrigger>
            <Primitive.Portal>
              <Primitive.Positioner
                className="aegis-menu-positioner"
                sideOffset={tokens['submenu-offset']}
                collisionPadding={tokens['trigger.overlay-collision-padding']}
              >
                <Primitive.Popup className="aegis-menu-content">
                  <MenuEntries items={item.items} />
                </Primitive.Popup>
              </Primitive.Positioner>
            </Primitive.Portal>
          </Primitive.SubmenuRoot>
        );
      default:
        return (
          <Primitive.Item
            key={item.id}
            disabled={item.disabled}
            onClick={item.onSelect}
            className={cn(
              'aegis-menu-item',
              item.intent === 'destroy' && 'aegis-menu-item-destroy',
            )}
          >
            {item.icon && (
              <span className="aegis-menu-icon" aria-hidden>
                {item.icon}
              </span>
            )}
            <span className="aegis-menu-item-label">{item.label}</span>
            {item.shortcut && <kbd>{item.shortcut}</kbd>}
          </Primitive.Item>
        );
    }
  });
}

export function DropdownMenu({
  trigger,
  items,
  align = 'end',
  side = 'bottom',
  className,
  label = 'Actions',
  modal = false,
  open,
  defaultOpen = false,
  onOpenChange,
  dir,
}: DropdownMenuProps) {
  const tokens = useComponentTokenNumbers([
    'trigger.overlay-offset',
    'trigger.overlay-collision-padding',
  ]);
  const menu = (
    <Primitive.Root modal={modal} open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <Primitive.Trigger
        render={trigger}
        nativeButton={typeof trigger.type !== 'string' || trigger.type === 'button'}
      />
      <Primitive.Portal>
        <Primitive.Positioner
          className="aegis-menu-positioner"
          align={align}
          side={side}
          sideOffset={tokens['trigger.overlay-offset']}
          collisionPadding={tokens['trigger.overlay-collision-padding']}
        >
          <Primitive.Popup aria-label={label} className={cn('aegis-menu-content', className)}>
            <MenuEntries items={items} />
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </Primitive.Root>
  );
  return dir ? <DirectionProvider direction={dir}>{menu}</DirectionProvider> : menu;
}
