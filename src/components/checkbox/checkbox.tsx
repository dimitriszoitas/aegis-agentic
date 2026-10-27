import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Check, Minus } from '@/components/icon';
import { cn } from '@/lib/utils';
import { mergeDescriptionIds, useFieldControl } from '@/components/field';
import './checkbox.css';

export type CheckboxCheckedState = boolean | 'indeterminate';
export interface CheckboxProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'value' | 'defaultChecked'
> {
  checked?: CheckboxCheckedState;
  defaultChecked?: CheckboxCheckedState;
  onCheckedChange?: (checked: CheckboxCheckedState) => void;
  value?: string;
  required?: boolean;
  /** Compact controls use the same styling at 16px instead of 18px. */
  size?: 'sm' | 'md';
  label?: ReactNode;
  description?: ReactNode;
  invalid?: boolean;
  /** Focusable and announced, but cannot be changed by pointer or keyboard. */
  readOnly?: boolean;
  containerClassName?: string;
}

/** A form-compatible Base UI checkbox including the mixed (indeterminate) state. */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  {
    size = 'md',
    label,
    description,
    invalid,
    readOnly = false,
    id,
    disabled,
    required,
    className,
    containerClassName,
    checked,
    defaultChecked = false,
    name,
    value,
    form,
    onCheckedChange,
    'aria-describedby': describedBy,
    'aria-labelledby': labelledBy,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  const localId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const currentChecked = checked ?? internalChecked;
  useEffect(() => {
    if (checked !== undefined) return;
    const owner = inputRef.current?.form;
    const reset = () => setInternalChecked(defaultChecked);
    owner?.addEventListener('reset', reset);
    return () => owner?.removeEventListener('reset', reset);
  }, [checked, defaultChecked, form]);
  const labelId = `aegis-checkbox-label-${localId}`;
  const descriptionId = `aegis-checkbox-help-${localId}`;
  const tokens = useComponentTokenNumbers(['input.icon-stroke-strong']);
  const control = useFieldControl({
    id,
    disabled,
    required,
    invalid,
    'aria-invalid': ariaInvalid,
    'aria-labelledby': labelledBy ?? (label ? labelId : undefined),
    'aria-describedby': mergeDescriptionIds(describedBy, description ? descriptionId : undefined),
  });
  return (
    <div
      className={cn('aegis-checkbox-field', containerClassName)}
      data-size={size}
      data-disabled={control.disabled || undefined}
      data-readonly={readOnly || undefined}
    >
      <CheckboxPrimitive.Root
        {...control}
        nativeButton
        render={<button {...props} ref={ref} />}
        inputRef={inputRef}
        name={name}
        value={value}
        form={form}
        checked={currentChecked === true}
        indeterminate={currentChecked === 'indeterminate'}
        readOnly={readOnly}
        className={cn('aegis-checkbox-control', className)}
        aria-readonly={readOnly || undefined}
        data-readonly={readOnly || undefined}
        onCheckedChange={(next) => {
          if (checked === undefined) setInternalChecked(next);
          onCheckedChange?.(next);
        }}
      >
        <CheckboxPrimitive.Indicator className="aegis-checkbox-indicator">
          <Check
            className="aegis-checkbox-check"
            size={componentToken('input.icon-sm')}
            strokeWidth={tokens['input.icon-stroke-strong']}
            aria-hidden="true"
          />
          <Minus
            className="aegis-checkbox-mixed"
            size={componentToken('input.icon-sm')}
            strokeWidth={tokens['input.icon-stroke-strong']}
            aria-hidden="true"
          />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {(label || description) && (
        <div className="aegis-checkbox-copy">
          {label && (
            <label className="aegis-checkbox-label" id={labelId} htmlFor={control.id}>
              {label}
            </label>
          )}
          {description && (
            <div className="aegis-checkbox-description" id={descriptionId}>
              {description}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
