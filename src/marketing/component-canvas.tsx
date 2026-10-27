import { useLayoutEffect, useRef } from 'react';
import { Avatar, AvatarGroup } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { ConfidenceBadge } from '@/components/confidence-badge';
import {
  Activity,
  ArrowUpRight,
  Bell,
  ChevronDown,
  ChevronRight,
  FileCode,
  Layers,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
} from '@/components/icon';
import { JsonViewer } from '@/components/json-viewer';
import { ProgressBar } from '@/components/progress-bar';
import { SeverityBadge, type Severity } from '@/components/severity-badge';
import { Sparkline } from '@/components/sparkline';
import { StatusBadge, type RecordStatus } from '@/components/status-badge';
import { Switch } from '@/components/switch';
import { Tag } from '@/components/tag';
import './component-canvas.css';

const trend = [18, 26, 22, 37, 29, 45, 39, 53, 47, 65, 54, 61, 75, 68, 84, 78];
const rows: {
  title: string;
  host: string;
  severity: Severity;
  status: RecordStatus;
  time: string;
}[] = [
  {
    title: 'Renewal approval',
    host: 'Atlas Commerce',
    severity: 'critical',
    status: 'new',
    time: '2m ago',
  },
  {
    title: 'Customer onboarding',
    host: 'Northstar Labs',
    severity: 'high',
    status: 'in-review',
    time: '4m ago',
  },
  {
    title: 'Invoice review',
    host: 'INV-2026-014',
    severity: 'medium',
    status: 'in-progress',
    time: '8m ago',
  },
  {
    title: 'Project handoff',
    host: 'Customer portal',
    severity: 'low',
    status: 'completed',
    time: '12m ago',
  },
];
const samplePayload = {
  source: 'projects',
  actor: 'alex-morgan',
  action: 'milestone_updated',
  allowed: false,
};

