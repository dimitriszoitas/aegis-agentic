import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfidenceBadge } from './confidence-badge';
const meta = {
  id: 'components-ai-confidencebadge',
  title: 'Components/AI/ConfidenceBadge',
  component: ConfidenceBadge,
  tags: ['autodocs'],
  args: { confidence: 'high' },
} satisfies Meta<typeof ConfidenceBadge>;
export default meta;
export const Levels: StoryObj<typeof meta> = {
  render: () => (
    <div className="stack" style={{ maxWidth: 560 }}>
      {(['high', 'medium', 'low'] as const).map((confidence, index) => (
        <div className="between" key={confidence}>
          <span>
            {
              [
                'All required fields supplied',
                'Owner assignment requires confirmation',
                'Insufficient workspace context',
              ][index]
            }
          </span>
          <ConfidenceBadge confidence={confidence} />
        </div>
      ))}
    </div>
  ),
};

export const Playground: StoryObj<typeof meta> = {
  args: { confidence: 'high' },
  argTypes: { confidence: { control: 'select', options: ['high', 'medium', 'low'] } },
  render: (args) => <ConfidenceBadge {...args} />,
};
