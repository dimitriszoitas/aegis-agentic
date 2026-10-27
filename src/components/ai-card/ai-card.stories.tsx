import type { ComponentProps } from 'react';
import { useArgs } from 'storybook/preview-api';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { AiCard, AiLabel, AiFeedback, type AiFeedbackValue } from './ai-card';
import { StreamingSkeleton } from '@/components/streaming-skeleton';
const meta = {
  id: 'components-ai-aicard',
  title: 'Components/AI/AiCard',
  component: AiCard,
  subcomponents: { AiLabel, AiFeedback },
  tags: ['autodocs'],
} satisfies Meta<typeof AiCard>;
export default meta;
function ReviewCard() {
  const [feedback, setFeedback] = useState<AiFeedbackValue>(null);
  const [revision, setRevision] = useState(1);
  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <AiCard
        title="Review the delivery checklist before closing this record"
        confidence="high"
        provenance={`REC-1002 · Project checklist · Summary ${revision}`}
        feedback={feedback}
        onFeedback={setFeedback}
        onRegenerate={() => {
          setRevision((value) => value + 1);
          setFeedback(null);
        }}
      >
        <p>
          The project checklist still has an unassigned review. Confirm the owner and due date
          before completing the handoff.
        </p>
        <p>
          <strong>Suggested next step:</strong> assign the remaining review and confirm the delivery
          date.
        </p>
      </AiCard>
      <p role="status" className="muted">
        {feedback === null
          ? 'No reviewer feedback yet.'
          : feedback === 'positive'
            ? 'Marked as helpful.'
            : 'Marked as unhelpful.'}
      </p>
    </div>
  );
}
export const ReviewerReview: StoryObj<typeof meta> = {
  render: () => <ReviewCard />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Helpful response' }));
    await expect(canvas.getByRole('button', { name: 'Helpful response' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Regenerate response' }));
    await expect(canvas.getByText(/Summary 2/)).toBeVisible();
  },
};
export const Pending: StoryObj<typeof meta> = {
  render: () => (
    <AiCard title="Preparing a review summary" loading provenance="2 selected records · Last 24h">
      <StreamingSkeleton lines={4} />
    </AiCard>
  ),
};
export const ConfidenceLevels: StoryObj<typeof meta> = {
  render: () => (
    <div className="story-grid">
      {(['high', 'medium', 'low'] as const).map((confidence, index) => (
        <AiCard
          key={confidence}
          title={
            ['Required fields are present', 'Owner needs confirmation', 'More context is needed'][
              index
            ]
          }
          confidence={confidence}
          provenance={
            ['Project checklist · REC-1002', 'Customer handoff · REC-1001', 'Workspace note'][index]
          }
        >
          {
            [
              'The supplied checklist contains an owner and delivery date. Confirm these values before applying the proposed update.',
              'The handoff note names a team but does not identify the next owner.',
              'The note does not include a due date or supporting detail. Ask for context before proposing a change.',
            ][index]
          }
        </AiCard>
      ))}
    </div>
  ),
};

type PlaygroundArgs = ComponentProps<typeof AiCard> & {
  showFeedback: boolean;
  showRegenerate: boolean;
};
export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    title: 'Review the project handoff',
    children: 'Confirm the remaining owner and due date before completing the handoff.',
    confidence: 'high',
    provenance: 'Project checklist · 2 supplied records',
    loading: false,
    showFeedback: true,
    showRegenerate: true,
    feedback: null,
  },
  argTypes: {
    title: { control: 'text' },
    children: { control: 'text', name: 'Content' },
    provenance: { control: 'text' },
    confidence: { control: 'select', options: ['high', 'medium', 'low'] },
    loading: { control: 'boolean' },
    showFeedback: { control: 'boolean', name: 'Feedback actions' },
    showRegenerate: { control: 'boolean', name: 'Regenerate action' },
    feedback: { control: false },
  },
  render: function Playground({ showFeedback, showRegenerate, ...args }) {
    const [, updateArgs] = useArgs<PlaygroundArgs>();
    return (
      <div style={{ width: '100%', maxWidth: 640 }}>
        <AiCard
          {...args}
          onFeedback={showFeedback ? (feedback) => updateArgs({ feedback }) : undefined}
          onRegenerate={
            showRegenerate
              ? () =>
                  updateArgs({
                    feedback: null,
                    provenance: 'Regenerated locally from the supplied project checklist',
                  })
              : undefined
          }
        />
      </div>
    );
  },
};
