import type { RecordStatus } from '@/components/status-badge';
import { seededRandom } from '@/lib/seeded-random';
import { workflows } from './rules';
import type {
  WorkRecord,
  RecordOwner,
  HistoryRecord,
  SeverityBucket,
  TranscriptFixture,
} from './types';

/** Fixed clock keeps examples and relative filters reproducible across reloads. */
export const referenceTime = Date.UTC(2026, 9, 6, 8, 30);
export const owners: RecordOwner[] = [
  { id: 'elena', name: 'Elena Vasquez', initials: 'EV', role: 'Operations lead' },
  { id: 'marcus', name: 'Marcus Chen', initials: 'MC', role: 'Project manager' },
  { id: 'ravi', name: 'Ravi Patel', initials: 'RP', role: 'Customer success manager' },
  { id: 'zoe', name: 'Zoe Ivanova', initials: 'ZI', role: 'Finance specialist' },
];
const accounts = [
  'Atlas Commerce',
  'Meridian Labs',
  'Cedar Studio',
  'Harbor Logistics',
  'Orbit Health',
  'Summit Works',
  'Nova Digital',
  'Evergreen Group',
];
const projects = [
  'Customer portal redesign',
  'Quarterly reporting',
  'Billing migration',
  'Workspace rollout',
  'Partner onboarding',
  'Annual planning',
  'Analytics refresh',
  'Knowledge base',
];
const severities: WorkRecord['severity'][] = [
  'high',
  'critical',
  'medium',
  'low',
  'high',
  'medium',
  'critical',
  'high',
  'low',
  'info',
];
const statuses: RecordStatus[] = [
  'new',
  'new',
  'in-review',
  'in-progress',
  'completed',
  'cancelled',
  'new',
];
const actions = [
  'Record created',
  'Owner assigned',
  'Review requested',
  'Notes updated',
  'Progress recorded',
  'Attachments added',
  'Due date updated',
  'Review completed',
];

/** Deterministic, independent records with real cross-linked workflow/history data. */
export function generateRecords(count = 150, seed = 20261006): WorkRecord[] {
  const random = seededRandom(seed);
  return Array.from(
    { length: Math.max(0, Math.floor(Number.isFinite(count) ? count : 0)) },
    (_, index) => {
      const workflow = workflows[index % workflows.length];
      const owner = owners[index % owners.length];
      const account = accounts[index % accounts.length];
      const project = projects[index % projects.length];
      const subjectType =
        workflow.source === 'Projects'
          ? 'project'
          : workflow.source === 'Workspace'
            ? 'user'
            : 'account';
      const subjectName =
        subjectType === 'project' ? project : subjectType === 'user' ? owner.name : account;
      const lastSeen = referenceTime - Math.floor(random() * 23.8 * 3600_000);
      const firstSeen = lastSeen - (5 + Math.floor(random() * 60)) * 60_000;
      const eventCount = 3 + Math.floor(random() * 6);
      const events: HistoryRecord[] = Array.from({ length: eventCount }, (_, eventIndex) => {
        const timestamp = new Date(
          firstSeen + (eventIndex * (lastSeen - firstSeen)) / (eventCount - 1),
        ).toISOString();
        const action = actions[eventIndex % actions.length];
        return {
          id: `EVT-${1048 + index}-${eventIndex + 1}`,
          timestamp,
          action,
          actor: owners[eventIndex % owners.length].name,
          subject: subjectName,
          payload: {
            timestamp,
            record_id: `REC-${1048 + index}`,
            action: action.toLowerCase().replaceAll(' ', '_'),
            project,
            account,
            stage: eventIndex === 0 ? 'created' : 'review',
            workflow_id: workflow.id,
          },
        };
      });
      const severity = severities[index % severities.length];
      return {
        id: `REC-${1048 + index}`,
        title: `${workflow.name} · ${subjectName}`,
        severity,
        status: statuses[index % statuses.length],
        source: workflow.source,
        category: {
          id: workflow.category,
          name: workflow.category[0].toUpperCase() + workflow.category.slice(1),
        },
        subject: {
          type: subjectType,
          name: subjectName,
          detail: subjectType === 'user' ? owner.role : `${account} · Operations`,
        },
        eventCount,
        firstSeen: new Date(firstSeen).toISOString(),
        lastSeen: new Date(lastSeen).toISOString(),
        createdAt: new Date(firstSeen).toISOString(),
        updatedAt: new Date(lastSeen).toISOString(),
        assignee: index % 5 === 0 ? undefined : { ...owner },
        tags: [
          workflow.category,
          workflow.source.toLowerCase(),
          index % 3 === 0 ? 'needs-review' : 'scheduled',
        ],
        sparkline: Array.from({ length: 24 }, (_, hour) =>
          Math.round(random() * 25 + (hour > 17 ? random() * 70 : 0)),
        ),
        events,
        workflowId: workflow.id,
        aiVerdict: {
          verdict:
            severity === 'critical'
              ? 'Review first'
              : severity === 'low' || severity === 'info'
                ? 'On track'
                : 'Check dependencies',
          confidence: Math.round((0.64 + random() * 0.33) * 100) / 100,
        },
      };
    },
  );
}
export const records = generateRecords();
export const timeSeries: SeverityBucket[] = Array.from({ length: 48 }, (_, i) => {
  const random = seededRandom(710 + i);
  const factor = i > 31 && i < 40 ? 2.5 : 1;
  const critical = Math.floor(random() * 5 * factor),
    high = Math.floor(random() * 17 * factor),
    medium = Math.floor((16 + random() * 25) * factor),
    low = Math.floor(8 + random() * 18),
    info = Math.floor(3 + random() * 8);
  const date = new Date(referenceTime - (47 - i) * 30 * 60_000);
  return {
    time: date.toISOString(),
    label: date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }),
    critical,
    high,
    medium,
    low,
    info,
    total: critical + high + medium + low + info,
  };
});
export const aiTranscripts: TranscriptFixture[] = [
  {
    id: 'review',
    title: 'Review selected records',
    response:
      '## Work that needs attention\n\nThe selected records include a **project delivery review** and a customer follow-up. They belong to different workstreams, so review each owner and due date before combining the work.\n\n1. Confirm the delivery scope and dependencies.\n2. Check whether the customer handoff is complete.\n3. Assign an owner to each outstanding item.\n\nNo status changes have been applied.',
    steps: [
      { label: 'Read the selected record history', status: 'complete' },
      { label: 'Compared ownership and workflow stages', status: 'complete' },
      { label: 'Prepared review suggestions', status: 'complete' },
    ],
    evidence: ['REC-1048', 'REC-1049', 'WF-001'],
  },
  {
    id: 'config',
    title: 'Refine a workflow',
    response:
      'The current workflow waits **24 hours** before requesting a review. A 12-hour threshold and an explicit owner requirement may help the operations team address pending work sooner.\n\nI prepared a configuration change for review. Preview the affected records before approving it.',
    steps: [
      { label: 'Read the current workflow', status: 'complete' },
      { label: 'Prepared a proposed configuration', status: 'complete' },
    ],
    evidence: ['WF-001'],
  },
  {
    id: 'summary',
    title: 'Summarize recent work',
    response:
      'The selection spans **projects, customer accounts, and billing tasks**. Start with critical work that has no owner, then check pending approvals.\n\nReview the original history before applying the suggested status changes. These are recommendations based on local sample records.',
    steps: [
      { label: 'Grouped records by workstream', status: 'complete' },
      { label: 'Prepared a concise summary', status: 'complete' },
    ],
    evidence: ['REC-1048', 'REC-1049'],
  },
];
