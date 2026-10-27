import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Slider } from './slider';
import { Field } from '@/components/field';

const percent = (value: number) => `${value}%`;
const meta = {
  id: 'components-forms-slider',
  title: 'Components/Inputs & Selection/Slider',
  component: Slider,
  tags: ['autodocs'],
  args: { label: 'Review threshold', defaultValue: [65], min: 0, max: 100, formatValue: percent },
  parameters: {
    docs: {
      description: {
        component:
          'Accessible Base UI slider supporting single values and ranges, horizontal/vertical orientation, form names and keyboard arrows, Page Up/Down, Home/End. Field descriptions are applied to every thumb; thumbLabels distinguish range endpoints.',
      },
    },
  },
} satisfies Meta<typeof Slider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  render: () => (
    <div className="story-grid">
      <Slider label="Review threshold" defaultValue={[65]} formatValue={percent} />
      <Slider
        label="Confidence range"
        defaultValue={[40, 90]}
        formatValue={percent}
        minStepsBetweenThumbs={5}
      />
      <Slider
        label="Event retention"
        defaultValue={[30]}
        min={7}
        max={90}
        step={1}
        formatValue={(value) => `${value} days`}
      />
      <Slider label="Managed threshold" defaultValue={[75]} formatValue={percent} disabled />
      <Field
        label="Review threshold"
        error="A threshold below 20% produces too many review requests."
      >
        <Slider defaultValue={[10]} formatValue={percent} />
      </Field>
      <Slider
        label="Signal sensitivity"
        orientation="vertical"
        defaultValue={[60]}
        formatValue={percent}
      />
    </div>
  ),
};
export const Range: Story = {
  args: {
    label: 'Confidence window',
    defaultValue: [40, 85],
    thumbLabels: ['Lower confidence', 'Upper confidence'],
    minStepsBetweenThumbs: 5,
  },
};
export const KeyboardAdjustment: Story = {
  render: function ControlledThreshold() {
    const [value, setValue] = useState([65]);
    return (
      <div className="stack">
        <Slider
          label="Review threshold"
          value={value}
          onValueChange={setValue}
          formatValue={percent}
        />
        <output aria-live="polite">Records scoring {value[0]} or higher require review.</output>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const thumb = canvas.getByRole('slider', { name: 'Review threshold' });
    thumb.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(thumb).toHaveAttribute('aria-valuenow', '66');
    await userEvent.keyboard('{End}');
    await expect(thumb).toHaveAttribute('aria-valuenow', '100');
    await expect(
      canvas.getByText('Records scoring 100 or higher require review.'),
    ).toBeInTheDocument();
  },
};
