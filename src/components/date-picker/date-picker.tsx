import { componentToken } from '@/lib/component-design-tokens';
import { useState } from 'react';
import { DayPicker, type Matcher } from 'react-day-picker';
import { CalendarDays } from '@/components/icon';
import { Popover } from '@/components/popover';
import { Button } from '@/components/button';
import { useFieldControl, type FieldControlProps } from '@/components/field';
import 'react-day-picker/style.css';
import './date-picker.css';
export interface DatePickerProps extends FieldControlProps {
  size?: 'sm' | 'md' | 'lg';
  timeZone?: string;
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (date: Date | undefined) => void;
  label?: string;
  disabled?: boolean;
  disabledDates?: Matcher | Matcher[];
  defaultOpen?: boolean;
}
export function DatePicker(allProps: DatePickerProps) {
  const {
    size = 'md',
    timeZone,
    value,
    defaultValue,
    onValueChange,
    label = 'Choose date',
    defaultOpen,
    disabledDates,
    ...props
  } = allProps;
  const controlled = Object.prototype.hasOwnProperty.call(allProps, 'value');
  const [internal, setInternal] = useState(defaultValue),
    [open, setOpen] = useState(defaultOpen ?? false);
  const selected = controlled ? value : internal;
  const control = useFieldControl(props);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          {...control}
          size={size}
          className="aegis-date-picker-trigger"
          disabled={control.disabled}
          emphasis="secondary"
          leadingIcon={<CalendarDays size={componentToken('input.icon-md')} />}
          aria-label={`${label}${selected ? `: ${selected.toLocaleDateString('en-GB', { timeZone })}` : ''}`}
        >
          {selected
            ? selected.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone,
              })
            : label}
        </Button>
      }
    >
      <DayPicker
        mode="single"
        timeZone={timeZone}
        selected={selected}
        disabled={disabledDates}
        defaultMonth={selected}
        onSelect={(date) => {
          if (!controlled) setInternal(date);
          onValueChange?.(date);
          setOpen(false);
        }}
        autoFocus
        navLayout="after"
      />
    </Popover>
  );
}
