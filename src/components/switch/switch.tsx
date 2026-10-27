import { forwardRef, useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';
import { mergeDescriptionIds, useFieldControl } from '@/components/field';
import './switch.css';

export interface SwitchProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'value'
> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  readOnly?: boolean;
  required?: boolean;
  value?: string;
  label?: ReactNode;
  description?: ReactNode;
  invalid?: boolean;
  size?: 'sm' | 'md';
  containerClassName?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    label,
    description,
    invalid,
    id,
    disabled,
    required,
    className,
    containerClassName,
    size = 'md',
    checked,
    defaultChecked,
    onCheckedChange,
    readOnly,
    name,
    value,
    form,
    'aria-describedby': describedBy,
    'aria-labelledby': labelledBy,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  const localId = useId();
  const labelId = `aegis-switch-label-${localId}`;
  const descriptionId = `aegis-switch-help-${localId}`;
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
      className={cn('aegis-switch-field', containerClassName)}
      data-disabled={control.disabled || undefined}
    >
      <SwitchPrimitive.Root
        {...control}
        nativeButton
        render={<button {...props} ref={ref} />}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        readOnly={readOnly}
        name={name}
        value={value}
        form={form}
        className={cn('aegis-switch-control', className)}
        data-size={size}
      >
        <SwitchPrimitive.Thumb className="aegis-switch-thumb" />
      </SwitchPrimitive.Root>
      {(label || description) && (
        <div className="aegis-switch-copy">
          {label && (
            <label id={labelId} htmlFor={control.id} className="aegis-switch-label">
              {label}
            </label>
          )}
          {description && (
            <div id={descriptionId} className="aegis-switch-description">
              {description}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
