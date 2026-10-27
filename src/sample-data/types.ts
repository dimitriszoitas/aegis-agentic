import type { Severity } from '@/components/severity-badge';
import type { RecordStatus } from '@/components/status-badge';

export type RecordSource = 'Projects' | 'Customers' | 'Billing' | 'Workspace';
export interface RecordOwner {
  id: string;
  name: string;
  initials: string;
  role: string;
}
export interface RecordSubject {
  type: 'user' | 'project' | 'account';
  name: string;
  detail: string;
}
export interface HistoryRecord {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  subject: string;
  payload: Record<string, unknown>;
}
export interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  source: RecordSource;
  category: string;
  yaml: string;
}
/** Generic work item used by filtering, data display, and workflow examples. */
export interface WorkRecord {
  id: string;
  title: string;
  severity: Severity;
  status: RecordStatus;
  source: RecordSource;
  category: { id: string; name: string };
  subject: RecordSubject;
  eventCount: number;
  firstSeen: string;
  lastSeen: string;
  createdAt?: string;
  updatedAt?: string;
  exportedTo?: string[];
  assignee?: RecordOwner;
  ownerNote?: string;
  tags: string[];
  sparkline: number[];
  events: HistoryRecord[];
  workflowId: string;
  aiVerdict: { verdict: string; confidence: number };
}
export interface SeverityBucket {
  time: string;
  label: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}
export interface TranscriptFixture {
  id: string;
  title: string;
  response: string;
  steps: { label: string; status: 'complete' | 'working' }[];
  evidence: string[];
}
