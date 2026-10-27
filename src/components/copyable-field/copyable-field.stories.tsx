import type { Meta, StoryObj } from '@storybook/react-vite';
import { CopyableField } from './copyable-field';
const meta = {
  id: 'components-forms-copyablefield',
  title: 'Components/Data Display/CopyableField',
  component: CopyableField,
  tags: ['autodocs'],
  args: {
    label: 'Workspace URL',
    value: 'https://northstar.example/workspace',
    description: 'Share this link with members of your team.',
  },
} satisfies Meta<typeof CopyableField>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Multiline: StoryObj<typeof meta> = {
  args: {
    label: 'Project reference',
    value: 'Project: Customer portal\nOwner: Maya Chen\nStatus: In progress',
    multiline: true,
  },
};
