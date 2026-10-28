import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Field } from '@/components/field';
import { PasswordInput, type PasswordInputProps } from './password-input';

describe('PasswordInput initial rendering', () => {
  it('starts concealed with an associated non-submitting visibility action', () => {
    const markup = renderToStaticMarkup(
      <PasswordInput id="account-password" label="Account password" defaultValue="example-only" />,
    );
    expect(markup).toMatch(/<input[^>]*type="password"[^>]*value="example-only"/);
    expect(markup).toContain('aria-label="Show password"');
    expect(markup).toContain('aria-controls="account-password"');
    expect(markup).toMatch(/<button[^>]*type="button"/);
    expect(markup).not.toContain('aegis-input-clear');
  });

  it('preserves Field labeling, descriptions, validation and disabled context for both controls', () => {
    const markup = renderToStaticMarkup(
      <Field
        id="new-password"
        label="New password"
        helpText="Use a unique password."
        error="Too short."
        required
        disabled
      >
        <PasswordInput name="password" autoComplete="new-password" defaultValue="example-only" />
      </Field>,
    );
    const input = markup.match(/<input\b[^>]*>/)?.[0] ?? '';
    const button = markup.match(/<button\b[^>]*>/)?.[0] ?? '';
    expect(input).toContain('id="new-password"');
    expect(input).toContain('aria-labelledby="new-password-label"');
    expect(input).toContain('aria-describedby="new-password-help new-password-error"');
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain('required=""');
    expect(input).toContain('disabled=""');
    expect(button).toContain('disabled=""');
  });

  it('keeps read-only values revealable and forwards native form constraints and controlled value', () => {
    const props: PasswordInputProps = {
      name: 'password',
      form: 'sign-in',
      autoComplete: 'current-password',
      minLength: 8,
      maxLength: 128,
      readOnly: true,
      value: 'example-only',
      showPasswordLabel: 'Reveal account password',
    };
    const markup = renderToStaticMarkup(
      <PasswordInput {...props} ref={createRef<HTMLInputElement>()} />,
    );
    const input = markup.match(/<input\b[^>]*>/)?.[0] ?? '';
    const button = markup.match(/<button\b[^>]*>/)?.[0] ?? '';
    expect(input).toContain('name="password"');
    expect(input).toContain('form="sign-in"');
    expect(input).toContain('autoComplete="current-password"');
    expect(input).toContain('minLength="8"');
    expect(input).toContain('maxLength="128"');
    expect(input).toContain('readOnly=""');
    expect(input).toContain('value="example-only"');
    expect(button).toContain('aria-label="Reveal account password"');
    expect(button).not.toContain('disabled=');
  });

  it('merges explicit description ids and preserves explicit Field-control precedence', () => {
    const markup = renderToStaticMarkup(
      <Field id="managed-password" label="Password" helpText="Managed account." disabled>
        <PasswordInput disabled={false} aria-describedby="extra managed-password-help" />
      </Field>,
    );
    const input = markup.match(/<input\b[^>]*>/)?.[0] ?? '';
    const button = markup.match(/<button\b[^>]*>/)?.[0] ?? '';
    expect(input).toContain('aria-describedby="managed-password-help extra"');
    expect(input).not.toContain('disabled=');
    expect(button).not.toContain('disabled=');
  });
});
