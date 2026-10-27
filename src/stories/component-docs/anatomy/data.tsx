import type { ReactNode } from 'react';
import { AiCard, AiHighlight } from '@/components/ai-card';
import { AiInlineSuggestion } from '@/components/ai-inline-suggestion';
import { AiMessage } from '@/components/ai-message';
import { ConfidenceBadge } from '@/components/confidence-badge';
import { StreamingSkeleton } from '@/components/streaming-skeleton';
import { ThinkingIndicator } from '@/components/thinking-indicator';
import {
  AreaChart,
  BarChart,
  ChartContainer,
  ChartLegend,
  DonutChart,
  LineChart,
  type ChartSeries,
} from '@/components/charts';
import { ChartMetricCard, MetricCard } from '@/components/metric-card';
import { EventHistogram } from '@/components/event-histogram';
import { GanttChart } from '@/components/gantt-chart';
import { MiniBarChart } from '@/components/mini-bar-chart';
import { Sparkline } from '@/components/sparkline';
import { CodeEditor } from '@/components/code-editor';
import { DiffView } from '@/components/diff-view';
import { YamlPresenter } from '@/components/yaml-presenter';
import { DataGrid } from '@/components/data-grid';
import { DescriptionList } from '@/components/description-list';
import {
  ActionsCell,
  AiVerdictCell,
  EntityCell,
  ExpandCell,
  NumberCell,
  SeverityCell,
  SparklineCell,
  StatusCell,
  TagsCell,
  TimeCell,
} from '@/components/data-grid-cells';
import { BulkActionsBar } from '@/components/bulk-actions-bar';
import { JsonViewer } from '@/components/json-viewer';
import { RelativeTime } from '@/components/relative-time';
import { Timeline } from '@/components/timeline';
import { EmptyState } from '@/components/empty-state';
import { Notification } from '@/components/notification';
import { ProgressBar } from '@/components/progress-bar';
import { Skeleton } from '@/components/skeleton';
import { Spinner } from '@/components/spinner';
import { Button } from '@/components/button';
import { Copy, ExternalLink, Folder, Pencil } from '@/components/icon';
import type { AiMessageData } from '@/lib/ai';
import type { AnatomyDefinition, AnatomyPart, AnatomyRegistry } from './types';

const noop = () => undefined;
const now = Date.parse('2026-10-25T12:00:00Z');
const values = [8, 12, 9, 18, 14, 22, 19, 26];
const points = values.map((value, index) => ({
  label: `Week ${index + 1}`,
  value,
  target: 16 + index,
}));
const series: readonly ChartSeries[] = [
  { key: 'value', label: 'Completed', color: 'function' },
  { key: 'target', label: 'Target', color: 'ai' },
];
const yaml =
  'name: Weekly review\nenabled: true\nsource: Projects\nactions:\n  - type: notify\n    value: workspace';
const scope = '[data-anatomy="data"]';
const p = (
  selector: string,
  name: string,
  description: string,
  anchor?: AnatomyPart['anchor'],
): AnatomyPart => ({ selector: `${scope} ${selector}`, name, description, anchor });
const sample = (children: ReactNode, width = 760) => (
  <div
    data-anatomy="data"
    style={{
      width: '100%',
      maxWidth: width,
      minWidth: 0,
      padding: 24,
      marginInline: 'auto',
      display: 'grid',
      gap: 24,
    }}
  >
    {children}
  </div>
);
const cell = (children: ReactNode) =>
  sample(
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <tbody>
        <tr>
          <td style={{ padding: 16 }}>{children}</td>
        </tr>
      </tbody>
    </table>,
    460,
  );
