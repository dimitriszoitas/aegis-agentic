import { componentToken } from '@/lib/component-design-tokens';
import {
  forwardRef,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { X } from '@/components/icon';
import { cn } from '@/lib/utils';
import { useFieldControl } from '@/components/field';
import './text-input.css';

export type TextInputSize = 'sm' | 'md' | 'lg';
export interface TextInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'prefix' | 'value' | 'defaultValue'
> {
  size?: TextInputSize;
  value?: string;
  defaultValue?: string;
  /** Visible standalone label. Inside Field, its label is used automatically. */
  label?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  clearable?: boolean;
  clearLabel?: string;
  invalid?: boolean;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
  inputClassName?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    size = 'md',
    value,
    defaultValue = '',
    label,
    prefix,
    suffix,
    clearable = false,
    clearLabel = 'Clear input',
    invalid,
    disabled,
    required,
    readOnly,
    id,
    className,
    inputClassName,
    onChange,
    onValueChange,
    onClear,
    'aria-describedby': describedBy,
    'aria-labelledby': labelledBy,
    'aria-invalid': ariaInvalid,
    type = 'text',
    ...props
  },
  forwardedRef,
) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const text = value ?? uncontrolledValue;
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = `aegis-input-label-${useId()}`;
  const control = useFieldControl({
    id,
    required,
    disabled,
    invalid,
    'aria-invalid': ariaInvalid,
    'aria-describedby': describedBy,
    'aria-labelledby': labelledBy ?? (label ? labelId : undefined),
  });
  useImperativeHandle(forwardedRef, () => inputRef.current!);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (value === undefined) setUncontrolledValue(event.currentTarget.value);
    onValueChange?.(event.currentTarget.value);
    onChange?.(event);
  }

  function clear() {
    const input = inputRef.current;
    if (!input) return;
    // Use the native setter so React receives an ordinary input change event.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
    onClear?.();
  }

  return (
    <div className={cn('aegis-input', className)}>
      {label && (
        <label className="aegis-field-label" id={labelId} htmlFor={control.id}>
          {label}
        </label>
      )}
      <div
        className="aegis-input-shell"
        data-size={size}
        data-invalid={
          control['aria-invalid'] === true || control['aria-invalid'] === 'true' || undefined
        }
        data-disabled={control.disabled || undefined}
        data-readonly={readOnly || undefined}
      >
        {prefix && <span className="aegis-input-prefix">{prefix}</span>}
        <input
          {...props}
          {...control}
          ref={inputRef}
          type={type}
          className={cn('aegis-input-native', inputClassName)}
          value={text}
          onChange={handleChange}
          readOnly={readOnly}
        />
        {clearable && text.length > 0 && !control.disabled && !readOnly && (
          <button
            type="button"
            className="aegis-input-clear"
            aria-label={clearLabel}
            onClick={clear}
          >
            <X size={componentToken('input.icon-sm')} aria-hidden="true" />
          </button>
        )}
        {suffix && <span className="aegis-input-suffix">{suffix}</span>}
      </div>
    </div>
  );
});
