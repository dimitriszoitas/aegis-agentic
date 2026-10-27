import { useId } from 'react';
import { CopyButton } from '@/components/copy-button';
import { cn } from '@/lib/utils';
import './copyable-field.css';
export interface CopyableFieldProps {
  label: string;
  value: string;
  description?: string;
  multiline?: boolean;
  className?: string;
}
/** Read-only text with a keyboard-selectable value and an explicit copy action. */
export function CopyableField({
  label,
  value,
  description,
  multiline,
  className,
}: CopyableFieldProps) {
  const id = useId();
  return (
    <div className={cn('aegis-copyable-field', className)}>
      <label htmlFor={id}>{label}</label>
      <div className="aegis-copyable-field-control">
        {multiline ? (
          <textarea
            id={id}
            value={value}
            readOnly
            rows={3}
            aria-describedby={description ? `${id}-description` : undefined}
          />
        ) : (
          <input
            id={id}
            value={value}
            readOnly
            aria-describedby={description ? `${id}-description` : undefined}
          />
        )}
        <CopyButton text={value} aria-label={`Copy ${label.toLowerCase()}`} />
      </div>
      {description && <p id={`${id}-description`}>{description}</p>}
    </div>
  );
}
