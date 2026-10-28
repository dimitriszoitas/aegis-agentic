import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { NumberField as Primitive } from '@base-ui/react/number-field';
import { IconButton } from '@/components/icon-button';
import { useFieldControl } from '@/components/field';
import { cn } from '@/lib/utils';
import './number-input.css';

export type NumberInputSize = 'sm' | 'md' | 'lg';
export type NumberInputChangeDetails = Primitive.Root.ChangeEventDetails;
export type NumberInputCommitDetails = Primitive.Root.CommitEventDetails;

export interface NumberInputProps
  extends
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      'size' | 'type' | 'value' | 'defaultValue' | 'min' | 'max' | 'step' | 'children'
    >,
    Pick<
      Primitive.Root.Props,
      | 'min'
      | 'max'
      | 'step'
      | 'smallStep'
      | 'largeStep'
      | 'snapOnStep'
      | 'allowOutOfRange'
      | 'allowWheelScrub'
      | 'locale'
      | 'format'
      | 'onValueChange'
      | 'onValueCommitted'
    > {
  size?: NumberInputSize;
  /** The controlled numeric value; null represents an empty field. */
  value?: number | null;
  /** Initial uncontrolled numeric value. Omitted or null starts empty. */
  defaultValue?: number | null;
  /** Visible standalone label. Inside Field, omit this to use its label. */
  label?: ReactNode;
  invalid?: boolean;
  /** Show pointer/touch step buttons. Keyboard stepping remains available when hidden. */
  showSteppers?: boolean;
  decrementLabel?: string;
  incrementLabel?: string;
  inputClassName?: string;
  /** Ref to Base UI's form-associated numeric input; the forwarded ref targets the visible input. */
  hiddenInputRef?: Ref<HTMLInputElement>;
}

/** Locale-aware numeric entry backed by Base UI NumberField, with nullable values. */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    size = 'md',
    value,
    defaultValue,
    label,
    invalid,
    showSteppers = true,
    decrementLabel = 'Decrease value',
    incrementLabel = 'Increase value',
    inputClassName,
    hiddenInputRef,
    className,
    style,
    id,
    required,
    disabled,
    readOnly,
    name,
    form,
    min,
    max,
    step,
    smallStep,
    largeStep,
    snapOnStep,
    allowOutOfRange,
    allowWheelScrub,
    locale,
    format,
    onValueChange,
    onValueCommitted,
    'aria-describedby': describedBy,
    'aria-labelledby': labelledBy,
    'aria-invalid': ariaInvalid,
    ...inputProps
  },
  forwardedRef,
) {
  const labelId = `aegis-number-label-${useId()}`;
  const hasLabel = label !== undefined && label !== null && label !== false && label !== '';
  const control = useFieldControl({
    id,
    required,
    disabled,
    invalid,
    'aria-invalid': ariaInvalid,
    'aria-describedby': describedBy,
    'aria-labelledby': labelledBy ?? (hasLabel ? labelId : undefined),
  });

  return (
    <Primitive.Root
      id={control.id}
      value={value}
      defaultValue={defaultValue ?? undefined}
      name={name}
      form={form}
      min={min}
      max={max}
      step={step}
      smallStep={smallStep}
      largeStep={largeStep}
      snapOnStep={snapOnStep}
      allowOutOfRange={allowOutOfRange}
      allowWheelScrub={allowWheelScrub}
      locale={locale}
      format={format}
      disabled={control.disabled}
      required={control.required}
      readOnly={readOnly}
      onValueChange={onValueChange}
      onValueCommitted={onValueCommitted}
      inputRef={hiddenInputRef}
      className={cn('aegis-number-input', className)}
      style={style}
      data-size={size}
      dir={inputProps.dir}
    >
      {hasLabel && (
        <label className="aegis-field-label" id={labelId} htmlFor={control.id}>
          {label}
        </label>
      )}
      <Primitive.Group
        className="aegis-number-input-group"
        aria-labelledby={control['aria-labelledby']}
        aria-label={inputProps['aria-label']}
      >
        {showSteppers && (
          <Primitive.Decrement
            render={
              <IconButton
                size={size}
                emphasis="secondary"
                tooltip={false}
                aria-label={decrementLabel}
              >
                <span aria-hidden="true">−</span>
              </IconButton>
            }
          />
        )}
        <Primitive.Input
          {...inputProps}
          {...control}
          ref={forwardedRef}
          className={cn('aegis-number-input-control', inputClassName)}
        />
        {showSteppers && (
          <Primitive.Increment
            render={
              <IconButton
                size={size}
                emphasis="secondary"
                tooltip={false}
                aria-label={incrementLabel}
              >
                <span aria-hidden="true">+</span>
              </IconButton>
            }
          />
        )}
      </Primitive.Group>
    </Primitive.Root>
  );
});
