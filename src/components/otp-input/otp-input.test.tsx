import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { Field } from '@/components/field';
import { OtpInput, normalizeOtp } from './otp-input';
describe('OtpInput candidate and native semantics', () => {
  it('normalizes full pasted content before bounding it and preserves leading zeroes', () => {
    expect(normalizeOtp('01 23-45 67', 'numeric', 6)).toBe('012345');
    expect(normalizeOtp('a-b 9!z', 'alphanumeric', 4)).toBe('AB9Z');
  });
  it('keeps one real form input with autocomplete and no per-cell roles', () => {
    const html = renderToStaticMarkup(
      <Field id="otp" label="Code" helpText="Use six digits." required>
        <OtpInput name="code" defaultValue="012345" />
      </Field>,
    );
    expect(html.match(/<input\b/g)).toHaveLength(1);
    expect(html).toContain('autoComplete="one-time-code"');
    expect(html).toContain('name="code"');
    expect(html).toContain('value="012345"');
    expect(html).toContain('pattern="[0-9]{6}"');
    expect(html).toContain('aria-describedby="otp-help"');
    expect(html).not.toContain('role="group"');
  });
  it('supports concealed and locked codes and rejects invalid length configuration', () => {
    const html = renderToStaticMarkup(
      <OtpInput label="Code" masked readOnly defaultValue="123456" />,
    );
    expect(html).toContain('type="password"');
    expect(html).toContain('readOnly=""');
    for (const length of [0, 33, 1.5])
      expect(() => renderToStaticMarkup(<OtpInput length={length} />)).toThrow(/length/);
  });
});
