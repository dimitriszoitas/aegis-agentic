import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '@/components/button';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Popover, PopoverClose } from './popover';

const meta = {
  id: 'components-overlays-popover',
  title: 'Components/Surfaces/Popover',
  component: Popover,
  subcomponents: { PopoverClose },
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Popover headers and footers are optional and have no divider lines. Use `showHeader={false}` for a body-only or footer-only layout; an existing title remains available to assistive technology. `density` is `regular` (16px padding) or `tight` (12px). The body scrolls independently while the close control and footer remain visible.\n\n`PopoverClose` closes its nearest parent popover and inherits native button props from Base UI. It must be rendered inside that parent.\n\n| PopoverClose prop | Type | Behavior |\n| --- | --- | --- |\n| asChild | `boolean` | Uses its single child as the close control instead of adding a button |\n| children | `ReactNode` | Button content or the single child when asChild is enabled |\n| disabled | `boolean` | Disables the close control |\n| onClick | `MouseEventHandler<HTMLButtonElement>` | Runs alongside the close behavior |\n| className / style | `string` / `CSSProperties` | Native presentation props |\n| aria-label | `string` | Accessible name for an icon-only control |\n',
      },
      story: { inline: false, height: 360 },
    },
  },
  args: {
    trigger: <button className="aegis-popover-demo-trigger">Activity details</button>,
    title: 'Project activity',
    description: 'Activity recorded during the selected project period.',
    children: (
      <p>The project team completed 37 tasks and submitted the onboarding milestone for review.</p>
    ),
    showClose: true,
  },
} satisfies Meta<typeof Popover>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const OpenActivity: Story = { args: { defaultOpen: true } };
export const PlacementMatrix: Story = {
  argTypes: { side: { control: false }, trigger: { control: false } },
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Popover
          key={side}
          {...args}
          side={side}
          trigger={<button className="aegis-popover-demo-trigger">{side} activity</button>}
        />
      ))}
    </div>
  ),
};
function ControlledExample() {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('Confirm the delivery date with the project owner.');
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={<button className="aegis-popover-demo-trigger">Add project note</button>}
      title="Project note"
      showClose
    >
      <label htmlFor="popover-note">Member note</label>
      <textarea
        id="popover-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        style={{
          width: '100%',
          marginBlock: 'var(--space-3)',
          background: 'var(--color-bg-surface)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-2)',
        }}
      />
      <PopoverClose className="aegis-popover-demo-trigger">Save note</PopoverClose>
    </Popover>
  );
}
export const ControlledForm: Story = { render: () => <ControlledExample /> };

export const BodyOnly: Story = {
  args: {
    title: 'Activity summary',
    description: undefined,
    showHeader: false,
    showClose: false,
    defaultOpen: true,
  },
};
export const HeaderOnly: Story = { args: { defaultOpen: true, footer: undefined } };
export const FooterOnly: Story = {
  args: {
    showHeader: false,
    showClose: false,
    defaultOpen: true,
    footer: (
      <PopoverClose asChild>
        <Button emphasis="secondary">Done</Button>
      </PopoverClose>
    ),
  },
};
export const HeaderAndFooter: Story = {
  args: {
    defaultOpen: true,
    footer: (
      <PopoverClose asChild>
        <Button emphasis="secondary">Done</Button>
      </PopoverClose>
    ),
  },
};
export const DensityMatrix: Story = {
  argTypes: {
    density: { control: false },
    title: { control: false },
    trigger: { control: false },
    footer: { control: false },
  },
  render: (args) => (
    <div className="row">
      {(['regular', 'tight'] as const).map((density) => (
        <Popover
          {...args}
          key={density}
          density={density}
          title={`${density === 'regular' ? 'Regular' : 'Tight'} activity summary`}
          trigger={<Button emphasis="secondary">{density} popover</Button>}
          footer={
            <PopoverClose asChild>
              <Button size="sm" emphasis="secondary">
                Done
              </Button>
            </PopoverClose>
          }
        />
      ))}
    </div>
  ),
};
export const ScrollableBody: Story = {
  args: {
    title: 'Long activity summary with a header that stays visible',
    footer: (
      <PopoverClose asChild>
        <Button emphasis="secondary">Finish review</Button>
      </PopoverClose>
    ),
    children: (
      <div>
        {Array.from({ length: 16 }, (_, index) => (
          <p key={index}>
            Update {index + 1}: The customer requested a change to the project timeline. Confirm the
            project owner and review the related updates.
          </p>
        ))}
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'Activity details' });
    await userEvent.click(trigger);
    const dialog = await body.findByRole('dialog');
    const header = dialog.querySelector<HTMLElement>('.aegis-popover-header')!;
    const footer = dialog.querySelector<HTMLElement>('.aegis-popover-footer')!;
    const scroll = dialog.querySelector<HTMLElement>('.aegis-popover-body')!;
    const headerTop = header.getBoundingClientRect().top;
    const footerTop = footer.getBoundingClientRect().top;
    scroll.scrollTop = scroll.scrollHeight;
    await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
    expect(header.getBoundingClientRect().top).toBe(headerTop);
    expect(footer.getBoundingClientRect().top).toBe(footerTop);
    await expect(body.getByRole('button', { name: 'Close popover' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
