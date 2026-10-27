import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Slider as Primitive } from '@base-ui/react/slider';
import { DirectionProvider, useDirection } from '@base-ui/react/direction-provider';
import { cn } from '@/lib/utils';
import { useFieldControl, type FieldControlProps } from '@/components/field';
import './slider.css';

export interface SliderProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'defaultValue'>, FieldControlProps {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  minStepsBetweenThumbs?: number;
  name?: string;
  form?: string;
  orientation?: 'horizontal' | 'vertical';
  inverted?: boolean;
  label?: ReactNode;
  /** One name per thumb. Defaults to Value, or Minimum and Maximum for a range. */
  thumbLabels?: readonly string[];
  formatValue?: (value: number) => string;
  showValue?: boolean;
}

export function Slider({
  label,
  thumbLabels,
  formatValue = String,
  showValue = true,
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  orientation = 'horizontal',
  minStepsBetweenThumbs = 0,
  inverted = false,
  dir,
  name,
  form,
  id,
  required,
  disabled,
  invalid,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: SliderProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? [min]);
  const values = value ?? internalValue;
  const inheritedDirection = useDirection();
  const direction = dir === 'rtl' || dir === 'ltr' ? dir : inheritedDirection;
  const verticalInverted = inverted && orientation === 'vertical';
  const toVisualValues = (next: number[]) =>
    verticalInverted ? next.map((current) => min + max - current).reverse() : next;
  const visualValues = toVisualValues(values);
  const labelId = `aegis-slider-label-${useId()}`;
  const control = useFieldControl({
    id,
    required,
    disabled,
    invalid,
    'aria-labelledby': labelledBy ?? (label ? labelId : undefined),
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
  });
  return (
    <DirectionProvider
      direction={
        inverted && orientation === 'horizontal' ? (direction === 'rtl' ? 'ltr' : 'rtl') : direction
      }
    >
      <div className="aegis-slider-field" data-orientation={orientation}>
        {(label || showValue) && (
          <div className="aegis-slider-heading">
            {label && (
              <span className="aegis-field-label" id={labelId}>
                {label}
              </span>
            )}
            {showValue && (
              <output className="aegis-slider-value" aria-hidden="true">
                {values.map(formatValue).join(' – ')}
              </output>
            )}
          </div>
        )}
        <Primitive.Root
          {...props}
          id={`${control.id}-slider`}
          disabled={control.disabled}
          aria-invalid={control['aria-invalid']}
          aria-describedby={control['aria-describedby']}
          name={verticalInverted ? undefined : name}
          form={form}
          value={visualValues}
          onValueChange={(visual) => {
            const next = toVisualValues(visual);
            if (value === undefined) setInternalValue(next);
            onValueChange?.(next);
          }}
          onValueCommitted={(visual) => onValueCommit?.(toVisualValues(visual))}
          min={min}
          max={max}
          step={step}
          orientation={orientation}
          minStepsBetweenValues={minStepsBetweenThumbs}
          thumbCollisionBehavior="none"
          thumbAlignment="edge"
          className={cn('aegis-slider', className)}
        >
          <Primitive.Control
            className="aegis-slider-control"
            dir={
              inverted && orientation === 'horizontal'
                ? direction === 'rtl'
                  ? 'ltr'
                  : 'rtl'
                : direction
            }
          >
            <Primitive.Track className="aegis-slider-track">
              <Primitive.Indicator
                className="aegis-slider-range"
                style={
                  verticalInverted && values.length === 1
                    ? {
                        bottom: `${((max - values[0]) / (max - min)) * 100}%`,
                        height: `${((values[0] - min) / (max - min)) * 100}%`,
                      }
                    : undefined
                }
              />
            </Primitive.Track>
            {visualValues.map((_current, visualIndex) => {
              const index = verticalInverted ? values.length - 1 - visualIndex : visualIndex;
              const current = values[index];
              const thumbLabel =
                thumbLabels?.[index] ??
                (values.length === 1
                  ? 'Value'
                  : index === 0
                    ? 'Minimum'
                    : index === values.length - 1
                      ? 'Maximum'
                      : `Threshold ${index + 1}`);
              const thumbLabelId = `${control.id}-thumb-label-${index}`;
              return (
                <Primitive.Thumb
                  key={index}
                  index={visualIndex}
                  render={(thumbProps) => {
                    // Base UI owns the native range input. Its render slot keeps Aegis's
                    // public Field id and inverted value semantics on that real input.
                    const configureInput = (children: ReactNode): ReactNode =>
                      Children.map(children, (child) => {
                        if (!isValidElement<{ children?: ReactNode }>(child)) return child;
                        if (child.type === Fragment)
                          return cloneElement(child, {}, configureInput(child.props.children));
                        if (child.type !== 'input') return child;
                        return cloneElement(
                          child as ReactElement<ComponentPropsWithoutRef<'input'>>,
                          {
                            id: index === 0 ? control.id : `${control.id}-thumb-${index}`,
                            'aria-invalid': control['aria-invalid'],
                            'aria-valuenow': current,
                          },
                        );
                      });
                    return <div {...thumbProps}>{configureInput(thumbProps.children)}</div>;
                  }}
                  onKeyDown={
                    verticalInverted
                      ? (event) => {
                          if (event.key !== 'Home' && event.key !== 'End') return;
                          event.preventDefault();
                          const next = [...values];
                          const minimum =
                            index === 0 ? min : values[index - 1] + minStepsBetweenThumbs * step;
                          const maximum =
                            index === values.length - 1
                              ? max
                              : values[index + 1] - minStepsBetweenThumbs * step;
                          next[index] = event.key === 'Home' ? minimum : maximum;
                          if (value === undefined) setInternalValue(next);
                          onValueChange?.(next);
                          onValueCommit?.(next);
                        }
                      : undefined
                  }
                  className="aegis-slider-thumb"
                  aria-label={
                    control['aria-labelledby']
                      ? undefined
                      : `${ariaLabel ?? (typeof label === 'string' ? label : 'Threshold')} ${thumbLabel.toLowerCase()}`
                  }
                  aria-labelledby={
                    control['aria-labelledby']
                      ? `${control['aria-labelledby']}${values.length > 1 ? ` ${thumbLabelId}` : ''}`
                      : undefined
                  }
                  aria-describedby={control['aria-describedby']}
                  aria-invalid={control['aria-invalid']}
                  aria-valuetext={formatValue(current)}
                >
                  <span className="sr-only" id={thumbLabelId}>
                    {thumbLabel}
                  </span>
                </Primitive.Thumb>
              );
            })}
          </Primitive.Control>
        </Primitive.Root>
        {verticalInverted &&
          name &&
          values.map((current, index) => (
            <input
              key={index}
              type="hidden"
              name={name}
              form={form}
              value={current}
              disabled={control.disabled}
            />
          ))}
      </div>
    </DirectionProvider>
  );
}
