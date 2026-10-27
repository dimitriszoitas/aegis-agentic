import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';
import './unsaved-changes-bar.css';
export interface UnsavedChangesBarProps {
  dirty: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  message?: string;
  saveLabel?: string;
  disabled?: boolean;
  className?: string;
}
/** Inline save/discard boundary. The host owns the edited data and navigation guard. */
export function UnsavedChangesBar({
  dirty,
  onSave,
  onDiscard,
  message = 'You have unsaved changes.',
  saveLabel = 'Save changes',
  disabled,
  className,
}: UnsavedChangesBarProps) {
  const [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const pending = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const save = async () => {
    if (pending.current || disabled) return;
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave();
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : 'Changes could not be saved. Try again.');
    } finally {
      pending.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  if (!dirty && !saving) return null;
  return (
    <section
      className={cn('aegis-unsaved-bar', className)}
      aria-label="Unsaved changes"
      aria-busy={saving || undefined}
    >
      <div>
        <p role="status">{saving ? 'Saving your changes…' : message}</p>
        {error && (
          <p className="aegis-unsaved-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="aegis-unsaved-actions">
        <Button
          emphasis="ghost"
          disabled={disabled || saving}
          onClick={() => {
            setError('');
            onDiscard();
          }}
        >
          Discard
        </Button>
        <Button intent="function" loading={saving} disabled={disabled} onClick={() => void save()}>
          {saveLabel}
        </Button>
      </div>
    </section>
  );
}
