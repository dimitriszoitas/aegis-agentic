import type { Meta, StoryObj } from '@storybook/react-vite';
import { DescriptionList } from './description-list';
const meta = {
  id: 'components-data-display-descriptionlist',
  title: 'Components/Data Display/DescriptionList',
  component: DescriptionList,
  tags: ['autodocs'],
  args: {
    items: [
      { id: 'customer', label: 'Customer', value: 'Atlas Commerce' },
      { id: 'owner', label: 'Account owner', value: 'Maya Chen' },
      { id: 'plan', label: 'Plan', value: 'Business' },
      { id: 'renewal', label: 'Renewal', value: '1 November 2026' },
    ],
  },
} satisfies Meta<typeof DescriptionList>;
export default meta;
export const Stacked: StoryObj<typeof meta> = { args: { columns: 2 } };
export const Horizontal: StoryObj<typeof meta> = { args: { orientation: 'horizontal' } };
export const MissingValue: StoryObj<typeof meta> = {
  args: { items: [{ id: 'owner', label: 'Account owner', value: null }] },
};
