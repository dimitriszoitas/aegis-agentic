import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Field } from '@/components/field';
import { ColorPicker, normalizeHex } from './color-picker';
describe('ColorPicker explicit hex data', () => {
  it('canonicalizes supported RGB and RGBA formats without accepting arbitrary CSS', () => {
    expect(normalizeHex('#abc', false)).toBe('#AABBCC');
    expect(normalizeHex('#f008', true)).toBe('#FF000088');
    expect(normalizeHex('#abc', true)).toBe('#AABBCCFF');
    for (const value of ['red', 'var(--brand)', 'url(test)', '#12345', '#abcdef80'])
      expect(normalizeHex(value, false)).toBeNull();
  });
  it('keeps form naming on the hex input and distinct IDs for alpha in a Field', () => {
    const html = renderToStaticMarkup(
      <Field id="brand" label="Brand">
        <ColorPicker name="color" defaultValue="#f008" alpha />
      </Field>,
    );
    expect(html.match(/name="color"/g)).toHaveLength(1);
    expect(html.match(/id="brand"/g)).toHaveLength(1);
    expect(html).toContain('value="#FF000088"');
    expect(html).toContain('value="#FF0000"');
    expect(html).toContain('Opacity percent');
  });
  it('requires parseable committed values and safe swatches', () => {
    expect(() => renderToStaticMarkup(<ColorPicker value="purple" />)).toThrow(/hexadecimal/);
    expect(() =>
      renderToStaticMarkup(<ColorPicker swatches={[{ value: 'url(x)', label: 'Unsafe' }]} />),
    ).toThrow(/swatches/);
  });
});
