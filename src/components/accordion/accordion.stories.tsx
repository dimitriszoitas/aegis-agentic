import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { RadioTower, Folder, UserRound } from '@/components/icon';
import { Checkbox } from '@/components/checkbox';
import { Accordion, type AccordionItem } from './accordion';

const items: AccordionItem[] = [
  {
    value: 'severity',
    title: 'Severity',
    icon: <Folder />,
    count: 150,
    content: (
      <div>
        Critical: 12 records · High: 38 records · Medium: 64 records · Low: 28 records · Info: 8
        records
      </div>
    ),
  },
  {
    value: 'source',
    title: 'Data source',
    icon: <RadioTower />,
    count: 4,
    content:
      'Project boards, customer accounts, invoices, and workspace activity are available in this view.',
  },
  {
    value: 'member',
    title: 'Assigned member',
    icon: <UserRound />,
    count: 3,
    content: 'Maya Chen, Nikos Papadopoulos, and Alex Morgan are on the current project team.',
  },
  {
    value: 'restricted',
    title: 'Restricted documents',
    content: 'Restricted customer documents.',
    disabled: true,
  },
];
const meta = {
  id: 'components-lists-accordion',
  title: 'Components/Surfaces/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Compact 36px disclosure headers use a quiet hover surface, subtle dividers, optional icons and counts, and a 12px nested-content inset. Use single mode for one open section or multiple mode for independent groups. Arrow keys, Home, and End move between enabled headers; Enter and Space toggle them. Keep form values outside collapsing content when they must persist.',
      },
    },
  },
  args: { type: 'single', collapsible: true, items, defaultValue: 'severity' },
} satisfies Meta<typeof Accordion>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Single: Story = {};
export const Multiple: Story = {
  render: () => <Accordion type="multiple" defaultValue={['severity', 'source']} items={items} />,
};
export const Contained: Story = { args: { variant: 'contained' } };
export const Disabled: Story = { args: { disabled: true } };
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const severity = canvas.getByRole('button', { name: /^Severity/ });
    const source = canvas.getByRole('button', { name: /^Data source/ });
    severity.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(source).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(source).toHaveAttribute('aria-expanded', 'true');
    await expect(severity).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{End}');
    await expect(canvas.getByRole('button', { name: /^Assigned member/ })).toHaveFocus();
    await expect(canvas.getByRole('button', { name: 'Restricted documents' })).toBeDisabled();
    await userEvent.keyboard('{Home}');
    await expect(severity).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(severity).toHaveAttribute('aria-expanded', 'true');
  },
};
function NestedExample() {
  const [delivery, setDelivery] = useState(false);
  return (
    <Accordion
      type="multiple"
      defaultValue={['scope']}
      items={[
        {
          value: 'scope',
          title: 'Project scope',
          icon: <Folder />,
          content: (
            <Accordion
              type="multiple"
              defaultValue={['accounts']}
              items={[
                {
                  value: 'accounts',
                  title: 'Accounts',
                  icon: <UserRound />,
                  content: 'Customer updates, account changes, and project activity.',
                },
                {
                  value: 'delivery',
                  title: 'Delivery',
                  icon: <RadioTower />,
                  content: (
                    <Checkbox
                      label="Include delivery tasks"
                      checked={delivery}
                      onCheckedChange={(checked) => setDelivery(checked === true)}
                    />
                  ),
                },
              ]}
            />
          ),
        },
        { value: 'summary', title: 'Summary', content: 'Review the selected project scope.' },
      ]}
    />
  );
}
export const Nested: Story = {
  render: () => <NestedExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const accounts = canvas.getByRole('button', { name: 'Accounts' });
    accounts.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('button', { name: 'Delivery' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Include delivery tasks' }));
    const scope = canvas.getByRole('button', { name: 'Project scope' });
    await userEvent.click(scope);
    await expect(scope).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() =>
      expect(canvas.queryByRole('button', { name: 'Delivery' })).not.toBeInTheDocument(),
    );
    await userEvent.click(scope);
    await userEvent.click(canvas.getByRole('button', { name: 'Delivery' }));
    await expect(canvas.getByRole('checkbox', { name: 'Include delivery tasks' })).toBeChecked();
  },
};
function ControlledExample() {
  const [value, setValue] = useState<string[]>(['source']);
  return (
    <>
      <Accordion type="multiple" value={value} onValueChange={setValue} items={items} />
      <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-4)' }}>
        {value.length} filter sections expanded
      </p>
    </>
  );
}
export const Controlled: Story = { render: () => <ControlledExample /> };
