import { useEffect, useRef, type ReactNode } from 'react';
import { Avatar, AvatarGroup } from '@/components/avatar';
import { Checkbox } from '@/components/checkbox';
import { ConfidenceBadge } from '@/components/confidence-badge';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleCheck,
  FileCode,
  Globe,
  Layers,
  Search,
  Server,
  Settings,
  Shield,
  Sparkles,
} from '@/components/icon';
import { ProgressBar } from '@/components/progress-bar';
import { SeverityBadge } from '@/components/severity-badge';
import { Sparkline } from '@/components/sparkline';
import { StatusBadge } from '@/components/status-badge';
import { Switch } from '@/components/switch';
import { Tag } from '@/components/tag';
import './hero-showcase.css';

const activity = [8, 13, 10, 18, 14, 24, 21, 28, 23, 36, 31, 40];
const people = ['Alex Morgan', 'Maya Chen', 'Sam Patel', 'Jordan Lee'];

/** A scroll-controlled page wall. All miniature data is illustrative and non-interactive. */
export function HeroShowcase() {
  const track = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 760px), (max-height: 640px)');
    let visible = false;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!visible || reducedMotion.matches || compact.matches) return;
      const rect = element.getBoundingClientRect();
      const distance = Math.max(1, rect.height - (window.innerHeight - 64));
      const progress = Math.max(0, Math.min(1, (64 - rect.top) / distance));
      const expansion = progress * progress;
      element.style.setProperty('--showcase-left', `${49 * (1 - expansion)}%`);
      element.style.setProperty('--showcase-angle', `${-14 * (1 - progress)}deg`);
      element.style.setProperty('--showcase-drift', `${-95 + progress * 160}px`);
      element.style.setProperty(
        '--showcase-copy-opacity',
        String(Math.max(0, 1 - expansion * 1.65)),
      );
      element.style.setProperty('--showcase-copy-shift', `${-progress * 30}px`);
      element.style.setProperty('--showcase-progress', String(progress));
    };
    const schedule = () => {
      if (visible && !frame && !reducedMotion.matches && !compact.matches)
        frame = requestAnimationFrame(update);
    };
    const reset = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      for (const property of [
        '--showcase-left',
        '--showcase-angle',
        '--showcase-drift',
        '--showcase-copy-opacity',
        '--showcase-copy-shift',
        '--showcase-progress',
      ])
        element.style.removeProperty(property);
      schedule();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      schedule();
    });
    observer.observe(element);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    reducedMotion.addEventListener('change', reset);
    compact.addEventListener('change', reset);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      reducedMotion.removeEventListener('change', reset);
      compact.removeEventListener('change', reset);
    };
  }, []);

  return (
    <section className="hero-showcase" ref={track} aria-labelledby="hero-showcase-title">
      <div className="hero-showcase-sticky">
        <div className="hero-showcase-copy">
          <div className="hero-showcase-copy-inner">
            <a className="hero-showcase-version" href="#collection">
              <span>Aegis 0.1</span> React + TypeScript <ArrowRight size={13} aria-hidden="true" />
            </a>
            <h1 id="hero-showcase-title">The design system for your next application.</h1>
            <p>
              Build applications, dashboards, and developer tools with a coherent set of React
              components, shared tokens, and patterns for real work.
            </p>
            <div className="hero-showcase-actions">
              <a className="hero-showcase-primary" href="?view=components">
                Explore components <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a className="hero-showcase-secondary" href="?view=console">
                <Layers size={17} aria-hidden="true" /> Business application
              </a>
            </div>
            <ul className="hero-showcase-facts" aria-label="About the library">
              <li>
                <Check size={13} aria-hidden="true" />
                85 components
              </li>
              <li>
                <Check size={13} aria-hidden="true" />
                12 categories
              </li>
              <li>
                <Check size={13} aria-hidden="true" />
                MIT source
              </li>
            </ul>
          </div>
          <a className="hero-showcase-scroll" href="#collection">
            <span>
              <ArrowDown size={17} aria-hidden="true" />
            </span>
            Scroll to explore
          </a>
        </div>
        <div className="hero-showcase-gallery" aria-hidden="true" inert>
          <div className="hero-showcase-wall dark" data-theme="dark">
            <div className="hero-showcase-wall-column">
              <RecordsBoard />
              <PeopleBoard />
              <SettingsBoard />
              <TimelineBoard />
            </div>
            <div className="hero-showcase-wall-column">
              <UsageBoard />
              <DashboardBoard />
              <TerminalBoard />
              <IdentityBoard />
            </div>
            <div className="hero-showcase-wall-column">
              <PipelineBoard />
              <QueryBoard />
              <DiffBoard />
              <AssistantBoard />
            </div>
          </div>
          <span className="hero-showcase-gallery-caption">
            Original product compositions · Illustrative data
          </span>
        </div>
      </div>
    </section>
  );
}

