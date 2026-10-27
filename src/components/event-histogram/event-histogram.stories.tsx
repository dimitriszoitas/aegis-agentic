import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EventHistogram } from './event-histogram';
import { TimeRangePicker } from '@/components/time-range-picker';
import { timeSeries, referenceTime } from '@/sample-data';
import type { TimeRange } from '@/lib/time-range';
const meta = {
  id: 'components-charts-event-histogram',
  title: 'Components/Data Visualization/Event histogram',
  component: EventHistogram,
  tags: ['autodocs'],
  args: { data: timeSeries, title: 'Workspace activity over time' },
} satisfies Meta<typeof EventHistogram>;
export default meta;
export const SeverityStacks: StoryObj<typeof meta> = {};
function LinkedHistogram() {
  const [range, setRange] = useState<TimeRange>({ mode: 'relative', preset: '24h' });
  return (
    <div className="stack">
      <div className="between">
        <p className="muted" style={{ margin: 0 }}>
          Drag the brush handles or use arrow keys on a handle to adjust the review window.
        </p>
        <TimeRangePicker value={range} onValueChange={setRange} now={referenceTime} />
      </div>
      <EventHistogram
        data={timeSeries}
        value={range}
        onValueChange={setRange}
        now={referenceTime}
        brush
        height={250}
        showDataTable
      />
    </div>
  );
}
export const LinkedTimeRange: StoryObj<typeof meta> = { render: () => <LinkedHistogram /> };
export const States: StoryObj<typeof meta> = {
  render: (args) => (
    <div className="stack">
      <EventHistogram {...args} loading />
      <EventHistogram {...args} data={[]} />
    </div>
  ),
};
