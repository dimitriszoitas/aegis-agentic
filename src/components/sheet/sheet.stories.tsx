import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Sheet, type SheetProps } from './sheet';

function Workspace(args: SheetProps) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(280);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div style={{ height: 540, width: '100%', maxWidth: 900 }}>
      <Sheet
        {...args}
        open={open}
        onOpenChange={setOpen}
        size={size}
        onSizeChange={setSize}
        restoreFocusRef={trigger}
        content={
          <main style={{ padding: 16 }}>
            <h2>Project workspace</h2>
            <button ref={trigger} type="button" onClick={() => setOpen(true)}>
              Open details
            </button>
            <p>Opening the sheet reduces the available workspace, without covering it.</p>
          </main>
        }
      />
    </div>
  );
}

const meta = {
  id: 'components-overlays-sheet',
  title: 'Components/Surfaces/Sheet',
  component: Sheet,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    title: 'Event details',
    description: 'REC-1082',
    content: null,
    children: (
      <p>
        The sheet follows the selected theme: flush in Fundamental and inset in Fundamental
        Floating. Its body scrolls independently.
      </p>
    ),
    minSize: 160,
    maxSize: 420,
    contentMinSize: 120,
  },
  render: (args) => <Workspace {...args} />,
} satisfies Meta<typeof Sheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Bottom: Story = {};
export const Right: Story = { args: { placement: 'right' } };
export const Left: Story = { args: { placement: 'left' } };
export const ControlledKeyboardResizeAndFocus: Story = {
  parameters: { docs: { story: { inline: true, autoplay: false, height: 540 } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Open details' });
    await userEvent.click(trigger);
    const edge = canvas.getByRole('separator', { name: 'Resize bottom sheet' });
    await waitFor(() => expect(edge).toHaveAttribute('aria-valuenow', '280'));
    edge.focus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(edge).toHaveAttribute('aria-valuenow', '300');
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
    await expect(edge).toHaveAttribute('aria-valuenow', '260');
    await userEvent.keyboard('{Home}');
    await expect(edge).toHaveAttribute('aria-valuenow', '160');
    await userEvent.keyboard('{End}');
    await expect(edge).toHaveAttribute('aria-valuenow', '420');
    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('separator')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
