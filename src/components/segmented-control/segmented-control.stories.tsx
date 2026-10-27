import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { SegmentedControl } from './segmented-control';
const meta = {
  id: 'components-forms-segmentedcontrol',
  title: 'Components/Inputs & Selection/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
  args: {
    label: 'Billing interval',
    options: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'yearly', label: 'Yearly' },
    ],
  },
} satisfies Meta<typeof SegmentedControl>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Compact: StoryObj<typeof meta> = { args: { size: 'sm' } };
export const Disabled: StoryObj<typeof meta> = { args: { disabled: true } };
export const KeyboardSelection: StoryObj<typeof meta> = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: 'Monthly' }));
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('radio', { name: 'Quarterly' })).toBeChecked();
  },
};
