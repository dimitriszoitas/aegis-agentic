import colors from '@/stories/fixtures/color-picker-values.json';
import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { ColorPicker } from './color-picker';
import { colorPickerAnatomy } from '@/stories/component-docs/anatomy/color-picker';
const swatches = [
  { value: colors.blue, label: 'Blue' },
  { value: colors.purple, label: 'Purple' },
  { value: colors.green, label: 'Green' },
];
const meta = {
  id: 'components-forms-colorpicker',
  title: 'Components/Inputs & Selection/ColorPicker',
  component: ColorPicker,
  tags: ['autodocs'],
  args: { label: 'Brand color', swatches },
  parameters: {
    docs: {
      description: {
        component:
          'Hex entry, labeled swatches and the native RGB chooser with optional alpha. Invalid local drafts remain visible and do not change the committed color. A valid draft commits on blur or Enter. The host owns contrast evaluation, palette policy, theme mapping and persistence.',
      },
    },
  },
} satisfies Meta<typeof ColorPicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {
  args: {
    value: colors.blue,
    alpha: false,
    size: 'md',
    disabled: false,
    readOnly: false,
    required: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: false },
    alpha: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    invalid: { control: 'boolean' },
    swatches: { control: false },
  },
  render: function Example(args) {
    const [, updateArgs] = useArgs();
    const value = args.alpha
      ? (args.value?.slice(0, 7) ?? colors.blue) + (args.value?.slice(7) || 'FF')
      : args.value?.slice(0, 7);
    return (
      <ColorPicker
        {...args}
        value={value}
        onValueChange={(value) => {
          args.onValueChange?.(value);
          updateArgs({ value });
        }}
      />
    );
  },
};
export const Anatomy: Story = { render: () => <>{colorPickerAnatomy.render()}</> };
export const DraftAlphaAndForm: Story = {
  render: function Example() {
    const [value, setValue] = useState(colors.blueOpaque);
    const [saved, setSaved] = useState('');
    return (
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(String(new FormData(e.currentTarget).get('color')));
        }}
      >
        <Field
          id="color-example"
          label="Brand color"
          helpText="Choose a color; this does not certify contrast."
        >
          <ColorPicker
            name="color"
            value={value}
            onValueChange={setValue}
            alpha
            swatches={swatches}
          />
        </Field>
        <output aria-label="Committed color">{value}</output>
        <Button type="submit">Save color</Button>
        <output aria-label="Submitted color">{saved}</output>
      </form>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Brand color' });
    await userEvent.clear(input);
    await userEvent.type(input, 'not-a-color');
    await userEvent.tab();
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByLabelText('Committed color')).toHaveTextContent(colors.blueOpaque);
    await userEvent.clear(input);
    await userEvent.type(input, colors.redShortAlpha);
    await userEvent.keyboard('{Enter}');
    await expect(input).toHaveValue(colors.redAlpha);
    await expect(canvas.getByLabelText('Committed color')).toHaveTextContent(colors.redAlpha);
    await userEvent.click(canvas.getByRole('button', { name: 'Blue' }));
    await expect(input).toHaveValue(colors.blueOpaque);
    await userEvent.click(canvas.getByRole('button', { name: 'Save color' }));
    await expect(canvas.getByLabelText('Submitted color')).toHaveTextContent(colors.blueOpaque);
    await expect(canvas.getByRole('textbox', { name: 'Opacity percent' })).not.toHaveAttribute(
      'id',
      input.id,
    );
  },
};
