import { forwardRef, useId, useState, type ReactNode } from 'react';
import { TextInput } from '@/components/text-input';
import { NumberInput } from '@/components/number-input';
import { Button } from '@/components/button';
import { useFieldControl, mergeDescriptionIds, type FieldControlProps } from '@/components/field';
import { cn } from '@/lib/utils';
import './color-picker.css';
import defaults from './color-picker-defaults.json';

export interface ColorSwatch {
  value: string;
  label: string;
}
export interface ColorPickerProps extends FieldControlProps {
  /** Canonical RGB/RGBA hex; shorthand hex is also accepted. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onDraftChange?: (draft: string) => void;
  alpha?: boolean;
  swatches?: readonly ColorSwatch[];
  label?: ReactNode;
  'aria-label'?: string;
  name?: string;
  form?: string;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  className?: string;
  pickerLabel?: string;
  alphaLabel?: string;
  swatchesLabel?: string;
  invalidHexLabel?: string;
}
export function normalizeHex(value: string, alpha: boolean): string | null {
  const clean = value.trim().toUpperCase();
  if (
    !/^#(?:[A-F0-9]{3}|[A-F0-9]{6})$/.test(clean) &&
    !(alpha && /^#(?:[A-F0-9]{4}|[A-F0-9]{8})$/.test(clean))
  )
    return null;
  const full =
    clean.length <= 5 ? `#${[...clean.slice(1)].map((part) => part + part).join('')}` : clean;
  return alpha && full.length === 7 ? `${full}FF` : full;
}

/** Hex color drafting with swatches and an RGB browser picker; alpha is explicit and separate. */
export const ColorPicker = forwardRef<HTMLInputElement, ColorPickerProps>(function ColorPicker(
  {
    value,
    defaultValue = defaults.value,
    onValueChange,
    onDraftChange,
    alpha = false,
    swatches = [],
    label,
    'aria-label': ariaLabel,
    name,
    form,
    size = 'md',
    readOnly,
    className,
    pickerLabel = 'Choose color visually',
    alphaLabel = 'Opacity percent',
    swatchesLabel = 'Color swatches',
    invalidHexLabel = 'Enter a valid hexadecimal color.',
    id,
    disabled,
    required,
    invalid,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
  },
  ref,
) {
  const [internal, setInternal] = useState(defaultValue);
  const canonical = normalizeHex(value ?? internal, alpha);
  if (!canonical)
    throw new TypeError(
      'ColorPicker value/defaultValue must be a valid hexadecimal color for its alpha setting.',
    );
  // Keep an invalid local draft without replacing the committed color. A changed host value resets it.
  const [draft, setDraft] = useState({ owner: canonical, text: canonical });
  const text = draft.owner === canonical ? draft.text : canonical;
  const validDraft = normalizeHex(text, alpha);
  const alphaId = `aegis-color-alpha-${useId()}`;
  const errorId = `aegis-color-error-${useId()}`;
  const control = useFieldControl({
    id,
    disabled,
    required,
    invalid,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
  });
  const normalizedSwatches = swatches.map((swatch) => ({
    ...swatch,
    canonical: normalizeHex(swatch.value, alpha),
  }));
  if (normalizedSwatches.some((swatch) => !swatch.canonical))
    throw new TypeError('ColorPicker swatches must contain valid hexadecimal colors.');
  function commit(next: string) {
    if (control.disabled || readOnly) return;
    if (value === undefined) setInternal(next);
    setDraft({ owner: next, text: next });
    onValueChange?.(next);
  }
  return (
    <div className={cn('aegis-color-picker', className)}>
      <TextInput
        ref={ref}
        label={label}
        aria-label={ariaLabel}
        id={control.id}
        aria-labelledby={control['aria-labelledby']}
        aria-describedby={mergeDescriptionIds(
          control['aria-describedby'],
          !validDraft ? errorId : undefined,
        )}
        aria-invalid={!validDraft || control['aria-invalid']}
        required={control.required}
        disabled={control.disabled}
        readOnly={readOnly}
        size={size}
        value={text}
        name={name}
        form={form}
        pattern={
          alpha
            ? '#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})'
            : '#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})'
        }
        onValueChange={(next) => {
          setDraft({ owner: canonical, text: next });
          onDraftChange?.(next);
        }}
        onBlur={() => {
          if (validDraft && validDraft !== canonical) commit(validDraft);
        }}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            !event.nativeEvent.isComposing &&
            validDraft &&
            validDraft !== canonical
          ) {
            event.preventDefault();
            commit(validDraft);
          }
        }}
      />
      {!validDraft && (
        <p className="aegis-color-error" id={errorId}>
          {invalidHexLabel}
        </p>
      )}
      <div className="aegis-color-tools">
        <label className="aegis-color-visual-label">
          {pickerLabel}
          <input
            type="color"
            className="aegis-color-native"
            aria-label={pickerLabel}
            value={canonical.slice(0, 7)}
            disabled={control.disabled || readOnly}
            onChange={(event) =>
              commit(`${event.currentTarget.value.toUpperCase()}${alpha ? canonical.slice(7) : ''}`)
            }
          />
        </label>
        {alpha && (
          <NumberInput
            id={alphaId}
            label={alphaLabel}
            value={Math.round((parseInt(canonical.slice(7), 16) / 255) * 100)}
            min={0}
            max={100}
            step={1}
            size={size}
            disabled={control.disabled}
            readOnly={readOnly}
            onValueChange={(next) => {
              if (next !== null)
                commit(
                  `${canonical.slice(0, 7)}${Math.round(
                    (Math.max(0, Math.min(100, next)) / 100) * 255,
                  )
                    .toString(16)
                    .padStart(2, '0')
                    .toUpperCase()}`,
                );
            }}
          />
        )}
      </div>
      {normalizedSwatches.length > 0 && (
        <div className="aegis-color-swatches" role="group" aria-label={swatchesLabel}>
          {normalizedSwatches.map((swatch, index) => (
            <Button
              key={`${swatch.value}-${index}`}
              type="button"
              emphasis="secondary"
              size={size}
              disabled={control.disabled || readOnly}
              aria-pressed={canonical === swatch.canonical}
              onClick={() => commit(swatch.canonical!)}
            >
              <span
                className="aegis-color-chip"
                aria-hidden="true"
                style={{ backgroundColor: swatch.canonical! }}
              />
              {swatch.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
});