const chartParts = (mark: string): AnatomyPart[] => [
  p(
    '.aegis-chart-header h3',
    'Title',
    'Names the measure or question shown in the chart.',
    'top-left',
  ),
  p('.aegis-chart-description', 'Description', 'Adds the time range and interpretation context.'),
  p(
    '.aegis-chart-plot',
    'Plot region',
    'Contains the data marks and their coordinate system.',
    'left',
  ),
  p(
    '.recharts-xAxis-tick-labels',
    'Category axis',
    'Labels the horizontal categories or time buckets.',
    'bottom',
  ),
  p(mark, 'Data marks', 'Visualizes the values of one series.', 'right'),
  p(
    '.aegis-chart-legend',
    'Legend',
    'Names each series and associates it with its color.',
    'bottom-right',
  ),
  p(
    '.aegis-chart-data > summary',
    'Data disclosure',
    'Opens the underlying exact values as a table.',
    'bottom-left',
  ),
];
const chart = (kind: 'area' | 'bar' | 'line'): AnatomyDefinition => ({
  render: () => {
    const Chart = kind === 'area' ? AreaChart : kind === 'bar' ? BarChart : LineChart;
    return sample(
      <Chart
        title="Project throughput"
        description="Completed work by week"
        data={points}
        series={series}
        height={210}
        showDataTable
      />,
    );
  },
  height: 470,
  parts: chartParts(
    kind === 'area' ? '.recharts-area' : kind === 'bar' ? '.recharts-bar' : '.recharts-line',
  ),
});
const message: AiMessageData = {
  id: 'anatomy-response',
  role: 'assistant',
  status: 'complete',
  timestamp: new Date(now).toISOString(),
  content:
    '**Review summary**\n\nThe selected project has one pending owner review. Confirm the assignment before applying changes.',
  context: [],
  steps: [{ id: 'review', label: 'Read the supplied project', status: 'complete' }],
  citations: [{ id: 'project-1', kind: 'record', label: 'Customer portal' }],
  provenance: 'Local demonstration · supplied context only',
};

