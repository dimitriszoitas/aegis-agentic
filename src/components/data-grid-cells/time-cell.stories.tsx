import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimeCell } from './data-grid-cells';
const now = Date.parse('2026-10-06T12:00:00Z');
export default {
  id: 'components-data-grid-time-cell',
  title: 'Components/Data Display/Data grid/Time cell',
  component: TimeCell,
  tags: ['autodocs'],
  args: { value: '2026-10-06T11:57:00Z', now },
} satisfies Meta<typeof TimeCell>;
export const Matrix: StoryObj<typeof TimeCell> = {
  render: () => (
    <div className="story-layout stack" style={{ maxWidth: 500 }}>
      {[
        ['Last event', '2026-10-06T11:59:42Z'],
        ['First seen', '2026-10-06T09:14:00Z'],
        ['Rule enabled', '2026-10-02T10:00:00Z'],
        ['Scheduled review', '2026-10-06T14:00:00Z'],
      ].map(([label, value]) => (
        <div className="between" key={label}>
          <span>{label}</span>
          <TimeCell value={value} now={now} />
        </div>
      ))}
    </div>
  ),
};
export const ViewerTimeZone: StoryObj<typeof TimeCell> = {
  args: { timeZone: 'Europe/Athens' },
};
