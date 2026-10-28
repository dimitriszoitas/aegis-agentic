import { forwardRef, useState, type ClipboardEvent } from 'react';
import { TextInput, type TextInputProps } from '@/components/text-input';
import { cn } from '@/lib/utils';
import './otp-input.css';

export type OtpInputMode = 'numeric' | 'alphanumeric';
export interface OtpInputProps extends Omit<
  TextInputProps,
  | 'type'
  | 'inputMode'
  | 'maxLength'
  | 'minLength'
  | 'pattern'
  | 'prefix'
  | 'suffix'
  | 'clearable'
  | 'autoComplete'
> {
  /** Required code length, from 1 to 32 characters. */
  length?: number;
  mode?: OtpInputMode;
  masked?: boolean;
  /** Called for a changed complete candidate; this does not verify or submit it. */
  onComplete?: (value: string) => void;
}
export function normalizeOtp(value: string, mode: OtpInputMode, length: number) {
  return (
    mode === 'numeric'
      ? value.replace(/[^0-9]/g, '')
      : value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  ).slice(0, length);
}

/** One real input for a complete code, preserving native selection, paste, autofill and form naming. */
export const OtpInput = forwardRef<HTMLInputElement, OtpInputProps>(function OtpInput(
  {
    length = 6,
    mode = 'numeric',
    masked = false,
    value,
    defaultValue = '',
    onValueChange,
    onComplete,
    onPaste,
    disabled,
    readOnly,
    className,
    ...props
  },
  ref,
) {
  if (!Number.isInteger(length) || length < 1 || length > 32)
    throw new TypeError('OtpInput length must be an integer from 1 to 32.');
  const [internal, setInternal] = useState(() => normalizeOtp(defaultValue, mode, length));
  const current = normalizeOtp(value ?? internal, mode, length);
  function handleValueChange(text: string) {
    const next = normalizeOtp(text, mode, length);
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
    if (next.length === length && next !== current) onComplete?.(next);
  }
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    onPaste?.(event);
    if (
      event.defaultPrevented ||
      disabled ||
      readOnly ||
      event.currentTarget.disabled ||
      event.currentTarget.readOnly
    )
      return;
    const input = event.currentTarget;
    const pasted = normalizeOtp(event.clipboardData.getData('text'), mode, length);
    event.preventDefault();
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? start;
    const next = normalizeOtp(current.slice(0, start) + pasted + current.slice(end), mode, length);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const caret = Math.min(start + pasted.length, next.length);
    input.setSelectionRange(caret, caret);
  }
  return (
    <TextInput
      {...props}
      ref={ref}
      className={cn('aegis-otp-input', className)}
      type={masked ? 'password' : 'text'}
      inputMode={mode === 'numeric' ? 'numeric' : 'text'}
      autoComplete="one-time-code"
      autoCapitalize={mode === 'alphanumeric' ? 'characters' : 'off'}
      spellCheck={false}
      value={current}
      maxLength={length}
      minLength={length}
      pattern={mode === 'numeric' ? `[0-9]{${length}}` : `[A-Z0-9]{${length}}`}
      disabled={disabled}
      readOnly={readOnly}
      onValueChange={handleValueChange}
      onPaste={handlePaste}
    />
  );
});
