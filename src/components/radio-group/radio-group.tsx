import { forwardRef, useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { DirectionProvider, useDirection } from '@base-ui/react/direction-provider';
import { cn } from '@/lib/utils';
import { mergeDescriptionIds, useFieldControl } from '@/components/field';
import './radio-group.css';

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'defaultValue'
> {
  options: readonly RadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  form?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  orientation?: 'horizontal' | 'vertical';
  loop?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  invalid?: boolean;
}

/** Arrow-key navigation and native form values are provided by Base UI. */
export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  {
    options,
    label,
    description,
    invalid,
    id,
    disabled,
    required,
    className,
    orientation = 'vertical',
    dir,
    loop = true,
    onKeyDownCapture,
    'aria-describedby': describedBy,
    'aria-labelledby': labelledBy,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  const inheritedDirection = useDirection();
  const localId = useId();
  const labelId = `aegis-radio-label-${localId}`;
  const descriptionId = `aegis-radio-help-${localId}`;
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
    <DirectionProvider direction={dir === 'rtl' || dir === 'ltr' ? dir : inheritedDirection}>
      <div className="aegis-radio-field" dir={dir}>
        {label && (
          <div className="aegis-field-label" id={labelId}>
            {label}
          </div>
        )}
        {description && (
          <div className="aegis-radio-description" id={descriptionId}>
            {description}
          </div>
        )}
        <RadioGroupPrimitive
          {...props}
          {...control}
          ref={ref}
          aria-orientation={orientation}
          data-orientation={orientation}
          onKeyDownCapture={(event) => {
            onKeyDownCapture?.(event);
            if (event.defaultPrevented || loop || !event.key.startsWith('Arrow')) return;
            const radios = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role=radio]:not(:disabled)',
              ),
            );
            const index = radios.indexOf(event.target as HTMLButtonElement);
            const backwards =
              event.key === 'ArrowUp' ||
              (event.key === 'ArrowLeft' &&
                getComputedStyle(event.currentTarget).direction !== 'rtl') ||
              (event.key === 'ArrowRight' &&
                getComputedStyle(event.currentTarget).direction === 'rtl');
            if ((backwards && index === 0) || (!backwards && index === radios.length - 1)) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          className={cn('aegis-radio-group', className)}
        >
          {options.map((option, index) => {
            const optionId = `${control.id}-option-${index}`;
            return (
              <div
                className="aegis-radio-option"
                key={option.value}
                data-disabled={control.disabled || option.disabled || undefined}
              >
                <Radio.Root
                  nativeButton
                  render={<button />}
                  className="aegis-radio-control"
                  id={optionId}
                  value={option.value}
                  disabled={option.disabled}
                  aria-labelledby={`${optionId}-label`}
                  aria-describedby={option.description ? `${optionId}-description` : undefined}
                  aria-invalid={control['aria-invalid']}
                >
                  <Radio.Indicator className="aegis-radio-indicator" />
                </Radio.Root>
                <div className="aegis-radio-copy">
                  <label className="aegis-radio-label" id={`${optionId}-label`} htmlFor={optionId}>
                    {option.label}
                  </label>
                  {option.description && (
                    <div className="aegis-radio-description" id={`${optionId}-description`}>
                      {option.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </RadioGroupPrimitive>
      </div>
    </DirectionProvider>
  );
});
