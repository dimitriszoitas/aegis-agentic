import { useEffect, useId, useRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Link } from '@/components/link';
import { cn } from '@/lib/utils';
import './form-error-summary.css';

export interface FormErrorSummaryItem {
  /** Stable unique error identity, independent of rendered order. */
  id: string;
  /** ID of the actual focusable field, not its surrounding Field. */
  fieldId: string;
  message: ReactNode;
}
export interface FormErrorSummaryProps extends Omit<
  ComponentPropsWithoutRef<'section'>,
  'children' | 'title'
> {
  errors: readonly FormErrorSummaryItem[];
  title?: ReactNode;
  description?: ReactNode;
  /** Change after a failed submission to focus this summary. Omit for no automatic focus. */
  focusRequestKey?: string | number;
  /** Override for controls that need to reveal a tab or use a custom focus API. */
  focusField?: (error: FormErrorSummaryItem) => void;
}
/** Host-supplied validation messages with real field links; no validation engine or field mutation. */
export function FormErrorSummary({
  errors,
  title = 'Check the following fields',
  description,
  focusRequestKey,
  focusField,
  className,
  ...props
}: FormErrorSummaryProps) {
  const titleId = useId();
  const root = useRef<HTMLElement>(null);
  const previousRequest = useRef<string | number | undefined>(undefined);
  const unique = new Set<string>();
  for (const error of errors) {
    if (!error.id || !error.fieldId || unique.has(error.id))
      throw new TypeError(
        'FormErrorSummary requires unique nonempty error ids and nonempty field ids.',
      );
    unique.add(error.id);
  }
  useEffect(() => {
    if (
      focusRequestKey !== undefined &&
      focusRequestKey !== previousRequest.current &&
      errors.length
    )
      root.current?.focus();
    previousRequest.current = focusRequestKey;
  }, [focusRequestKey, errors.length]);
  if (!errors.length) return null;
  return (
    <section
      {...props}
      ref={root}
      className={cn('aegis-form-error-summary', className)}
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <h2 id={titleId} data-form-error-slot="title">
        {title}
      </h2>
      {description && <p data-form-error-slot="description">{description}</p>}
      <ul data-form-error-slot="errors">
        {errors.map((error) => (
          <li key={error.id}>
            <Link
              href={`#${encodeURIComponent(error.fieldId)}`}
              onClick={(event) => {
                if (
                  event.defaultPrevented ||
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                if (focusField) {
                  event.preventDefault();
                  focusField(error);
                  return;
                }
                const field = document.getElementById(error.fieldId);
                if (field) {
                  event.preventDefault();
                  field.focus();
                  field.scrollIntoView({ block: 'nearest' });
                }
              }}
            >
              {error.message}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
