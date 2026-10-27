import type { Meta, StoryObj } from '@storybook/react-vite';
import { NumberCell } from './data-grid-cells';
export default {
  id: 'components-data-grid-number-cell',
  title: 'Components/Data Display/Data grid/Number cell',
  component: NumberCell,
  tags: ['autodocs'],
  args: { value: 1284 },
} satisfies Meta<typeof NumberCell>;
export const Matrix: StoryObj<typeof NumberCell> = {
  render: () => (
    <div className="story-layout stack" style={{ width: 320 }}>
      <div className="between">
        <span>History updates</span>
        <NumberCell value={1284} />
      </div>
      <div className="between">
        <span>Events per second</span>
        <NumberCell value={8421.6} format={{ maximumFractionDigits: 1 }} />
      </div>
      <div className="between">
        <span>Delivery coverage</span>
        <NumberCell value={0.984} format={{ style: 'percent', minimumFractionDigits: 1 }} />
      </div>
      <div className="between">
        <span>Archived events</span>
        <NumberCell value={2400000} format={{ notation: 'compact' }} />
      </div>
    </div>
  ),
};

export const Playground: StoryObj<typeof NumberCell> = {
  args: { value: 1284.5, locale: 'en-GB', format: { maximumFractionDigits: 1 } },
  argTypes: {
    format: { control: 'object' },
    locale: { control: 'select', options: ['en-GB', 'en-US', 'de-DE', 'fr-FR'] },
  },
};
