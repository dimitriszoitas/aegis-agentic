import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button';
import { TextInput } from '../text-input';
import { Modal, Dialog, ModalClose, ConfirmDialog } from './modal';

const meta = {
  id: 'components-overlays-modal',
  title: 'Components/Surfaces/Modal',
  component: Modal,
  subcomponents: { Dialog, ConfirmDialog, ModalClose },
  parameters: {
    docs: {
      description: {
        component:
          'Modal has three width presets: `small` (400px), `regular` (560px, default), and `large` (800px), clamped to the viewport. `showHeader={false}` hides the visual header while preserving its accessible title. Header and footer have divider lines and remain outside the scrollable body.\n\n`ModalClose` closes its nearest parent modal and inherits native button props from Base UI. It must be rendered inside that parent.\n\n| ModalClose prop | Type | Behavior |\n| --- | --- | --- |\n| asChild | `boolean` | Uses its single child as the close control instead of adding a button |\n| children | `ReactNode` | Button content or the single child when asChild is enabled |\n| disabled | `boolean` | Disables the close control |\n| onClick | `MouseEventHandler<HTMLButtonElement>` | Runs alongside the close behavior |\n| className / style | `string` / `CSSProperties` | Native presentation props |\n| aria-label | `string` | Accessible name for an icon-only control |\n',
      },
      story: { inline: false, height: 600 },
    },
  },
  tags: ['autodocs'],
  args: {
    title: 'Assign record to a member',
    description: 'Assign REC-00842 to the member responsible for the customer project.',
    trigger: <Button>Assign record</Button>,
    children: (
      <TextInput
        label="Project note"
        defaultValue="Review the delivery checklist before completing the record."
      />
    ),
    footer: (
      <>
        <ModalClose asChild>
          <Button emphasis="ghost">Cancel</Button>
        </ModalClose>
        <ModalClose asChild>
          <Button intent="function">Save assignment</Button>
        </ModalClose>
      </>
    ),
  },
} satisfies Meta<typeof Modal>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const OpenDialog: Story = { args: { defaultOpen: true } };
export const Sizes: Story = {
  argTypes: { size: { control: false }, trigger: { control: false } },
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
      {(['small', 'regular', 'large'] as const).map((size) => (
        <Modal {...args} key={size} size={size} trigger={<Button>{size} project dialog</Button>} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      page = within(canvasElement.ownerDocument.body);
    const viewport = canvasElement.ownerDocument.defaultView!.innerWidth;
    for (const [size, width] of [
      ['small', 400],
      ['regular', 560],
      ['large', 800],
    ] as const) {
      const trigger = canvas.getByRole('button', { name: `${size} project dialog` });
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      const dialog = await page.findByRole('dialog');
      await waitFor(() =>
        expect(
          Math.abs(dialog.getBoundingClientRect().width - Math.min(width, viewport - 24)),
        ).toBeLessThan(1),
      );
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(trigger).toHaveFocus());
    }
  },
};
export const ScrollableWithStickyFooter: Story = {
  args: {
    title: 'Review project activity',
    children: (
      <div>
        {Array.from({ length: 18 }, (_, index) => (
          <p key={index}>
            09:{String(index + 12).padStart(2, '0')} UTC · PRJ-0042 received a new project
            requirement. The customer team requested updated onboarding copy and a review of the
            account settings before the next milestone.
          </p>
        ))}
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'Assign record' });
    await userEvent.click(trigger);
    const dialog = await page.findByRole('dialog');
    const header = dialog.querySelector<HTMLElement>('.aegis-modal-header')!;
    const footer = dialog.querySelector<HTMLElement>('.aegis-modal-footer')!;
    const body = dialog.querySelector<HTMLElement>('.aegis-modal-body')!;
    const headerTop = header.getBoundingClientRect().top,
      footerTop = footer.getBoundingClientRect().top;
    body.scrollTop = body.scrollHeight;
    await waitFor(() => expect(body.scrollTop).toBeGreaterThan(0));
    expect(header.getBoundingClientRect().top).toBe(headerTop);
    expect(footer.getBoundingClientRect().top).toBe(footerTop);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
function ConfirmationExample({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [deleted, setDeleted] = useState(false);
  return (
    <>
      <ConfirmDialog
        defaultOpen={defaultOpen}
        trigger={
          <Button intent="destroy" emphasis="secondary">
            Delete workflow
          </Button>
        }
        title="Delete customer portal workflow?"
        description="The workflow will no longer be available for new projects. Existing records and project history will remain available."
        confirmationText="Customer portal"
        confirmLabel="Delete workflow"
        onConfirm={() => setDeleted(true)}
      />
      <p
        role="status"
        style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)' }}
      >
        {deleted
          ? 'The customer portal workflow was deleted.'
          : 'The workflow is available in 12 projects.'}
      </p>
    </>
  );
}
export const TypedConfirmation: Story = { render: () => <ConfirmationExample /> };
export const OpenTypedConfirmation: Story = { render: () => <ConfirmationExample defaultOpen /> };
export const FailedConfirmation: Story = {
  render: () => (
    <ConfirmDialog
      trigger={<Button intent="destroy">Remove project note</Button>}
      title="Remove project note?"
      description="This note will be permanently removed from REC-00842."
      confirmLabel="Remove note"
      onConfirm={async () => {
        throw new Error('The project is locked by another member. Try again after the handoff.');
      }}
    />
  ),
};

function NavigationConfirmationExample() {
  const [open, setOpen] = useState(false);
  const [navigated, setNavigated] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (open || !navigated) return;
    // The destination is inert until the controlled dialog has actually closed.
    const frame = requestAnimationFrame(() => heading.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, navigated]);
  return (
    <div className="stack">
      <Button onClick={() => setOpen(true)}>Leave project</Button>
      <h2 ref={heading} tabIndex={-1}>
        {navigated ? 'Reports workspace' : 'Project draft'}
      </h2>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Discard project draft?"
        description="Discard the draft and return to reports."
        confirmLabel="Discard and continue"
        onConfirm={() => {
          setNavigated(true);
        }}
      />
    </div>
  );
}
export const NavigationFocus: Story = {
  render: () => <NavigationConfirmationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const portal = within(document.body);
    const opener = canvas.getByRole('button', { name: 'Leave project' });
    await userEvent.click(opener);
    await portal.findByRole('alertdialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
    await userEvent.click(opener);
    await userEvent.click(await portal.findByRole('button', { name: 'Discard and continue' }));
    await waitFor(() =>
      expect(canvas.getByRole('heading', { name: 'Reports workspace' })).toHaveFocus(),
    );
  },
};

export const BodyOnly: Story = {
  args: { showHeader: false, showClose: false, footer: undefined, defaultOpen: true },
};
export const HeaderOnly: Story = { args: { footer: undefined, defaultOpen: true } };
export const FooterOnly: Story = {
  args: { showHeader: false, showClose: false, defaultOpen: true },
};
export const HeaderAndFooter: Story = { args: { defaultOpen: true } };
export const HeaderActionsKeyboardOrder: Story = {
  args: {
    showClose: false,
    headerActions: <Button emphasis="ghost">Preview assignment</Button>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'Assign record' });
    await userEvent.click(trigger);
    const dialog = await page.findByRole('dialog');
    const content = within(dialog);
    const headerAction = content.getByRole('button', { name: 'Preview assignment' });
    await waitFor(() => expect(headerAction).toHaveFocus());
    await userEvent.tab();
    await expect(content.getByRole('region', { name: 'Dialog content' })).toHaveFocus();
    await userEvent.tab();
    await expect(content.getByRole('textbox', { name: 'Project note' })).toHaveFocus();
    await userEvent.tab();
    await expect(content.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.tab();
    await expect(content.getByRole('button', { name: 'Save assignment' })).toHaveFocus();
    await userEvent.tab();
    await waitFor(() => expect(headerAction).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(page.queryByRole('dialog')).not.toBeInTheDocument();
  },
};
export const HeaderlessWithClose: Story = {
  args: { showHeader: false, footer: undefined, defaultOpen: true },
};
