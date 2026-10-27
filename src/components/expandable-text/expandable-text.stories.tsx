import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '@/components/button';
import { ExpandableText } from './expandable-text';

const project =
  'The customer portal redesign brings onboarding, account settings, and billing into one workspace. The first milestone includes updated navigation and a clearer project overview. Review the proposed flow with the customer team before scheduling implementation. Compare the designs with the agreed requirements, confirm accessibility and content responsibilities, and record the next steps in the project brief so everyone can follow the decision.';
const meta = {
  id: 'components-content-expandabletext',
  title: 'Components/Data Display/ExpandableText',
  component: ExpandableText,
  parameters: {
    docs: {
      description: {
        component:
          'A configurable line-clamped text preview. The disclosure appears only when measured content exceeds the collapsed line limit, including after resizing or font loading. Plain-text content stays readable to assistive technology. Use expanded/onExpandedChange for controlled state, or defaultExpanded for an initial expanded view.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 420px)' }}>
        <Story />
      </div>
    ),
  ],
  args: { children: project, collapsedLines: 3 },
} satisfies Meta<typeof ExpandableText>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const OneLine: Story = { args: { collapsedLines: 1 } };
export const FiveLines: Story = { args: { collapsedLines: 5 } };
export const ShortText: Story = {
  args: { children: 'No additional details was found.' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Read more' })).toBeNull();
  },
};
export const InitiallyExpanded: Story = { args: { defaultExpanded: true } };
export const CustomLabels: Story = {
  args: { expandLabel: 'Read full details', collapseLabel: 'Collapse details' },
};
export const KeyboardDisclosure: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = await canvas.findByRole('button', { name: 'Read more' });
    const content = canvasElement.ownerDocument.getElementById(
      toggle.getAttribute('aria-controls')!,
    )!;
    const collapsedHeight = content.getBoundingClientRect().height;
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveAccessibleName('Read less');
    expect(content.getBoundingClientRect().height).toBeGreaterThan(collapsedHeight);
    await userEvent.keyboard(' ');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveFocus();
    expect(content.getBoundingClientRect().height).toBe(collapsedHeight);
  },
};
export const Controlled: Story = {
  render: function ControlledExample(args) {
    const [expanded, setExpanded] = useState(false);
    const [short, setShort] = useState(false);
    return (
      <div className="stack">
        <div className="row">
          <Button emphasis="secondary" onClick={() => setExpanded(!expanded)}>
            Toggle externally
          </Button>
          <Button emphasis="secondary" onClick={() => setShort(!short)}>
            Change text length
          </Button>
        </div>
        <ExpandableText {...args} expanded={expanded} onExpandedChange={setExpanded}>
          {short ? 'Project review complete.' : project}
        </ExpandableText>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle externally' }));
    await expect(canvas.getByRole('button', { name: 'Read less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Change text length' }));
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Read less' })).toBeNull());
    await userEvent.click(canvas.getByRole('button', { name: 'Change text length' }));
    await expect(canvas.getByRole('button', { name: 'Read less' })).toBeVisible();
  },
};
