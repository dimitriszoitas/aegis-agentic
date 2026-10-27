import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sparkles, SlidersHorizontal, Trash2 } from '@/components/icon';
import { IconButton } from './icon-button';
export default {
  id: 'components-actions-iconbutton',
  title: 'Components/Triggers/IconButton',
  component: IconButton,
} satisfies Meta<typeof IconButton>;
export const Matrix: StoryObj<typeof IconButton> = {
  render: () => (
    <div className="stack">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div className="row" key={size}>
          {(['primary', 'secondary', 'tertiary', 'ghost'] as const).flatMap((emphasis) =>
            (['default', 'function', 'destroy', 'ai'] as const).map((intent) => (
              <IconButton
                key={emphasis + intent}
                size={size}
                emphasis={emphasis}
                intent={intent}
                aria-label={
                  intent === 'ai'
                    ? 'Explain selected record'
                    : intent === 'destroy'
                      ? 'Delete project'
                      : 'Configure columns'
                }
              >
                {intent === 'ai' ? (
                  <Sparkles size={16} />
                ) : intent === 'destroy' ? (
                  <Trash2 size={16} />
                ) : (
                  <SlidersHorizontal size={16} />
                )}
              </IconButton>
            )),
          )}
        </div>
      ))}
    </div>
  ),
};
export const States: StoryObj<typeof IconButton> = {
  render: () => (
    <div className="row">
      <IconButton aria-label="Configure columns" disabled>
        <SlidersHorizontal size={16} />
      </IconButton>
      <IconButton aria-label="Summarizing records" loading intent="ai">
        <Sparkles size={16} />
      </IconButton>
    </div>
  ),
};

export const Playground: StoryObj<typeof IconButton> = {
  args: {
    'aria-label': 'Configure workspace',
    size: 'md',
    emphasis: 'secondary',
    intent: 'function',
    tooltip: true,
    disabled: false,
    loading: false,
  },
  argTypes: {
    'aria-label': { control: 'text', name: 'Accessible label' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    emphasis: { control: 'select', options: ['primary', 'secondary', 'tertiary', 'ghost'] },
    intent: { control: 'select', options: ['default', 'function', 'destroy', 'ai'] },
    tooltip: { control: 'boolean' },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
  render: function Playground(args) {
    const [count, setCount] = useState(0);
    return (
      <div className="stack">
        <IconButton {...args} onClick={() => setCount((value) => value + 1)}>
          <SlidersHorizontal />
        </IconButton>
        <p className="muted" role="status">
          {count
            ? `Configured ${count} ${count === 1 ? 'time' : 'times'}`
            : 'Activate the button to configure the workspace.'}
        </p>
      </div>
    );
  },
};
