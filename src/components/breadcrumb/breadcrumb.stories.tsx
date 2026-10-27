import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShieldCheck } from '@/components/icon';
import { Breadcrumb } from './breadcrumb';
const meta = {
  id: 'components-navigation-breadcrumb',
  title: 'Components/Navigation/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  args: {
    items: [
      { label: 'Workspace', href: '#workspace' },
      { label: 'Records', href: '#records' },
      { label: 'ALT-2026-0842' },
    ],
  },
} satisfies Meta<typeof Breadcrumb>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Hierarchy: Story = {
  render: () => (
    <div className="stack">
      <Breadcrumb
        items={[
          { label: 'Aegis', icon: <ShieldCheck size={15} />, href: '#aegis' },
          { label: 'Projects', href: '#projects' },
          { label: 'Customer portal redesign' },
        ]}
      />
      <Breadcrumb
        items={[{ label: 'Projects', href: '#projects' }, { label: 'PRJ-2026-0184' }]}
        separator="/"
      />
      <Breadcrumb items={[{ label: 'Overview' }]} />
    </div>
  ),
};
function NavigationDemo() {
  const [location, setLocation] = useState('Record detail');
  return (
    <div className="story-layout stack">
      <Breadcrumb
        items={[
          { label: 'Overview', onClick: () => setLocation('Overview') },
          { label: 'Records', onClick: () => setLocation('Records') },
          { label: 'ALT-2026-0842' },
        ]}
      />
      <p className="muted" aria-live="polite" style={{ margin: 0 }}>
        Current view: {location}
      </p>
    </div>
  );
}
export const ClientNavigation: Story = { render: () => <NavigationDemo /> };

interface BreadcrumbPlaygroundOptions {
  depth: number;
  separatorStyle: 'chevron' | 'slash' | 'dot';
  showIcon: boolean;
  interactive: boolean;
  currentLabel: string;
}
export const Playground: StoryObj<BreadcrumbPlaygroundOptions> = {
  args: {
    depth: 3,
    separatorStyle: 'chevron',
    showIcon: true,
    interactive: true,
    currentLabel: 'Customer portal',
  },
  argTypes: {
    depth: { control: { type: 'range', min: 1, max: 4, step: 1 } },
    separatorStyle: { control: 'inline-radio', options: ['chevron', 'slash', 'dot'] },
    showIcon: { control: 'boolean' },
    interactive: { control: 'boolean' },
    currentLabel: { control: 'text' },
  },
  render: function BreadcrumbPlayground(args) {
    const [location, setLocation] = useState('');
    const labels = ['Workspace', 'Projects', 'Deliverables'].slice(
      0,
      Math.max(0, Math.min(3, args.depth - 1)),
    );
    const items = [...labels, args.currentLabel].map((label, index) => ({
      label,
      icon: index === 0 && args.showIcon ? <ShieldCheck size={15} /> : undefined,
      onClick: args.interactive ? () => setLocation(label) : undefined,
    }));
    return (
      <div className="stack">
        <Breadcrumb
          items={items}
          separator={
            args.separatorStyle === 'slash' ? '/' : args.separatorStyle === 'dot' ? '·' : undefined
          }
        />
        <p className="muted" role="status">
          {location
            ? `Selected destination: ${location}`
            : 'Choose a parent destination to preview navigation.'}
        </p>
      </div>
    );
  },
};
