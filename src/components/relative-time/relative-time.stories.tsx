import type { Meta, StoryObj } from '@storybook/react-vite';
import { RelativeTime } from './relative-time';
import { referenceTime } from '@/sample-data';
const meta = {
  id: 'components-data-relativetime',
  title: 'Components/Data Display/RelativeTime',
  component: RelativeTime,
  tags: ['autodocs'],
  args: { value: referenceTime - 6 * 60000, now: referenceTime },
} satisfies Meta<typeof RelativeTime>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Matrix: Story = {
  render: () => (
    <div className="story-layout stack">
      {[0, 45000, 360000, 3600000, 86400000, 2592000000, -7200000].map((offset) => (
        <div className="row" key={offset}>
          <RelativeTime value={referenceTime - offset} now={referenceTime} />
          <span className="muted">·</span>
          <RelativeTime value={referenceTime - offset} now={referenceTime} compact />
        </div>
      ))}
    </div>
  ),
};
export const AutoUpdating: Story = {
  args: { value: new Date().toISOString(), now: undefined, updateInterval: 1000 },
};
export const InvalidTimestamp: Story = { args: { value: 'unavailable' } };
