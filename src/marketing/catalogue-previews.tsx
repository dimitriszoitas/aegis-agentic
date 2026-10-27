import { lazy, Suspense, useId, useMemo, useState, type ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Accordion } from '@/components/accordion';
import { AiCard, AiHighlight } from '@/components/ai-card';
import { AiInlineSuggestion } from '@/components/ai-inline-suggestion';
import { Avatar, AvatarGroup } from '@/components/avatar';
import { Notification } from '@/components/notification';
import { BottomSheet } from '@/components/bottom-sheet';
import { Breadcrumb } from '@/components/breadcrumb';
import { BulkActionsBar } from '@/components/bulk-actions-bar';
import { Button } from '@/components/button';
import { ButtonGroup } from '@/components/button-group';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { CommandPalette } from '@/components/command-palette';
import { ConfidenceBadge } from '@/components/confidence-badge';
import { ContextMenu } from '@/components/context-menu';
import { CopyButton } from '@/components/copy-button';
import { CountBadge } from '@/components/count-badge';
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
import { DatePicker } from '@/components/date-picker';
import { DropdownMenu, type DropdownMenuEntry } from '@/components/dropdown-menu';
import { EmptyState } from '@/components/empty-state';
import { ExpandableText } from '@/components/expandable-text';
import { Field } from '@/components/field';
import { IconButton } from '@/components/icon-button';
import {
  Activity,
  ArrowRight,
  Bell,
  ChevronDown,
  Download,
  Eye,
  FileCode,
  Layers,
  Pencil,
  Plus,
  Search,
  Server,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  User,
} from '@/components/icon';
import { JsonViewer } from '@/components/json-viewer';
import { Kbd } from '@/components/kbd';
import { List, ListItem } from '@/components/list';
import { MetricCard, ChartMetricCard } from '@/components/metric-card';
import { ConfirmDialog, Modal } from '@/components/modal';
import { MultiCombobox } from '@/components/multi-combobox';
import { Pagination } from '@/components/pagination';
import { Popover, PopoverClose } from '@/components/popover';
import { ProgressBar } from '@/components/progress-bar';
import { RadioGroup } from '@/components/radio-group';
import { RelativeTime } from '@/components/relative-time';
import { ResizablePanels, ResizablePanel, ResizeHandle } from '@/components/resizable-panels';
import { ScrollArea } from '@/components/scroll-area';
import { SearchInput } from '@/components/search-input';
import { Select } from '@/components/select';
import { Separator } from '@/components/separator';
import { SeverityBadge, type Severity } from '@/components/severity-badge';
import { SideNav } from '@/components/side-nav';
import { SideSheet, SideSheetField, SideSheetSection } from '@/components/side-sheet';
import { Skeleton } from '@/components/skeleton';
import { Slider } from '@/components/slider';
import { Sparkline } from '@/components/sparkline';
import { MiniBarChart } from '@/components/mini-bar-chart';
import { Spinner } from '@/components/spinner';
import { StatusBadge, StatusDot } from '@/components/status-badge';
import { Stepper } from '@/components/stepper';
import { StreamingSkeleton } from '@/components/streaming-skeleton';
import { Switch } from '@/components/switch';
import { Tabs } from '@/components/tabs';
import { Tag } from '@/components/tag';
import { TextInput } from '@/components/text-input';
import { Textarea } from '@/components/textarea';
import { ThinkingIndicator } from '@/components/thinking-indicator';
import { TimeRangePicker } from '@/components/time-range-picker';
import { Timeline } from '@/components/timeline';
import { Tooltip, RichTooltip } from '@/components/tooltip';
import { TreeView } from '@/components/tree-view';
import type { AiMessageData } from '@/lib/ai';
import type { TimeRange } from '@/lib/time-range';
import './catalogue-previews.css';

const DataGrid = lazy(() =>
  import('@/components/data-grid').then((module) => ({ default: module.DataGrid })),
);
const CodeEditor = lazy(() =>
  import('@/components/code-editor').then((module) => ({ default: module.CodeEditor })),
);
const DiffView = lazy(() =>
  import('@/components/diff-view').then((module) => ({ default: module.DiffView })),
);
const YamlPresenter = lazy(() =>
  import('@/components/yaml-presenter').then((module) => ({ default: module.YamlPresenter })),
);
const AiMessage = lazy(() =>
  import('@/components/ai-message').then((module) => ({ default: module.AiMessage })),
);
const LineChart = lazy(() =>
  import('@/components/charts').then((module) => ({ default: module.LineChart })),
);
const AreaChart = lazy(() =>
  import('@/components/charts').then((module) => ({ default: module.AreaChart })),
);
const BarChart = lazy(() =>
  import('@/components/charts').then((module) => ({ default: module.BarChart })),
);
const DonutChart = lazy(() =>
  import('@/components/charts').then((module) => ({ default: module.DonutChart })),
);
const ChartContainer = lazy(() =>
  import('@/components/charts').then((module) => ({ default: module.ChartContainer })),
);
const EventHistogram = lazy(() =>
  import('@/components/event-histogram').then((module) => ({ default: module.EventHistogram })),
);

const referenceTime = new Date('2026-10-06T12:00:00Z');
const sparklineData = [12, 18, 15, 24, 20, 29, 25, 32, 28, 36, 31, 39];
const sourceOptions = [
  {
    value: 'endpoint',
    label: 'Projects',
    description: 'Milestones and delivery plans',
    icon: <Server size={16} />,
  },
  {
    value: 'identity',
    label: 'Customers',
    description: 'Accounts and relationships',
    icon: <User size={16} />,
  },
  {
    value: 'network',
    label: 'Invoices',
    description: 'Billing and payment status',
    icon: <Activity size={16} />,
  },
];
const yamlSample =
  'title: Production deployment\nstatus: experimental\nsource:\n  category: build\nworkflow:\n  action: release\n  condition: approved\nlevel: high';
