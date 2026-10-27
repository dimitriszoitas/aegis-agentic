import type { Meta, StoryObj } from '@storybook/react-vite';
import { AiVerdictCell } from './data-grid-cells';
export default {
  id: 'components-data-grid-ai-verdict-cell',
  title: 'Components/Data Display/Data grid/AI verdict cell',
  component: AiVerdictCell,
  tags: ['autodocs'],
  args: { verdict: 'Review first', confidence: 0.96 },
} satisfies Meta<typeof AiVerdictCell>;
export const ConfidenceLevels: StoryObj<typeof AiVerdictCell> = {
  render: () => (
    <div className="stack" style={{ alignItems: 'flex-start' }}>
      <AiVerdictCell verdict="Review first" confidence={0.96} />
      <AiVerdictCell verdict="Needs context" confidence={0.67} />
      <AiVerdictCell verdict="Insufficient evidence" confidence={0.32} />
    </div>
  ),
};

export const Playground: StoryObj<typeof AiVerdictCell> = {
  args: { verdict: 'Review first', confidence: 0.96 },
  argTypes: { confidence: { control: { type: 'number', min: 0, max: 1, step: 0.01 } } },
};
