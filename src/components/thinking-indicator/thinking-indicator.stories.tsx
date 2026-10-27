import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThinkingIndicator } from './thinking-indicator';
const meta = {
  id: 'components-ai-thinkingindicator',
  title: 'Components/AI/ThinkingIndicator',
  component: ThinkingIndicator,
  tags: ['autodocs'],
} satisfies Meta<typeof ThinkingIndicator>;
export default meta;
export const EvidenceReview: StoryObj<typeof meta> = {
  args: {
    messages: [
      'Reading the selected record context',
      'Comparing record identifiers and timestamps',
      'Preparing verification steps',
    ],
  },
};
export const Compact: StoryObj<typeof meta> = { args: { compact: true } };
