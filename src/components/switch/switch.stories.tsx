import { useArgs } from 'storybook/preview-api';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Switch } from './switch';
import { Field } from '@/components/field';

const meta = {
  id: 'components-forms-switch',
  title: 'Components/Inputs & Selection/Switch',
  component: Switch,
  tags: ['autodocs'],
  args: {
    label: 'Enable project notifications',
    description: 'Send updates when project milestones change.',
  },
  parameters: {
    docs: {
      description: {
        component:
          'An immediate on/off setting with a persistent accessible label. Space and Enter toggle it. Checked state is included in native forms when a name is supplied.',
      },
    },
  },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  render: () => (
    <div className="story-grid">
      <Switch
        label="Enable project notifications"
        description="Send updates when project milestones change."
      />
      <Switch label="Notify assigned members" defaultChecked />
      <Switch label="Show resolved records" size="sm" />
      <Switch label="Correlate identity events" size="sm" defaultChecked />
      <Switch label="External sharing unavailable" disabled />
      <Switch label="Audit logging required" defaultChecked disabled />
      <Field label="Enable outbound response" error="An approved response policy is required.">
        <Switch />
      </Field>
    </div>
  ),
};

export const ImmediateSetting: Story = {
  render: function ControlledExample() {
    const [enabled, setEnabled] = useState(false);
    return (
      <div className="stack">
        <Switch
          label="Enable project notifications"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
        <output aria-live="polite">
          {enabled
            ? 'Notifications enabled. New project updates will be delivered.'
            : 'Notifications paused. Existing updates remain available.'}
        </output>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('switch', { name: 'Enable project notifications' });
    await userEvent.click(toggle);
    await expect(toggle).toBeChecked();
    await userEvent.keyboard(' ');
    await expect(toggle).not.toBeChecked();
  },
};

export const Playground: Story = {
  args: {
    label: 'Enable project notifications',
    description: 'Send updates when milestones change.',
    checked: false,
    size: 'md',
    disabled: false,
    readOnly: false,
    invalid: false,
    required: false,
  },
  argTypes: {
    label: { control: 'text' },
    description: { control: 'text' },
    checked: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  render: function SwitchPlayground(args) {
    const [, updateArgs] = useArgs();
    return <Switch {...args} onCheckedChange={(checked) => updateArgs({ checked })} />;
  },
};
