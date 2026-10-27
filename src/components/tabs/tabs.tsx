import { useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Tabs as Primitive } from '@base-ui/react/tabs';
import { DirectionProvider, useDirection } from '@base-ui/react/direction-provider';
import { cn } from '../../lib/utils';
import './tabs.css';

export interface TabItem {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
  content: ReactNode;
  disabled?: boolean;
}
export interface TabsProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'defaultValue'
> {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  activationMode?: 'automatic' | 'manual';
  variant?: 'line' | 'pill';
  label?: string;
  listClassName?: string;
  contentClassName?: string;
  /** One persistent workspace whose data changes with the selected tab. Preserves its local state. */
  sharedContent?: ReactNode;
}
export function Tabs({
  items,
  variant = 'line',
  label = 'Views',
  className,
  listClassName,
  contentClassName,
  defaultValue,
  value,
  onValueChange,
  sharedContent,
  activationMode = 'automatic',
  dir,
  ...props
}: TabsProps) {
  const inheritedDirection = useDirection();
  const firstEnabled = items.find((item) => !item.disabled)?.value;
  const [internalValue, setInternalValue] = useState(defaultValue ?? firstEnabled);
  const activeValue = value ?? internalValue;
  return (
    <DirectionProvider direction={dir === 'rtl' || dir === 'ltr' ? dir : inheritedDirection}>
      <Primitive.Root
        dir={dir}
        {...props}
        value={activeValue ?? null}
        onValueChange={(next) => {
          if (typeof next !== 'string') return;
          if (value === undefined) setInternalValue(next);
          onValueChange?.(next);
        }}
        className={cn('aegis-tabs', `aegis-tabs-${variant}`, className)}
      >
        <div className="aegis-tabs-overflow">
          <Primitive.List
            activateOnFocus={activationMode === 'automatic'}
            className={cn('aegis-tabs-list', listClassName)}
            aria-label={label}
          >
            {items.map((item) => (
              <Primitive.Tab
                key={item.value}
                value={item.value}
                disabled={item.disabled}
                className="aegis-tabs-trigger"
              >
                {item.icon && (
                  <span className="aegis-tabs-icon" aria-hidden>
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="aegis-tabs-count" aria-label={`${item.count} items`}>
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                )}
              </Primitive.Tab>
            ))}
          </Primitive.List>
        </div>
        {sharedContent !== undefined ? (
          <Primitive.Panel
            value={activeValue ?? ''}
            className={cn('aegis-tabs-content', contentClassName)}
          >
            {sharedContent}
          </Primitive.Panel>
        ) : (
          items.map((item) => (
            <Primitive.Panel
              key={item.value}
              value={item.value}
              className={cn('aegis-tabs-content', contentClassName)}
            >
              {item.content}
            </Primitive.Panel>
          ))
        )}
      </Primitive.Root>
    </DirectionProvider>
  );
}