const payload = {
  event: 'role_updated',
  actor: 'svc-deploy',
  allowed: false,
  context: { host: 'prod-api-03', environment: 'production' },
  roles: ['reader', 'administrator'],
};
const chartData = Array.from({ length: 8 }, (_, index) => ({
  label: `${String(index + 4).padStart(2, '0')}:00`,
  events: [18, 28, 22, 42, 36, 53, 44, 60][index],
  reviewed: [10, 17, 16, 25, 28, 38, 34, 45][index],
}));
const histogramData = chartData.map((_point, index) => ({
  time: new Date(+referenceTime - (8 - index) * 30 * 60_000).toISOString(),
  label: new Date(+referenceTime - (8 - index) * 30 * 60_000).toISOString().slice(11, 16),
  critical: 2 + index,
  high: 4 + index,
  medium: 6 + index,
  low: 3 + index,
  info: 2,
  total: 17 + index * 4,
}));
const owners = [
  { id: 'alex', name: 'Alex Morgan', initials: 'AM' },
  { id: 'maya', name: 'Maya Chen', initials: 'MC' },
  { id: 'sam', name: 'Sam Patel', initials: 'SP' },
];
const treeItems = [
  {
    id: 'production',
    label: 'Production',
    children: [
      { id: 'api', label: 'API servers' },
      { id: 'workers', label: 'Background workers' },
    ],
  },
  { id: 'staging', label: 'Staging', children: [{ id: 'preview', label: 'Preview environment' }] },
];

export interface ComponentPreviewProps {
  id: string;
  expanded?: boolean;
}

/** Every catalogue entry renders the shared component, independently of Storybook. */
export function ComponentPreview({ id, expanded = false }: ComponentPreviewProps) {
  return (
    <div className="catalogue-preview" data-expanded={expanded} data-component={id}>
      <Suspense
        fallback={
          <div className="catalogue-preview-loading">
            <Spinner size="sm" label="Loading component preview" />
          </div>
        }
      >
        <PreviewContent key={id} id={id} expanded={expanded} />
      </Suspense>
    </div>
  );
}

