import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { GanttChart, type GanttTask } from './gantt-chart';
const tasks: GanttTask[] = [
  {
    id: 'research',
    label: 'Customer research',
    start: '2026-10-05',
    end: '2026-10-09',
    progress: 100,
    owner: 'Maya Chen',
    intent: 'success',
  },
  {
    id: 'design',
    label: 'Design exploration',
    start: '2026-10-12',
    end: '2026-10-23',
    progress: 80,
    owner: 'Alex Morgan',
    dependencies: ['research'],
    intent: 'ai',
  },
  {
    id: 'review',
    label: 'Design approval',
    start: '2026-10-26',
    end: '2026-10-26',
    milestone: true,
    dependencies: ['design'],
    intent: 'warning',
  },
  {
    id: 'build',
    label: 'Implementation',
    start: '2026-10-27',
    end: '2026-11-13',
    progress: 15,
    owner: 'Jordan Lee',
    dependencies: ['review'],
  },
  {
    id: 'test',
    label: 'Acceptance testing',
    start: '2026-11-16',
    end: '2026-11-20',
    progress: 0,
    dependencies: ['build'],
    intent: 'warning',
  },
  {
    id: 'launch',
    label: 'Launch',
    start: '2026-11-23',
    end: '2026-11-23',
    milestone: true,
    dependencies: ['test'],
    intent: 'success',
  },
];
const meta = {
  id: 'components-charts-ganttchart',
  title: 'Components/Data Visualization/GanttChart',
  component: GanttChart,
  tags: ['autodocs'],
  args: {
    title: 'Customer portal delivery',
    description: 'Plan the work and follow each handoff.',
    tasks,
    today: '2026-10-24',
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof GanttChart>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ProjectTimeline: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const viewport = canvasElement.querySelector<HTMLElement>('.aegis-gantt-scroll')!;
    const taskHeading = canvasElement.querySelector<HTMLElement>('.aegis-gantt-column-heading')!;
    const plot = canvasElement.querySelector<HTMLElement>('.aegis-gantt-plot')!;
    const axis = canvasElement.querySelector<HTMLElement>('.aegis-gantt-axis')!;
    for (const [label, minimumColumnWidth] of [
      ['Day', 42],
      ['Month', 128],
      ['Week', 100],
    ] as const) {
      await userEvent.click(canvas.getByRole('radio', { name: label }));
      const expected = Math.max(
        520,
        axis.children.length * minimumColumnWidth,
        viewport.clientWidth - taskHeading.getBoundingClientRect().width,
      );
      await expect(Math.abs(plot.getBoundingClientRect().width - expected)).toBeLessThan(1);
      await expect(
        Math.abs(axis.getBoundingClientRect().width - plot.getBoundingClientRect().width),
      ).toBeLessThan(1);
    }
  },
};
export const Monthly: Story = { args: { defaultScale: 'month' } };
export const Empty: Story = { args: { tasks: [] } };
export const SelectTask: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState<GanttTask>();
    return (
      <div className="stack">
        <GanttChart {...args} selectedTaskId={selected?.id} onTaskSelect={setSelected} />
        <p role="status">
          {selected ? `Selected ${selected.label}` : 'Select a task to view its details.'}
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Design exploration, from/ }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Selected Design exploration');
    await userEvent.click(canvas.getByRole('radio', { name: 'Month' }));
    await expect(canvas.getByRole('radio', { name: 'Month' })).toBeChecked();
    await userEvent.click(canvas.getByText('View schedule data'));
    await expect(
      canvas.getByRole('table', { name: 'Customer portal delivery schedule data' }),
    ).toBeVisible();
  },
};

export const LongOwners: Story = {
  args: {
    tasks: [
      { ...tasks[0], owner: 'Customer-experience-implementation-operations-team@example.com' },
      { ...tasks[1], owner: 'Alexandria Maximiliana Elizabeth Johnson Thompson' },
    ],
  },
  play: async ({ canvasElement }) => {
    const rows = canvasElement.querySelectorAll('.aegis-gantt-labels > div');
    for (const row of rows) {
      const title = row.querySelector('strong')!;
      const owner = row.querySelector('small')!;
      await expect(title.getBoundingClientRect().height).toBeGreaterThan(0);
      await expect(owner.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        row.getBoundingClientRect().bottom,
      );
      await expect(owner.scrollWidth).toBeGreaterThan(owner.clientWidth);
      await expect(owner).toHaveAttribute('title', owner.textContent!);
    }
  },
};
