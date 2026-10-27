import type { Meta, StoryObj } from '@storybook/react-vite';
import { AiHighlight } from './ai-card';
const meta = {
  id: 'components-ai-aihighlight',
  title: 'Components/AI/AiHighlight',
  component: AiHighlight,
  tags: ['autodocs'],
} satisfies Meta<typeof AiHighlight>;
export default meta;
export const ReviewNote: StoryObj<typeof meta> = {
  args: {
    confidence: 'medium',
    provenance: 'Customer handoff · REC-1001',
    children: (
      <>
        Confirm that <strong>Elena Voss</strong> has accepted the handoff before marking the
        onboarding checklist complete.
      </>
    ),
  },
};
export const ConfigurationReview: StoryObj<typeof meta> = {
  args: {
    provenance: 'Proposed action · WF-003',
    children: (
      <>
        The proposed notification follows the existing assignment step. Simulate the configuration
        with sample records before approving it.
      </>
    ),
  },
};