function Board({
  title,
  section,
  action,
  children,
  className = '',
}: {
  title: string;
  section: string;
  action?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`hero-showcase-board ${className}`}>
      <div className="hero-showcase-board-chrome">
        <span className="hero-showcase-board-mark">
          <Layers size={10} />
        </span>
        <span>
          Workspace <span>/</span> {section}
        </span>
        <Search size={10} />
        <Avatar name="Alex Morgan" size="sm" />
      </div>
      <div className="hero-showcase-board-body">
        <div className="hero-showcase-board-heading">
          <h2>{title}</h2>
          {action && <span className="hero-showcase-mini-action">{action}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}
function BoardTabs({ items }: { items: string[] }) {
  return (
    <div className="hero-showcase-board-tabs">
      {items.map((item, index) => (
        <span data-active={index === 0} key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}
function Stat({ label, value, change }: { label: string; value: string; change?: string }) {
  return (
    <div className="hero-showcase-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {change && (
        <small>
          <ArrowUpRight size={9} />
          {change}
        </small>
      )}
    </div>
  );
}

function RecordsBoard() {
  return (
    <Board
      title="Work queue"
      section="Business workspace"
      action="Create task"
      className="hero-showcase-board-records"
    >
      <BoardTabs items={['All tasks', 'Assigned to me', 'Completed']} />
      <div className="hero-showcase-mini-filter">
        <Search size={10} />
        Search tasks…
        <span>
          <Tag size="sm">Last 24h</Tag>
          <Settings size={10} />
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th />
            <th>Task</th>
            <th>Severity</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Renewal approval', 'Atlas Commerce', 'critical', 'new'],
            ['Customer onboarding', 'Northstar Labs', 'high', 'in-review'],
            ['Invoice review', 'INV-2026-014', 'medium', 'in-progress'],
            ['Project handoff', 'Customer portal', 'low', 'completed'],
          ].map(([title, entity, severity, status], index) => (
            <tr key={title}>
              <td>
                <Checkbox size="sm" checked={index === 1} aria-label={title} />
              </td>
              <td>
                <strong>{title}</strong>
                <small>{entity}</small>
              </td>
              <td>
                <SeverityBadge severity={severity as 'critical' | 'high' | 'medium' | 'low'} />
              </td>
              <td>
                <StatusBadge status={status as 'new' | 'in-review' | 'in-progress' | 'completed'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="hero-showcase-board-footer">
        <span>4 of 24 tasks</span>
        <span>
          Previous <b>1</b> 2 3 Next
        </span>
      </div>
    </Board>
  );
}
function UsageBoard() {
  return (
    <Board title="Usage overview" section="Infrastructure" action="Export">
      <BoardTabs items={['Overview', 'Compute', 'Storage']} />
      <div className="hero-showcase-stats">
        <Stat label="Events ingested" value="24.8M" change="12.8%" />
        <Stat label="Active sources" value="128" change="8 new" />
        <Stat label="Retention" value="30d" />
      </div>
      <div className="hero-showcase-bar-chart">
        {[34, 47, 42, 61, 55, 72, 64, 83, 73, 97, 82, 91, 78, 100].map((height, index) => (
          <span key={index} style={{ height: `${height}%` }}>
            <i style={{ height: `${50 + (index % 4) * 8}%` }} />
          </span>
        ))}
      </div>
      <div className="hero-showcase-axis">
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
        <span>Sun</span>
      </div>
      <div className="hero-showcase-quota">
        <span>
          Monthly allocation <strong>68%</strong>
        </span>
        <ProgressBar
          value={68}
          label="Illustrative monthly allocation"
          size="sm"
          intent="success"
        />
      </div>
    </Board>
  );
}
function PipelineBoard() {
  return (
    <Board title="Production pipeline" section="Deployments" action="Run pipeline">
      <div className="hero-showcase-pipeline-meta">
        <Tag intent="success" size="sm">
          Passed
        </Tag>
        <code>main / 8f2a9c1</code>
        <span>2m 34s</span>
      </div>
      <div className="hero-showcase-pipeline">
        <div>
          <CircleCheck />
          <strong>Build</strong>
          <small>48s · 4 jobs</small>
        </div>
        <span />
        <div>
          <CircleCheck />
          <strong>Verify</strong>
          <small>1m 12s · 8 jobs</small>
        </div>
        <span />
        <div>
          <CircleCheck />
          <strong>Deploy</strong>
          <small>34s · 2 regions</small>
        </div>
      </div>
      <div className="hero-showcase-job-list">
        {[
          'TypeScript validation',
          'Component interaction tests',
          'Production bundle',
          'Deploy to edge',
        ].map((job, index) => (
          <div key={job}>
            <Check size={10} />
            <span>{job}</span>
            <small>{[12, 42, 26, 34][index]}s</small>
          </div>
        ))}
      </div>
      <div className="hero-showcase-board-footer">
        <span>Triggered by Alex Morgan</span>
        <AvatarGroup size="sm" avatars={people.slice(0, 3).map((name) => ({ name }))} max={3} />
      </div>
    </Board>
  );
}
function PeopleBoard() {
  return (
    <Board title="People & access" section="Workspace" action="Invite member">
      <BoardTabs items={['Members', 'Groups', 'Service accounts']} />
      <div className="hero-showcase-mini-filter">
        <Search size={10} />
        Find a member
        <span>
          All roles <ChevronDown size={9} />
        </span>
      </div>
      <div className="hero-showcase-people-list">
        {people.map((name, index) => (
          <div key={name}>
            <Avatar name={name} size="sm" status={index < 2 ? 'online' : undefined} />
            <span>
              <strong>{name}</strong>
              <small>{name.toLowerCase().replace(' ', '.')}@example.com</small>
            </span>
            <Tag size="sm">{['Admin', 'Manager', 'Member', 'Viewer'][index]}</Tag>
            <span className="hero-showcase-dots">···</span>
          </div>
        ))}
      </div>
      <div className="hero-showcase-board-footer">
        <span>Workspace permissions</span>
        <span className="hero-showcase-positive">
          <Shield size={9} /> SSO enabled
        </span>
      </div>
    </Board>
  );
}
function DashboardBoard() {
  return (
    <Board title="System health" section="Overview">
      <div className="hero-showcase-stats">
        <Stat label="Availability" value="99.98%" />
        <Stat label="Throughput" value="842/s" change="6.4%" />
        <Stat label="Latency p95" value="124ms" />
      </div>
      <div className="hero-showcase-line-chart">
        <div className="hero-showcase-chart-label">
          <span>
            <i />
            Event throughput
          </span>
          <small>Last 12 hours</small>
        </div>
        <Sparkline data={activity} width={310} height={78} intent="function" variant="area" />
        <div className="hero-showcase-axis">
          <span>00:00</span>
          <span>04:00</span>
          <span>08:00</span>
          <span>12:00</span>
        </div>
      </div>
      <div className="hero-showcase-health-grid">
        <div>
          <span className="hero-showcase-donut" />
          <span>
            <strong>Healthy</strong>
            <small>28 / 30 services</small>
          </span>
        </div>
        <div>
          <ProgressBar value={42} label="Illustrative CPU usage" size="sm" intent="success" />
          <span>
            CPU <b>42%</b>
          </span>
        </div>
      </div>
    </Board>
  );
}
function QueryBoard() {
  return (
    <Board title="Explore events" section="Query workspace" action="Run query">
      <div className="hero-showcase-code-tabs">
        <FileCode size={10} />
        <span>role_changes.sql</span>
        <small>SQL</small>
      </div>
      <div className="hero-showcase-sql">
        <code>
          <i>1</i>
          <b>SELECT</b> actor, action, event_time
        </code>
        <code>
          <i>2</i>
          <b>FROM</b> identity.events
        </code>
        <code>
          <i>3</i>
          <b>WHERE</b> action = <em>'role_updated'</em>
        </code>
        <code>
          <i>4</i> <b>AND</b> environment = <em>'production'</em>
        </code>
        <code>
          <i>5</i>
          <b>ORDER BY</b> event_time <b>DESC</b>
        </code>
        <code>
          <i>6</i>
          <b>LIMIT</b> <span>100</span>;
        </code>
      </div>
      <div className="hero-showcase-query-result">
        <span>
          <Check size={9} /> Query complete
        </span>
        <small>42 rows · 128ms</small>
      </div>
      <table className="hero-showcase-query-table">
        <thead>
          <tr>
            <th>actor</th>
            <th>action</th>
            <th>event_time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>svc-deploy</td>
            <td>role_updated</td>
            <td>12:42:08</td>
          </tr>
          <tr>
            <td>admin-eu</td>
            <td>role_updated</td>
            <td>12:40:31</td>
          </tr>
        </tbody>
      </table>
    </Board>
  );
}
function SettingsBoard() {
  return (
    <Board title="Project settings" section="Configuration" action="Save changes">
      <BoardTabs items={['General', 'Notifications', 'Security']} />
      <div className="hero-showcase-settings-form">
        <label>
          Project name
          <input value="Production workspace" readOnly />
        </label>
        <label>
          Environment
          <span className="hero-showcase-faux-select">
            <span className="hero-showcase-positive">
              <span className="hero-showcase-dot" /> Production
            </span>
            <ChevronDown size={10} />
          </span>
        </label>
        <label>
          Region
          <span className="hero-showcase-faux-select">
            Europe · eu-west-1
            <Globe size={10} />
          </span>
        </label>
      </div>
      <div className="hero-showcase-setting-toggle">
        <span>
          <strong>Audit logging</strong>
          <small>Keep a record of workspace activity.</small>
        </span>
        <Switch size="sm" checked aria-label="Audit logging" />
      </div>
      <div className="hero-showcase-setting-toggle">
        <span>
          <strong>Real-time notifications</strong>
          <small>Notify your team when signals need attention.</small>
        </span>
        <Switch size="sm" checked aria-label="Real-time notifications" />
      </div>
    </Board>
  );
}
function TerminalBoard() {
  return (
    <Board title="Live logs" section="Observability" className="hero-showcase-board-terminal">
      <div className="hero-showcase-log-toolbar">
        <Tag size="sm" intent="success">
          Streaming
        </Tag>
        <span>api-production</span>
        <span>
          All levels <ChevronDown size={8} />
        </span>
      </div>
      <div className="hero-showcase-log-lines">
        {[
          ['12:42:00.042', 'INFO', 'Service health check passed'],
          ['12:42:00.128', 'INFO', 'Connected to event stream'],
          ['12:42:01.031', 'DEBUG', 'Batch received · 128 records'],
          ['12:42:01.082', 'INFO', 'Processing identity events'],
          ['12:42:01.204', 'WARN', 'Request exceeded p95 threshold'],
          ['12:42:01.248', 'INFO', 'Retry completed successfully'],
          ['12:42:02.016', 'INFO', 'Checkpoint committed'],
          ['12:42:02.144', 'DEBUG', 'Queue depth: 0 · workers: 8'],
        ].map(([time, level, message]) => (
          <div key={time}>
            <small>{time}</small>
            <b data-level={level}>{level}</b>
            <span>{message}</span>
          </div>
        ))}
      </div>
      <div className="hero-showcase-terminal-prompt">
        <span>❯</span> Filter by service, trace, or message
        <span className="hero-showcase-caret" />
      </div>
    </Board>
  );
}
function DiffBoard() {
  return (
    <Board title="Review changes" section="Project automation" action="Approve">
      <div className="hero-showcase-diff-meta">
        <FileCode size={11} />
        <span>project-reminders.yaml</span>
        <small>
          <b>+4</b> −2
        </small>
      </div>
      <div className="hero-showcase-diff-lines">
        {[
          [' ', 'title: Delivery reminder', 'context'],
          [' ', 'source:', 'context'],
          [' ', '  category: projects', 'context'],
          ['−', '  level: medium', 'removed'],
          ['+', '  level: high', 'added'],
          [' ', 'workflow:', 'context'],
          ['+', '  selection:', 'added'],
          ['+', '    action: milestone_due', 'added'],
          ['+', '    reminders: true', 'added'],
          ['−', '  condition: all', 'removed'],
          [' ', '  condition: selection', 'context'],
        ].map(([sign, line, kind], index) => (
          <code data-kind={kind} key={index}>
            <i>{index + 1}</i>
            <span>{sign}</span>
            {line}
          </code>
        ))}
      </div>
      <div className="hero-showcase-board-footer">
        <span>
          <Check size={10} /> Syntax valid
        </span>
        <span>1 file changed</span>
      </div>
    </Board>
  );
}
function TimelineBoard() {
  return (
    <Board title="Project activity" section="Business workspace · PRJ-1042">
      <div className="hero-showcase-timeline-summary">
        <SeverityBadge severity="high" />
        <StatusBadge status="in-progress" />
        <AvatarGroup avatars={people.slice(0, 2).map((name) => ({ name }))} size="sm" />
      </div>
      <div className="hero-showcase-timeline">
        {[
          ['12:42', 'Project updated', 'New milestone for the customer portal', Shield],
          ['12:44', 'References attached', '3 customer notes linked', FileCode],
          ['12:48', 'Assigned to Maya Chen', 'Review started', Avatar],
          ['12:52', 'Context reviewed', 'Waiting for owner approval', CircleCheck],
        ].map(([time, title, detail], index) => (
          <div key={String(time)}>
            <span className="hero-showcase-timeline-dot" data-step={index}>
              <Check size={9} />
            </span>
            <div>
              <strong>{String(title)}</strong>
              <small>{String(detail)}</small>
            </div>
            <time>{String(time)}</time>
          </div>
        ))}
      </div>
      <div className="hero-showcase-note-input">
        Add a project note…<span>↵</span>
      </div>
    </Board>
  );
}
function IdentityBoard() {
  return (
    <Board title="Service identity" section="Entities" action="View events">
      <div className="hero-showcase-identity-heading">
        <span>
          <Server size={25} />
        </span>
        <div>
          <h3>svc-deploy-production</h3>
          <small>Service account · eu-west-1</small>
          <Tag size="sm" intent="success">
            Active
          </Tag>
        </div>
      </div>
      <div className="hero-showcase-identity-fields">
        <div>
          <span>Owner</span>
          <strong>Platform engineering</strong>
        </div>
        <div>
          <span>Last active</span>
          <strong>2 minutes ago</strong>
        </div>
        <div>
          <span>Permissions</span>
          <strong>3 roles</strong>
        </div>
      </div>
      <div className="hero-showcase-permission-tags">
        <Tag size="sm">Deployments</Tag>
        <Tag size="sm">Read events</Tag>
        <Tag size="sm">Manage secrets</Tag>
      </div>
      <div className="hero-showcase-identity-spark">
        <span>Activity over 24 hours</span>
        <Sparkline
          data={activity.map((value, index) => (index % 3 ? value / 2 : value))}
          width={320}
          height={50}
          variant="bar"
          intent="success"
        />
      </div>
    </Board>
  );
}
function AssistantBoard() {
  return (
    <Board title="Aegis AI" section="Workspace assistant">
      <div className="hero-showcase-assistant-prompt">
        <Avatar name="Alex Morgan" size="sm" />
        <span>What needs attention in this project?</span>
      </div>
      <div className="hero-showcase-assistant-response">
        <span>
          <Sparkles size={12} /> Suggested context <ConfidenceBadge confidence="high" />
        </span>
        <p>
          Three upcoming milestones depend on the same customer review. Confirm ownership and timing
          before changing the delivery plan.
        </p>
        <div className="hero-showcase-evidence-list">
          <div>
            <FileCode size={12} />
            <span>
              Milestone updated<small>project.activity</small>
            </span>
            <ArrowUpRight size={10} />
          </div>
          <div>
            <Activity size={12} />
            <span>
              Review requested<small>customer.notes</small>
            </span>
            <ArrowUpRight size={10} />
          </div>
        </div>
        <span className="hero-showcase-assistant-hint">
          Review the context before taking action.
        </span>
      </div>
      <div className="hero-showcase-note-input">
        Ask a follow-up…<span>↑</span>
      </div>
    </Board>
  );
}
