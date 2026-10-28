import { forwardRef, useId } from 'react';
import { TextInput, type TextInputProps } from '@/components/text-input';
import { mergeDescriptionIds } from '@/components/field';
import { cn } from '@/lib/utils';
import './date-time-picker.css';

export interface DateTimePickerProps extends Omit<
  TextInputProps,
  'type' | 'prefix' | 'suffix' | 'min' | 'max' | 'step'
> {
  /** Offset-free local date/time, e.g. 2027-04-12T09:30. Empty is an empty string. */
  value?: string;
  defaultValue?: string;
  /** Explicit interpretation policy: local means the device zone; otherwise supply an IANA zone. No conversion occurs. */
  timeZone: string;
  /** Optional localized text replacing the complete visible zone explanation. */
  timeZoneLabel?: string;
  min?: string;
  max?: string;
  /** Native step in seconds. */
  step?: number | 'any';
}

export function assertDateTimeZone(timeZone: string) {
  if (timeZone === 'local') return;
  if (!timeZone || /^[+-]/.test(timeZone))
    throw new TypeError('DateTimePicker requires local or an IANA time zone.');
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format(0);
  } catch (error) {
    throw new TypeError('DateTimePicker requires local or a supported IANA time zone.', {
      cause: error,
    });
  }
}

/** Native local date/time entry with an explicit displayed zone policy; it never creates an instant. */
export const DateTimePicker = forwardRef<HTMLInputElement, DateTimePickerProps>(
  function DateTimePicker(
    { timeZone, timeZoneLabel, step = 60, className, 'aria-describedby': describedBy, ...props },
    ref,
  ) {
    assertDateTimeZone(timeZone);
    const zoneId = `aegis-date-time-zone-${useId()}`;
    return (
      <div className={cn('aegis-date-time-picker', className)}>
        <TextInput
          {...props}
          ref={ref}
          type="datetime-local"
          step={step}
          aria-describedby={mergeDescriptionIds(describedBy, zoneId)}
        />
        <p className="aegis-date-time-zone" id={zoneId}>
          {timeZoneLabel ??
            (timeZone === 'local'
              ? 'Local time in this device’s time zone.'
              : `Time zone: ${timeZone}.`)}
        </p>
      </div>
    );
  },
);