function PreviewContent({ id, expanded = false }: ComponentPreviewProps) {
  const instanceId = useId();
  const [active, setActive] = useState(false);
  const [mixed, setMixed] = useState<boolean | 'indeterminate'>('indeterminate');
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [choice, setChoice] = useState('endpoint');
  const [selected, setSelected] = useState<string[]>(['endpoint']);
  const [number, setNumber] = useState(42);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [range, setRange] = useState<TimeRange>({ mode: 'relative', preset: '24h' });
  const report = (text: string) => setMessage(text);
  async function copyIdentifier() {
    try {
      await navigator.clipboard.writeText('AEG-1042');
      report('Sample identifier copied.');
    } catch {
      report('Clipboard unavailable. Sample identifier: AEG-1042');
    }
  }
  function downloadRecord() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ id: 'AEG-1042', ...payload }, null, 2)], {
        type: 'application/json',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aegis-sample-event.json';
    link.click();
    URL.revokeObjectURL(url);
    report('Sample JSON export downloaded.');
  }
  const menuItems: DropdownMenuEntry[] = [
    {
      id: 'inspect',
      label: 'Inspect event',
      icon: <Eye size={15} />,
      onSelect: () => report('Event details selected.'),
    },
    {
      id: 'export',
      label: 'Export record',
      icon: <Download size={15} />,
      onSelect: downloadRecord,
    },
    { type: 'separator', id: 'separator' },
    {
      type: 'checkbox',
      id: 'watch',
      label: 'Watch this signal',
      checked: active,
      onCheckedChange: setActive,
    },
    {
      id: 'archive',
      label: 'Archive sample',
      intent: 'destroy',
      icon: <Trash2 size={15} />,
      onSelect: () => report('Sample archived. No external data was changed.'),
    },
  ];
  let content: ReactNode;

  switch (id) {
    case 'button':
      content = (
        <div className="catalogue-preview-row">
          <Button size="sm" intent="function" onClick={() => setActive(!active)}>
            {active ? 'Action complete' : 'Review'}
          </Button>
          <Button
            size="sm"
            emphasis="secondary"
            leadingIcon={<Plus size={14} />}
            onClick={() => report('New local draft created.')}
          >
            New draft
          </Button>
          {expanded && (
            <>
              <Button
                emphasis="tertiary"
                size="sm"
                onClick={() => report('Outline action activated.')}
              >
                Outline
              </Button>
              <Button emphasis="ghost" size="sm" onClick={() => report('Ghost action activated.')}>
                Ghost
              </Button>
              <Button
                intent="ai"
                size="sm"
                leadingIcon={<Sparkles size={14} />}
                onClick={() => report('AI is an explicit intent.')}
              >
                Explain
              </Button>
            </>
          )}
        </div>
      );
      break;
    case 'button-group':
      content = (
        <ButtonGroup aria-label="Event view">
          <Button
            size="sm"
            emphasis={choice === 'endpoint' ? 'secondary' : 'ghost'}
            onClick={() => setChoice('endpoint')}
          >
            Events
          </Button>
          <Button
            size="sm"
            emphasis={choice === 'identity' ? 'secondary' : 'ghost'}
            onClick={() => setChoice('identity')}
          >
            Entities
          </Button>
          <Button
            size="sm"
            emphasis={choice === 'network' ? 'secondary' : 'ghost'}
            onClick={() => setChoice('network')}
          >
            Workflows
          </Button>
        </ButtonGroup>
      );
      break;
    case 'icon-button':
      content = (
        <div className="catalogue-preview-row">
          <IconButton
            aria-label={active ? 'Stop watching signal' : 'Watch signal'}
            aria-pressed={active}
            intent={active ? 'function' : 'default'}
            emphasis="secondary"
            onClick={() => setActive(!active)}
          >
            <Bell size={18} />
          </IconButton>
          <IconButton
            aria-label="Create local draft"
            emphasis="tertiary"
            onClick={() => report('Local draft created.')}
          >
            <Plus size={18} />
          </IconButton>
          <IconButton
            aria-label="Inspect sample settings"
            emphasis="ghost"
            onClick={() => report('Settings action activated.')}
          >
            <Settings size={18} />
          </IconButton>
        </div>
      );
      break;
    case 'checkbox':
      content = (
        <div className="catalogue-preview-stack">
          <Checkbox
            label="Include production"
            checked={active}
            onCheckedChange={(checked) => setActive(checked === true)}
          />
          <Checkbox label="Some sources selected" checked={mixed} onCheckedChange={setMixed} />
          {expanded && <Checkbox label="Managed by policy" checked disabled />}
        </div>
      );
      break;
    case 'switch':
      content = (
        <Switch
          label="Live updates"
          description={expanded ? 'Receive new events in this sample view.' : undefined}
          checked={active}
          onCheckedChange={setActive}
        />
      );
      break;
    case 'radio-group':
      content = (
        <RadioGroup
          label="Review scope"
          value={choice}
          onValueChange={setChoice}
          options={[
            { value: 'endpoint', label: 'Selected host' },
            { value: 'identity', label: 'Entire environment' },
          ]}
        />
      );
      break;
    case 'text-input':
      content = (
        <TextInput
          label="Environment name"
          placeholder="e.g. production-eu"
          value={value}
          onValueChange={setValue}
          clearable
          prefix={<Server size={15} />}
        />
      );
      break;
    case 'textarea':
      content = (
        <Textarea
          label="Team note"
          placeholder="Add context for your team…"
          value={value}
          onValueChange={setValue}
          rows={expanded ? 4 : 2}
          maxLength={240}
          showCount
        />
      );
      break;
    case 'field':
      content = (
        <Field
          label="Project name"
          required
          helpText="Use a name your team will recognize."
          error={active && !value.trim() ? 'Enter a project name.' : undefined}
        >
          <TextInput
            placeholder="Production deployment"
            value={value}
            onValueChange={setValue}
            onBlur={() => setActive(true)}
          />
        </Field>
      );
      break;
    case 'search-input':
      content = (
        <div className="catalogue-preview-stack">
          <SearchInput
            label="Search hosts"
            placeholder="Filter the sample hosts…"
            value={value}
            onValueChange={setValue}
            debounceMs={0}
            shortcut={<Kbd>⌘ K</Kbd>}
          />
          {expanded && (
            <p className="catalogue-preview-note">
              {['prod-api-03', 'prod-worker-02', 'staging-api-01']
                .filter((host) => host.includes(value.toLowerCase()))
                .join(' · ') || 'No sample hosts match.'}
            </p>
          )}
        </div>
      );
      break;
    case 'select':
      content = (
        <Select
          label="Data source"
          value={choice}
          onValueChange={setChoice}
          options={sourceOptions}
        />
      );
      break;
    case 'multi-combobox':
      content = (
        <MultiCombobox
          label="Data sources"
          options={sourceOptions}
          value={selected}
          onValueChange={setSelected}
        />
      );
      break;
    case 'slider':
      content = (
        <Slider
          label="Confidence threshold"
          value={[number]}
          onValueChange={([next]) => setNumber(next)}
          min={0}
          max={100}
          step={1}
          showValue
          formatValue={(next) => `${next}%`}
        />
      );
      break;
    case 'date-picker':
      content = <DatePicker label="Review date" defaultValue={referenceTime} />;
      break;
    case 'time-range-picker':
      content = (
        <TimeRangePicker
          label="Event time range"
          value={range}
          onValueChange={setRange}
          now={referenceTime}
        />
      );
      break;
    case 'avatar':
      content = (
        <div className="catalogue-preview-row">
          <Avatar name="Alex Morgan" status="online" size="lg" />
          <AvatarGroup
            avatars={owners.map((owner) => ({
              name: owner.name,
              initials: owner.initials,
            }))}
            max={expanded ? 3 : 2}
            label="Assigned team"
          />
        </div>
      );
      break;
    case 'count-badge':
      content = (
        <div className="catalogue-preview-row">
          <span>Open tasks</span>
          <CountBadge count={number} label="open sample tasks" />
          <CountBadge count={128} max={99} variant="inverted" label="additional events" />
          {expanded && (
            <Button size="sm" emphasis="ghost" onClick={() => setNumber(number + 1)}>
              Add sample
            </Button>
          )}
        </div>
      );
      break;
    case 'severity-badge':
      content = (
        <div className="catalogue-preview-row">
          {(['critical', 'high', 'medium', 'low', 'info'] as const).map((severity) => (
            <SeverityBadge key={severity} severity={severity} />
          ))}
        </div>
      );
      break;
    case 'status-badge':
      content = (
        <div className="catalogue-preview-row">
          <StatusBadge status="new" />
          <StatusBadge status="in-review" />
          <StatusBadge status="in-progress" />
          {expanded && (
            <>
              <StatusBadge status="completed" />
              <StatusDot status="cancelled" label />
            </>
          )}
        </div>
      );
      break;
    case 'confidence-badge':
      content = (
        <div className="catalogue-preview-row">
          <ConfidenceBadge confidence="high" />
          <ConfidenceBadge confidence="medium" />
          <ConfidenceBadge confidence="low" />
        </div>
      );
      break;
    case 'tag':
      content = (
        <div className="catalogue-preview-row">
          <Tag
            intent="function"
            variant="interactive"
            selected={active}
            onSelectedChange={setActive}
          >
            Production
          </Tag>
          <Tag variant="counter" count={12}>
            Identity
          </Tag>
          {!open ? (
            <Tag
              variant="removable"
              onRemove={() => setOpen(true)}
              removeLabel="Remove automation tag"
            >
              Automation
            </Tag>
          ) : (
            <Button size="sm" emphasis="ghost" onClick={() => setOpen(false)}>
              Restore tag
            </Button>
          )}
        </div>
      );
      break;
    case 'kbd':
      content = (
        <div className="catalogue-preview-row">
          <span>Open command menu</span>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
          {expanded && (
            <>
              <Separator variant="dot" />
              <Kbd>Esc</Kbd>
              <span>Dismiss</span>
            </>
          )}
        </div>
      );
      break;
    case 'separator':
      content = (
        <div className="catalogue-preview-stack">
          <div className="catalogue-preview-row">
            <span>Production</span>
            <Separator variant="dot" />
            <span>12 sources</span>
          </div>
          <Separator />
          <div className="catalogue-preview-row">
            <span>High priority</span>
            <Separator orientation="vertical" className="catalogue-preview-short-divider" />
            <span>Needs review</span>
          </div>
        </div>
      );
      break;
    case 'card':
      content = (
        <Card elevation="flat">
          <CardHeader>
            <CardTitle>Record context</CardTitle>
            <CardDescription>Shared structure for a focused task.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="catalogue-preview-row">
              <SeverityBadge severity="high" />
              <span>prod-api-03</span>
            </div>
          </CardContent>
          {expanded && (
            <CardFooter>
              <span>24 related events</span>
              <Button size="sm" onClick={() => report('Sample record opened.')}>
                Review
              </Button>
            </CardFooter>
          )}
        </Card>
      );
      break;
    case 'chart-metric-card':
      content = (
        <ChartMetricCard
          label="Processed events"
          metric={61800}
          delta={364.3}
          trendIsPositive
          period="in past 7d"
          height={180}
          data={[10100, 9300, 9900, 6100, 7000, 9700, 9700].map((value, i) => ({
            label: `Oct ${15 + i}`,
            value,
          }))}
        />
      );
      break;
    case 'metric-card':
      content = (
        <MetricCard
          label="Open work items"
          value={42}
          delta={-12}
          deltaLabel="from previous day"
          trendIsPositive
          sparkline={sparklineData}
          sparklineLabel="Work item trend"
        />
      );
      break;
    case 'list':
      content = (
        <List density="compact">
          <ListItem
            title="prod-api-03"
            description="Production · EU West"
            icon={<Server size={16} />}
            selectable
            selected={active}
            onSelect={() => setActive(!active)}
            meta={<StatusDot status="new" />}
          />
          <ListItem
            title="prod-worker-02"
            description="Background jobs"
            icon={<Server size={16} />}
            selectable
            selected={!active}
            onSelect={() => setActive(!active)}
          />
        </List>
      );
      break;
    case 'accordion':
      content = (
        <Accordion
          type="single"
          collapsible
          defaultValue={expanded ? 'scope' : undefined}
          items={[
            {
              value: 'scope',
              title: 'Review scope',
              count: 12,
              icon: <Shield size={16} />,
              content: 'Production hosts and the last 24 hours of identity events.',
            },
            {
              value: 'evidence',
              title: 'Related evidence',
              count: 3,
              icon: <Layers size={16} />,
              content: 'A role change, a new session, and an outbound connection.',
            },
          ]}
        />
      );
      break;
    case 'tabs':
      content = (
        <Tabs
          label="Record panels"
          defaultValue="events"
          items={[
            {
              value: 'events',
              label: 'Events',
              count: 24,
              content: <p className="catalogue-preview-note">24 events from the selected host.</p>,
            },
            {
              value: 'entities',
              label: 'Entities',
              count: 3,
              content: (
                <p className="catalogue-preview-note">
                  One host, one service account, one destination.
                </p>
              ),
            },
            {
              value: 'notes',
              label: 'Notes',
              content: <Textarea label="Team note" rows={2} placeholder="Add context…" />,
            },
          ]}
        />
      );
      break;
    case 'breadcrumb':
      content = (
        <Breadcrumb
          items={[
            {
              label: 'Workspace',
              onClick: () => report('Workspace selected.'),
              icon: <Layers size={14} />,
            },
            { label: 'Projects', onClick: () => report('Projects selected.') },
            { label: 'AEG-1042' },
          ]}
        />
      );
      break;
    case 'pagination':
      content = (
        <Pagination page={page} pageSize={10} total={80} onPageChange={setPage} noun="events" />
      );
      break;
    case 'stepper':
      content = (
        <div className="catalogue-preview-stack">
          <Stepper
            steps={[
              { id: 'scope', title: 'Scope' },
              { id: 'logic', title: 'Logic' },
              { id: 'review', title: 'Review' },
            ]}
            currentStep={page - 1}
            orientation={expanded ? 'horizontal' : 'vertical'}
            onStepChange={(next) => setPage(next + 1)}
          />
          {expanded && (
            <Button size="sm" onClick={() => setPage(page === 3 ? 1 : page + 1)}>
              {page === 3 ? 'Restart sample' : 'Continue'}
            </Button>
          )}
        </div>
      );
      break;
    case 'side-nav':
      content = (
        <div className="catalogue-preview-nav">
          <SideNav
            workspace="Sample workspace"
            activeId={choice}
            onNavigate={setChoice}
            defaultCollapsed={!expanded}
            sections={[
              {
                label: 'Workspace',
                items: [
                  { id: 'endpoint', label: 'Projects', icon: <Shield size={17} />, count: 12 },
                  { id: 'identity', label: 'Entities', icon: <Server size={17} /> },
                  { id: 'network', label: 'Workflows', icon: <FileCode size={17} /> },
                ],
              },
            ]}
          />
        </div>
      );
      break;
    case 'tree-view':
      content = (
        <TreeView
          label="Environment scope"
          items={treeItems}
          defaultExpandedIds={['production']}
          defaultSelectedIds={['api']}
        />
      );
      break;
    case 'scroll-area':
      content = (
        <ScrollArea label="Recent sample events" maxHeight={expanded ? 250 : 145}>
          <List density="compact">
            {Array.from({ length: 12 }, (_, index) => (
              <ListItem
                key={index}
                title={`Identity event ${1042 + index}`}
                description={`prod-api-${String(index + 1).padStart(2, '0')} · Role policy evaluated`}
                icon={<Activity size={14} />}
              />
            ))}
          </List>
        </ScrollArea>
      );
      break;
    case 'resizable-panels':
      content = (
        <ResizablePanels orientation="horizontal" className="catalogue-preview-panels">
          <ResizablePanel defaultSize="55%" minSize="25%">
            <div className="catalogue-preview-panel-content">
              <Shield size={20} />
              <strong>Signals</strong>
              {expanded && <p>Resize with the divider or arrow keys.</p>}
            </div>
          </ResizablePanel>
          <ResizeHandle label="Resize signals and evidence" />
          <ResizablePanel defaultSize="45%" minSize="25%">
            <div className="catalogue-preview-panel-content">
              <Layers size={20} />
              <strong>Evidence</strong>
              {expanded && <p>Keep context beside the work.</p>}
            </div>
          </ResizablePanel>
        </ResizablePanels>
      );
      break;
    case 'bottom-sheet':
      content = (
        <div className="aegis-bottom-sheet-workspace catalogue-preview-bottom-workspace">
          <div className="catalogue-preview-bottom-heading">
            <span>Sample workspace</span>
            <Button size="sm" emphasis="ghost" onClick={() => setOpen(!open)}>
              {open ? 'Close queue' : 'Open queue'}
            </Button>
          </div>
          <BottomSheet
            title="Work queue"
            open={open}
            onOpenChange={setOpen}
            minHeight={100}
            defaultHeight={expanded ? 180 : 120}
            workspaceMinHeight={40}
          >
            <p className="catalogue-preview-note">Three sample records are ready for review.</p>
            <SeverityBadge severity="high" />
          </BottomSheet>
          {!open && (
            <p className="catalogue-preview-note">The queue expands inside its workspace.</p>
          )}
        </div>
      );
      break;
    case 'modal':
      content = (
        <div className="catalogue-preview-row">
          <Modal
            title="Review record"
            description="Changes in this example stay local."
            open={open}
            onOpenChange={setOpen}
            size="small"
            trigger={
              <Button size="sm" intent="function">
                Open dialog
              </Button>
            }
            footer={
              <>
                <Button emphasis="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  intent="function"
                  onClick={() => {
                    report(`Local record saved: ${value || 'Production identity review'}.`);
                    setOpen(false);
                  }}
                >
                  Save changes
                </Button>
              </>
            }
          >
            <TextInput
              label="Record name"
              value={value || (active ? '' : 'Production identity review')}
              onValueChange={(next) => {
                setActive(true);
                setValue(next);
              }}
            />
          </Modal>
          {expanded && (
            <ConfirmDialog
              title="Delete the sample?"
              description="Type SAMPLE to confirm this local action."
              confirmationText="SAMPLE"
              trigger={
                <Button size="sm" intent="destroy" emphasis="secondary">
                  Typed confirmation
                </Button>
              }
              onConfirm={() => report('Sample deletion confirmed.')}
              confirmLabel="Delete sample"
            />
          )}
        </div>
      );
      break;
    case 'side-sheet':
      content = (
        <SideSheet
          title="AEG-1042"
          description="Sample record details"
          trigger={
            <Button
              size="sm"
              intent="function"
              emphasis="secondary"
              trailingIcon={<ArrowRight size={14} />}
            >
              Open detail sheet
            </Button>
          }
          open={open}
          onOpenChange={setOpen}
          footer={
            <Button
              intent="function"
              onClick={() => {
                report('Sample detail reviewed.');
                setActive(true);
                setOpen(false);
              }}
            >
              Mark reviewed
            </Button>
          }
        >
          <SideSheetSection title="Overview">
            <SideSheetField label="Severity">
              <SeverityBadge severity="high" />
            </SideSheetField>
            <SideSheetField label="Entity">prod-api-03</SideSheetField>
            <SideSheetField label="Status">
              <StatusBadge status={active ? 'in-review' : 'new'} />
            </SideSheetField>
          </SideSheetSection>
          <SideSheetSection title="Team note">
            <Textarea label="Add record context" rows={4} value={value} onValueChange={setValue} />
          </SideSheetSection>
        </SideSheet>
      );
      break;
    case 'popover':
      content = (
        <Popover
          title="View options"
          description="Tune this sample view."
          trigger={
            <Button size="sm" emphasis="secondary" trailingIcon={<ChevronDown size={14} />}>
              View options
            </Button>
          }
          footer={
            <PopoverClose asChild>
              <Button size="sm" intent="function">
                Done
              </Button>
            </PopoverClose>
          }
        >
          <div className="catalogue-preview-stack">
            <Checkbox
              label="Show resolved events"
              checked={active}
              onCheckedChange={(checked) => setActive(checked === true)}
            />
            <Switch label="Live updates" defaultChecked />
          </div>
        </Popover>
      );
      break;
    case 'dropdown-menu':
      content = (
        <DropdownMenu
          trigger={
            <Button size="sm" emphasis="secondary" trailingIcon={<ChevronDown size={14} />}>
              Record actions
            </Button>
          }
          items={menuItems}
          label="Sample record actions"
        />
      );
      break;
    case 'context-menu':
      content = (
        <ContextMenu items={menuItems} label="Sample event menu">
          <button type="button" className="catalogue-preview-context-target">
            <Server size={22} />
            <strong>prod-api-03</strong>
            <span>Right-click or press Shift + F10</span>
          </button>
        </ContextMenu>
      );
      break;
    case 'command-palette':
      content = (
        <>
          <Button
            size="sm"
            emphasis="secondary"
            leadingIcon={<Search size={15} />}
            onClick={() => setOpen(true)}
          >
            Find a command <Kbd>⌘ K</Kbd>
          </Button>
          <CommandPalette
            open={open}
            onOpenChange={setOpen}
            shortcut={false}
            actions={[
              {
                id: 'records',
                label: 'Open tasks',
                group: 'Navigate',
                icon: <Shield size={16} />,
                onSelect: () => report('Projects command selected.'),
              },
              {
                id: 'rules',
                label: 'Inspect project workflows',
                group: 'Navigate',
                icon: <FileCode size={16} />,
                onSelect: () => report('Workflows command selected.'),
              },
              {
                id: 'copy',
                label: 'Copy event identifier',
                group: 'Actions',
                onSelect: () => void copyIdentifier(),
              },
            ]}
          />
        </>
      );
      break;
    case 'tooltip':
      content = (
        <div className="catalogue-preview-row">
          <Tooltip content="Inspect the original event payload" delayDuration={100}>
            <IconButton
              aria-label="Inspect payload"
              emphasis="secondary"
              onClick={() => report('Payload action activated.')}
            >
              <FileCode size={18} />
            </IconButton>
          </Tooltip>
          <RichTooltip
            title="Record context"
            description="Keep related entities and evidence together."
            shortcut={<Kbd>⌘ I</Kbd>}
          >
            <Button size="sm" emphasis="ghost" onClick={() => report('Record context selected.')}>
              Hover or focus
            </Button>
          </RichTooltip>
        </div>
      );
      break;
    case 'notification':
      content = (
        <div className="catalogue-preview-stack">
          {!active ? (
            <Notification
              variant="inline"
              title="One source needs attention"
              description="Review the collector connection."
              intent="warning"
              onDismiss={() => setActive(true)}
            />
          ) : (
            <Button size="sm" emphasis="secondary" onClick={() => setActive(false)}>
              Restore notification
            </Button>
          )}
          {expanded && (
            <Notification
              variant="floating"
              intent="success"
              title="Sample project saved"
              description="The local draft is ready for review."
              action={{ label: 'Undo', onClick: () => report('Local save undone.') }}
            />
          )}
        </div>
      );
      break;
    case 'empty-state':
      content = (
        <EmptyState
          compact
          preset={active ? 'no-data' : 'no-results'}
          title={active ? 'Ready for a new search' : 'No matching events'}
          description={expanded ? 'Adjust the search or broaden the time range.' : undefined}
          action={
            <Button size="sm" emphasis="secondary" onClick={() => setActive(!active)}>
              {active ? 'Restore example' : 'Clear sample filters'}
            </Button>
          }
        />
      );
      break;
    case 'progress-bar':
      content = (
        <div className="catalogue-preview-stack">
          <ProgressBar value={number} label="Sample replay" showValue />
          {expanded && (
            <Button
              size="sm"
              emphasis="secondary"
              onClick={() => setNumber(number >= 100 ? 0 : Math.min(100, number + 20))}
            >
              {number >= 100 ? 'Restart' : 'Advance sample'}
            </Button>
          )}
        </div>
      );
      break;
    case 'spinner':
      content = (
        <div className="catalogue-preview-row">
          <Spinner size="sm" />
          <Spinner label="Loading sample events" />
          {expanded && <Spinner size="lg" />}
        </div>
      );
      break;
    case 'skeleton':
      content = (
        <div className="catalogue-preview-stack">
          <div className="catalogue-preview-row">
            <Skeleton variant="avatar" />
            <div className="catalogue-preview-grow">
              <Skeleton width="70%" />
              <Skeleton width="45%" />
            </div>
          </div>
          <Skeleton variant="text" width="92%" />
          <Skeleton variant="text" width="64%" />
        </div>
      );
      break;
    case 'streaming-skeleton':
      content = <StreamingSkeleton lines={expanded ? 5 : 3} label="Sample response loading" />;
      break;
    case 'thinking-indicator':
      content = (
        <ThinkingIndicator
          compact={!expanded}
          messages={[
            'Preparing the sample response',
            'Organizing supplied context',
            'Drafting a review checklist',
          ]}
          interval={2200}
        />
      );
      break;
    case 'ai-card':
      content = (
        <AiCard
          title="Suggested next step"
          confidence="medium"
          provenance={expanded ? 'Local example · Your approval required' : undefined}
          onRegenerate={expanded ? () => setActive(!active) : undefined}
        >
          <p>
            {active
              ? 'Check the configuration against the approved release plan.'
              : 'Review the service configuration before approving the release.'}
          </p>
        </AiCard>
      );
      break;
    case 'ai-highlight':
      content = (
        <AiHighlight
          confidence="high"
          provenance={expanded ? 'Illustrative summary of supplied context' : undefined}
        >
          <p>
            Three sample events share the same host identifier. Validate the timestamps before
            drawing a conclusion.
          </p>
        </AiHighlight>
      );
      break;
    case 'ai-inline-suggestion':
      content = (
        <AiInlineSuggestion
          label="Automation name"
          value={value || (active ? '' : 'Production deployment')}
          onValueChange={(next) => {
            setActive(true);
            setValue(next);
          }}
          suggestion="Production deployment awaiting team review"
          onAccept={(next) => {
            setValue(next);
            setActive(true);
            report('Suggested text accepted.');
          }}
        />
      );
      break;
    case 'ai-message':
      content = <MessagePreview expanded={expanded} report={report} />;
      break;
    case 'data-grid':
      content = <GridPreview expanded={expanded} />;
      break;
    case 'bulk-actions-bar':
      content = (
        <div className="catalogue-preview-stack">
          <BulkActionsBar
            position="inline"
            selectedCount={active ? 0 : 3}
            owners={owners}
            onClear={() => setActive(true)}
            onAssign={(next) =>
              report(
                `Assigned sample records to ${owners.find((owner) => owner.id === next)?.name ?? 'Unassigned'}.`,
              )
            }
            onStatusChange={(next) => report(`Sample records changed to ${next}.`)}
            onSummarize={() => report('Summary requested for three sample records.')}
          />
          {active && (
            <Button size="sm" emphasis="secondary" onClick={() => setActive(false)}>
              Select three samples
            </Button>
          )}
        </div>
      );
      break;
    case 'data-grid-cells':
      content = (
        <div className="catalogue-preview-stack">
          <EntityCell
            entity={{
              type: 'project',
              name: 'Customer portal',
              detail: 'Northstar Labs · Design review',
            }}
          />
          <div className="catalogue-preview-row">
            <SeverityCell severity="high" />
            <StatusCell status="in-review" />
            <NumberCell value={12840} />
          </div>
        </div>
      );
      break;
    case 'severity-cell':
      content = (
        <div className="catalogue-preview-row">
          <SeverityCell severity="critical" />
          <SeverityCell severity="medium" compact />
        </div>
      );
      break;
    case 'status-cell':
      content = (
        <div className="catalogue-preview-row">
          <StatusCell status="new" />
          <StatusCell status="in-progress" />
        </div>
      );
      break;
    case 'number-cell':
      content = (
        <div className="catalogue-preview-cell-pair">
          <span>Events processed</span>
          <NumberCell value={1245800} />
          {expanded && (
            <>
              <span>Confidence</span>
              <NumberCell value={0.92} format={{ style: 'percent' }} />
            </>
          )}
        </div>
      );
      break;
    case 'tags-cell':
      content = (
        <TagsCell
          tags={['customer-experience', 'northstar', 'milestone-2', 'design-review']}
          maxVisible={2}
        />
      );
      break;
    case 'time-cell':
      content = <TimeCell value="2026-10-06T11:42:00Z" now={referenceTime} />;
      break;
    case 'sparkline-cell':
      content = (
        <SparklineCell
          data={sparklineData}
          width={expanded ? 240 : 160}
          label="Events per hour"
          variant={active ? 'bar' : 'line'}
        />
      );
      break;
    case 'ai-verdict-cell':
      content = <AiVerdictCell verdict="Review recommended" confidence={0.86} />;
      break;
    case 'expand-cell':
      content = (
        <div className="catalogue-preview-stack">
          <ExpandCell
            expanded={active}
            onExpandedChange={setActive}
            count={3}
            label="Related events"
          />
          {active && (
            <p className="catalogue-preview-note">
              Role updated · Session started · Permission evaluated
            </p>
          )}
        </div>
      );
      break;
    case 'actions-cell':
      content = (
        <ActionsCell
          actions={[
            {
              id: 'inspect',
              label: 'Inspect event',
              icon: <Eye size={15} />,
              onClick: () => report('Sample event opened.'),
            },
            {
              id: 'edit',
              label: 'Edit note',
              icon: <Pencil size={15} />,
              onClick: () => report('Sample note editor selected.'),
            },
            {
              id: 'archive',
              label: 'Archive',
              icon: <Trash2 size={15} />,
              intent: 'destroy',
              onClick: () => report('Sample archived.'),
            },
          ]}
          maxVisible={2}
        />
      );
      break;
    case 'area-chart':
    case 'bar-chart':
    case 'line-chart':
    case 'donut-chart':
    case 'chart-container':
      content = <ChartPreview id={id} expanded={expanded} />;
      break;
    case 'event-histogram':
      content = (
        <EventHistogram
          data={histogramData}
          height={expanded ? 240 : 125}
          compact={!expanded}
          brush={expanded}
          showLegend={expanded}
          showDataTable={false}
          value={range}
          now={referenceTime}
          onValueChange={setRange}
        />
      );
      break;
    case 'mini-bar-chart':
      content = (
        <div className="catalogue-preview-stack">
          <MiniBarChart
            data={sparklineData}
            width={expanded ? 240 : 160}
            height={expanded ? 56 : 40}
            label="Sample event counts over the last twelve hours"
          />
        </div>
      );
      break;
    case 'sparkline':
      content = (
        <div className="catalogue-preview-stack">
          <Sparkline
            data={sparklineData}
            width={expanded ? 280 : 200}
            height={expanded ? 72 : 48}
            variant={active ? 'bar' : 'area'}
            label="Recent sample activity"
          />
          {expanded && (
            <Button size="sm" emphasis="ghost" onClick={() => setActive(!active)}>
              Switch to {active ? 'area' : 'bars'}
            </Button>
          )}
        </div>
      );
      break;
    case 'code-editor':
      content = (
        <CodeEditor
          label="Sample workflow YAML"
          language="yaml"
          defaultValue={yamlSample}
          height={expanded ? 280 : 145}
          statusBar={expanded ? 'Editable local sample' : false}
        />
      );
      break;
    case 'yaml-presenter':
      content = (
        <YamlPresenter
          value={yamlSample}
          filename="workflow.yaml"
          minHeight={100}
          maxHeight={expanded ? 320 : 150}
        />
      );
      break;
    case 'diff-view':
      content = (
        <DiffView
          original={yamlSample}
          modified={yamlSample
            .replace('experimental', 'test')
            .replace('level: high', 'level: critical')}
          language="yaml"
          defaultMode="unified"
          showModeToggle={expanded}
          minHeight={120}
          maxHeight={expanded ? 340 : 160}
          collapseUnchanged
        />
      );
      break;
    case 'json-viewer':
      content = (
        <JsonViewer
          value={payload}
          label="Sample identity event payload"
          maxHeight={expanded ? 340 : 150}
          defaultExpandedDepth={expanded ? 2 : 1}
          onCopy={(kind) => report(`JSON ${kind} copied.`)}
        />
      );
      break;
    case 'copy-button':
      content = (
        <div className="catalogue-preview-row">
          <code>AEG-1042</code>
          <CopyButton
            text="AEG-1042"
            notify={false}
            onCopy={() => report('Sample identifier copied.')}
            aria-label="Copy sample event identifier"
          />
        </div>
      );
      break;
    case 'expandable-text':
      content = (
        <ExpandableText collapsedLines={expanded ? 3 : 2}>
          The sample service received a configuration update outside its usual deployment window.
          Compare the event timestamp with the approved change log, inspect the actor identity, and
          record the context supporting the final assessment. This example describes a review
          workflow without querying external systems.
        </ExpandableText>
      );
      break;
    case 'relative-time':
      content = (
        <div className="catalogue-preview-stack">
          <div className="catalogue-preview-row">
            <span>Last observed</span>
            <RelativeTime value="2026-10-06T11:42:00Z" now={referenceTime} />
          </div>
          {expanded && (
            <p className="catalogue-preview-note">
              Hover or focus the timestamp for its absolute value.
            </p>
          )}
        </div>
      );
      break;
    case 'timeline':
      content = (
        <Timeline
          now={referenceTime}
          label="Sample activity timeline"
          items={[
            {
              id: 'detected',
              title: 'Configuration update received',
              timestamp: '2026-10-06T11:20:00Z',
              type: 'event',
            },
            {
              id: 'assigned',
              title: 'Assigned to Alex Morgan',
              timestamp: '2026-10-06T11:35:00Z',
              type: 'assignment',
              actor: 'Maya Chen',
            },
            ...(expanded
              ? [
                  {
                    id: 'note',
                    title: 'Deployment window confirmed',
                    timestamp: '2026-10-06T11:42:00Z',
                    type: 'note' as const,
                    description: 'The local sample is ready for review.',
                  },
                ]
              : []),
          ]}
        />
      );
      break;
    case 'icons':
      content = (
        <div className="catalogue-preview-icons">
          {[Shield, Server, Activity, FileCode, Search, Layers, Bell, Settings].map(
            (Icon, index) => (
              <span key={index}>
                <Icon size={expanded ? 28 : 22} aria-hidden="true" />
              </span>
            ),
          )}
          <span className="sr-only">
            Shield, server, activity, file code, search, layers, bell, and settings icons.
          </span>
        </div>
      );
      break;
    default:
      content = <p className="catalogue-preview-note">Select a component to view its example.</p>;
  }
  return (
    <>
      <div className="catalogue-preview-content">{content}</div>
      {message && (
        <p className="catalogue-preview-feedback" role="status">
          {message}
        </p>
      )}
      <span className="sr-only" data-preview-instance={instanceId} />
    </>
  );
}

