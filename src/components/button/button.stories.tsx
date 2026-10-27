import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sparkles, Plus, ArrowRight } from '@/components/icon';
import { Button } from './button';
const meta = {
  id: 'components-actions-button',
  title: 'Components/Triggers/Button',
  component: Button,
  args: { children: 'Create project', intent: 'function' },
  parameters: {
    docs: {
      description: {
        component:
          'Primary actions are filled, secondary actions have an outline, tertiary actions use a soft tint, and ghost actions show only their label and icon. All four support neutral, function, destroy, and AI intents. Buttons use 4/5/6px corners at 28/34/40px heights, with optical padding on icon sides. Loading keeps the original button width.',
      },
    },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Matrix: Story = {
  render: () => (
    <div className="stack">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <section className="story-layout stack" key={size}>
          <h3>
            {size === 'sm'
              ? 'Compact actions'
              : size === 'md'
                ? 'Default actions'
                : 'Prominent actions'}
          </h3>
          {(['primary', 'secondary', 'tertiary', 'ghost'] as const).map((emphasis) => (
            <div className="row" key={emphasis}>
              <span style={{ width: 72, color: 'var(--color-text-secondary)' }}>{emphasis}</span>
              {(['default', 'function', 'destroy', 'ai'] as const).map((intent) => (
                <Button
                  key={intent}
                  size={size}
                  emphasis={emphasis}
                  intent={intent}
                  leadingIcon={intent === 'ai' ? <Sparkles /> : <Plus />}
                >
                  {intent === 'ai'
                    ? 'Ask Aegis'
                    : intent === 'destroy'
                      ? 'Delete project'
                      : intent === 'function'
                        ? 'Create project'
                        : 'View records'}
                </Button>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  ),
};
export const States: Story = {
  render: () => (
    <div className="stack">
      {(['primary', 'secondary', 'tertiary', 'ghost'] as const).map((emphasis) => (
        <section className="story-layout stack" key={emphasis}>
          <h3>{emphasis}</h3>
          <div className="row">
            <Button emphasis={emphasis} intent="function" leadingIcon={<Plus />}>
              Create project
            </Button>
            <Button emphasis={emphasis} intent="function" disabled leadingIcon={<Plus />}>
              Create project
            </Button>
            <Button emphasis={emphasis} intent="function" loading leadingIcon={<Plus />}>
              Create project
            </Button>
            <Button emphasis={emphasis} intent="function" loading>
              Create project
            </Button>
            <Button emphasis={emphasis} intent="ai" loading leadingIcon={<Sparkles />}>
              Summarize records
            </Button>
          </div>
        </section>
      ))}
    </div>
  ),
};
export const IconSpacing: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Text sides keep 8/12/16px padding at small/medium/large sizes. Icon sides use 6/8/12px. Both icon slots reduce their own side; loading preserves those slots and the full button footprint.',
      },
    },
  },
  render: () => (
    <div className="stack">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <section className="story-layout stack" key={size}>
          <h3>
            {size === 'sm' ? 'Small · 28px' : size === 'md' ? 'Medium · 34px' : 'Large · 40px'}
          </h3>
          <div className="row">
            <Button size={size} emphasis="tertiary">
              Review records
            </Button>
            <Button size={size} emphasis="tertiary" leadingIcon={<Plus />}>
              Review records
            </Button>
            <Button size={size} emphasis="tertiary" trailingIcon={<ArrowRight />}>
              Review records
            </Button>
            <Button
              size={size}
              emphasis="tertiary"
              leadingIcon={<Plus />}
              trailingIcon={<ArrowRight />}
            >
              Review records
            </Button>
          </div>
          <div className="row">
            <Button size={size} emphasis="tertiary" loading>
              Review records
            </Button>
            <Button size={size} emphasis="tertiary" loading leadingIcon={<Plus />}>
              Review records
            </Button>
            <Button size={size} emphasis="tertiary" loading trailingIcon={<ArrowRight />}>
              Review records
            </Button>
            <Button
              size={size}
              emphasis="tertiary"
              loading
              leadingIcon={<Plus />}
              trailingIcon={<ArrowRight />}
            >
              Review records
            </Button>
          </div>
        </section>
      ))}
    </div>
  ),
};

type PlaygroundIcon = 'none' | 'plus' | 'arrow' | 'sparkles';
type PlaygroundArgs = Omit<ComponentProps<typeof Button>, 'leadingIcon' | 'trailingIcon'> & {
  leadingIcon: PlaygroundIcon;
  trailingIcon: PlaygroundIcon;
};
const playgroundIcons = {
  none: undefined,
  plus: <Plus />,
  arrow: <ArrowRight />,
  sparkles: <Sparkles />,
};
export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    children: 'Create project',
    size: 'md',
    intent: 'function',
    emphasis: 'primary',
    disabled: false,
    loading: false,
    leadingIcon: 'none',
    trailingIcon: 'none',
  },
  argTypes: {
    children: { control: 'text', name: 'Label' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    intent: { control: 'select', options: ['default', 'function', 'destroy', 'ai'] },
    emphasis: { control: 'select', options: ['primary', 'secondary', 'tertiary', 'ghost'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    leadingIcon: { control: 'select', options: ['none', 'plus', 'arrow', 'sparkles'] },
    trailingIcon: { control: 'select', options: ['none', 'plus', 'arrow', 'sparkles'] },
  },
  render: function Playground({ leadingIcon, trailingIcon, ...args }) {
    const [count, setCount] = useState(0);
    return (
      <div className="stack" style={{ alignItems: 'center' }}>
        <Button
          {...args}
          leadingIcon={playgroundIcons[leadingIcon]}
          trailingIcon={playgroundIcons[trailingIcon]}
          onClick={() => setCount((value) => value + 1)}
        />
        <p className="sr-only" role="status">
          {count
            ? `${count} ${count === 1 ? 'action' : 'actions'} completed locally`
            : 'Activate the button to run the example action.'}
        </p>
      </div>
    );
  },
};
