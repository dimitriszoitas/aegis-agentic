import type { Meta, StoryObj } from '@storybook/react-vite';
import { Info, ShieldCheck } from '@/components/icon';
import { Tooltip, RichTooltip } from './tooltip';

const meta = {
  id: 'components-overlays-tooltip',
  title: 'Components/Feedback/Tooltip',
  component: Tooltip,
  subcomponents: { RichTooltip },
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { story: { inline: false, height: 280 } } },
  args: {
    content: 'Open the record project',
    children: <button className="aegis-tooltip-demo-trigger">Review record</button>,
  },
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const OpenTooltip: Story = { args: { defaultOpen: true } };
export const Inverted: Story = { args: { defaultOpen: true, variant: 'inverted' } };
export const InvertedRichTooltip: Story = {
  render: () => (
    <RichTooltip
      defaultOpen
      variant="inverted"
      title="Progress confidence"
      description="Four completed milestones support this progress estimate."
      shortcut="⌘I"
    >
      <button className="aegis-tooltip-demo-trigger">Inspect confidence</button>
    </RichTooltip>
  ),
};
export const ArrowEdges: Story = {
  parameters: { docs: { story: { inline: false, height: 680 } } },
  render: () => (
    <div className="aegis-tooltip-arrow-matrix">
      {(['default', 'inverted'] as const).map((variant) => (
        <div className="aegis-tooltip-arrow-matrix-row" key={variant}>
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <Tooltip
              key={side}
              open
              variant={variant}
              side={side}
              content={`${variant === 'default' ? 'Default' : 'Inverted'} tooltip`}
            >
              <button className="aegis-tooltip-demo-trigger">{side}</button>
            </Tooltip>
          ))}
        </div>
      ))}
    </div>
  ),
};
export const OpenRichTooltip: Story = {
  render: () => (
    <RichTooltip
      defaultOpen
      title="Progress confidence"
      description="High confidence: four completed milestones support the current project progress estimate."
      shortcut="⌘I"
    >
      <button className="aegis-tooltip-demo-trigger" aria-label="About workflow confidence">
        <Info size={16} /> Progress confidence
      </button>
    </RichTooltip>
  ),
};
export const PlacementMatrix: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-12)' }}>
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Tooltip key={side} side={side} content={`Details appears ${side}`}>
          <button className="aegis-tooltip-demo-trigger">{side}</button>
        </Tooltip>
      ))}
    </div>
  ),
};
export const RichDetails: Story = {
  render: () => (
    <RichTooltip
      title="Progress confidence"
      description="High confidence: four completed milestones support the current project progress estimate."
      shortcut="⌘I"
    >
      <button className="aegis-tooltip-demo-trigger" aria-label="About workflow confidence">
        <Info size={16} /> Progress confidence
      </button>
    </RichTooltip>
  ),
};
export const IconOnlyAndDisabled: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
      <Tooltip content="Verify the identity source">
        <button className="aegis-tooltip-demo-trigger" aria-label="Verify identity source">
          <ShieldCheck size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Resolve requires an assigned member">
        <span tabIndex={0}>
          <button className="aegis-tooltip-demo-trigger" disabled>
            Resolve record
          </button>
        </span>
      </Tooltip>
    </div>
  ),
};
