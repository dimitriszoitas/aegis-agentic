import { forwardRef, useId, useState } from 'react';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/max';
import { TextInput, type TextInputProps } from '@/components/text-input';
import { Select } from '@/components/select';
import { mergeDescriptionIds, useFieldControl } from '@/components/field';
import { cn } from '@/lib/utils';
import './phone-input.css';

export interface PhoneInputCommit {
  raw: string;
  /** Parsed E.164 candidate, excluding any extension; null when parsing fails. */
  e164: string | null;
  extension: string | null;
  country: CountryCode | null;
  formatted: string | null;
  possible: boolean;
  /** Metadata-based validity, not proof of allocation, reachability or ownership. */
  valid: boolean;
}
export interface PhoneInputProps extends Omit<
  TextInputProps,
  'type' | 'prefix' | 'suffix' | 'inputMode' | 'onBlur'
> {
  country?: CountryCode;
  defaultCountry?: CountryCode;
  onCountryChange?: (country: CountryCode) => void;
  countries?: readonly CountryCode[];
  countryLabel?: string;
  countryLocale?: string;
  format?: 'national' | 'international';
  /** Explicit opt-in: normalize a possible parsed number when the field loses focus. */
  formatOnBlur?: boolean;
  onValueCommit?: (result: PhoneInputCommit) => void;
  onBlur?: TextInputProps['onBlur'];
  showFormattedValue?: boolean;
  formattedLabel?: string;
}
export function inspectPhone(
  raw: string,
  country: CountryCode,
  format: 'national' | 'international',
): PhoneInputCommit {
  const parsed = parsePhoneNumberFromString(raw, { defaultCountry: country, extract: false });
  return {
    raw,
    e164: parsed?.number ?? null,
    extension: parsed?.ext ?? null,
    country: parsed?.country ?? null,
    formatted: parsed
      ? format === 'national'
        ? parsed.formatNational()
        : parsed.formatInternational()
      : null,
    possible: parsed?.isPossible() ?? false,
    valid: parsed?.isValid() ?? false,
  };
}

/** Raw telephone drafting with explicit country context and metadata-backed formatting previews. */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  {
    country,
    defaultCountry = 'US',
    onCountryChange,
    countries = getCountries(),
    countryLabel = 'Country',
    countryLocale = 'en',
    format = 'international',
    formatOnBlur = false,
    onValueCommit,
    showFormattedValue = true,
    formattedLabel = 'Formatted number',
    value,
    defaultValue = '',
    onValueChange,
    onBlur,
    size = 'md',
    disabled,
    readOnly,
    className,
    'aria-describedby': describedBy,
    ...props
  },
  ref,
) {
  const [internalCountry, setInternalCountry] = useState(defaultCountry);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedCountry = country ?? internalCountry;
  const current = value ?? internalValue;
  const control = useFieldControl({ disabled });
  const countryId = `aegis-phone-country-${useId()}`;
  const previewId = `aegis-phone-preview-${useId()}`;
  const regionNames = new Intl.DisplayNames([countryLocale], { type: 'region' });
  const allowed = [...new Set(countries)];
  if (!allowed.length || !allowed.includes(selectedCountry))
    throw new TypeError('PhoneInput countries must include the selected country.');
  const result = inspectPhone(current, selectedCountry, format);
  function update(next: string) {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  }
  return (
    <div className={cn('aegis-phone-input', className)}>
      <Select
        id={countryId}
        label={countryLabel}
        value={selectedCountry}
        size={size}
        disabled={control.disabled}
        readOnly={readOnly}
        options={allowed.map((code) => ({
          value: code,
          label: `${regionNames.of(code) ?? code} (+${getCountryCallingCode(code)})`,
        }))}
        onValueChange={(next) => {
          if (country === undefined) setInternalCountry(next as CountryCode);
          onCountryChange?.(next as CountryCode);
        }}
      />
      <TextInput
        {...props}
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete={props.autoComplete ?? 'tel'}
        size={size}
        disabled={control.disabled}
        readOnly={readOnly}
        value={current}
        onValueChange={update}
        aria-describedby={mergeDescriptionIds(
          describedBy,
          showFormattedValue && result.formatted ? previewId : undefined,
        )}
        onBlur={(event) => {
          onBlur?.(event);
          if (event.defaultPrevented || control.disabled || readOnly) return;
          const committed = inspectPhone(event.currentTarget.value, selectedCountry, format);
          if (
            formatOnBlur &&
            committed.possible &&
            committed.formatted &&
            committed.formatted !== current
          )
            update(committed.formatted);
          onValueCommit?.(committed);
        }}
      />
      {showFormattedValue && result.formatted && (
        <p className="aegis-phone-preview" id={previewId}>
          {formattedLabel}: {result.formatted}
        </p>
      )}
    </div>
  );
});
