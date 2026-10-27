import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useCallback, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Activity,
  ArrowRight,
  Clock,
  Database,
  FileChartColumn,
  Folder,
  LayoutDashboard,
  Layers,
  Search,
  Settings,
  Sparkles,
  UserRound,
} from '@/components/icon';
import { Avatar } from '@/components/avatar';
import { Breadcrumb } from '@/components/breadcrumb';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CommandPalette, type CommandAction } from '@/components/command-palette';
import { ChartMetricCard, MetricCard } from '@/components/metric-card';
import { ProgressBar } from '@/components/progress-bar';
import { GanttChart } from '@/components/gantt-chart';
import { SearchInput } from '@/components/search-input';
import { Select } from '@/components/select';
import { SideNav, type NavSection } from '@/components/side-nav';
import { Switch } from '@/components/switch';
import { Tag } from '@/components/tag';
import { TextInput } from '@/components/text-input';
import { Timeline } from '@/components/timeline';
import { Toaster, showToast } from '@/components/toast';
import { AiPanel } from '@/patterns/ai-panel';
import { PromptInput } from '@/patterns/prompt-input';
import { NotificationCenter } from '@/patterns/notification-center';
import { PageHeader } from '@/patterns/page-header';
import type { AiRequest } from '@/lib/ai';
import type { Theme } from '@/lib/theme';
import { layoutThemeOptions, type LayoutTheme } from '@/lib/layout-theme';
import { BusinessDetails } from './business-details';
import { BusinessLists } from './business-lists';
import { createBusinessData } from './business-data';
import {
  businessContext,
  businessMetrics,
  revenueSeries,
  streamBusinessResponse,
} from './business-logic';
import {
  businessReferenceDate,
  currentMemberId,
  formatMoney,
  type BusinessPage,
  type BusinessRoute,
  type BusinessViewProps,
} from './business-types';
import './business-app.css';

