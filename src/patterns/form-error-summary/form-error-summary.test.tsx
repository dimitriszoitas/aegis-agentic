import { renderToStaticMarkup as render } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { FormErrorSummary } from './form-error-summary';
describe('FormErrorSummary ownership', () => {
  it('does not create an empty region or invent errors', () => {
    expect(render(<FormErrorSummary errors={[]} />)).toBe('');
  });
  it('requires stable unique errors and actual target ids', () => {
    expect(() =>
      render(
        <FormErrorSummary
          errors={[
            { id: 'same', fieldId: 'one', message: 'One' },
            { id: 'same', fieldId: 'two', message: 'Two' },
          ]}
        />,
      ),
    ).toThrow(/unique/);
    expect(() =>
      render(<FormErrorSummary errors={[{ id: 'one', fieldId: '', message: 'One' }]} />),
    ).toThrow(/field ids/);
  });
  it('renders escaped native links and a programmatic summary focus target without forcing an alert', () => {
    const html = render(
      <FormErrorSummary errors={[{ id: 'one', fieldId: 'field:one', message: 'A < B' }]} />,
    );
    expect(html).toContain('href="#field%3Aone"');
    expect(html).toContain('A &lt; B');
    expect(html).toContain('tabindex="-1"');
    expect(html).not.toContain('role="alert"');
  });
});
