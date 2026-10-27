import { useId } from 'react';
import { useInputFocusModality } from '@/lib/use-input-focus';

/** Visible native radio choices keep every example reachable without a dropdown. */
export function ExamplePicker({
  examples,
  value,
  onChange,
}: {
  examples: readonly { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const name = useId();
  useInputFocusModality();
  return (
    <fieldset className="component-docs-example-picker">
      <legend>Examples</legend>
      <div className="component-docs-example-choices">
        {examples.map((example) => (
          <label className="component-docs-example-choice" key={example.id}>
            <input
              className="sr-only"
              type="radio"
              name={name}
              value={example.id}
              checked={value === example.id}
              onChange={() => onChange(example.id)}
            />
            <span>{example.name}</span>
            <span className="component-docs-example-selected" aria-hidden="true">
              ✓
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