/** Decorative, locally themed React composition. Motion follows the visitor; it never loops. */
export function ComponentCanvas() {
  const viewport = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let frame = 0;
    let measuredWidth = -1;

    const measure = () => {
      const width = element.clientWidth;
      if (width === measuredWidth) return;
      measuredWidth = width;
      const compact = width < 760;
      const scale = compact
        ? Math.max(0.4, Math.min(0.72, width / 830))
        : Math.min(1.06, width / 1440);
      element.style.setProperty('--canvas-scale', String(scale));
      element.style.setProperty('--canvas-height', `${scale * (compact ? 1350 : 900)}px`);
      element.dataset.compact = String(compact);
    };
    const update = () => {
      frame = 0;
      if (motion.matches) {
        element.style.setProperty('--canvas-spread', '0');
        return;
      }
      if (!visible) return;
      const top = element.getBoundingClientRect().top;
      const progress = Math.max(
        0,
        Math.min(1, (window.innerHeight * 0.95 - top) / (window.innerHeight * 0.85)),
      );
      const eased = 1 - Math.pow(1 - progress, 2);
      element.style.setProperty('--canvas-spread', String(1 - eased));
    };
    const schedule = () => {
      if ((!visible && !motion.matches) || frame) return;
      frame = requestAnimationFrame(update);
    };
    const changeMotion = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      update();
    };
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        element.dataset.visible = String(visible);
        if (!visible && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
        schedule();
      },
      { rootMargin: '100px 0px' },
    );
    const resize = new ResizeObserver(() => {
      measure();
      schedule();
    });
    measure();
    changeMotion();
    intersection.observe(element);
    resize.observe(element);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    motion.addEventListener('change', changeMotion);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      intersection.disconnect();
      resize.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      motion.removeEventListener('change', changeMotion);
    };
  }, []);

  return (
    <figure className="component-canvas">
      <div ref={viewport} className="component-canvas-viewport">
        <div className="component-canvas-scaler">
          <div className="component-canvas-scene dark" data-theme="dark" aria-hidden="true" inert>
            <div className="component-canvas-plane">
              <div className="component-canvas-workspace component-canvas-panel">
                <div className="component-canvas-windowbar">
                  <span className="component-canvas-windowdots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>
                    <Layers size={13} /> Aegis / Business workspace
                  </span>
                  <span className="component-canvas-windowhint">⌘ K</span>
                </div>
                <div className="component-canvas-appbar">
                  <span className="component-canvas-appmark">
                    <Shield size={17} />
                  </span>
                  <span>
                    Workspace <ChevronRight size={12} /> Workspace overview
                  </span>
                  <div className="component-canvas-app-actions">
                    <Search size={15} />
                    <Bell size={15} />
                    <Avatar name="Alex Morgan" size="sm" />
                  </div>
                </div>
                <div className="component-canvas-workspace-body">
                  <div className="component-canvas-pageheading">
                    <div>
                      <span className="component-canvas-kicker">WORKSPACE / ATLAS COMMERCE</span>
                      <h3>Workspace overview</h3>
                    </div>
                    <Button
                      size="sm"
                      intent="function"
                      leadingIcon={<SlidersHorizontal size={13} />}
                    >
                      Configure view
                    </Button>
                  </div>
                  <div className="component-canvas-summary">
                    {[
                      ['Open tasks', '124', '+8 today'],
                      ['In progress', '18', '6 teammates'],
                      ['Customer response', '4m 32s', '−18% this week'],
                    ].map(([label, value, detail]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                        <small>{detail}</small>
                      </div>
                    ))}
                  </div>
                  <div className="component-canvas-overview">
                    <Card className="component-canvas-activity-card">
                      <div className="component-canvas-card-heading">
                        <span>
                          <Activity size={14} /> Workspace activity
                        </span>
                        <Tag size="sm">Last 24 hours</Tag>
                      </div>
                      <div className="component-canvas-chart">
                        <div className="component-canvas-chart-guides">
                          <span>800</span>
                          <span>400</span>
                          <span>0</span>
                        </div>
                        <Sparkline
                          data={trend}
                          width={480}
                          height={95}
                          variant="area"
                          intent="function"
                          label="Illustrative workspace activity"
                        />
                      </div>
                      <div className="component-canvas-chart-axis">
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>23:59</span>
                      </div>
                    </Card>
                    <Card className="component-canvas-sources">
                      <div className="component-canvas-card-heading">
                        Project progress <span>3</span>
                      </div>
                      {[
                        ['Customer portal', 82],
                        ['Onboarding', 64],
                        ['Reporting', 45],
                      ].map(([label, value]) => (
                        <div className="component-canvas-source" key={label}>
                          <span>{label}</span>
                          <ProgressBar
                            label={String(label)}
                            value={Number(value)}
                            size="sm"
                            intent={
                              label === 'Customer portal'
                                ? 'function'
                                : label === 'Onboarding'
                                  ? 'success'
                                  : 'warning'
                            }
                          />
                        </div>
                      ))}
                    </Card>
                  </div>
                  <div className="component-canvas-table-heading">
                    <span>
                      Priority tasks{' '}
                      <Tag size="sm" variant="counter" count={12}>
                        Open
                      </Tag>
                    </span>
                    <span>
                      <Search size={13} /> Search tasks… <SlidersHorizontal size={13} />
                    </span>
                  </div>
                  <table className="component-canvas-table">
                    <thead>
                      <tr>
                        <th>
                          <Checkbox
                            size="sm"
                            aria-label="Select all sample tasks"
                            checked="indeterminate"
                          />
                        </th>
                        <th>Task</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Updates</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={row.title}>
                          <td>
                            <Checkbox
                              size="sm"
                              aria-label={`Select ${row.title}`}
                              checked={index === 1}
                            />
                          </td>
                          <td>
                            <strong>{row.title}</strong>
                            <span>{row.host}</span>
                          </td>
                          <td>
                            <SeverityBadge severity={row.severity} />
                          </td>
                          <td>
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="component-canvas-event-count">
                            {[182, 64, 28, 12][index]}
                          </td>
                          <td>{row.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="component-canvas-workspace-footer">
                  <span>
                    <span className="component-canvas-online" /> Sample workspace
                  </span>
                  <span>Illustrative workspace · Native React components</span>
                </div>
              </div>

              <div className="component-canvas-library component-canvas-panel">
                <div className="component-canvas-panel-header">
                  <span>
                    <Layers size={15} /> Components
                  </span>
                  <span>React</span>
                </div>
                <div className="component-canvas-library-search">
                  <Search size={13} /> Find a component <span>⌘ K</span>
                </div>
                <div className="component-canvas-library-label">YOUR BUILDING BLOCKS</div>
                <div className="component-canvas-library-items">
                  {[
                    [Layers, 'Foundations'],
                    [Shield, 'Data display'],
                    [SlidersHorizontal, 'Inputs'],
                    [Sparkles, 'AI patterns'],
                  ].map(([Icon, label]) => {
                    const Glyph = Icon as typeof Layers;
                    return (
                      <div key={String(label)} data-active={label === 'Data display'}>
                        <Glyph size={14} />
                        <span>{String(label)}</span>
                        <ChevronRight size={11} />
                      </div>
                    );
                  })}
                </div>
                <div className="component-canvas-library-samples">
                  <span>One visual language.</span>
                  <div>
                    <Button size="sm" intent="function">
                      Create project
                    </Button>
                    <Button size="sm" emphasis="secondary">
                      Cancel
                    </Button>
                  </div>
                  <div>
                    <Tag size="sm" intent="success">
                      Production
                    </Tag>
                    <Tag size="sm" intent="function">
                      Customer
                    </Tag>
                  </div>
                  <div>
                    <Switch size="sm" checked label="Live updates" />
                    <Checkbox size="sm" checked label="Selected" />
                  </div>
                </div>
                <div className="component-canvas-panel-note">
                  <FileCode size={12} /> Built with typed React components
                </div>
              </div>

              <div className="component-canvas-inspector component-canvas-panel">
                <div className="component-canvas-panel-header">
                  <span>
                    <Settings size={15} /> Tokens
                  </span>
                  <ChevronDown size={13} />
                </div>
                <div className="component-canvas-inspector-section">
                  <span className="component-canvas-inspector-label">APPEARANCE</span>
                  <div className="component-canvas-token-mode">
                    <span>Dark</span>
                    <span>Light</span>
                  </div>
                  <div className="component-canvas-token-row">
                    <span>Surface</span>
                    <i className="component-canvas-swatch-surface" />
                    <code>surface</code>
                  </div>
                  <div className="component-canvas-token-row">
                    <span>Action</span>
                    <i className="component-canvas-swatch-blue" />
                    <code>function</code>
                  </div>
                  <div className="component-canvas-token-row">
                    <span>Positive</span>
                    <i className="component-canvas-swatch-mint" />
                    <code>success</code>
                  </div>
                </div>
                <div className="component-canvas-inspector-section">
                  <span className="component-canvas-inspector-label">COMPONENT GEOMETRY</span>
                  <div className="component-canvas-dimension-row">
                    <span>
                      Padding <b>12</b>
                    </span>
                    <span>
                      Radius <b>10</b>
                    </span>
                  </div>
                  <div className="component-canvas-token-code">
                    <code>--layout-card-padding</code>
                    <span>var(--space-3)</span>
                  </div>
                </div>
                <div className="component-canvas-inspector-section component-canvas-payload">
                  <span className="component-canvas-inspector-label">STRUCTURED CONTEXT</span>
                  <JsonViewer
                    value={samplePayload}
                    label="Illustrative event context"
                    rootName="event"
                    defaultExpandedDepth={1}
                    maxHeight={160}
                  />
                </div>
              </div>

              <Card className="component-canvas-ai component-canvas-panel">
                <div className="component-canvas-ai-heading">
                  <span>
                    <Sparkles size={17} /> AI suggestion
                  </span>
                  <ConfidenceBadge confidence="high" />
                </div>
                <h3>Connect the context.</h3>
                <p>
                  Three project milestones share the same dependency. Review the context before
                  taking action.
                </p>
                <div className="component-canvas-ai-footer">
                  <div>
                    <Tag size="sm">3 milestones</Tag>
                    <AvatarGroup
                      avatars={[{ name: 'Alex Morgan' }, { name: 'Maya Chen' }]}
                      max={2}
                    />
                  </div>
                  <Button size="sm" intent="ai" emphasis="tertiary">
                    Review <ArrowUpRight size={13} />
                  </Button>
                </div>
              </Card>
              <Card className="component-canvas-metric component-canvas-panel">
                <div className="component-canvas-metric-label">
                  <span className="component-canvas-metric-symbol">
                    <Activity size={15} />
                  </span>
                  Records updated <Tag size="sm">24h</Tag>
                </div>
                <div className="component-canvas-metric-value">
                  <strong>24,802</strong>
                  <span>
                    <ArrowUpRight size={12} /> 12.8%
                  </span>
                </div>
                <Sparkline
                  data={[3, 8, 5, 12, 9, 15, 13, 18, 15, 24, 20, 28]}
                  width={202}
                  height={35}
                  intent="success"
                  variant="area"
                />
              </Card>
            </div>
          </div>
        </div>
      </div>
      <figcaption>
        <span className="component-canvas-caption-mark">
          <Layers size={14} />
        </span>{' '}
        Shared components assembled into a connected business workspace.
        <span className="component-canvas-caption-note">Illustrative data</span>
      </figcaption>
    </figure>
  );
}
