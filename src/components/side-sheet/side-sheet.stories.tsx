import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../button';
import { SeverityBadge } from '../severity-badge';
import { SideSheet, SideSheetSection, SideSheetField } from './side-sheet';

function RecordFields() {
  return (
    <>
      <SideSheetSection title="Record details">
        <SideSheetField label="Severity">
          <SeverityBadge severity="high" />
        </SideSheetField>
        <SideSheetField label="Status">Needs review</SideSheetField>
        <SideSheetField label="Project ID">
          <code>PRJ-0042</code>
        </SideSheetField>
        <SideSheetField label="Category">Customer experience</SideSheetField>
        <SideSheetField label="Created">
          <code>2026-06-18 09:42:16 UTC</code>
        </SideSheetField>
        <SideSheetField label="Assigned member">Maya Chen</SideSheetField>
      </SideSheetSection>
      <SideSheetSection title="Project summary">
        <p>
          The customer portal redesign includes updated onboarding, account settings, and billing.
          Review the latest requirements and delivery plan before completing this project.
        </p>
      </SideSheetSection>
    </>
  );
}
const meta = {
  id: 'components-overlays-sidesheet',
  title: 'Components/Surfaces/SideSheet',
  component: SideSheet,
  subcomponents: { SideSheetSection, SideSheetField },
  parameters: {
    docs: {
      description: {
        component:
          'The title and close control share the first header row. Optional `headerActions` appear below alongside result navigation; `actions` remains a compatible alias. Optional `footer` actions remain visible outside the scrollable body. Fundamental and Fundamental Floating share the same content and interactions.',
      },
      story: { inline: false, height: 600 },
    },
  },
  tags: ['autodocs'],
  args: {
    title: 'Customer portal redesign',
    description: 'REC-00842 · Customer project',
    trigger: <Button>Open record details</Button>,
    children: <RecordFields />,
    footer: (
      <>
        <Button emphasis="ghost">Assign member</Button>
        <Button intent="function">Mark as reviewed</Button>
      </>
    ),
  },
} satisfies Meta<typeof SideSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const OpenSheet: Story = { args: { defaultOpen: true } };
export const SizeMatrix: Story = {
  argTypes: { size: { control: false }, trigger: { control: false } },
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <SideSheet
          {...args}
          key={size}
          size={size}
          trigger={<Button>{size} detail panel</Button>}
        />
      ))}
    </div>
  ),
};
function ReviewExample() {
  const [position, setPosition] = useState(5);
  return (
    <SideSheet
      {...meta.args}
      defaultOpen
      position={position}
      total={48}
      onPrevious={() => setPosition((value) => Math.max(1, value - 1))}
      onNext={() => setPosition((value) => Math.min(48, value + 1))}
      actions={
        <Button size="sm" emphasis="ghost">
          Open project
        </Button>
      }
    />
  );
}
export const RecordNavigation: Story = { render: () => <ReviewExample /> };
function DockedExample() {
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        height: 600,
        display: 'flex',
        background: 'var(--color-bg-canvas)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
      }}
    >
      <main style={{ flex: 1, minWidth: 0, padding: 'var(--space-5)' }}>
        <h2>Records workspace</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBlock: 'var(--space-4)' }}>
          The details panel uses layout space while the records remain interactive.
        </p>
        <Button onClick={() => setOpen(!open)}>{open ? 'Close' : 'Open'} docked details</Button>
      </main>
      <SideSheet
        {...meta.args}
        trigger={undefined}
        open={open}
        onOpenChange={setOpen}
        docked
        size="sm"
      />
    </div>
  );
}
export const DockedPushLayout: Story = {
  render: () => <DockedExample />,
  parameters: { layout: 'fullscreen' },
};

export const HeaderActions: Story = {
  args: {
    defaultOpen: true,
    headerActions: (
      <Button emphasis="secondary" size="sm">
        Assign member
      </Button>
    ),
    footer: undefined,
  },
};
export const FooterActions: Story = { args: { defaultOpen: true } };
export const HeaderAndFooterActions: Story = {
  args: {
    defaultOpen: true,
    headerActions: (
      <>
        <Button emphasis="tertiary" size="sm">
          Assign member
        </Button>
        <Button emphasis="secondary" size="sm">
          Open project
        </Button>
      </>
    ),
  },
};
export const LongTitle: Story = {
  args: {
    defaultOpen: true,
    title:
      'Customer portal redesign with updated onboarding requirements for the Northstar enterprise account',
    headerActions: (
      <Button emphasis="secondary" size="sm">
        Assign member
      </Button>
    ),
  },
};
export const FloatingSheet: Story = {
  name: 'Fundamental Floating sheet',
  globals: { layoutTheme: 'fundamental-floating' },
  args: { defaultOpen: true },
};
export const FixedSheet: Story = {
  name: 'Fundamental sheet',
  globals: { layoutTheme: 'fundamental' },
  args: { defaultOpen: true },
};
export const HeaderAlignmentAndClose: Story = {
  args: {
    title: 'A long record title that wraps while the close button stays beside the first line',
    headerActions: (
      <Button emphasis="secondary" size="sm">
        Assign member
      </Button>
    ),
    children: (
      <>
        {Array.from({ length: 5 }, (_, index) => (
          <RecordFields key={index} />
        ))}
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'Open record details' });
    await userEvent.click(trigger);
    const dialog = await page.findByRole('dialog');
    const title = dialog.querySelector<HTMLElement>('.aegis-sheet-title')!;
    const close = page.getByRole('button', { name: 'Close detail panel' });
    expect(
      Math.abs(title.getBoundingClientRect().top - close.getBoundingClientRect().top),
    ).toBeLessThan(1);
    const header = dialog.querySelector<HTMLElement>('.aegis-sheet-header')!;
    const scroll = dialog.querySelector<HTMLElement>('.aegis-sheet-body')!;
    const top = header.getBoundingClientRect().top;
    scroll.scrollTop = scroll.scrollHeight;
    await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
    expect(header.getBoundingClientRect().top).toBe(top);
    close.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const ResizeFocus: Story = {
  args: { resizable: true },
  parameters: {
    docs: {
      description: {
        story:
          'Pointer opening focuses the close control without a ring or persistent resize highlight. Keyboard navigation reveals focus, and the resize separator supports arrows, Home, and End.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'Open record details' });
    await userEvent.click(trigger);
    const close = await page.findByRole('button', { name: 'Close detail panel' });
    const separator = page.getByRole('separator', { name: 'Resize side panel' });
    await waitFor(() => expect(close).toHaveFocus());
    expect(getComputedStyle(close).outlineStyle).toBe('none');
    expect(getComputedStyle(separator, '::after').backgroundColor).toBe('rgba(0, 0, 0, 0)');
    await userEvent.tab({ shift: true });
    await expect(separator).toHaveFocus();
    expect(getComputedStyle(separator, '::after').backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    await userEvent.keyboard('{Home}');
    await waitFor(() =>
      expect(separator.getAttribute('aria-valuenow')).toBe(separator.getAttribute('aria-valuemin')),
    );
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(Number(separator.getAttribute('aria-valuenow'))).toBeGreaterThan(
        Number(separator.getAttribute('aria-valuemin')),
      ),
    );
    await userEvent.keyboard('{End}');
    await waitFor(() =>
      expect(separator.getAttribute('aria-valuenow')).toBe(separator.getAttribute('aria-valuemax')),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    const keyboardClose = await page.findByRole('button', { name: 'Close detail panel' });
    await waitFor(() => expect(keyboardClose).toHaveFocus());
    expect(getComputedStyle(keyboardClose).outlineStyle).toBe('solid');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