const pageLabels: Record<BusinessPage, string> = {
  overview: 'Overview',
  projects: 'Projects',
  customers: 'Customers',
  invoices: 'Invoices',
  team: 'Team',
  activity: 'Activity',
  settings: 'Settings',
};
const descriptions: Record<BusinessPage, string> = {
  overview: 'A clear view of your projects, customers, and business.',
  projects: 'Keep delivery moving, from first brief to final handoff.',
  customers: 'Every relationship, with the context your team needs.',
  invoices: 'Manage your billing and keep track of what’s outstanding.',
  team: 'The people behind the work.',
  activity: 'Updates and decisions across your workspace.',
  settings: 'Make this workspace work for you.',
};
function useMedia(query: string) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const media = matchMedia(query);
      media.addEventListener('change', notify);
      return () => media.removeEventListener('change', notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => matchMedia(query).matches,
    () => false,
  );
}
function BusinessActivityView({
  data,
  onNavigate,
  limit,
}: Pick<BusinessViewProps, 'data' | 'onNavigate'> & { limit?: number }) {
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('all');
  const filtered = data.activity.filter(
    (entry) =>
      (actor === 'all' || entry.actorId === actor) &&
      `${entry.text} ${data.team.find((member) => member.id === entry.actorId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const activity = limit ? filtered.slice(0, limit) : filtered;
  return (
    <div className="business-activity">
      {!limit && (
        <div className="business-toolbar">
          <SearchInput
            aria-label="Search activity"
            placeholder="Search activity…"
            value={query}
            onValueChange={setQuery}
          />
          <Select
            aria-label="Activity member"
            value={actor}
            onValueChange={setActor}
            options={[
              { value: 'all', label: 'Everyone' },
              ...data.team.map((member) => ({ value: member.id, label: member.name })),
            ]}
          />
        </div>
      )}
      {activity.length ? (
        <Timeline
          label="Workspace activity"
          now={Math.max(
            new Date(businessReferenceDate).getTime(),
            ...data.activity.map((entry) => new Date(entry.date).getTime()),
          )}
          items={activity.map((entry) => ({
            id: entry.id,
            title: entry.text,
            timestamp: entry.date,
            actor: data.team.find((member) => member.id === entry.actorId)?.name ?? 'Workspace',
            type: 'event',
            ...(entry.page && entry.recordId
              ? {
                  actions: (
                    <Button
                      size="sm"
                      emphasis="ghost"
                      onClick={() => onNavigate({ page: entry.page!, recordId: entry.recordId! })}
                      trailingIcon={<ArrowRight size={componentToken('application.icon-sm')} />}
                    >
                      View record
                    </Button>
                  ),
                }
              : {}),
          }))}
        />
      ) : (
        <div className="business-empty">
          <h3>No activity matches</h3>
          <p>Try another search or member.</p>
          <Button
            emphasis="tertiary"
            onClick={() => {
              setQuery('');
              setActor('all');
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
function BusinessOverview(props: BusinessViewProps & { showActivity: boolean }) {
  const { data, onNavigate, onAskAi, showActivity } = props;
  const sizes = useComponentTokenNumbers(['business-chart-height']);
  const [months, setMonths] = useState('6');
  const [contextIds, setContextIds] = useState(['workspace-summary']);
  const availableContext = [
    businessContext(data, { page: 'overview' })[0],
    ...data.projects.flatMap((project) =>
      businessContext(data, { page: 'projects', recordId: project.id }),
    ),
    ...data.customers.flatMap((customer) =>
      businessContext(data, { page: 'customers', recordId: customer.id }),
    ),
  ];
  const metrics = businessMetrics(data);
  const revenue = revenueSeries(data, Number(months));
  const priorities = data.projects
    .filter((project) => project.status !== 'Completed')
    .sort(
      (a, b) =>
        Number(b.status === 'On hold') - Number(a.status === 'On hold') ||
        a.dueDate.localeCompare(b.dueDate),
    )
    .slice(0, 5);
  const statuses = (['Planned', 'Active', 'On hold', 'Completed'] as const).map((label) => ({
    label,
    value: data.projects.filter((project) => project.status === label).length,
    color: (
      { Planned: 'chart-4', Active: 'chart-2', 'On hold': 'warning', Completed: 'success' } as const
    )[label],
  }));
  return (
    <div className="business-overview">
      <section className="business-ai-hub" aria-labelledby="business-ai-heading">
        <div className="business-ai-intro">
          <span className="business-ai-eyebrow">
            <Sparkles size={componentToken('application.icon-md')} /> Aegis AI
          </span>
          <h2 id="business-ai-heading">What should we work on?</h2>
          <p>Bring your projects, customers, and next steps together.</p>
        </div>
        <PromptInput
          presentation="hero"
          placeholder="Work with Aegis AI…"
          availableContext={availableContext}
          context={availableContext.filter((item) => contextIds.includes(item.id))}
          onContextChange={(items) => setContextIds(items.map((item) => item.id))}
          onSend={(prompt, attached) => onAskAi(prompt, { page: 'overview' }, attached)}
          commands={[
            {
              id: 'briefing',
              label: 'Workspace briefing',
              description: 'Catch up on your business',
              prompt: 'Give me a briefing on the attached workspace context.',
            },
            {
              id: 'priorities',
              label: 'Review priorities',
              description: 'Find the work that needs attention',
              prompt: 'Review these projects and suggest next steps.',
            },
            {
              id: 'handoff',
              label: 'Prepare a handoff',
              description: 'Summarize the selected records',
              prompt: 'Summarize the attached records for a team handoff.',
            },
          ]}
        />
      </section>
      <div className="business-metrics">
        {[
          {
            label: 'Active projects',
            value: metrics.activeProjects,
            page: 'projects' as const,
            caption: `${data.projects.filter((project) => project.status === 'On hold').length} need attention`,
          },
          {
            label: 'Active customers',
            value: metrics.activeCustomers,
            page: 'customers' as const,
            caption: `${data.customers.length} total accounts`,
          },
          {
            label: 'Revenue collected',
            value: formatMoney(metrics.collected),
            page: 'invoices' as const,
            caption: 'Across paid invoices',
          },
          {
            label: 'Outstanding',
            value: formatMoney(metrics.outstanding),
            page: 'invoices' as const,
            caption: `${metrics.overdue} overdue invoices`,
          },
        ].map((metric) => (
          <div className="business-metric" key={metric.label}>
            <MetricCard label={metric.label} value={metric.value} />
            <button
              className="business-metric-link"
              onClick={() => onNavigate({ page: metric.page })}
            >
              <span>{metric.caption}</span>
              <ArrowRight size={componentToken('application.icon-sm')} />
            </button>
          </div>
        ))}
      </div>
      <div className="business-section-heading">
        <h2>Business performance</h2>
        <Select
          aria-label="Revenue period"
          value={months}
          onValueChange={setMonths}
          options={[
            { value: '3', label: 'Last 3 months' },
            { value: '6', label: 'Last 6 months' },
          ]}
        />
      </div>
      <div className="business-chart-grid">
        <ChartMetricCard
          label="Collected revenue"
          color="ai"
          metric={revenue.reduce((sum, point) => sum + point.value, 0)}
          data={revenue}
          period={`last ${months} months · invoice issue date`}
          valueFormatter={formatMoney}
          variant="bar"
          height={sizes['business-chart-height']}
        />
        <ChartMetricCard
          label="Project portfolio"
          metric={data.projects.length}
          data={statuses}
          period="projects across all statuses"
          height={sizes['business-chart-height']}
        />
      </div>
      <Card className="business-project-timeline">
        <GanttChart
          title="Project timeline"
          description="A planning window for your projects. Select a project to see its details."
          today="2026-10-24"
          tasks={data.projects.slice(0, 8).map((project) => ({
            id: project.id,
            label: project.name,
            start: new Date(Date.parse(project.dueDate) - 28 * 86_400_000)
              .toISOString()
              .slice(0, 10),
            end: project.dueDate.slice(0, 10),
            progress: project.progress,
            owner: data.team.find((member) => member.id === project.ownerId)?.name,
            intent:
              project.status === 'Completed'
                ? 'success'
                : project.status === 'On hold'
                  ? 'warning'
                  : 'function',
          }))}
          onTaskSelect={(task) => onNavigate({ page: 'projects', recordId: task.id })}
        />
      </Card>
      <div className="business-lower-grid">
        <section>
          <div className="business-section-heading">
            <h2>Delivery priorities</h2>
            <Button
              emphasis="ghost"
              size="sm"
              trailingIcon={<ArrowRight size={componentToken('application.icon-sm')} />}
              onClick={() => onNavigate({ page: 'projects' })}
            >
              View projects
            </Button>
          </div>
          <Card className="business-priorities">
            {priorities.map((project) => (
              <button
                key={project.id}
                onClick={() => onNavigate({ page: 'projects', recordId: project.id })}
              >
                <span className="business-priority-copy">
                  <strong>{project.name}</strong>
                  <span>
                    {data.customers.find((customer) => customer.id === project.customerId)?.name}
                  </span>
                </span>
                <Tag intent={project.status === 'On hold' ? 'warning' : 'default'}>
                  {project.status}
                </Tag>
                <ProgressBar
                  value={project.progress}
                  label={`${project.name} progress`}
                  size="sm"
                />
                <span className="mono">{project.progress}%</span>
              </button>
            ))}
          </Card>
        </section>
        {showActivity && (
          <section>
            <div className="business-section-heading">
              <h2>Recent activity</h2>
              <Button
                emphasis="ghost"
                size="sm"
                trailingIcon={<ArrowRight size={componentToken('application.icon-sm')} />}
                onClick={() => onNavigate({ page: 'activity' })}
              >
                View all
              </Button>
            </div>
            <Card className="business-activity-card">
              <BusinessActivityView data={data} onNavigate={onNavigate} limit={4} />
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
export interface BusinessAppProps {
  initialPage?: BusinessPage;
  initialRecordId?: string;
  defaultAiOpen?: boolean;
  theme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  layoutTheme?: LayoutTheme;
  onLayoutThemeChange?: (theme: LayoutTheme) => void;
}
export function BusinessApp({
  initialPage = 'overview',
  initialRecordId,
  defaultAiOpen = false,
  theme = 'light',
  onThemeChange,
  layoutTheme = 'fundamental',
  onLayoutThemeChange,
}: BusinessAppProps) {
  const [data, setData] = useState(createBusinessData);
  const [route, setRoute] = useState<BusinessRoute>({
    page: initialPage,
    ...(initialRecordId ? { recordId: initialRecordId } : {}),
  });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const sizes = useComponentTokenNumbers([
    'application.breakpoint-compact',
    'application.breakpoint-docked',
  ]);
  const compact = useMedia(`(max-width: ${sizes['application.breakpoint-compact']}px)`);
  const docked = useMedia(`(min-width: ${sizes['application.breakpoint-docked']}px)`);
  const [aiOpen, setAiOpen] = useState(defaultAiOpen);
  const [request, setRequest] = useState<AiRequest>();
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationDestination = useRef<BusinessRoute | null>(null);
  const [notificationRead, setNotificationRead] = useState<Record<string, boolean>>({});
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [workspaceName, setWorkspaceName] = useState('Northstar');
  const [workspaceDraft, setWorkspaceDraft] = useState('Northstar');
  const [showActivity, setShowActivity] = useState(true);
  const mainRef = useRef<HTMLElement>(null);
  const mainId = useId();
  const sequence = useRef(0);
  const [visited, setVisited] = useState<BusinessPage[]>([initialPage]);
  const self = data.team.find((member) => member.id === currentMemberId)!;
  const context = businessContext(data, route);
  const notifications = data.activity
    .filter((entry) => !dismissedNotifications.includes(entry.id))
    .map((entry) => ({
      id: entry.id,
      title: entry.text,
      description: `${data.team.find((member) => member.id === entry.actorId)?.name ?? 'Workspace'} · ${entry.page ? pageLabels[entry.page] : 'Workspace update'}`,
      timestamp: entry.date,
      read: notificationRead[entry.id] ?? false,
    }));
  useLayoutEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    const heading = mainRef.current?.querySelector<HTMLElement>(
      ':scope > :not([hidden]) h1, :scope > header h1',
    );
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
  }, [route.page, route.recordId]);
  const navigate = (next: BusinessRoute) => {
    setRoute(next);
    setVisited((previous) => (previous.includes(next.page) ? previous : [...previous, next.page]));
    setMobileExpanded(false);
  };
  const change: BusinessViewProps['onChange'] = (patch, message) => {
    setData((current) => ({
      ...current,
      ...patch,
      activity: patch.activity ?? [
        {
          id: `act-${Date.now()}-${++sequence.current}`,
          actorId: currentMemberId,
          text: message,
          date: new Date().toISOString(),
          ...(route.recordId && ['projects', 'customers', 'team'].includes(route.page)
            ? { page: route.page as 'projects' | 'customers' | 'team', recordId: route.recordId }
            : {}),
        },
        ...current.activity,
      ],
    }));
    showToast({ title: message, intent: 'success' });
  };
  const askAi: BusinessViewProps['onAskAi'] = (prompt, target = route, attached) => {
    setRequest({
      id: `business-${++sequence.current}`,
      prompt,
      context: attached ?? businessContext(data, target),
    });
    setAiOpen(true);
  };
  const views: BusinessViewProps = { data, onNavigate: navigate, onChange: change, onAskAi: askAi };
  const sections: NavSection[] = [
    {
      label: 'Workspace',
      items: [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard /> },
        {
          id: 'projects',
          label: 'Projects',
          icon: <Folder />,
          count: data.projects.filter((project) => project.status === 'Active').length,
        },
        { id: 'customers', label: 'Customers', icon: <Database /> },
        { id: 'invoices', label: 'Invoices', icon: <FileChartColumn /> },
      ],
    },
    {
      label: 'Organization',
      items: [
        { id: 'team', label: 'Team', icon: <UserRound /> },
        { id: 'activity', label: 'Activity', icon: <Activity /> },
        { id: 'aegis-ai', label: 'Aegis AI', icon: <Sparkles /> },
      ],
    },
  ];
  const actions: CommandAction[] = [
    ...Object.entries(pageLabels).map(([id, label]) => ({
      id,
      label: `Go to ${label.toLowerCase()}`,
      group: 'Navigation',
      onSelect: () => navigate({ page: id as BusinessPage }),
    })),
    ...data.projects.map((project) => ({
      id: project.id,
      label: project.name,
      keywords: [project.id],
      group: 'Projects',
      icon: <Folder />,
      onSelect: () => navigate({ page: 'projects', recordId: project.id }),
    })),
    ...data.customers.map((customer) => ({
      id: customer.id,
      label: customer.name,
      group: 'Customers',
      onSelect: () => navigate({ page: 'customers', recordId: customer.id }),
    })),
    ...data.team.map((member) => ({
      id: member.id,
      label: member.name,
      group: 'People',
      onSelect: () => navigate({ page: 'team', recordId: member.id }),
    })),
  ];
  return (
    <div
      className="aegis-console business-app"
      data-layout-theme={layoutTheme}
      data-page={route.page}
    >
      <a className="business-skip" href={`#${mainId}`}>
        Skip to workspace
      </a>
      <SideNav
        brandName="Northstar"
        brandIcon={<Layers />}
        showWorkspace={false}
        workspace={workspaceName}
        sections={sections}
        activeId={route.page}
        onNavigate={(id) =>
          id === 'aegis-ai' ? setAiOpen(true) : navigate({ page: id as BusinessPage })
        }
        collapsed={compact ? !mobileExpanded : collapsed}
        onCollapsedChange={(next) => (compact ? setMobileExpanded(!next) : setCollapsed(next))}
        onSearch={() => setCommandOpen(true)}
        footer={(small) => (
          <div className="business-nav-footer">
            <button
              className={`nav-item ${route.page === 'settings' ? 'is-active' : ''}`}
              aria-label="Workspace settings"
              onClick={() => navigate({ page: 'settings' })}
            >
              <Settings size={componentToken('application.icon-navigation')} />
              <span className="nav-item-copy" aria-hidden={small}>
                <span className="nav-item-label">Settings</span>
              </span>
            </button>
            <button
              className="business-profile-trigger"
              aria-label="Your profile"
              onClick={() => navigate({ page: 'team', recordId: self.id })}
            >
              <Avatar name={self.name} initials={self.initials} size="sm" status="online" />
              {!small && (
                <span>
                  <strong>{self.name}</strong>
                  <small>{self.role}</small>
                </span>
              )}
            </button>
          </div>
        )}
      />
      <div className="aegis-console-workspace business-workspace">
        <main className="business-main" id={mainId} ref={mainRef} tabIndex={-1}>
          <div className="business-topbar">
            {route.page !== 'overview' ? (
              <Breadcrumb
                items={[
                  { label: workspaceName, onClick: () => navigate({ page: 'overview' }) },
                  { label: pageLabels[route.page], onClick: () => navigate({ page: route.page }) },
                  ...(route.recordId
                    ? [
                        {
                          label:
                            (route.page === 'projects'
                              ? data.projects
                              : route.page === 'customers'
                                ? data.customers
                                : data.team
                            ).find((item) => item.id === route.recordId)?.name ?? 'Record',
                        },
                      ]
                    : []),
                ]}
              />
            ) : (
              <span className="business-workspace-label">{workspaceName} workspace</span>
            )}
            <div>
              <NotificationCenter
                items={notifications}
                open={notificationsOpen}
                onOpenChange={setNotificationsOpen}
                onOpenChangeComplete={(open) => {
                  if (open || !notificationDestination.current) return;
                  const destination = notificationDestination.current;
                  notificationDestination.current = null;
                  // Let the closing panel finish restoring focus before the new page owns it.
                  requestAnimationFrame(() => navigate(destination));
                }}
                now={Math.max(
                  new Date(businessReferenceDate).getTime(),
                  ...data.activity.map((entry) => new Date(entry.date).getTime()),
                )}
                onReadChange={(ids, read) =>
                  setNotificationRead((current) => ({
                    ...current,
                    ...Object.fromEntries(ids.map((id) => [id, read])),
                  }))
                }
                onDismiss={(id) => setDismissedNotifications((current) => [...current, id])}
                onOpenItem={(item) => {
                  const entry = data.activity.find((activity) => activity.id === item.id);
                  notificationDestination.current =
                    entry?.page && entry.recordId
                      ? { page: entry.page, recordId: entry.recordId }
                      : { page: 'activity' };
                  setNotificationsOpen(false);
                }}
              />
              <Button
                size="sm"
                emphasis="ghost"
                aria-label="Search workspace"
                onClick={() => setCommandOpen(true)}
              >
                <Search size={componentToken('application.icon-md')} />
              </Button>
              <Button
                size="sm"
                intent="ai"
                emphasis="ghost"
                leadingIcon={<Sparkles size={componentToken('application.icon-inline')} />}
                onClick={() => setAiOpen(true)}
              >
                Aegis AI
              </Button>
            </div>
          </div>
          {route.page === 'overview' && (
            <div className="business-overview-header">
              <PageHeader
                title="Overview"
                description={descriptions.overview}
                actions={
                  <span className="business-date">
                    <Clock size={componentToken('application.icon-sm')} />
                    24 October 2026
                  </span>
                }
              />
            </div>
          )}
          {!route.recordId &&
            !['overview', 'projects', 'customers', 'invoices', 'team'].includes(route.page) && (
              <header className="business-page-heading">
                <div>
                  <h1 tabIndex={-1}>{pageLabels[route.page]}</h1>
                  <p>{descriptions[route.page]}</p>
                </div>
              </header>
            )}
          {route.page === 'overview' && <BusinessOverview {...views} showActivity={showActivity} />}
          {(['projects', 'customers', 'invoices', 'team'] as const).map(
            (kind) =>
              visited.includes(kind) && (
                <div key={kind} hidden={route.page !== kind || !!route.recordId}>
                  <BusinessLists kind={kind} {...views} />
                </div>
              ),
          )}
          {route.recordId &&
            (route.page === 'projects' || route.page === 'customers' || route.page === 'team') && (
              <BusinessDetails
                key={`${route.page}-${route.recordId}`}
                kind={route.page}
                id={route.recordId}
                {...views}
              />
            )}
          {route.page === 'activity' && (
            <Card className="business-activity-page">
              <BusinessActivityView data={data} onNavigate={navigate} />
            </Card>
          )}
          {route.page === 'settings' && (
            <div className="business-settings">
              <section>
                <h2>Workspace</h2>
                <p className="muted">Shared details for your team.</p>
                <form
                  className="business-settings-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!workspaceDraft.trim()) return;
                    setWorkspaceName(workspaceDraft.trim());
                    showToast({ title: 'Workspace settings saved', intent: 'success' });
                  }}
                >
                  <TextInput
                    label="Workspace name"
                    value={workspaceDraft}
                    onValueChange={setWorkspaceDraft}
                    required
                    maxLength={50}
                  />
                  <TextInput label="Workspace URL" value="northstar.example" readOnly />
                  <Button
                    type="submit"
                    emphasis="primary"
                    intent="function"
                    disabled={!workspaceDraft.trim() || workspaceDraft.trim() === workspaceName}
                  >
                    Save changes
                  </Button>
                </form>
              </section>
              <section>
                <h2>Appearance</h2>
                <p className="muted">Color and layout are independent.</p>
                <div className="business-settings-choices" role="group" aria-label="Color mode">
                  {(['light', 'dark'] as const).map((mode) => (
                    <Button
                      key={mode}
                      aria-pressed={theme === mode}
                      onClick={() => onThemeChange?.(mode)}
                      emphasis={theme === mode ? 'secondary' : 'tertiary'}
                    >
                      {mode === 'light' ? 'Light' : 'Dark'}
                    </Button>
                  ))}
                </div>
                <div className="business-settings-choices" role="group" aria-label="Theme">
                  {layoutThemeOptions.map((option) => (
                    <Button
                      key={option.value}
                      aria-pressed={layoutTheme === option.value}
                      onClick={() => onLayoutThemeChange?.(option.value)}
                      emphasis={layoutTheme === option.value ? 'secondary' : 'tertiary'}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </section>
              <section>
                <h2>Dashboard</h2>
                <Switch
                  label="Show recent activity"
                  description="Include the latest workspace changes on your overview."
                  checked={showActivity}
                  onCheckedChange={setShowActivity}
                />
              </section>
              <section>
                <h2>Your account</h2>
                <div className="business-account-row">
                  <Avatar name={self.name} initials={self.initials} />
                  <span className="business-account-copy">
                    <strong>{self.name}</strong>
                    <small>{self.email}</small>
                  </span>
                  <Button
                    emphasis="tertiary"
                    onClick={() => navigate({ page: 'team', recordId: self.id })}
                  >
                    Edit profile
                  </Button>
                </div>
              </section>
              <p className="business-sample-note">
                Sample workspace. Changes stay in this session and reset when you refresh.
              </p>
            </div>
          )}
        </main>
      </div>
      <AiPanel
        open={aiOpen}
        onOpenChange={setAiOpen}
        title="Aegis AI"
        modelLabel="Aegis AI · Sample workspace"
        scopeLabel={pageLabels[route.page]}
        docked={docked}
        context={context}
        request={request}
        streamResponse={streamBusinessResponse}
        onEvidenceClick={(item) => {
          const page = data.projects.some((project) => project.id === item.id)
            ? 'projects'
            : data.customers.some((customer) => customer.id === item.id)
              ? 'customers'
              : data.team.some((member) => member.id === item.id)
                ? 'team'
                : undefined;
          if (page) {
            navigate({ page, recordId: item.id });
            if (!docked) setAiOpen(false);
          }
        }}
        className="business-assistant"
      />
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        actions={actions}
        shortcut={!(aiOpen && !docked)}
      />
      <Toaster />
    </div>
  );
}