export const dataAnatomy: AnatomyRegistry = {
  'components-ai-aicard': {
    render: () =>
      sample(
        <AiCard
          title="Project review"
          confidence="high"
          provenance="Based on the selected project"
          onFeedback={noop}
          onRegenerate={noop}
        >
          The next milestone is ready for owner review.
        </AiCard>,
        540,
      ),
    parts: [
      p(
        '.aegis-ai-card',
        'Container',
        'Groups the generated content and its supporting controls.',
        'top-right',
      ),
      p('.aegis-ai-label', 'AI marker', 'Identifies generated material.'),
      p('.aegis-confidence-badge', 'Confidence', 'Describes the supplied evidence strength.'),
      p('.aegis-ai-card-title', 'Title', 'Names the result.'),
      p('.aegis-ai-card-content', 'Content', 'Holds the generated explanation or result.'),
      p('.aegis-ai-provenance', 'Provenance', 'Explains where the result came from.'),
      p(
        '.aegis-ai-feedback',
        'Feedback actions',
        'Provides feedback and optional regeneration.',
        'bottom-right',
      ),
    ],
  },
  'components-ai-aihighlight': {
    render: () =>
      sample(
        <AiHighlight confidence="medium" provenance="Based on two supplied records">
          Two tasks share the same owner and due date. Review them together.
        </AiHighlight>,
        540,
      ),
    parts: [
      p('.aegis-ai-highlight', 'Highlight container', 'Sets apart a short generated observation.'),
      p('.aegis-ai-label', 'AI marker', 'Identifies generated content.'),
      p('.aegis-confidence-badge', 'Confidence', 'Shows the supplied evidence strength.'),
      p('.aegis-ai-card-content', 'Observation', 'Contains the concise finding.'),
      p('.aegis-ai-provenance', 'Provenance', 'Names the source context.'),
    ],
  },
  'components-ai-aiinlinesuggestion': {
    render: () =>
      sample(
        <AiInlineSuggestion
          label="Project summary"
          defaultValue="Customer portal"
          suggestion="Customer portal accessibility review"
        />,
        620,
      ),
    parts: [
      p('.aegis-field-label', 'Field label', 'Names the editable value.'),
      p(
        '.aegis-ai-inline-control',
        'Input and completion',
        'Overlays an uncommitted completion after the typed prefix.',
      ),
      p(
        '.aegis-ai-inline-ghost',
        'Suggested suffix',
        'Shows the proposed text without changing the value.',
      ),
      p('.aegis-ai-inline-label', 'AI marker', 'Identifies the proposal as generated.'),
      p('.aegis-ai-inline-actions', 'Accept and dismiss', 'Keeps accepting the proposal explicit.'),
      p('.aegis-ai-inline-hint', 'Keyboard hint', 'Explains Tab to accept and Escape to dismiss.'),
    ],
  },
  'components-ai-aimessage': {
    render: () =>
      sample(
        <AiMessage
          message={message}
          onCitationClick={noop}
          onFeedback={noop}
          onRegenerate={noop}
          resultCards={<span>1 review item identified</span>}
        />,
        640,
      ),
    height: 490,
    parts: [
      p('.aegis-ai-message-header', 'Response header', 'Combines AI attribution and provenance.'),
      p(
        '.aegis-ai-working summary',
        'Review disclosure',
        'Summarizes the available processing steps.',
      ),
      p('.aegis-ai-markdown', 'Response content', 'Renders supported markdown from the response.'),
      p('.aegis-ai-result-cards', 'Result slot', 'Holds optional structured result content.'),
      p(
        '.aegis-ai-evidence-section',
        'References',
        'Connects the explanation to supplied context.',
      ),
      p(
        '.aegis-ai-message-footer',
        'Response actions',
        'Contains copying, feedback, and regeneration.',
      ),
    ],
  },
  'components-ai-confidencebadge': {
    render: () => sample(<ConfidenceBadge confidence="medium" />, 330),
    parts: [
      p('.aegis-confidence-badge', 'Badge', 'Keeps the confidence indicator and label together.'),
      p(
        '.aegis-confidence-bars',
        'Strength indicator',
        'Uses one to three active bars for the supplied level.',
      ),
      p(
        '.aegis-confidence-badge > span:last-child',
        'Confidence label',
        'States the level in text as well as shape.',
      ),
    ],
  },
  'components-ai-streamingskeleton': {
    render: () =>
      sample(
        <StreamingSkeleton variant="card" lines={4} label="Preparing a project summary" />,
        520,
      ),
    parts: [
      p(
        '.aegis-streaming-skeleton',
        'Status and glow container',
        'Contains the AI-colored glow and announces the loading label.',
      ),
      p(
        '.aegis-streaming-line:nth-of-type(2)',
        'Placeholder line',
        'Indicates the approximate shape of upcoming text.',
      ),
      p(
        '.aegis-streaming-line:last-child',
        'Short final line',
        'Varies the placeholder rhythm to resemble prose.',
      ),
    ],
    note: 'A subtle AI-colored glow stays inside the container. Reduced motion keeps the glow static.',
  },
  'components-ai-thinkingindicator': {
    render: () => sample(<ThinkingIndicator messages={['Reading the selected project']} />, 590),
    parts: [
      p(
        '.aegis-ai-label',
        'AI activity label',
        'Identifies which assistant activity is in progress.',
      ),
      p('.aegis-thinking-dots', 'Activity indicator', 'Provides a small decorative progress cue.'),
      p(
        '.aegis-thinking-status',
        'Current step',
        'Describes the present operation in plain language.',
      ),
    ],
  },
  'components-charts-area-chart': chart('area'),
  'components-charts-bar-chart': chart('bar'),
  'components-charts-line-chart': chart('line'),
  'components-charts-chart-container': {
    render: () =>
      sample(
        <ChartContainer
          title="Project activity"
          description="Eight recent intervals"
          height={130}
          action={
            <Button size="sm" emphasis="ghost">
              View report
            </Button>
          }
          legend={<ChartLegend series={series} />}
          footer={<small>Updated from the current workspace</small>}
        >
          <Sparkline data={values} width={430} height={110} label="Completed work" />
        </ChartContainer>,
      ),
    height: 390,
    parts: [
      p('.aegis-chart-header h3', 'Title', 'Names the chart.'),
      p('.aegis-chart-description', 'Description', 'Adds supporting context.'),
      p('.aegis-chart-action', 'Header action', 'Holds an optional related action.'),
      p(
        '.aegis-chart-plot',
        'Plot slot',
        'Reserves the chart area and its loading or error replacement.',
      ),
      p('.aegis-chart-legend-wrap', 'Legend slot', 'Explains the displayed series.'),
      p('.aegis-chart-footer', 'Footer slot', 'Holds secondary supporting content.'),
    ],
  },
  'components-charts-donut-chart': {
    render: () =>
      sample(
        <DonutChart
          title="Portfolio status"
          description="Current project distribution"
          height={220}
          data={[
            { name: 'Active', value: 18, color: 'function' },
            { name: 'Completed', value: 12, color: 'success' },
            { name: 'Planned', value: 6, color: 'chart-4' },
          ]}
          totalLabel="projects"
          showDataTable
        />,
      ),
    height: 470,
    parts: [
      p('.aegis-chart-header h3', 'Title', 'Names the distribution.'),
      p('.recharts-pie', 'Segments', 'Encodes each category as part of the total.'),
      p('.aegis-donut-total', 'Total', 'Summarizes the complete dataset.'),
      p('.aegis-chart-legend', 'Category legend', 'Maps segment colors to category names.'),
      p('.aegis-chart-data summary', 'Data disclosure', 'Provides exact category values.'),
    ],
  },
  'components-charts-chart-metric-card': {
    render: () =>
      sample(
        <ChartMetricCard
          label="Weekly revenue"
          metric="$18,400"
          delta={12.4}
          period="vs last week"
          trendIsPositive
          data={points}
          height={180}
          color="ai"
        />,
        620,
      ),
    height: 470,
    parts: [
      p('.aegis-chart-metric-header h3', 'Metric label', 'Names the aggregate measure.'),
      p('.aegis-chart-metric-value', 'Summary value', 'Displays the caller-supplied aggregate.'),
      p('.aegis-chart-metric-comparison', 'Comparison', 'Shows change and the comparison period.'),
      p(
        '.aegis-chart-metric-latest',
        'Latest interval',
        'Displays the newest point separately from the aggregate.',
      ),
      p('.aegis-chart-metric-plot', 'History plot', 'Shows the underlying ordered series.'),
      p('.aegis-chart-data summary', 'Exact data', 'Opens the values behind the chart.'),
    ],
  },
  'components-charts-event-histogram': {
    render: () =>
      sample(
        <EventHistogram
          title="Workspace events"
          data={values.map((value, index) => ({
            time: new Date(now - (8 - index) * 3600000).toISOString(),
            label: `Hour ${index + 1}`,
            total: value + 10,
            critical: 1,
            high: 2,
            medium: value,
            low: 4,
            info: 3,
          }))}
          height={200}
          showDataTable
          brush
        />,
      ),
    height: 470,
    parts: [
      p('.aegis-chart-header h3', 'Title', 'Names the event series.'),
      p('.aegis-chart-plot', 'Stacked plot', 'Stacks counts by severity within each time bucket.'),
      p('.recharts-xAxis-tick-labels', 'Time axis', 'Labels the bucket times.'),
      p('.recharts-brush', 'Range brush', 'Restricts the displayed time interval.'),
      p(
        '.aegis-chart-legend',
        'Severity legend',
        'Maps the stacked series to named severity levels.',
      ),
      p('.aegis-chart-data summary', 'Exact values', 'Exposes the bucket values in a table.'),
    ],
  },
  'components-charts-ganttchart': {
    render: () =>
      sample(
        <GanttChart
          title="Release schedule"
          description="Two linked project tasks"
          today="2026-10-25"
          defaultScale="day"
          onTaskSelect={noop}
          tasks={[
            {
              id: 'design',
              label: 'Design review',
              owner: 'Maya Chen',
              start: '2026-10-23',
              end: '2026-10-26',
              progress: 65,
            },
            {
              id: 'build',
              label: 'Implementation',
              owner: 'Alex Kim',
              start: '2026-10-26',
              end: '2026-10-30',
              progress: 20,
              dependencies: ['design'],
              intent: 'success',
            },
          ]}
        />,
        900,
      ),
    height: 400,
    parts: [
      p('.aegis-gantt-header h3', 'Schedule title', 'Names the schedule.'),
      p('.aegis-gantt-header .aegis-segmented', 'Scale control', 'Switches the time scale.'),
      p('.aegis-gantt-labels', 'Task labels', 'Shows each task and optional owner.'),
      p('.aegis-gantt-axis > span:first-child', 'Date axis', 'Labels each calendar interval.'),
      p('.aegis-gantt-bar', 'Task duration', 'Positions a task between its start and end dates.'),
      p('.aegis-gantt-progress', 'Completion fill', 'Shows the task progress inside its bar.'),
      p('.aegis-gantt-today', 'Today marker', 'Marks the supplied reference date.'),
      p(
        '.aegis-gantt-data summary',
        'Schedule data',
        'Opens the exact dates and completion values.',
      ),
    ],
  },
  'components-charts-metric-card': {
    render: () =>
      sample(
        <MetricCard
          label="Completed tasks"
          value={128}
          unit="tasks"
          delta={8.2}
          deltaLabel="vs previous week"
          trendIsPositive
          sparkline={values}
          sparklineLabel="Weekly completed tasks"
        />,
        420,
      ),
    parts: [
      p('.aegis-metric-label', 'Label', 'Names the metric.'),
      p('.aegis-metric-value', 'Value and unit', 'Shows the primary summary.'),
      p('.aegis-sparkline', 'Trend', 'Provides compact history alongside the value.'),
      p('.aegis-metric-delta', 'Change', 'Shows the numeric comparison.'),
      p('.aegis-metric-comparison', 'Comparison context', 'Identifies the period being compared.'),
    ],
  },
  'components-charts-mini-bar-chart': {
    render: () =>
      sample(
        <MiniBarChart data={values} width={300} height={70} label="Completed tasks by week" />,
        390,
      ),
    parts: [
      p('.aegis-sparkline', 'Chart bounds', 'Contains a compact, zero-based series.'),
      p('.aegis-sparkline rect', 'Bar', 'Encodes one non-negative bucket value through height.'),
    ],
  },
  'components-charts-sparkline': {
    render: () =>
      sample(
        <Sparkline
          data={values}
          variant="area"
          width={300}
          height={70}
          label="Project activity trend"
        />,
        390,
      ),
    parts: [
      p('.aegis-sparkline', 'Trend bounds', 'Holds the small, non-interactive series.'),
      p('.aegis-sparkline path:first-of-type', 'Area fill', 'Fills the region beneath the line.'),
      p('.aegis-sparkline path:last-of-type', 'Trend line', 'Connects the ordered values.'),
    ],
  },
  'components-code-codeeditor': {
    render: () =>
      sample(
        <CodeEditor
          value={yaml}
          language="yaml"
          label="Workflow configuration"
          height={210}
          highlightedLines={[{ from: 2, to: 2 }]}
          statusBar="workflow.yaml"
        />,
        760,
      ),
    height: 330,
    parts: [
      p('.cm-gutters', 'Gutter', 'Contains line numbers and available fold controls.'),
      p('.cm-content', 'Editing surface', 'Renders the editable, syntax-colored document.'),
      p('.cm-line', 'Source line', 'Keeps each line of source text addressable.'),
      p('.aegis-code-status', 'Status bar', 'Shows document context and editor information.'),
    ],
  },
  'components-code-diffview': {
    render: () =>
      sample(
        <DiffView
          label="Workflow update"
          original={yaml}
          modified={yaml
            .replace('Weekly review', 'Weekly project review')
            .replace('enabled: true', 'enabled: false')}
          language="yaml"
          minHeight={190}
          maxHeight={250}
          modifiedIntent="ai"
          originalLabel="Current"
          modifiedLabel="Proposed"
        />,
        900,
      ),
    height: 420,
    parts: [
      p('.aegis-diff-title', 'Diff heading', 'Names the comparison.'),
      p(
        '.aegis-diff-tools',
        'View controls',
        'Changes the comparison layout and navigates changes.',
      ),
      p(
        '.aegis-diff-legend',
        'Change summary',
        'Names the documents and counts added or removed lines.',
      ),
      p(
        '.aegis-diff-host',
        'Comparison surface',
        'Shows the original and modified source with change markings.',
      ),
    ],
  },
  'components-code-yamlpresenter': {
    render: () =>
      sample(
        <YamlPresenter
          value={yaml}
          filename="workflow.yaml"
          highlightedLines={[{ from: 2, to: 2 }]}
          maxHeight={230}
        />,
        760,
      ),
    height: 350,
    parts: [
      p('.aegis-yaml-filename', 'Filename', 'Identifies the displayed source.'),
      p('.aegis-yaml-actions', 'Document actions', 'Provides folding and copying controls.'),
      p('.cm-gutters', 'Gutter', 'Shows line numbers and fold controls.'),
      p('.cm-content', 'YAML content', 'Presents read-only syntax-colored configuration.'),
    ],
  },
  'components-data-datagrid': {
    render: () =>
      sample(
        <DataGrid
          label="Projects"
          noun="projects"
          data={[
            { id: 'a', name: 'Customer portal', owner: 'Maya Chen' },
            { id: 'b', name: 'Billing refresh', owner: 'Alex Kim' },
            { id: 'c', name: 'Workspace migration', owner: 'Priya Rao' },
          ]}
          columns={[
            { accessorKey: 'name', header: 'Project', size: 280 },
            { accessorKey: 'owner', header: 'Owner', size: 180 },
          ]}
          getRowId={(row) => row.id}
          renderExpandedRow={(row) => <span>Project details for {row.name}</span>}
          defaultExpandedRowIds={['a']}
          pageSize={2}
        />,
        900,
      ),
    height: 480,
    parts: [
      p('.aegis-grid-toolbar', 'Toolbar', 'Holds the grid heading, density, and column controls.'),
      p(
        '.aegis-grid-table thead',
        'Column headers',
        'Names the columns and hosts sorting and resizing.',
      ),
      p(
        '.aegis-grid-selection-column',
        'Selection column',
        'Selects individual rows or the current result set.',
      ),
      p('.aegis-grid-row', 'Data row', 'Groups the values of one record.'),
      p('.aegis-grid-expand', 'Expansion control', 'Discloses optional record details.'),
      p('.aegis-grid-expanded-content', 'Expanded content', 'Holds caller-provided row details.'),
      p('.aegis-grid-footer', 'Pagination', 'Shows the visible range and page controls.'),
    ],
  },
  'components-data-display-descriptionlist': {
    render: () =>
      sample(
        <DescriptionList
          columns={2}
          items={[
            { id: 'owner', label: 'Owner', value: 'Maya Chen' },
            { id: 'status', label: 'Status', value: <StatusCell status="in-progress" /> },
            { id: 'department', label: 'Department', value: 'Product' },
            { id: 'note', label: 'Reference', value: null },
          ]}
        />,
        620,
      ),
    parts: [
      p(
        '.aegis-description-list',
        'Description list',
        'Groups related metadata using label and value semantics.',
      ),
      p(
        '.aegis-description-list > div:first-child',
        'Metadata item',
        'Keeps a label paired with its value.',
      ),
      p('.aegis-description-list dt', 'Label', 'Names the property.'),
      p('.aegis-description-list dd', 'Value', 'Shows the property content or its empty fallback.'),
    ],
  },
  'components-data-grid-cells': {
    render: () =>
      cell(<EntityCell entity={{ type: 'user', name: 'Maya Chen', detail: 'Product designer' }} />),
    parts: [
      p('.aegis-entity-cell .aegis-avatar', 'Entity avatar', 'Provides a compact identity cue.'),
      p('.aegis-entity-cell-name', 'Primary label', 'Identifies the entity.'),
      p('.aegis-entity-cell-detail', 'Supporting detail', 'Adds secondary identity context.'),
    ],
    note: 'The shared Cells family includes specialized value adapters; each has its own anatomy page.',
  },
  'components-data-grid-actions-cell': {
    render: () =>
      cell(
        <ActionsCell
          maxVisible={2}
          actions={[
            { id: 'open', label: 'Open project', icon: <ExternalLink size={15} />, onClick: noop },
            { id: 'edit', label: 'Edit project', icon: <Pencil size={15} />, onClick: noop },
            { id: 'copy', label: 'Copy identifier', icon: <Copy size={15} />, onClick: noop },
          ]}
        />,
      ),
    parts: [
      p(
        '.aegis-actions-cell',
        'Action group',
        'Keeps row actions together without activating the row.',
      ),
      p(
        '.aegis-actions-cell-primary',
        'Visible actions',
        'Shows up to the configured number of direct actions.',
      ),
      p(
        '.aegis-actions-cell button[aria-label^="More"]',
        'Overflow trigger',
        'Opens the remaining actions in a menu.',
      ),
    ],
  },
  'components-data-grid-ai-verdict-cell': {
    render: () => cell(<AiVerdictCell verdict="Ready for review" confidence={0.86} />),
    parts: [
      p('.aegis-ai-verdict-cell > svg', 'AI icon', 'Marks the verdict as a generated suggestion.'),
      p('.aegis-ai-verdict-label', 'Suggested verdict', 'States the proposed interpretation.'),
      p(
        '.aegis-ai-verdict-confidence',
        'Confidence score',
        'Shows the supplied normalized score as a percentage.',
      ),
    ],
  },
  'components-data-grid-bulk-actions-bar': {
    render: () =>
      sample(
        <BulkActionsBar
          position="inline"
          selectedCount={3}
          owners={[{ id: 'maya', name: 'Maya Chen' }]}
          onAssign={noop}
          onStatusChange={noop}
          onSummarize={noop}
          onClear={noop}
        />,
        880,
      ),
    parts: [
      p(
        '.aegis-bulk-selection',
        'Selection summary',
        'States how many records the actions affect.',
      ),
      p(
        'button[aria-label="Clear selected records"]',
        'Clear selection',
        'Returns to the normal table toolbar.',
      ),
      p(
        '.aegis-bulk-actions-row > button',
        'Bulk actions',
        'Applies an assignment, status change, or AI summary to the selection.',
      ),
    ],
  },
  'components-data-grid-expand-cell': {
    render: () =>
      cell(<ExpandCell expanded={false} count={4} label="related tasks" onExpandedChange={noop} />),
    parts: [
      p(
        '.aegis-expand-cell',
        'Disclosure button',
        'Controls the expanded state of related content.',
      ),
      p(
        '.aegis-expand-cell svg',
        'Direction icon',
        'Points toward the collapsed or expanded state.',
      ),
      p('.aegis-expand-cell span', 'Related count', 'Shows the optional number of related items.'),
    ],
  },
  'components-data-grid-number-cell': {
    render: () =>
      cell(<NumberCell value={18420.5} format={{ style: 'currency', currency: 'USD' }} />),
    parts: [
      p(
        '.aegis-number-cell',
        'Formatted value',
        'Uses the selected locale and number format with aligned numeric glyphs.',
      ),
    ],
  },
  'components-data-grid-severity-cell': {
    render: () => cell(<SeverityCell severity="high" />),
    parts: [
      p('.severity-badge', 'Severity badge', 'Pairs the named severity with its semantic outline.'),
    ],
  },
  'components-data-grid-sparkline-cell': {
    render: () =>
      cell(
        <SparklineCell
          data={values}
          variant="area"
          width={180}
          height={45}
          label="Project activity"
        />,
      ),
    parts: [
      p('.aegis-sparkline', 'Trend graphic', 'Fits a compact activity series into a table cell.'),
      p(
        '.aegis-sparkline path:last-of-type',
        'Series line',
        'Connects the values in their supplied order.',
      ),
    ],
  },
  'components-data-grid-status-cell': {
    render: () => cell(<StatusCell status="in-progress" />),
    parts: [
      p('.status-badge', 'Status pill', 'Groups the current workflow state.'),
      p('.status-dot', 'State indicator', 'Adds the semantic state color.'),
    ],
  },
  'components-data-grid-tags-cell': {
    render: () =>
      cell(<TagsCell tags={['Product', 'Priority', 'Customer-facing']} maxVisible={2} />),
    parts: [
      p('.aegis-tags-cell', 'Tag group', 'Keeps related labels together in the cell.'),
      p('.aegis-tags-cell .tag', 'Visible tag', 'Shows a supplied record label.'),
      p(
        '.aegis-tags-cell-overflow',
        'Overflow count',
        'Summarizes additional tags and exposes their text on focus or hover.',
      ),
    ],
  },
  'components-data-grid-time-cell': {
    render: () => cell(<TimeCell value="2026-10-25T11:42:00Z" now={now} />),
    parts: [
      p(
        '.aegis-time-cell',
        'Relative time',
        'Shows a compact elapsed time with an exact datetime available to assistive technology and the tooltip.',
      ),
    ],
  },
  'components-data-jsonviewer': {
    render: () =>
      sample(
        <JsonViewer
          value={{
            project: 'Customer portal',
            enabled: true,
            owner: { name: 'Maya Chen' },
            tasks: 4,
          }}
          label="Project payload"
          rootName="project"
          defaultExpandedDepth={2}
          maxHeight={230}
        />,
        720,
      ),
    height: 400,
    parts: [
      p('.aegis-json-header', 'Payload toolbar', 'Names the payload and offers tree actions.'),
      p('.aegis-json-tree', 'JSON tree', 'Represents nested values as navigable tree items.'),
      p('.aegis-json-expand', 'Disclosure control', 'Expands or collapses an object or array.'),
      p('.aegis-json-key', 'Property name', 'Names a property or array position.'),
      p('.aegis-json-value', 'Typed value', 'Displays a primitive value or collection summary.'),
      p('.aegis-json-footer', 'Tree footer', 'Shows usage guidance and copy feedback.'),
    ],
  },
  'components-data-relativetime': {
    render: () => sample(<RelativeTime value="2026-10-25T11:42:00Z" now={now} />, 350),
    parts: [
      p(
        '.aegis-relative-time',
        'Relative label',
        'Formats the elapsed time while retaining the exact datetime on the time element.',
      ),
    ],
  },
  'components-data-timeline': {
    render: () =>
      sample(
        <Timeline
          now={now}
          items={[
            {
              id: 'note',
              type: 'note',
              title: 'Review note added',
              actor: 'Maya Chen',
              timestamp: '2026-10-25T11:42:00Z',
              description: 'The customer portal is ready for the next review.',
              actions: (
                <Button size="sm" emphasis="ghost">
                  Open project
                </Button>
              ),
            },
            {
              id: 'state',
              type: 'status',
              title: 'Project started',
              actor: 'Alex Kim',
              timestamp: '2026-10-25T10:00:00Z',
            },
          ]}
        />,
        650,
      ),
    height: 370,
    parts: [
      p(
        '.aegis-timeline-marker',
        'Event marker',
        'Identifies the type of activity along the timeline.',
      ),
      p('.aegis-timeline-heading', 'Title and timestamp', 'Names the event and places it in time.'),
      p('.aegis-timeline-actor', 'Actor', 'Identifies who performed the action.'),
      p('.aegis-timeline-description', 'Event detail', 'Adds contextual information.'),
      p('.aegis-timeline-actions', 'Related action', 'Offers a relevant destination or next step.'),
    ],
  },
  'components-feedback-empty-state': {
    render: () =>
      sample(
        <EmptyState
          preset="no-data"
          icon={<Folder size={25} />}
          title="No projects yet"
          description="Create a project to organize work for your team."
          action={<Button size="sm">Create project</Button>}
          secondaryAction={
            <Button size="sm" emphasis="ghost">
              Learn more
            </Button>
          }
        />,
      ),
    height: 360,
    parts: [
      p(
        '.aegis-empty-state-icon',
        'Illustrative icon',
        'Reinforces the empty state without carrying its message alone.',
      ),
      p('.aegis-empty-state-copy h3', 'Heading', 'Explains what is missing.'),
      p('.aegis-empty-state-copy p', 'Explanation', 'Describes how to move forward.'),
      p(
        '.aegis-empty-state-actions',
        'Next steps',
        'Provides primary and optional secondary actions.',
      ),
    ],
  },
  'components-feedback-notification': {
    render: () =>
      sample(
        <Notification
          variant="floating"
          intent="success"
          title="Project updated"
          description="Your changes are available to the workspace."
          action={{ label: 'View project', onClick: noop }}
          onDismiss={noop}
        />,
        480,
      ),
    parts: [
      p('.aegis-notification-icon', 'Intent icon', 'Signals the notification type.'),
      p('.aegis-notification-title', 'Title', 'Summarizes the outcome.'),
      p('.aegis-notification-description', 'Description', 'Adds useful supporting detail.'),
      p('.aegis-notification-actions', 'Related action', 'Offers a relevant next step.'),
      p(
        '.aegis-notification-dismiss',
        'Dismiss control',
        'Closes the notification when a dismissal callback is supplied.',
      ),
    ],
  },
  'components-feedback-progress-bar': {
    render: () => sample(<ProgressBar label="Workspace import" value={64} showValue />, 480),
    parts: [
      p(
        '.aegis-progress-label > span:first-child',
        'Task label',
        'Names the operation being measured.',
      ),
      p(
        '.aegis-progress-label > span:last-child',
        'Progress value',
        'Shows the completion percentage.',
      ),
      p('.aegis-progress-track', 'Track', 'Defines the full completion range.'),
      p('.aegis-progress-fill', 'Fill', 'Encodes the current progress within that range.'),
    ],
  },
  'components-feedback-skeleton': {
    render: () => sample(<Skeleton variant="table-row" columns={3} height={56} />, 520),
    parts: [
      p(
        '.aegis-skeleton',
        'Placeholder container',
        'Reserves the loading content shape without exposing false data.',
      ),
      p(
        '.aegis-skeleton-cell',
        'Placeholder cell',
        'Reserves one value position in the table-row preset.',
      ),
    ],
  },
  'components-feedback-spinner': {
    render: () => sample(<Spinner size="lg" label="Loading projects" />, 220),
    parts: [
      p(
        '.aegis-spinner',
        'Loading status',
        'Provides an accessible name for the pending operation.',
      ),
      p('.aegis-spinner circle', 'Track', 'Defines the full circular path.'),
      p('.aegis-spinner path', 'Active arc', 'Rotates to communicate ongoing work.'),
    ],
  },
};
