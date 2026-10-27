import type { ComponentProps } from 'react';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ArrowLeft, Folder } from '@/components/icon';
import { Link } from './link';

const meta = {
  id: 'components-actions-link',
  title: 'Components/Triggers/Link',
  component: Link,
  tags: ['autodocs'],
  args: { href: '#project-details', children: 'View project' },
  parameters: {
    docs: {
      description: {
        component:
          'Use Link for navigation and Button for actions. It renders a native anchor with normal browser behavior, including modifier-click and context menus. Disabled links have no destination and leave the tab sequence. External links open a new tab by default, announce that behavior, and include noopener/noreferrer. Keep link text descriptive; size changes text, not a button-like hit area.',
      },
    },
  },
} satisfies Meta<typeof Link>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  render: () => (
    <div className="story-grid">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div className="stack" key={size}>
          <Link href="#project-details" size={size}>
            View project
          </Link>
          <Link
            href="#projects"
            intent="default"
            underline="hover"
            size={size}
            leadingIcon={<ArrowLeft />}
          >
            Projects
          </Link>
          <Link href="#project-details" size={size} underline="none" leadingIcon={<Folder />}>
            Customer portal
          </Link>
          <Link href="#unavailable" disabled size={size}>
            Archived project
          </Link>
        </div>
      ))}
      <Link href="https://example.com/project" external>
        Project documentation
      </Link>
    </div>
  ),
};
export const InlineAndLongText: Story = {
  render: () => (
    <div className="stack" style={{ maxWidth: 320 }}>
      <p>
        Read the <Link href="#project-details">project requirements</Link> before sharing the next
        milestone.
      </p>
      <Link href="#project-details">
        Review the customer portal accessibility requirements and delivery checklist
      </Link>
    </div>
  ),
};
export const KeyboardNavigation: Story = {
  render: function Example() {
    const [destination, setDestination] = useState('No navigation yet');
    return (
      <div className="stack">
        <button type="button">Start keyboard navigation</button>
        <Link
          href="#project-details"
          onClick={(event) => {
            event.preventDefault();
            setDestination('Project details selected');
          }}
        >
          View project
        </Link>
        <Link
          href="#unavailable"
          disabled
          onClick={() => setDestination('Disabled link activated')}
        >
          Archived project
        </Link>
        <Link
          href="#customers"
          onClick={(event) => {
            event.preventDefault();
            setDestination('Customers selected');
          }}
        >
          View customers
        </Link>
        <p role="status">{destination}</p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole('button', { name: 'Start keyboard navigation' }).focus();
    await userEvent.tab();
    await expect(canvas.getByRole('link', { name: 'View project' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('status')).toHaveTextContent('Project details selected');
    await expect(canvas.getByRole('link', { name: 'Archived project' })).not.toHaveAttribute(
      'href',
    );
    await userEvent.tab();
    await expect(canvas.getByRole('link', { name: 'View customers' })).toHaveFocus();
    await userEvent.click(canvas.getByRole('link', { name: 'Archived project' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Project details selected');
  },
};

type PlaygroundArgs = ComponentProps<typeof Link> & { showIcon: boolean };
export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    children: 'View project',
    href: '#playground-project',
    size: 'md',
    intent: 'function',
    underline: 'hover',
    external: false,
    disabled: false,
    showIcon: false,
  },
  argTypes: {
    children: { control: 'text', name: 'Label' },
    href: { control: 'text', name: 'Destination' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    intent: { control: 'select', options: ['default', 'function'] },
    underline: { control: 'select', options: ['always', 'hover', 'none'] },
    external: { control: 'boolean' },
    disabled: { control: 'boolean' },
    showIcon: { control: 'boolean', name: 'Leading icon' },
  },
  render: ({ showIcon, ...args }) => (
    <div className="stack">
      <Link {...args} leadingIcon={showIcon ? <Folder /> : undefined} />
      <section id="playground-project" tabIndex={-1}>
        <h3>Project overview</h3>
        <p className="muted">The link targets this section in the example.</p>
      </section>
    </div>
  ),
};
