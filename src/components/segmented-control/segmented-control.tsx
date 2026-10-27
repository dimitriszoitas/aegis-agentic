import { useInputFocusModality } from '@/lib/use-input-focus';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './segmented-control.css';

export interface SegmentOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}
export interface SegmentedControlProps {
  label: string;
  options: readonly SegmentOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  /** Allow short option sets to wrap within narrow settings panels. */
  wrap?: boolean;
  className?: string;
}
/** A single selection among related views, using native radio keyboard behavior. */
export function SegmentedControl({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  disabled,
  size = 'md',
  fullWidth,
  wrap,
  className,
}: SegmentedControlProps) {
  useInputFocusModality();
  const id = useId();
  const [internal, setInternal] = useState(
    defaultValue ?? options.find((option) => !option.disabled)?.value ?? '',
  );
  const selected = value ?? internal;
  return (
    <fieldset
      className={cn('aegis-segmented', className)}
      disabled={disabled}
      data-size={size}
      data-full-width={fullWidth || undefined}
      data-wrap={wrap || undefined}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="aegis-segmented-option"
          data-selected={selected === option.value}
          data-disabled={disabled || option.disabled || undefined}
        >
          <input
            type="radio"
            name={id}
            value={option.value}
            checked={selected === option.value}
            disabled={option.disabled}
            onChange={() => {
              if (value === undefined) setInternal(option.value);
              onValueChange?.(option.value);
            }}
          />
          <span>
            {option.icon}
            {option.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
