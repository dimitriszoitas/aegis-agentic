import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from '@/components/text-input';
import { cn } from '@/lib/utils';
import './time-picker.css';

export interface TimePickerProps extends Omit<
  TextInputProps,
  'type' | 'prefix' | 'suffix' | 'min' | 'max' | 'step'
> {
  /** Native local clock value, HH:mm or HH:mm:ss. Empty is an empty string. */
  value?: string;
  defaultValue?: string;
  /** Native clock constraints. They do not calculate an application validation message. */
  min?: string;
  max?: string;
  /** Seconds between allowed values; 60 by default. Use 1 to expose seconds or any to omit step validation. */
  step?: number | 'any';
}

/** A native local-time input; browser locale owns the displayed editing interface. */
export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker(
  { step = 60, className, ...props },
  ref,
) {
  return (
    <TextInput
      {...props}
      ref={ref}
      type="time"
      step={step}
      className={cn('aegis-time-picker', className)}
    />
  );
});
