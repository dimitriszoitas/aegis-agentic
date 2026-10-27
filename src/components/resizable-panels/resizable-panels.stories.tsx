import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResizablePanels, ResizablePanel, ResizeHandle } from './resizable-panels';
import { SeverityBadge } from '@/components/severity-badge';
const meta = {
  id: 'components-layout-resizablepanels',
  title: 'Components/Layout/ResizablePanels',
  component: ResizablePanels,
  subcomponents: { ResizablePanel, ResizeHandle },
  parameters: {
    docs: {
      description: {
        component:
          "`ResizablePanel` inherits `PanelProps` from react-resizable-panels and forwards native div attributes. Size numbers are pixels; explicit strings such as `\"35%\"` keep proportional layouts.\n\n| ResizablePanel prop | Type | Default / behavior |\n| --- | --- | --- |\n| id | `string` or `number` | Generated ID; use stable IDs for saved layouts |\n| children | `ReactNode` | Content within the panel |\n| defaultSize | `number` or `string` | Shares available space when omitted |\n| minSize / maxSize | `number` or `string` | `0%` / `100%` |\n| collapsible | `boolean` | Enables collapse below the minimum size |\n| collapsedSize | `number` or `string` | `0%` |\n| collapsedThreshold | `number` or `string` | Half the gap between collapsedSize and minSize |\n| disabled | `boolean` | Prevents direct and indirect resizing |\n| groupResizeBehavior | `'preserve-relative-size'` or `'preserve-pixel-size'` | `'preserve-relative-size'` |\n| onResize | `(size, id, previousSize) => void` | Sizes contain `asPercentage` and `inPixels` |\n| panelRef / elementRef | `Ref<PanelImperativeHandle>` / `Ref<HTMLDivElement>` | Imperative panel controls / DOM access |\n| className / style | `string` / `CSSProperties` | Native presentation props |\n\nCollapsed panels become inert and hidden from assistive technology. `ResizeHandle` has its own prop table below and supports arrow keys and Enter.\n",
      },
    },
  },
  tags: ['autodocs'],
  args: { orientation: 'horizontal' },
  render: (args) => (
    <ResizablePanels {...args} style={{ height: 420 }}>
      <ResizablePanel id="records" defaultSize="65%" minSize="25%">
        <div className="story-layout" style={{ height: '100%' }}>
          <h3>Record queue</h3>
          <p className="muted">
            Drag the divider or focus it and use the arrow keys to resize the project workspace.
          </p>
          <div className="row">
            <SeverityBadge severity="high" />
            Customer portal redesign
          </div>
        </div>
      </ResizablePanel>
      <ResizeHandle label="Resize record queue and documents" />
      <ResizablePanel id="documents" defaultSize="35%" minSize="20%">
        <div className="story-layout" style={{ height: '100%' }}>
          <h3>Documents</h3>
          <p className="muted">Six related process events</p>
          <code>PRJ-0042 · Customer portal redesign</code>
        </div>
      </ResizablePanel>
    </ResizablePanels>
  ),
} satisfies Meta<typeof ResizablePanels>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Horizontal: Story = {};
export const Vertical: Story = { args: { orientation: 'vertical' } };
export const Disabled: Story = { args: { disabled: true } };
export const Collapsible: Story = {
  render: () => (
    <ResizablePanels style={{ height: 320 }}>
      <ResizablePanel id="assistant" defaultSize="30%" minSize="20%" collapsible collapsedSize="0%">
        <div className="story-layout" style={{ height: '100%' }}>
          <h3>Aegis assistant</h3>
          <p className="muted">Review the selected record documents.</p>
        </div>
      </ResizablePanel>
      <ResizeHandle label="Resize or collapse assistant" />
      <ResizablePanel id="main" defaultSize="70%" minSize="30%">
        <div className="story-layout" style={{ height: '100%' }}>
          <h3>Project</h3>
          <p>Press Enter on the divider to collapse or restore the assistant.</p>
        </div>
      </ResizablePanel>
    </ResizablePanels>
  ),
};
