import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Field } from '@/components/field';
import { PhoneInput, inspectPhone } from './phone-input';
describe('PhoneInput parsing boundaries', () => {
  it('keeps raw drafts and produces separate international candidates', () => {
    expect(inspectPhone('(202) 555-0123', 'US', 'international')).toMatchObject({
      raw: '(202) 555-0123',
      e164: '+12025550123',
      formatted: '+1 202 555 0123',
      possible: true,
      valid: true,
    });
    expect(inspectPhone('call me at 2025550123', 'US', 'international').e164).toBeNull();
  });
  it('preserves extensions outside the E.164 candidate and does not force the selected country', () => {
    expect(inspectPhone('+44 20 7946 0018 ext. 12', 'US', 'international')).toMatchObject({
      e164: '+442079460018',
      extension: '12',
      country: 'GB',
    });
    expect(inspectPhone('12', 'US', 'international').possible).toBe(false);
  });
  it('submits one raw tel draft and keeps the country control id separate inside Field', () => {
    const html = renderToStaticMarkup(
      <Field id="telephone" label="Telephone">
        <PhoneInput name="phone" defaultValue="(202) 555-0123" countries={['US', 'GB']} />
      </Field>,
    );
    expect(html).toContain('type="tel"');
    expect(html).toContain('value="(202) 555-0123"');
    expect(html.match(/id="telephone"/g)).toHaveLength(1);
    expect(html.match(/name="phone"/g)).toHaveLength(1);
    expect(html).toContain('Formatted number:');
  });
  it('rejects countries configuration that excludes the selected context', () => {
    expect(() =>
      renderToStaticMarkup(<PhoneInput countries={['GB']} defaultCountry="US" />),
    ).toThrow(/selected country/);
  });
});
