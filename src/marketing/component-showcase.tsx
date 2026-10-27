import { useRef, useState, type ReactNode } from 'react';
import { Accordion } from '@/components/accordion';
import { AiCard } from '@/components/ai-card';
import { Avatar, AvatarGroup } from '@/components/avatar';
import { Breadcrumb } from '@/components/breadcrumb';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { CountBadge } from '@/components/count-badge';
import { ArrowRight, Check, Layers, Rows3, Shield, Sparkles } from '@/components/icon';
import { SeverityBadge, type Severity } from '@/components/severity-badge';
import { StatusBadge } from '@/components/status-badge';
import { Switch } from '@/components/switch';
import { Tabs } from '@/components/tabs';
import { Tag } from '@/components/tag';
import './component-showcase.css';

type Context = 'signals' | 'context' | 'review';
type ReviewDecision = 'pending' | 'accepted' | 'dismissed';
interface SampleSignal {
  id: string;
  title: string;
  entity: string;
  severity: Severity;
  time: string;
}
const sampleSignals: readonly SampleSignal[] = [
  {
    id: '1042',
    title: 'Customer portal launch review',
    entity: 'Atlas Commerce · Project',
    severity: 'critical',
    time: '09:42',
  },
  {
    id: '1041',
    title: 'Renewal approval requested',
    entity: 'Atlas Commerce · Customer',
    severity: 'high',
    time: '09:41',
  },
  {
    id: '1040',
    title: 'Invoice awaiting approval',
    entity: 'INV-2026-014 · Finance',
    severity: 'high',
    time: '09:38',
  },
  {
    id: '1039',
    title: 'Onboarding checklist update',
    entity: 'Northstar Labs · Customer',
    severity: 'medium',
    time: '09:35',
  },
  {
    id: '1038',
    title: 'Project handoff scheduled',
    entity: 'Reporting dashboard · Project',
    severity: 'low',
    time: '09:31',
  },
];
const stories: Record<
  Context,
  {
    number: string;
    title: string;
    description: string;
    annotations: { name: string; benefit: string }[];
    hint: string;
  }
> = {
  signals: {
    number: '01',
    title: 'Find what matters first.',
    description:
      'Dense information needs a clear reading order. Give urgency, state, and action their own visual roles.',
    annotations: [
      { name: 'SeverityBadge + StatusBadge', benefit: 'Separate urgency from workflow state.' },
      { name: 'Checkbox + Button', benefit: 'Make selection lead to an explicit action.' },
      { name: 'Tag + Switch', benefit: 'Narrow the view and adjust its density.' },
    ],
    hint: 'Filter high-priority tasks, select a row, then mark it for review.',
  },
  context: {
    number: '02',
    title: 'Stay oriented as you go deeper.',
    description:
      'Keep the project, ownership, and references together. Reveal detail when it helps the work.',
    annotations: [
      { name: 'Breadcrumb', benefit: 'Keep the route back in view.' },
      { name: 'Accordion', benefit: 'Let context unfold at the right level.' },
      { name: 'Avatar + Tag', benefit: 'Give people and projects a clear place.' },
    ],
    hint: 'Open the detail groups or assign the sample project.',
  },
  review: {
    number: '03',
    title: 'Make assistance recognizable.',
    description:
      'AI suggestions need visible provenance and a clear decision point. Keep the context visible and the person in control.',
    annotations: [
      { name: 'AiCard + ConfidenceBadge', benefit: 'Distinguish a suggestion from a verdict.' },
      { name: 'Accordion + Tag', benefit: 'Keep supporting context within reach.' },
      { name: 'Button', benefit: 'Make accepting, dismissing, and undoing explicit.' },
    ],
    hint: 'Review the sample context, then accept or dismiss the suggestion.',
  },
};

