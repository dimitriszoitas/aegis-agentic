import { useEffect, useId, useState } from 'react';
import { SegmentedControl } from '@/components/segmented-control';
import './playground-controls.css';

export type PlaygroundControlValue = string | number | boolean;
export interface PlaygroundControl {
  name: string;
  label: string;
  type: 'boolean' | 'select' | 'text' | 'number' | 'json';
  description?: string;
  options?: readonly { label: string; value: PlaygroundControlValue }[];
  defaultValue?: unknown;
  min?: number;
  max?: number;
  step?: number;
  multiline?: boolean;
  disabled?: boolean;
}
export interface PlaygroundControlsProps {
  controls: readonly PlaygroundControl[];
  args: Record<string, unknown>;
  onArgsChange: (patch: Record<string, unknown>) => void;
  onReset: () => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}

export function formatPlaygroundJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? '';
  } catch {
    return '';
  }
}

function JsonControl({
  id,
  value,
  disabled,
  descriptionId,
  onChange,
}: {
  id: string;
  value: unknown;
  disabled: boolean;
  descriptionId?: string;
  onChange: (value: unknown) => void;
}) {
  const serialized = formatPlaygroundJson(value);
  const [draft, setDraft] = useState(serialized);
  const [error, setError] = useState('');
  const [appliedValue, setAppliedValue] = useState<string>();
  useEffect(() => {
    setDraft(serialized);
    setError('');
  }, [serialized]);
  const apply = () => {
    if (disabled) return;
    try {
      const next: unknown = JSON.parse(draft);
      setError('');
      setAppliedValue(formatPlaygroundJson(next));
      onChange(next);
    } catch {
      setError('Enter valid JSON before applying this value.');
      setAppliedValue(undefined);
    }
  };
  return (
    <>
      <textarea
        id={id}
        className="component-docs-playground-json"
        value={draft}
        disabled={disabled}
        rows={5}
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [descriptionId, error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined
        }
        onChange={(event) => {
          setDraft(event.target.value);
          setError('');
          setAppliedValue(undefined);
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            apply();
          }
        }}
      />
      {error && (
        <p className="component-docs-playground-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
      <div className="component-docs-playground-json-actions">
        <button type="button" onClick={apply} disabled={disabled || draft === serialized}>
          Apply JSON
        </button>
        <span role="status">
          {appliedValue !== undefined && appliedValue === serialized && draft === serialized
            ? 'Applied'
            : 'Apply after editing'}
        </span>
      </div>
    </>
  );
}

function NumberControl({
  control,
  id,
  value,
  disabled,
  descriptionId,
  onChange,
}: {
  control: PlaygroundControl;
  id: string;
  value: unknown;
  disabled: boolean;
  descriptionId?: string;
  onChange: (value: unknown) => void;
}) {
  const external = typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
  const [draft, setDraft] = useState(external);
  const [error, setError] = useState('');
  useEffect(() => {
    setDraft(external);
    setError('');
  }, [external]);
  const change = (text: string, valid: boolean) => {
    setDraft(text);
    if (text === '') {
      setError('');
      onChange(undefined);
      return;
    }
    const next = Number(text);
    if (valid && Number.isFinite(next)) {
      setError('');
      onChange(next);
    } else
      setError(
        control.min !== undefined || control.max !== undefined
          ? `Enter a number${control.min !== undefined ? ` from ${control.min}` : ''}${control.max !== undefined ? ` up to ${control.max}` : ''}.`
          : 'Enter a valid number.',
      );
  };
  return (
    <>
      <input
        type="number"
        id={id}
        value={draft}
        min={control.min}
        max={control.max}
        step={control.step ?? 'any'}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [descriptionId, error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined
        }
        onChange={(event) => change(event.target.value, event.target.validity.valid)}
      />
      {error && (
        <p className="component-docs-playground-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function ControlField({
  control,
  value,
  disabled,
  onChange,
}: {
  control: PlaygroundControl;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const id = useId();
  const descriptionId = control.description ? `${id}-description` : undefined;
  const inactive = disabled || Boolean(control.disabled);
  const content =
    control.type === 'boolean' ? (
      <label className="component-docs-playground-toggle" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          disabled={inactive}
          aria-describedby={descriptionId}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{control.label}</span>
      </label>
    ) : (
      <>
        {control.type === 'select' && (control.options?.length ?? 0) <= 4 ? (
          <>
            <span className="component-docs-playground-label">{control.label}</span>
            <SegmentedControl
              label={control.label}
              size="sm"
              wrap
              fullWidth
              disabled={inactive}
              options={(control.options ?? []).map((option, index) => ({
                label: option.label,
                value: String(index),
              }))}
              value={String(
                control.options?.findIndex((option) => Object.is(option.value, value)) ?? -1,
              )}
              onValueChange={(index) => {
                const option = control.options?.[Number(index)];
                if (option) onChange(option.value);
              }}
            />
          </>
        ) : (
          <label htmlFor={id}>{control.label}</label>
        )}
        {control.type === 'select' && (control.options?.length ?? 0) <= 4 ? null : control.type ===
          'select' ? (
          <select
            id={id}
            disabled={inactive || !control.options?.length}
            value={String(
              control.options?.findIndex((option) => Object.is(option.value, value)) ?? -1,
            )}
            aria-describedby={descriptionId}
            onChange={(event) => {
              const option = control.options?.[Number(event.target.value)];
              if (option) onChange(option.value);
            }}
          >
            {!control.options?.some((option) => Object.is(option.value, value)) && (
              <option value="-1" disabled>
                {value === undefined ? 'Choose a value' : 'Current example value'}
              </option>
            )}
            {control.options?.map((option, index) => (
              <option value={index} key={`${typeof option.value}:${String(option.value)}`}>
                {option.label}
              </option>
            ))}
          </select>
        ) : control.type === 'number' ? (
          <NumberControl
            control={control}
            id={id}
            value={value}
            disabled={inactive}
            descriptionId={descriptionId}
            onChange={onChange}
          />
        ) : control.type === 'json' ? (
          <JsonControl
            id={id}
            value={value}
            disabled={inactive}
            descriptionId={descriptionId}
            onChange={onChange}
          />
        ) : control.multiline ? (
          <textarea
            id={id}
            rows={3}
            value={typeof value === 'string' ? value : ''}
            disabled={inactive}
            aria-describedby={descriptionId}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <input
            type="text"
            id={id}
            value={typeof value === 'string' ? value : ''}
            disabled={inactive}
            aria-describedby={descriptionId}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </>
    );
  return (
    <div className="component-docs-playground-field" data-control-type={control.type}>
      {content}
      {control.description && (
        <p id={descriptionId} className="component-docs-playground-description">
          {control.description}
        </p>
      )}
    </div>
  );
}

/** Edits only descriptors provided by the live specimen; no inferred DOM or callback controls. */
export function PlaygroundControls({
  controls,
  args,
  onArgsChange,
  onReset,
  disabled = false,
  loading = false,
  error,
}: PlaygroundControlsProps) {
  const headingId = useId();
  const [resetVersion, setResetVersion] = useState(0);
  const inactive = disabled || loading;
  return (
    <section
      className="component-docs-controls component-docs-playground-controls"
      aria-labelledby={headingId}
      aria-busy={loading}
    >
      <header className="component-docs-playground-heading">
        <div>
          <h3 id={headingId}>Playground controls</h3>
          <p>
            {controls.length} editable {controls.length === 1 ? 'option' : 'options'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (inactive) return;
            setResetVersion((version) => version + 1);
            onReset();
          }}
          disabled={inactive || controls.length === 0}
        >
          Reset
        </button>
      </header>
      {loading && (
        <p className="component-docs-playground-message" role="status">
          Loading example controls…
        </p>
      )}
      {error && (
        <p className="component-docs-playground-error" role="alert">
          {error}
        </p>
      )}
      {!loading && controls.length === 0 && (
        <p className="component-docs-playground-message">
          This example has no editable options. Use its preview or choose another example.
        </p>
      )}
      {controls.map((control) => (
        <ControlField
          key={`${resetVersion}:${control.name}`}
          control={control}
          value={args[control.name] === undefined ? control.defaultValue : args[control.name]}
          disabled={inactive}
          onChange={(value) => {
            if (!inactive && !control.disabled) onArgsChange({ [control.name]: value });
          }}
        />
      ))}
    </section>
  );
}