interface PreviewRecord {
  id: string;
  severity: Severity;
  signal: string;
  events: number;
}
const gridRecords: PreviewRecord[] = [
  { id: 'AEG-1042', severity: 'high', signal: 'Renewal approval requested', events: 24 },
  { id: 'AEG-1043', severity: 'medium', signal: 'Customer onboarding review', events: 8 },
  { id: 'AEG-1044', severity: 'low', signal: 'Invoice approval needed', events: 3 },
  { id: 'AEG-1045', severity: 'critical', signal: 'Delivery milestone overdue', events: 42 },
];
function GridPreview({ expanded }: { expanded: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [opened, setOpened] = useState<PreviewRecord>();
  const columns = useMemo<ColumnDef<PreviewRecord>[]>(
    () => [
      {
        accessorKey: 'severity',
        header: 'Severity',
        size: expanded ? 132 : 112,
        minSize: expanded ? 116 : 104,
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} compact={!expanded} />,
      },
      { accessorKey: 'signal', header: 'Task', size: 240, minSize: 130 },
      ...(expanded ? [{ accessorKey: 'events', header: 'Events', size: 90, minSize: 70 }] : []),
    ],
    [expanded],
  );
  // The lazy component's generic type is erased by React.lazy; the wrapper preserves
  // the known record contract while the source DataGrid still receives typed columns.
  const TypedDataGrid = DataGrid as typeof import('@/components/data-grid').DataGrid;
  return (
    <div className="catalogue-preview-stack">
      <TypedDataGrid
        data={expanded ? gridRecords : gridRecords.slice(0, 2)}
        columns={columns}
        getRowId={(row) => row.id}
        rowLabel={(row) => row.signal}
        density="compact"
        enableSelection={expanded}
        selectedRowIds={selected}
        onSelectedRowsChange={setSelected}
        pagination={expanded}
        pageSize={3}
        label="Task activity sample"
        onRowClick={expanded ? setOpened : undefined}
      />
      {expanded && (
        <p className="catalogue-preview-note" role="status">
          {opened
            ? `Selected record: ${opened.id} · ${opened.signal}`
            : `${selected.length} sample rows selected. Sort, resize, or select a row.`}
        </p>
      )}
    </div>
  );
}

