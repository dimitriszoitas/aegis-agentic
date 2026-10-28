import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DateTimePicker, assertDateTimeZone } from './date-time-picker';
describe('DateTimePicker local policy', () => {
  it('preserves an ambiguous local time rather than converting it to an instant', () => {
    const html = renderToStaticMarkup(
      <DateTimePicker
        label="Appointment"
        value="2027-11-07T01:30"
        timeZone="America/New_York"
        name="appointment"
        aria-describedby="external"
      />,
    );
    expect(html).toContain('type="datetime-local"');
    expect(html).toContain('value="2027-11-07T01:30"');
    expect(html).toContain('Time zone: America/New_York.');
    expect(html).toMatch(/aria-describedby="external aegis-date-time-zone-/);
    expect(html).not.toContain('01:30Z');
  });
  it('requires an explicit supported zone or local policy', () => {
    for (const zone of ['', 'Mars/Olympus', '+02:00'])
      expect(() => assertDateTimeZone(zone)).toThrow(/time zone/);
    expect(() => assertDateTimeZone('local')).not.toThrow();
    expect(() => assertDateTimeZone('UTC')).not.toThrow();
  });
});
