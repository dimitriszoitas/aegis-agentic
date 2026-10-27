import { componentToken } from '@/lib/component-design-tokens';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Accordion as Primitive } from '@base-ui/react/accordion';
import { ChevronDown } from '@/components/icon';
import { cn } from '../../lib/utils';
import './accordion.css';

export interface AccordionItem {
  value: string;
  title: ReactNode;
  content: ReactNode;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
}
export type AccordionProps = Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'defaultValue' | 'onChange'
> & {
  items: AccordionItem[];
  variant?: 'divided' | 'contained';
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
} & (
    | {
        type: 'single';
        value?: string;
        defaultValue?: string;
        onValueChange?: (value: string) => void;
        collapsible?: boolean;
      }
    | {
        type: 'multiple';
        value?: string[];
        defaultValue?: string[];
        onValueChange?: (value: string[]) => void;
        collapsible?: never;
      }
  );

/** Compact disclosure rows with consistent nesting; Base UI supplies disclosure state and ARIA behavior. */
export function Accordion(props: AccordionProps) {
  const {
    items,
    variant = 'divided',
    className,
    type,
    value,
    defaultValue,
    onValueChange: _onValueChange,
    collapsible,
    onKeyDown,
    orientation = 'vertical',
    ...rootProps
  } = props;
  const values =
    value === undefined ? undefined : typeof value === 'string' ? (value ? [value] : []) : value;
  const defaults =
    defaultValue === undefined
      ? undefined
      : typeof defaultValue === 'string'
        ? defaultValue
          ? [defaultValue]
          : []
        : defaultValue;
  return (
    <Primitive.Root
      {...rootProps}
      multiple={type === 'multiple'}
      value={values}
      defaultValue={defaults}
      orientation={orientation}
      onValueChange={(next: string[], details) => {
        if (props.type === 'single') {
          if (!collapsible && next.length === 0) {
            details.cancel();
            return;
          }
          props.onValueChange?.(next[0] ?? '');
        } else props.onValueChange?.(next);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          event.defaultPrevented ||
          !(event.target instanceof HTMLElement) ||
          !event.target.matches('.aegis-accordion-trigger')
        )
          return;
        const triggers = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>(
            ':scope > .aegis-accordion-item > .aegis-accordion-header > .aegis-accordion-trigger:not(:disabled)',
          ),
        );
        const index = triggers.indexOf(event.target as HTMLButtonElement);
        const previous =
          orientation === 'horizontal'
            ? getComputedStyle(event.currentTarget).direction === 'rtl'
              ? 'ArrowRight'
              : 'ArrowLeft'
            : 'ArrowUp';
        const next =
          orientation === 'horizontal'
            ? previous === 'ArrowLeft'
              ? 'ArrowRight'
              : 'ArrowLeft'
            : 'ArrowDown';
        const target =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? triggers.length - 1
              : event.key === next
                ? (index + 1) % triggers.length
                : event.key === previous
                  ? (index + triggers.length - 1) % triggers.length
                  : -1;
        if (target >= 0) {
          event.preventDefault();
          triggers[target]?.focus();
        }
      }}
      className={cn('aegis-accordion', `aegis-accordion-${variant}`, className)}
    >
      {items.map((item) => (
        <Primitive.Item
          value={item.value}
          key={item.value}
          disabled={item.disabled}
          className="aegis-accordion-item"
        >
          <Primitive.Header className="aegis-accordion-header">
            <Primitive.Trigger
              className="aegis-accordion-trigger"
              render={(triggerProps, state) => (
                <button
                  {...triggerProps}
                  aria-disabled={(type === 'single' && !collapsible && state.open) || undefined}
                />
              )}
            >
              {item.icon && (
                <span className="aegis-accordion-icon" aria-hidden>
                  {item.icon}
                </span>
              )}
              <span className="aegis-accordion-title">{item.title}</span>
              {item.count !== undefined && (
                <span className="aegis-accordion-count">{item.count}</span>
              )}
              <ChevronDown
                size={componentToken('surface.icon-md')}
                className="aegis-accordion-chevron"
                aria-hidden
              />
            </Primitive.Trigger>
          </Primitive.Header>
          <Primitive.Panel className="aegis-accordion-content">
            <div className="aegis-accordion-content-inner">{item.content}</div>
          </Primitive.Panel>
        </Primitive.Item>
      ))}
    </Primitive.Root>
  );
}
