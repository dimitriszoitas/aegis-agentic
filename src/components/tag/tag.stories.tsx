import type { ComponentProps } from 'react';
import { useArgs } from 'storybook/preview-api';
import { Button } from '@/components/button';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Tag, Chip } from './tag';
export default {
  id: 'components-tags-tag',
  title: 'Components/Data Display/Tag',
  component: Tag,
  subcomponents: { Chip },
} satisfies Meta<typeof Tag>;
function Tags() {
  const [selected, setSelected] = useState(false);
  const [removed, setRemoved] = useState(false);
  return (
    <div className="stack">
      {(['sm', 'md'] as const).map((size) => (
        <div className="row" key={size}>
          {(['default', 'function', 'destroy', 'ai', 'success', 'warning'] as const).map(
            (intent) => (
              <Tag size={size} intent={intent} key={intent}>
                {intent === 'ai' ? 'AI suggested' : 'Customer success'}
              </Tag>
            ),
          )}
        </div>
      ))}
      <div className="row">
        <Tag variant="interactive" selected={selected} onSelectedChange={setSelected}>
          Assigned to me
        </Tag>
        <Tag variant="counter" count={24}>
          Identity
        </Tag>
        {!removed && (
          <Tag
            variant="removable"
            removeLabel="Remove Customer portal filter"
            onRemove={() => setRemoved(true)}
          >
            Customer portal
          </Tag>
        )}
      </div>
    </div>
  );
}
export const Matrix: StoryObj<typeof Tag> = { render: () => <Tags /> };

export const Status: StoryObj<typeof Tag> = {
  parameters: {
    docs: {
      description: {
        story:
          'Status tags use a colored dot, quiet pill background, and primary text. Medium tags are 24px tall; small tags are 20px. Use intent for semantic colors or dotColor with a workflow color token, such as the separate purple review token. Status tags are labels, not live announcements or controls.',
      },
    },
  },
  render: () => (
    <div className="stack">
      {(['md', 'sm'] as const).map((size) => (
        <div
          className="row"
          key={size}
          aria-label={`${size === 'md' ? 'Medium' : 'Small'} status tags`}
          role="group"
        >
          <Tag variant="status" size={size} intent="function">
            New
          </Tag>
          <Tag variant="status" size={size} intent="function">
            Open
          </Tag>
          <Tag variant="status" size={size} dotColor="var(--color-status-review-fg)">
            In review
          </Tag>
          <Tag variant="status" size={size} intent="warning">
            In progress
          </Tag>
          <Tag variant="status" size={size} intent="success">
            Closed
          </Tag>
          <Tag variant="status" size={size} intent="destroy">
            Blocked
          </Tag>
          <Tag variant="status" size={size}>
            Queued
          </Tag>
        </div>
      ))}
    </div>
  ),
};

type PlaygroundArgs = ComponentProps<typeof Tag> & { visible: boolean };
export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    children: 'Customer portal',
    variant: 'static',
    size: 'md',
    intent: 'function',
    count: 24,
    selected: false,
    disabled: false,
    visible: true,
    removeLabel: 'Remove Customer portal tag',
  },
  argTypes: {
    children: { control: 'text', name: 'Label' },
    variant: {
      control: 'select',
      options: ['static', 'interactive', 'removable', 'counter', 'status'],
    },
    size: { control: 'select', options: ['sm', 'md'] },
    intent: {
      control: 'select',
      options: ['default', 'function', 'destroy', 'ai', 'success', 'warning'],
    },
    count: { control: { type: 'number', min: 0, step: 1 } },
    selected: { control: 'boolean' },
    disabled: { control: 'boolean' },
    visible: { control: 'boolean' },
    removeLabel: { control: 'text' },
  },
  render: function Playground({ visible, ...args }) {
    const [, updateArgs] = useArgs<PlaygroundArgs>();
    return (
      <div className="stack">
        {visible ? (
          <Tag
            {...args}
            onSelectedChange={(selected) => updateArgs({ selected })}
            onRemove={() => updateArgs({ visible: false })}
          />
        ) : (
          <>
            <p role="status">Tag removed.</p>
            <Button emphasis="ghost" onClick={() => updateArgs({ visible: true })}>
              Restore tag
            </Button>
          </>
        )}
      </div>
    );
  },
};
