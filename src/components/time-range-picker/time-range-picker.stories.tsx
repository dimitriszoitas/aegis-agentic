import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { TimeRangePicker, type TimeRange } from './time-range-picker';
import { Field } from '@/components/field';
import { resolveTimeRange, timePresets } from '@/lib/time-range';
export default {
  id: 'components-forms-timerangepicker',
  title: 'Components/Inputs & Selection/TimeRangePicker',
  component: TimeRangePicker,
  parameters: { docs: { story: { inline: false, height: 600 } } },
} satisfies Meta<typeof TimeRangePicker>;
const now = Date.UTC(2026, 9, 6, 12);
export const Matrix: StoryObj<typeof TimeRangePicker> = {
  render: () => (
    <div className="stack">
      {timePresets.map((p) => (
        <TimeRangePicker key={p.value} value={{ mode: 'relative', preset: p.value }} now={now} />
      ))}
      <TimeRangePicker
        value={{ mode: 'absolute', from: '2026-10-05T10:00:00Z', to: '2026-10-06T12:00:00Z' }}
        now={now}
      />
    </div>
  ),
};
function LinkedRange() {
  const [value, setValue] = useState<TimeRange>({ mode: 'relative', preset: '24h' });
  const resolved = resolveTimeRange(value, now);
  return (
    <div className="stack">
      <TimeRangePicker value={value} onValueChange={setValue} now={now} />
      <p className="mono muted">
        {resolved.from.toISOString()} → {resolved.to.toISOString()}
      </p>
    </div>
  );
}
export const Interactive: StoryObj<typeof TimeRangePicker> = { render: () => <LinkedRange /> };
export const CustomCalendar: StoryObj<typeof TimeRangePicker> = {
  args: {
    defaultOpen: true,
    now,
    defaultValue: { mode: 'absolute', from: '2026-10-05T08:30:00Z', to: '2026-10-06T12:00:00Z' },
  },
  play: async ({ canvasElement }) => {
    const portal = within(canvasElement.ownerDocument.body);
    const dialog = await portal.findByRole('dialog', { name: 'Time range' });
    const body = dialog.querySelector<HTMLElement>('.aegis-popover-body')!;
    const days = dialog.querySelectorAll<HTMLElement>('.rdp-weekday');
    await waitFor(() => expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth));
    expect(days).toHaveLength(7);
    expect(days[0].getBoundingClientRect().left).toBeGreaterThanOrEqual(
      body.getBoundingClientRect().left,
    );
    expect(days[6].getBoundingClientRect().right).toBeLessThanOrEqual(
      body.getBoundingClientRect().right,
    );
    const apply = portal.getByRole('button', { name: 'Apply range' });
    const top = apply.getBoundingClientRect().top;
    body.scrollTop = body.scrollHeight;
    expect(apply.getBoundingClientRect().top).toBe(top);
    await expect(apply).toBeVisible();
    body.scrollTop = 0;
  },
};
export const Presets: StoryObj<typeof TimeRangePicker> = { args: { defaultOpen: true, now } };
export const FieldComposition: StoryObj<typeof TimeRangePicker> = {
  render: function FieldRanges() {
    const [value, setValue] = useState<TimeRange>({ mode: 'relative', preset: '24h' });
    return (
      <div className="story-grid">
        <Field
          label="Project window"
          required
          helpText="Limits the events included in this project."
          error={
            value.mode === 'relative' && value.preset === '24h'
              ? 'Choose the last hour for current project review.'
              : undefined
          }
        >
          <TimeRangePicker value={value} onValueChange={setValue} now={now} />
        </Field>
        <Field
          label="Archived reporting window"
          disabled
          helpText="This completed report has a fixed scope."
        >
          <TimeRangePicker defaultValue={{ mode: 'relative', preset: '7d' }} now={now} />
        </Field>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const portal = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'Project window (required)' });
    await expect(trigger).toHaveAttribute('aria-invalid', 'true');
    await expect(trigger).toHaveAccessibleDescription(/Limits the events included in this project/);
    await expect(trigger).toHaveAccessibleDescription(/Choose the last hour/);
    await expect(canvas.getByRole('button', { name: 'Archived reporting window' })).toBeDisabled();
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.click(await portal.findByRole('button', { name: 'Last hour' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(trigger).toHaveTextContent('Last 1h');
    await expect(trigger).toHaveAttribute('aria-invalid', 'false');
    await expect(trigger).toHaveAccessibleDescription(
      'Limits the events included in this project. Last 1h',
    );
  },
};
