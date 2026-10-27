import type { Meta, StoryObj } from '@storybook/react-vite';
import { DatePicker } from './date-picker';
import { Field } from '@/components/field';
export default {
  id: 'components-forms-datepicker',
  title: 'Components/Inputs & Selection/DatePicker',
  component: DatePicker,
  parameters: { docs: { story: { inline: false, height: 420 } } },
} satisfies Meta<typeof DatePicker>;
export const Matrix: StoryObj<typeof DatePicker> = {
  render: () => (
    <div className="row">
      <Field label="Project date">
        <DatePicker defaultValue={new Date('2026-10-06T00:00:00Z')} />
      </Field>
      <Field label="Report date" optional>
        <DatePicker />
      </Field>
      <Field label="Archived before">
        <DatePicker disabled defaultValue={new Date('2026-09-01T00:00:00Z')} />
      </Field>
    </div>
  ),
};
export const OpenCalendar: StoryObj<typeof DatePicker> = {
  args: { defaultValue: new Date('2026-10-06T00:00:00Z'), defaultOpen: true },
};