function ChartPreview({ id, expanded }: { id: string; expanded: boolean }) {
  const series = [
    { key: 'events', label: 'Events', color: 'chart-1' as const },
    { key: 'reviewed', label: 'Reviewed', color: 'chart-4' as const },
  ];
  const props = {
    data: chartData,
    series,
    xKey: 'label',
    height: expanded ? 240 : 125,
    compact: !expanded,
    showLegend: expanded,
    showDataTable: false,
  };
  if (id === 'donut-chart')
    return (
      <DonutChart
        title="Events by severity"
        height={expanded ? 250 : 135}
        compact={!expanded}
        showLegend={expanded}
        showDataTable={false}
        data={[
          { name: 'Critical', value: 8, color: 'critical' },
          { name: 'High', value: 24, color: 'high' },
          { name: 'Medium', value: 42, color: 'medium' },
          { name: 'Low', value: 18, color: 'low' },
        ]}
      />
    );
  if (id === 'chart-container')
    return (
      <ChartContainer
        title="Processing throughput"
        description={
          expanded ? 'A shared frame for chart labels, status, and supporting detail.' : undefined
        }
        height={expanded ? 220 : 110}
        compact={!expanded}
      >
        <div className="catalogue-preview-chart-frame">
          <Sparkline
            data={sparklineData}
            width={240}
            height={80}
            variant="area"
            label="Sample throughput"
          />
        </div>
      </ChartContainer>
    );
  if (id === 'area-chart') return <AreaChart {...props} title="Ingestion over time" />;
  if (id === 'bar-chart') return <BarChart {...props} title="Events and reviews" />;
  return <LineChart {...props} title="Event activity" />;
}

function MessagePreview({
  expanded,
  report,
}: {
  expanded: boolean;
  report: (message: string) => void;
}) {
  const [revision, setRevision] = useState(0);
  const message: AiMessageData = {
    id: 'catalogue-response',
    role: 'assistant',
    status: 'complete',
    timestamp: referenceTime.toISOString(),
    content: expanded
      ? `### Review the supplied event\n\n${revision ? 'Compare the proposed change with the approved release plan.' : 'Check the configuration update against the deployment window.'}\n\nThis local example has not queried external data or changed any record.`
      : 'Review the configuration update against the approved release plan. This is a local example.',
    context: [],
    steps: [],
    citations: expanded ? [{ id: 'AEG-1042', kind: 'record', label: 'Configuration update' }] : [],
  };
  return (
    <AiMessage
      message={message}
      onCitationClick={(citation) => report(`Reference selected: ${citation.id}.`)}
      onFeedback={(feedback) => report(`Feedback saved locally: ${feedback}.`)}
      onRegenerate={expanded ? () => setRevision(revision + 1) : undefined}
    />
  );
}
