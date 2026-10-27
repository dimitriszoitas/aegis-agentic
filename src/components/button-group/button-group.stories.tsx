import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '@/components/button';
import { ButtonGroup } from './button-group';
export default {
  id: 'components-actions-buttongroup',
  title: 'Components/Triggers/ButtonGroup',
  component: ButtonGroup,
} satisfies Meta<typeof ButtonGroup>;
function DensityControls() {
  const [density, setDensity] = useState('Default');
  return (
    <ButtonGroup aria-label="Grid density">
      {['Compact', 'Default', 'Comfortable'].map((label) => (
        <Button
          key={label}
          emphasis={density === label ? 'secondary' : 'ghost'}
          intent={density === label ? 'function' : 'default'}
          aria-pressed={density === label}
          onClick={() => setDensity(label)}
        >
          {label}
        </Button>
      ))}
    </ButtonGroup>
  );
}
export const Matrix: StoryObj<typeof ButtonGroup> = { render: () => <DensityControls /> };

type PlaygroundArgs = {
  selection: 'Compact' | 'Default' | 'Comfortable';
  size: 'sm' | 'md' | 'lg';
  emphasis: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  intent: 'default' | 'function' | 'destroy' | 'ai';
  disabled: boolean;
};
export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    selection: 'Default',
    size: 'md',
    emphasis: 'secondary',
    intent: 'function',
    disabled: false,
  },
  argTypes: {
    selection: { control: 'select', options: ['Compact', 'Default', 'Comfortable'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    emphasis: { control: 'select', options: ['primary', 'secondary', 'tertiary', 'ghost'] },
    intent: { control: 'select', options: ['default', 'function', 'destroy', 'ai'] },
    disabled: { control: 'boolean' },
  },
  render: function Playground(args) {
    const [, updateArgs] = useArgs<PlaygroundArgs>();
    return (
      <ButtonGroup aria-label="Grid density">
        {(['Compact', 'Default', 'Comfortable'] as const).map((label) => (
          <Button
            key={label}
            size={args.size}
            emphasis={args.selection === label ? args.emphasis : 'ghost'}
            intent={args.intent}
            disabled={args.disabled}
            aria-pressed={args.selection === label}
            onClick={() => updateArgs({ selection: label })}
          >
            {label}
          </Button>
        ))}
      </ButtonGroup>
    );
  },
};