function SignalPreview() {
  const [compact, setCompact] = useState(false);
  const [priority, setPriority] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const visible = sampleSignals.filter(
    (signal) => !priority || signal.severity === 'critical' || signal.severity === 'high',
  );
  const selectedVisible = visible.filter((signal) => selected.includes(signal.id)).length;
  return (
    <div className="marketing-showcase-signal" data-compact={compact}>
      <div className="marketing-showcase-view-heading">
        <div>
          <span className="marketing-showcase-overline">BUSINESS WORKSPACE</span>
          <h3>
            Work queue <CountBadge count={visible.length} label="sample tasks" />
          </h3>
        </div>
        <Switch size="sm" label="Compact rows" checked={compact} onCheckedChange={setCompact} />
      </div>
      <div className="marketing-showcase-filter-row">
        <Tag variant="interactive" size="sm" selected={priority} onSelectedChange={setPriority}>
          High priority
        </Tag>
        <span>Sample tasks · 09:31–09:42 UTC</span>
      </div>
      <div className="marketing-showcase-queue-head">
        <Checkbox
          size="sm"
          aria-label="Select all visible sample tasks"
          checked={
            selectedVisible === visible.length ? true : selectedVisible ? 'indeterminate' : false
          }
          onCheckedChange={(checked) =>
            setSelected(checked === true ? visible.map((signal) => signal.id) : [])
          }
        />
        <span>Task / project</span>
        <span>Status</span>
        <span>Observed</span>
      </div>
      <ol className="marketing-showcase-queue" aria-label="Sample work queue">
        {visible.map((signal) => (
          <li key={signal.id} data-selected={selected.includes(signal.id)}>
            <Checkbox
              size="sm"
              aria-label={`Select ${signal.title}`}
              checked={selected.includes(signal.id)}
              onCheckedChange={(checked) =>
                setSelected((current) =>
                  checked === true
                    ? [...current, signal.id]
                    : current.filter((id) => id !== signal.id),
                )
              }
            />
            <div className="marketing-showcase-signal-copy">
              <strong>{signal.title}</strong>
              <div>
                <SeverityBadge severity={signal.severity} />
                <span>{signal.entity}</span>
              </div>
            </div>
            <StatusBadge status={reviewed.includes(signal.id) ? 'in-review' : 'new'} />
            <time>{signal.time}</time>
          </li>
        ))}
      </ol>
      <div className="marketing-showcase-preview-actions">
        <span role="status">
          {selected.length
            ? `${selected.length} selected`
            : reviewed.length
              ? `${reviewed.length} sample tasks reviewed`
              : 'Select a task to take action'}
        </span>
        <div>
          <Button
            size="sm"
            emphasis="ghost"
            onClick={() => {
              setReviewed([]);
              setSelected([]);
              setPriority(false);
            }}
          >
            Reset
          </Button>
          <Button
            size="sm"
            emphasis="secondary"
            intent="function"
            leadingIcon={<Check size={14} />}
            disabled={!selected.length}
            onClick={() => {
              setReviewed((current) => [...new Set([...current, ...selected])]);
              setSelected([]);
            }}
          >
            Mark in review
          </Button>
        </div>
      </div>
    </div>
  );
}

function ContextPreview({ onBack }: { onBack: () => void }) {
  const [assigned, setAssigned] = useState(false);
  return (
    <div className="marketing-showcase-context">
      <Breadcrumb
        aria-label="Sample project path"
        items={[{ label: 'Tasks', onClick: onBack }, { label: 'PRJ-1042' }]}
      />
      <div className="marketing-showcase-case-heading">
        <div className="marketing-showcase-entity-icon">
          <Shield size={22} />
        </div>
        <div>
          <h3>Customer portal launch review</h3>
          <p>
            Atlas Commerce <span>·</span> Customer portal
          </p>
        </div>
      </div>
      <div className="marketing-showcase-case-tags">
        <SeverityBadge severity="critical" />
        <StatusBadge status="in-progress" />
        <Tag size="sm">Launch readiness</Tag>
      </div>
      <dl className="marketing-showcase-metadata">
        <div>
          <dt>Customer</dt>
          <dd>Atlas Commerce</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>09:42:08 UTC</dd>
        </div>
        <div>
          <dt>Assigned to</dt>
          <dd>
            <Avatar
              name={assigned ? 'You' : 'Elena Varga'}
              initials={assigned ? 'YO' : 'EV'}
              size="sm"
            />
            {assigned ? 'You' : 'Elena Varga'}
          </dd>
        </div>
      </dl>
      <Accordion
        type="multiple"
        defaultValue={['process']}
        variant="divided"
        items={[
          {
            value: 'process',
            title: 'Delivery milestones',
            count: 3,
            content: (
              <div className="marketing-showcase-process">
                <code>DESIGN</code>
                <ArrowRight size={13} />
                <code>REVIEW</code>
                <ArrowRight size={13} />
                <code>LAUNCH</code>
                <p>Customer review follows design approval before the launch milestone.</p>
              </div>
            ),
          },
          {
            value: 'network',
            title: 'Customer context',
            count: 1,
            content: (
              <p className="marketing-showcase-evidence-copy">
                The launch checklist and customer feedback are linked to <code>PRJ-1042</code>.
                Confirm the remaining feedback with the customer before closing the review.
              </p>
            ),
          },
          {
            value: 'identity',
            title: 'Team ownership',
            count: 1,
            content: (
              <p className="marketing-showcase-evidence-copy">
                The project is coordinated by <strong>Elena Varga</strong>. Confirm each milestone
                owner before changing the delivery plan.
              </p>
            ),
          },
        ]}
      />
      <div className="marketing-showcase-preview-actions">
        <AvatarGroup
          size="sm"
          label="Sample collaborators"
          avatars={[
            { name: 'Elena Varga', initials: 'EV' },
            { name: 'Marcus Chen', initials: 'MC' },
          ]}
        />
        <Button
          size="sm"
          emphasis="secondary"
          intent="function"
          onClick={() => setAssigned(!assigned)}
        >
          {assigned ? 'Assigned to you · undo' : 'Assign to me'}
        </Button>
      </div>
      <span className="sr-only" role="status">
        {assigned ? 'Sample project assigned to you.' : 'Sample project assigned to Elena Varga.'}
      </span>
    </div>
  );
}

