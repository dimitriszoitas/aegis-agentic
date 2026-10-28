import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Field } from '@/components/field';
import { NumberInput } from './number-input';

// Bounded render checks; interactive behavior is exercised by the companion stories.
const inputs = (markup: string) => markup.match(/<input\b[^>]*>/g) ?? [];
const visibleInput = (markup: string) =>
  inputs(markup).find((input) => input.includes('type="text"'))!;
const formInput = (markup: string) =>
  inputs(markup).find((input) => input.includes('type="number"'))!;

describe('NumberInput form and field semantics', () => {
  it('separates localized display from the one raw form value', () => {
    const markup = renderToStaticMarkup(
      <NumberInput
        label="Distance"
        defaultValue={1234.5}
        name="distance"
        form="external-form"
        locale="de-DE"
        format={{ minimumFractionDigits: 2 }}
      />,
    );
    expect(visibleInput(markup)).toContain('value="1.234,50"');
    expect(visibleInput(markup)).not.toContain('name=');
    expect(formInput(markup)).toContain('name="distance"');
    expect(formInput(markup)).toContain('form="external-form"');
    expect(formInput(markup)).toContain('value="1234.5"');
    expect(inputs(markup).filter((input) => input.includes('name="distance"'))).toHaveLength(1);
  });

  it('keeps null and an omitted default empty instead of converting either to zero', () => {
    for (const props of [{ value: null }, { defaultValue: null }, {}]) {
      const markup = renderToStaticMarkup(<NumberInput label="Optional amount" {...props} />);
      expect(visibleInput(markup)).toContain('value=""');
      expect(formInput(markup)).toContain('value=""');
    }
    expect(visibleInput(renderToStaticMarkup(<NumberInput label="Zero" value={0} />))).toContain(
      'value="0"',
    );
  });

  it('associates Field labels, help, errors and required state with the real control', () => {
    const markup = renderToStaticMarkup(
      <Field
        id="allocation"
        label="Allocation"
        helpText="In seats."
        error="Choose a valid amount."
        required
      >
        <NumberInput
          defaultValue={2}
          min={0}
          max={10}
          step={2}
          aria-describedby="extra-help allocation-help"
        />
      </Field>,
    );
    const input = visibleInput(markup);
    expect(input).toContain('id="allocation"');
    expect(input).toContain('aria-labelledby="allocation-label"');
    expect(input).toContain('aria-describedby="allocation-help allocation-error extra-help"');
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain('required=""');
    expect(formInput(markup)).toContain('min="0" max="10" step="2"');
  });

  it('forwards disabled and read-only to both input surfaces', () => {
    for (const props of [{ disabled: true }, { readOnly: true }]) {
      const markup = renderToStaticMarkup(
        <NumberInput label="Managed amount" defaultValue={4} {...props} />,
      );
      for (const input of inputs(markup))
        expect(input).toContain(props.disabled ? 'disabled=""' : 'readOnly=""');
    }
  });

  it('renders real shared step buttons or omits both without changing input semantics', () => {
    const markup = renderToStaticMarkup(
      <NumberInput label="Seats" decrementLabel="Fewer seats" incrementLabel="More seats" />,
    );
    const buttons = markup.match(/<button\b[^>]*>/g) ?? [];
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toContain('aegis-icon-button');
      expect(button).toContain('type="button"');
      expect(button).toContain('tabindex="-1"');
    }
    expect(markup).toContain('aria-label="Fewer seats"');
    expect(markup).toContain('aria-label="More seats"');
    const plain = renderToStaticMarkup(<NumberInput label="Seats" showSteppers={false} />);
    expect(plain).not.toContain('<button');
    expect(inputs(plain)).toHaveLength(2);
  });
});
