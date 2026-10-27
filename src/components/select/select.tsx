import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useId, useState, type ReactNode } from 'react';
import { Select as Primitive } from '@base-ui/react/select';
import { Check, ChevronDown, ChevronUp } from '@/components/icon';
import { DirectionProvider, useDirection } from '@base-ui/react/direction-provider';
import { cn } from '@/lib/utils';
import { useFieldControl, type FieldControlProps } from '@/components/field';
import './select.css';

export interface SelectOption {
  /** Stable, nonempty form value. */
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps extends FieldControlProps {
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  name?: string;
  form?: string;
  autoComplete?: string;
  readOnly?: boolean;
  dir?: 'ltr' | 'rtl';
  label?: ReactNode;
  'aria-label'?: string;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  contentClassName?: string;
}

/** A form-compatible single select with Base UI keyboard navigation and typeahead. */
export function Select({
  options,
  value,
  defaultValue = '',
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  label,
  placeholder = 'Choose an option',
  size = 'md',
  className,
  contentClassName,
  dir,
  id,
  required,
  disabled,
  invalid,
  'aria-label': ariaLabel,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: SelectProps) {
  const inheritedDirection = useDirection();
  const tokens = useComponentTokenNumbers(['picker-offset', 'input.overlay-collision-padding']);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const selectedValue = value ?? internalValue;
  const labelId = `aegis-select-label-${useId()}`;
  const control = useFieldControl({
    id,
    required,
    disabled,
    invalid,
    'aria-labelledby': labelledBy ?? (label ? labelId : undefined),
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
  });
  const selected = options.find((option) => option.value === selectedValue);
  const groups = [...new Set(options.map((option) => option.group ?? ''))];
  return (
    <DirectionProvider direction={dir ?? inheritedDirection}>
      <div className={cn('aegis-select-field', className)} dir={dir}>
        {label && (
          <label id={labelId} htmlFor={control.id} className="aegis-field-label">
            {label}
          </label>
        )}
        <Primitive.Root
          {...props}
          items={options}
          open={isOpen}
          onOpenChange={(next) => {
            if (open === undefined) setInternalOpen(next);
            onOpenChange?.(next);
          }}
          value={selectedValue || null}
          required={control.required}
          disabled={control.disabled}
          onValueChange={(next) => {
            const nextValue = next ?? '';
            if (value === undefined) setInternalValue(nextValue);
            onValueChange?.(nextValue);
          }}
        >
          <Primitive.Trigger
            id={control.id}
            className="aegis-select-trigger"
            data-size={size}
            data-placeholder={!selected || undefined}
            aria-label={ariaLabel}
            aria-labelledby={control['aria-labelledby']}
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
          >
            {selected?.icon && (
              <span className="aegis-select-icon" aria-hidden="true">
                {selected.icon}
              </span>
            )}
            <span className="aegis-select-value" title={selected?.label ?? placeholder}>
              <Primitive.Value placeholder={placeholder} />
            </span>
            <Primitive.Icon className="aegis-select-chevron">
              <ChevronDown size={componentToken('input.icon-md')} aria-hidden="true" />
            </Primitive.Icon>
          </Primitive.Trigger>
          <Primitive.Portal>
            <Primitive.Positioner
              className="aegis-select-positioner"
              align="start"
              alignItemWithTrigger={false}
              sideOffset={tokens['picker-offset']}
              collisionPadding={tokens['input.overlay-collision-padding']}
            >
              <Primitive.Popup className={cn('aegis-select-content', contentClassName)}>
                <Primitive.ScrollUpArrow className="aegis-select-scroll">
                  <ChevronUp size={componentToken('input.icon-md')} aria-hidden="true" />
                </Primitive.ScrollUpArrow>
                <Primitive.List
                  className="aegis-select-viewport"
                  aria-label={
                    ariaLabel ?? (typeof label === 'string' ? label : 'Available options')
                  }
                  aria-labelledby={control['aria-labelledby']}
                >
                  {groups.map((group) => (
                    <Primitive.Group key={group}>
                      {group && (
                        <Primitive.GroupLabel className="aegis-select-group-label">
                          {group}
                        </Primitive.GroupLabel>
                      )}
                      {options
                        .filter((option) => (option.group ?? '') === group)
                        .map((option) => (
                          <Primitive.Item
                            className="aegis-select-option"
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                            label={option.label}
                            aria-describedby={
                              option.description
                                ? `${control.id}-${encodeURIComponent(option.value)}-description`
                                : undefined
                            }
                          >
                            {option.icon && (
                              <span className="aegis-select-icon" aria-hidden="true">
                                {option.icon}
                              </span>
                            )}
                            <span className="aegis-select-option-copy">
                              <Primitive.ItemText>{option.label}</Primitive.ItemText>
                              {option.description && (
                                <span
                                  id={`${control.id}-${encodeURIComponent(option.value)}-description`}
                                  className="aegis-select-option-description"
                                >
                                  {option.description}
                                </span>
                              )}
                            </span>
                            <Primitive.ItemIndicator className="aegis-select-check">
                              <Check size={componentToken('input.icon-md')} aria-hidden="true" />
                            </Primitive.ItemIndicator>
                          </Primitive.Item>
                        ))}
                    </Primitive.Group>
                  ))}
                  {options.length === 0 && (
                    <Primitive.Item
                      value="aegis-no-options"
                      disabled
                      className="aegis-select-no-options"
                    >
                      <Primitive.ItemText>No options available</Primitive.ItemText>
                    </Primitive.Item>
                  )}
                </Primitive.List>
                <Primitive.ScrollDownArrow className="aegis-select-scroll">
                  <ChevronDown size={componentToken('input.icon-md')} aria-hidden="true" />
                </Primitive.ScrollDownArrow>
              </Primitive.Popup>
            </Primitive.Positioner>
          </Primitive.Portal>
        </Primitive.Root>
      </div>
    </DirectionProvider>
  );
}
