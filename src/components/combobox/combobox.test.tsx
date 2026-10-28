import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Combobox } from './combobox';
import { Field } from '@/components/field';
const options = [
  { value: 'ath', label: 'Athens' },
  { value: 'ber', label: 'Berlin' },
];
describe('Combobox selection and form contract', () => {
  it('renders selected label but names only the selected ID form input', () => {
    const html = renderToStaticMarkup(
      <Field id="city" label="City" helpText="Pick a city">
        <Combobox options={options} defaultValue="ath" name="city" form="travel" />
      </Field>,
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('value="Athens"');
    expect(html).toContain('value="ath"');
    expect(html.match(/name="city"/g)).toHaveLength(1);
    expect(html).toContain('form="travel"');
    expect(html).toContain('aria-describedby="city-help"');
  });
  it('retains a remote selected label without requiring its ID in current results', () => {
    const html = renderToStaticMarkup(
      <Combobox options={[]} value="ath" selectedLabel="Athens" filterOptions={false} />,
    );
    expect(html).toContain('value="Athens"');
  });
  it('rejects ambiguous option IDs', () => {
    expect(() => renderToStaticMarkup(<Combobox options={[...options, options[0]]} />)).toThrow(
      /unique/,
    );
    expect(() =>
      renderToStaticMarkup(<Combobox options={[{ value: '', label: 'Empty' }]} />),
    ).toThrow(/nonempty/);
  });
});
