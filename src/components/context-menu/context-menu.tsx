import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useRef, useState, type ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { ContextMenu as Primitive } from '@base-ui/react/context-menu';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { Check, ChevronRight, Circle, Minus } from '@/components/icon';
import type { DropdownMenuEntry } from '../dropdown-menu';
import { cn } from '../../lib/utils';
import './context-menu.css';

export type ContextMenuEntry = DropdownMenuEntry;
export interface ContextMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** @deprecated Context menus use Base UI native modal focus behavior. */
  modal?: boolean;
  dir?: 'ltr' | 'rtl';
  children: ReactElement;
  items: ContextMenuEntry[];
  disabled?: boolean;
  label?: string;
  className?: string;
}

function MenuEntries({ items }: { items: ContextMenuEntry[] }) {
  const tokens = useComponentTokenNumbers(['submenu-offset', 'trigger.overlay-collision-padding']);
  return items.map((item) => {
    switch (item.type) {
      case 'separator':
        return <Primitive.Separator key={item.id} className="aegis-context-separator" />;
      case 'group':
        return (
          <Primitive.Group key={item.id}>
            {item.label && (
              <Primitive.GroupLabel className="aegis-context-label">
                {item.label}
              </Primitive.GroupLabel>
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
            className="aegis-context-item aegis-context-checkable"
          >
            <Primitive.CheckboxItemIndicator className="aegis-context-indicator">
              {item.checked === 'indeterminate' ? (
                <Minus size={componentToken('trigger.icon-sm')} />
              ) : (
                <Check size={componentToken('trigger.icon-sm')} />
              )}
            </Primitive.CheckboxItemIndicator>
            <span className="aegis-context-item-label">{item.label}</span>
            {item.shortcut && <kbd>{item.shortcut}</kbd>}
          </Primitive.CheckboxItem>
        );
      case 'radio-group':
        return (
          <Primitive.Group key={item.id}>
            {item.label && (
              <Primitive.GroupLabel className="aegis-context-label">
                {item.label}
              </Primitive.GroupLabel>
            )}
            <Primitive.RadioGroup value={item.value} onValueChange={item.onValueChange}>
              {item.options.map((option) => (
                <Primitive.RadioItem
                  key={option.value}
                  value={option.value}
                  closeOnClick
                  disabled={option.disabled}
                  className="aegis-context-item aegis-context-checkable"
                >
                  <Primitive.RadioItemIndicator className="aegis-context-indicator">
                    <Circle size={componentToken('trigger.icon-dot')} fill="currentColor" />
                  </Primitive.RadioItemIndicator>
                  {option.label}
                </Primitive.RadioItem>
              ))}
            </Primitive.RadioGroup>
          </Primitive.Group>
        );
      case 'submenu':
        return (
          <Primitive.SubmenuRoot key={item.id}>
            <Primitive.SubmenuTrigger disabled={item.disabled} className="aegis-context-item">
              {item.icon && (
                <span className="aegis-context-icon" aria-hidden>
                  {item.icon}
                </span>
              )}
              <span className="aegis-context-item-label">{item.label}</span>
              <ChevronRight
                className="aegis-context-sub-arrow"
                size={componentToken('trigger.icon-sm')}
              />
            </Primitive.SubmenuTrigger>
            <Primitive.Portal>
              <Primitive.Positioner
                className="aegis-context-positioner"
                sideOffset={tokens['submenu-offset']}
                collisionPadding={tokens['trigger.overlay-collision-padding']}
              >
                <Primitive.Popup className="aegis-context-content">
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
              'aegis-context-item',
              item.intent === 'destroy' && 'aegis-context-item-destroy',
            )}
          >
            {item.icon && (
              <span className="aegis-context-icon" aria-hidden>
                {item.icon}
              </span>
            )}
            <span className="aegis-context-item-label">{item.label}</span>
            {item.shortcut && <kbd>{item.shortcut}</kbd>}
          </Primitive.Item>
        );
    }
  });
}

export function ContextMenu({
  children,
  items,
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  label = 'Context actions',
  className,
  modal: _modal,
  dir,
}: ContextMenuProps) {
  const tokens = useComponentTokenNumbers([
    'trigger.overlay-offset',
    'trigger.overlay-collision-padding',
  ]);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pointerAnchored, setPointerAnchored] = useState(false);
  const closingWithTab = useRef(false);
  function changeOpen(next: boolean) {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }
  const menu = (
    <Primitive.Root disabled={disabled} open={open ?? internalOpen} onOpenChange={changeOpen}>
      <Primitive.Trigger
        render={children}
        ref={triggerRef}
        aria-disabled={disabled || undefined}
        onContextMenu={() => setPointerAnchored(true)}
        onTouchStart={() => setPointerAnchored(true)}
        tabIndex={0}
        onKeyDownCapture={(event) => {
          // A pointer-opened menu may still be transferring focus from its trigger.
          if (event.key === 'Tab' && (open ?? internalOpen)) {
            event.stopPropagation();
            closingWithTab.current = true;
            flushSync(() => changeOpen(false));
          }
        }}
        onKeyDown={(event) => {
          if (
            !disabled &&
            (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))
          ) {
            event.preventDefault();
            const bounds = event.currentTarget.getBoundingClientRect();
            const trigger = event.currentTarget;
            flushSync(() => {
              trigger.dispatchEvent(
                new MouseEvent('contextmenu', {
                  bubbles: true,
                  cancelable: true,
                  clientX: bounds.left + tokens['trigger.overlay-collision-padding'],
                  clientY: bounds.top + bounds.height / 2,
                }),
              );
            });
            popupRef.current?.focus();
          }
        }}
      />
      <Primitive.Portal>
        <Primitive.Positioner
          className="aegis-context-positioner"
          anchor={pointerAnchored ? undefined : triggerRef}
          collisionPadding={tokens['trigger.overlay-collision-padding']}
        >
          <Primitive.Popup
            ref={popupRef}
            aria-label={label}
            className={cn('aegis-context-content', className)}
            onKeyDownCapture={(event) => {
              if (event.key === 'Tab') {
                event.stopPropagation();
                closingWithTab.current = true;
                flushSync(() => changeOpen(false));
                triggerRef.current?.focus();
              }
            }}
            finalFocus={() => {
              if (closingWithTab.current) {
                closingWithTab.current = false;
                return false;
              }
              return triggerRef.current;
            }}
          >
            <MenuEntries items={items} />
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </Primitive.Root>
  );
  return dir ? <DirectionProvider direction={dir}>{menu}</DirectionProvider> : menu;
}
