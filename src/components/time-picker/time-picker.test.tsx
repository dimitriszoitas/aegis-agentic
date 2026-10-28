import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Field } from '@/components/field';
import { TimePicker } from './time-picker';
it('keeps the native time value, seconds step, constraints, Field association and form identity', () => {
  const html = renderToStaticMarkup(
    <Field id="time" label="Time" helpText="Local time">
      <TimePicker
        name="time"
        form="booking"
        value="09:30:45"
        min="08:00"
        max="18:00"
        step={1}
        readOnly
        required
      />
    </Field>,
  );
  expect(html).toContain('type="time"');
  expect(html).toContain('value="09:30:45"');
  expect(html).toContain('step="1"');
  expect(html).toContain('min="08:00"');
  expect(html).toContain('max="18:00"');
  expect(html).toContain('name="time"');
  expect(html).toContain('form="booking"');
  expect(html).toContain('aria-describedby="time-help"');
  expect(html).toContain('readOnly=""');
});
it('represents empty as an empty string, without midnight conversion', () => {
  expect(renderToStaticMarkup(<TimePicker value="" />)).toContain('value=""');
});
