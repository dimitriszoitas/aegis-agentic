import { createContext, useContext, useId, type AriaAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useInputFocusModality } from '@/lib/use-input-focus';
import './field.css';

interface FieldContextValue {
  controlId: string;
  labelId: string;
  describedBy?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Common control metadata, combined with the nearest Field when present. */
export interface FieldControlProps extends Pick<AriaAttributes, 'aria-describedby' | 'aria-labelledby' | 'aria-invalid'> {
  id?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
}

export interface FieldControlAttributes extends Omit<FieldControlProps, 'invalid'> {
  id: string;
}

/** Join and deduplicate space-separated ARIA ID references. */
export function mergeDescriptionIds(...values: (string | undefined)[]): string | undefined {
  const ids = [...new Set(values.flatMap((value) => value?.split(/\s+/).filter(Boolean) ?? []))];
  return ids.length ? ids.join(' ') : undefined;
}

/** Used by all Aegis inputs; public for composing new accessible controls. */
export function useFieldControl(props: FieldControlProps = {}): FieldControlAttributes {
  useInputFocusModality();
  const context = useContext(FieldContext);
  const generatedId = useId();
  return {
    id: props.id ?? context?.controlId ?? `aegis-control-${generatedId}`,
    'aria-labelledby': props['aria-labelledby'] ?? context?.labelId,
    'aria-describedby': mergeDescriptionIds(context?.describedBy, props['aria-describedby']),
    'aria-invalid': props['aria-invalid'] ?? props.invalid ?? context?.invalid,
    required: props.required ?? context?.required,
    disabled: props.disabled ?? context?.disabled,
  };
}

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The ID shared by the label and the control. */
  id?: string;
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  children: ReactNode;
}

/** Label, help and validation message with automatic control association. */
export function Field({ id, label, helpText, error, required, optional, disabled, invalid, children, className, ...props }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? `aegis-field-${generatedId}`;
  const labelId = `${controlId}-label`;
  const hasHelp = helpText !== undefined && helpText !== null && helpText !== false;
  const hasError = error !== undefined && error !== null && error !== false && error !== '';
  const describedBy = mergeDescriptionIds(hasHelp ? `${controlId}-help` : undefined, hasError ? `${controlId}-error` : undefined);
  return (
    <FieldContext.Provider value={{ controlId, labelId, describedBy, required, disabled, invalid: invalid ?? hasError }}>
      <div {...props} id={`${controlId}-field`} className={cn('aegis-field', className)} data-disabled={disabled || undefined} data-invalid={(invalid ?? hasError) || undefined}>
        <label className="aegis-field-label" id={labelId} htmlFor={controlId}>
          {label}
          {required ? <span className="aegis-field-marker"> <span aria-hidden="true">*</span><span className="sr-only"> (required)</span></span> : optional ? <span className="aegis-field-optional">Optional</span> : null}
        </label>
        {children}
        {hasHelp && <div className="aegis-field-help" id={`${controlId}-help`}>{helpText}</div>}
        {hasError && <div className="aegis-field-error" id={`${controlId}-error`} role="alert">{error}</div>}
      </div>
    </FieldContext.Provider>
  );
}
