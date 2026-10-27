import type { Meta, StoryObj } from '@storybook/react-vite';
import { Timeline } from './timeline';
import { referenceTime } from '@/sample-data';
import { Tag } from '@/components/tag';
const meta = {
  id: 'components-data-timeline',
  title: 'Components/Data Display/Timeline',
  component: Timeline,
  tags: ['autodocs'],
  args: {
    now: referenceTime,
    items: [
      {
        id: 'resolved',
        type: 'status',
        title: 'Project moved to review',
        actor: 'Elena Vasquez',
        timestamp: referenceTime - 60000,
        description: 'The design milestone is ready for review by the customer team.',
      },
      {
        id: 'note',
        type: 'note',
        title: 'Member note added',
        actor: 'Marcus Chen',
        timestamp: referenceTime - 180000,
        description:
          'The customer approved the updated onboarding requirements. Compare the design with the agreed scope before the next milestone.',
      },
      {
        id: 'ai',
        type: 'ai',
        title: 'Project summary generated',
        actor: 'Aegis AI',
        timestamp: referenceTime - 240000,
        description:
          'The latest updates are summarized with proposed next steps for the project team.',
        actions: <Tag intent="ai">Project · PRJ-1049</Tag>,
      },
      {
        id: 'assigned',
        type: 'assignment',
        title: 'Assigned to Elena Vasquez',
        actor: 'Marcus Chen',
        timestamp: referenceTime - 300000,
      },
      {
        id: 'started',
        type: 'workflow',
        title: 'Project workflow started',
        timestamp: referenceTime - 360000,
        description: 'The project workflow created six tasks for the customer portal redesign.',
      },
    ],
  },
} satisfies Meta<typeof Timeline>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Activity: Story = {
  decorators: [
    (Story) => (
      <div className="story-layout" style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
};
export const Empty: Story = { args: { items: [] } };
export const SingleEvent: Story = { args: { items: [meta.args.items[4]] } };
