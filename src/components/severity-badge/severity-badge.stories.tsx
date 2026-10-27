import type { Meta, StoryObj } from '@storybook/react-vite';
import { SeverityBadge } from './severity-badge';
export default {
  id: 'components-tags-severitybadge',
  title: 'Components/Data Display/SeverityBadge',
  component: SeverityBadge,
} satisfies Meta<typeof SeverityBadge>;
export const Matrix: StoryObj<typeof SeverityBadge> = {
  render: () => (
    <div className="stack">
      {[false, true].map((compact) => (
        <div key={String(compact)} className="row">
          {(['critical', 'high', 'medium', 'low', 'info'] as const).map((severity) => (
            <SeverityBadge severity={severity} compact={compact} key={severity} />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Playground: StoryObj<typeof SeverityBadge> = {
  args: { severity: 'high', compact: false },
  argTypes: {
    severity: { control: 'select', options: ['critical', 'high', 'medium', 'low', 'info'] },
    compact: { control: 'boolean' },
  },
  render: (args) => <SeverityBadge {...args} />,
};