function ReviewPreview() {
  const [decision, setDecision] = useState<ReviewDecision>('pending');
  const decisionActions = useRef<HTMLDivElement>(null);
  return (
    <div className="marketing-showcase-review">
      <div className="marketing-showcase-view-heading">
        <div>
          <span className="marketing-showcase-overline">AEGIS AI</span>
          <h3>Context before action.</h3>
        </div>
        <Tag size="sm">PRJ-1042</Tag>
      </div>
      <AiCard
        title="One project. A shared dependency."
        confidence="medium"
        provenance="Illustrative suggestion · 3 sample updates"
      >
        <p>
          Three upcoming milestones depend on the customer review for <strong>PRJ-1042</strong>.
          Confirm ownership and timing before updating the delivery plan.
        </p>
        <div className="marketing-showcase-ai-tags">
          <Tag size="sm" intent="ai">
            Shared project
          </Tag>
          <Tag size="sm" intent="ai">
            Upcoming milestones
          </Tag>
        </div>
      </AiCard>
      <Accordion
        type="single"
        collapsible
        variant="divided"
        items={[
          {
            value: 'evidence',
            title: 'Inspect supporting context',
            count: 3,
            content: (
              <ol className="marketing-showcase-evidence-list">
                <li>
                  <time>09:42:08</time>
                  <span>Design approval recorded for PRJ-1042.</span>
                </li>
                <li>
                  <time>09:42:12</time>
                  <span>Customer review requested by the project owner.</span>
                </li>
                <li>
                  <time>09:42:26</time>
                  <span>Launch checklist updated with a new dependency.</span>
                </li>
              </ol>
            ),
          },
        ]}
      />
      <div className="marketing-showcase-decision" data-decision={decision} role="status">
        {decision === 'pending' ? (
          <>
            <span className="marketing-showcase-decision-dot" />
            Awaiting your review. No action taken.
          </>
        ) : decision === 'accepted' ? (
          <>
            <Check size={16} />
            Sample follow-up created. Nothing was sent.
          </>
        ) : (
          <>Suggestion dismissed. The sample records are unchanged.</>
        )}
      </div>
      <div className="marketing-showcase-review-actions" ref={decisionActions}>
        <Button
          size="sm"
          intent={decision === 'pending' ? 'ai' : 'default'}
          emphasis={decision === 'pending' ? 'primary' : 'secondary'}
          leadingIcon={decision === 'pending' ? <Sparkles size={15} /> : undefined}
          onClick={() => setDecision(decision === 'pending' ? 'accepted' : 'pending')}
        >
          {decision === 'pending' ? 'Create follow-up' : 'Undo decision'}
        </Button>
        <Button
          size="sm"
          emphasis="ghost"
          disabled={decision !== 'pending'}
          onClick={() => {
            setDecision('dismissed');
            decisionActions.current?.querySelector<HTMLButtonElement>('button')?.focus();
          }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

/** Curated, local interactions showing Aegis components in technical workflows. */
export function ComponentShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<Context>('signals');
  const [dark, setDark] = useState(true);
  const story = stories[active];
  const previews: Record<Context, ReactNode> = {
    signals: <SignalPreview />,
    context: (
      <ContextPreview
        onBack={() => {
          sectionRef.current
            ?.querySelector<HTMLButtonElement>('.marketing-showcase-tab-list [role="tab"]')
            ?.focus();
          setActive('signals');
        }}
      />
    ),
    review: <ReviewPreview />,
  };
  return (
    <section
      ref={sectionRef}
      className="marketing-workflow-stage"
      aria-label="Interactive business workflow built with Aegis"
    >
      <h2 className="sr-only">A business workflow, built with Aegis</h2>
      <div className="marketing-stage-topline">
        <span>
          <i /> AEGIS / BUSINESS WORKSPACE
        </span>
        <span>Shared components · sample data</span>
      </div>
      <Tabs
        value={active}
        onValueChange={(value) => {
          if (value === 'signals' || value === 'context' || value === 'review') setActive(value);
        }}
        label="Component showcase workflows"
        className="marketing-showcase-tabs"
        listClassName="marketing-showcase-tab-list"
        contentClassName="marketing-showcase-tab-panel"
        items={[
          { value: 'signals', label: 'Work queue', icon: <Rows3 size={17} />, content: null },
          {
            value: 'context',
            label: 'Project details',
            icon: <Layers size={17} />,
            content: null,
          },
          { value: 'review', label: 'AI review', icon: <Sparkles size={17} />, content: null },
        ]}
        sharedContent={
          <div
            className={`marketing-showcase-preview ${dark ? 'dark' : 'aegis-theme-light'}`}
            style={{ colorScheme: dark ? 'dark' : 'light' }}
          >
            <div className="marketing-showcase-preview-bar">
              <span>01 / INTERACTIVE SPECIMEN</span>
              <Switch size="sm" label="Dark preview" checked={dark} onCheckedChange={setDark} />
            </div>
            <div className="marketing-showcase-preview-body">{previews[active]}</div>
          </div>
        }
      />
      <div className="marketing-stage-caption">
        <p>{story.hint}</p>
        <a href="?view=console">
          Open the business application <ArrowRight size={15} />
        </a>
      </div>
    </section>
  );
}
