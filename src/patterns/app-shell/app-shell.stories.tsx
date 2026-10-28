import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import { AppShell, type AppShellProps } from './app-shell';
import { appShellAnatomy } from '@/stories/component-docs/anatomy/app-shell';
function ShellExample(args: AppShellProps) {
  const [route, setRoute] = useState('Requests');
  return (
    <AppShell
      {...args}
      navigation={({ closeNavigation }) => (
        <div className="stack">
          {['Requests', 'Customers'].map((name) => (
            <Button
              key={name}
              emphasis="ghost"
              onClick={() => {
                setRoute(name);
                closeNavigation();
              }}
            >
              {name}
            </Button>
          ))}
        </div>
      )}
    >
      <h1>{route}</h1>
      <p>Local navigation example.</p>
      <TextInput label="Retained note" defaultValue="Keep my note" />
    </AppShell>
  );
}
const meta = {
  id: 'patterns-appshell',
  title: 'Patterns/Application/AppShell',
  component: AppShell,
  tags: ['autodocs'],
  args: {
    brand: 'Local workspace',
    header: 'Example account',
    navigation: () => null,
    children: null,
    footer: 'Local demo only',
    navigationLabel: 'Workspace navigation',
    openNavigationLabel: 'Open navigation',
    closeNavigationLabel: 'Close navigation',
    skipLabel: 'Skip to content',
  },
  argTypes: {
    brand: { control: 'text' },
    header: { control: 'text' },
    footer: { control: 'text' },
    navigationLabel: { control: 'text' },
    openNavigationLabel: { control: 'text' },
    closeNavigationLabel: { control: 'text' },
    skipLabel: { control: 'text' },
    navigation: { control: false },
    children: { control: false },
  },
  render: (args) => <ShellExample {...args} />,
} satisfies Meta<typeof AppShell>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const NavigationAndSkip: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(c.getByRole('link', { name: 'Skip to content' }));
    await expect(c.getByRole('main')).toHaveFocus();
    const input = c.getByRole('textbox', { name: 'Retained note' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Draft preserved');
    const trigger = c.queryByRole('button', { name: 'Open navigation' });
    if (trigger) await userEvent.click(trigger);
    await userEvent.click(body.getByRole('button', { name: 'Customers' }));
    await expect(c.getByRole('heading', { name: 'Customers' })).toBeVisible();
    await expect(input).toHaveValue('Draft preserved');
  },
};
export const Anatomy: Story = { render: () => <>{appShellAnatomy.render()}</> };
