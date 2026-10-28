export type RequestStatus = 'open' | 'in-progress' | 'waiting' | 'resolved';
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';
export type CustomerStatus = 'active' | 'trial' | 'inactive';

export interface RelayCustomer {
  id: string;
  name: string;
  company: string;
  email: string;
  status: CustomerStatus;
  plan: 'Starter' | 'Growth' | 'Enterprise';
  joinedAt: string;
  notes: string;
}

export interface RelayRequest {
  id: string;
  title: string;
  customerId: string;
  status: RequestStatus;
  priority: RequestPriority;
  labels: string[];
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewRequestInput {
  title: string;
  customerId: string;
  description?: string;
  priority?: RequestPriority;
  labels?: string[];
}

export type RequestPatch = Partial<
  Pick<RelayRequest, 'title' | 'status' | 'priority' | 'labels' | 'description'>
>;

export interface RequestsPageProps {
  requests: RelayRequest[];
  customers: RelayCustomer[];
  onCreateRequest: (input: NewRequestInput) => void;
  onUpdateRequest: (id: string, patch: RequestPatch) => void;
}

export const requestStatusLabels: Record<RequestStatus, string> = {
  open: 'Open',
  'in-progress': 'In progress',
  waiting: 'Waiting',
  resolved: 'Resolved',
};
export const priorityLabels: Record<RequestPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};
export const customerStatusLabels: Record<CustomerStatus, string> = {
  active: 'Active',
  trial: 'Trial',
  inactive: 'Inactive',
};
export const requestStatusOptions = [
  { value: 'all', label: 'All statuses' },
  ...Object.entries(requestStatusLabels).map(([value, label]) => ({ value, label })),
];
export const customerStatusOptions = [
  { value: 'all', label: 'All statuses' },
  ...Object.entries(customerStatusLabels).map(([value, label]) => ({ value, label })),
];
export const labelSuggestions = [
  'Billing',
  'Bug',
  'Feature request',
  'Integration',
  'Onboarding',
  'Account',
];

export const initialCustomers: RelayCustomer[] = [
  {
    id: 'cus_01',
    name: 'Maya Chen',
    company: 'Linear Studio',
    email: 'maya@linear-studio.example',
    status: 'active',
    plan: 'Enterprise',
    joinedAt: '2026-03-12',
    notes: 'Design team with 28 seats. Maya coordinates the rollout across three teams.',
  },
  {
    id: 'cus_02',
    name: 'Oliver James',
    company: 'Northstar',
    email: 'oliver@northstar.example',
    status: 'active',
    plan: 'Growth',
    joinedAt: '2026-05-18',
    notes: 'Fast-growing operations team. Prefers concise setup guides and asynchronous support.',
  },
  {
    id: 'cus_03',
    name: 'Sofia Rossi',
    company: 'Forma',
    email: 'sofia@forma.example',
    status: 'trial',
    plan: 'Growth',
    joinedAt: '2026-10-20',
    notes: 'Evaluating Relay for a customer success team. Trial review is next week.',
  },
  {
    id: 'cus_04',
    name: 'Ethan Park',
    company: 'Acme',
    email: 'ethan@acme.example',
    status: 'active',
    plan: 'Enterprise',
    joinedAt: '2026-02-06',
    notes: 'Account administrator for the production workspace. Integration owner for Acme.',
  },
  {
    id: 'cus_05',
    name: 'Amara Okafor',
    company: 'Orbit',
    email: 'amara@orbit.example',
    status: 'active',
    plan: 'Growth',
    joinedAt: '2026-07-08',
    notes: 'Product lead using request labels to organize feedback from beta customers.',
  },
  {
    id: 'cus_06',
    name: 'Lucas Silva',
    company: 'Canvas',
    email: 'lucas@canvas.example',
    status: 'trial',
    plan: 'Starter',
    joinedAt: '2026-10-24',
    notes: 'Small creative team testing the shared inbox and customer directory.',
  },
  {
    id: 'cus_07',
    name: 'Freya Nielsen',
    company: 'Daybreak',
    email: 'freya@daybreak.example',
    status: 'inactive',
    plan: 'Starter',
    joinedAt: '2026-06-03',
    notes: 'Seasonal workspace currently paused. Keep historical requests available.',
  },
  {
    id: 'cus_08',
    name: 'Noah Williams',
    company: 'Meridian',
    email: 'noah@meridian.example',
    status: 'active',
    plan: 'Enterprise',
    joinedAt: '2026-01-15',
    notes: 'Long-term customer with regional teams. Noah manages billing and permissions.',
  },
];

export const initialRequests: RelayRequest[] = [
  {
    id: 'REQ-1042',
    title: 'Unable to connect the production workspace',
    customerId: 'cus_04',
    status: 'open',
    priority: 'urgent',
    labels: ['Integration', 'Bug'],
    description:
      'The connection completes during setup, but the production workspace returns an authorization error when we try to sync. The staging workspace is working.',
    createdAt: '2026-10-28T08:35:00Z',
    updatedAt: '2026-10-28T09:10:00Z',
  },
  {
    id: 'REQ-1041',
    title: 'Add teammates to our annual plan',
    customerId: 'cus_01',
    status: 'in-progress',
    priority: 'normal',
    labels: ['Billing', 'Account'],
    description:
      'We are bringing another design team into the workspace and need eight additional seats on our annual plan. Please confirm when the seats will become available.',
    createdAt: '2026-10-28T08:00:00Z',
    updatedAt: '2026-10-28T08:55:00Z',
  },
  {
    id: 'REQ-1040',
    title: 'Help setting up our first shared inbox',
    customerId: 'cus_03',
    status: 'open',
    priority: 'high',
    labels: ['Onboarding'],
    description:
      'We would like to route messages from our support address into the shared inbox. We have verified the domain and would appreciate help with the next steps.',
    createdAt: '2026-10-27T16:30:00Z',
    updatedAt: '2026-10-28T08:20:00Z',
  },
  {
    id: 'REQ-1039',
    title: 'Export includes archived conversations',
    customerId: 'cus_05',
    status: 'in-progress',
    priority: 'high',
    labels: ['Bug'],
    description:
      'When exporting the active requests view, the downloaded file also includes archived conversations. We expected it to match the current filters.',
    createdAt: '2026-10-27T15:10:00Z',
    updatedAt: '2026-10-27T17:05:00Z',
  },
  {
    id: 'REQ-1038',
    title: 'Update the billing contact on our invoices',
    customerId: 'cus_08',
    status: 'waiting',
    priority: 'normal',
    labels: ['Billing'],
    description:
      'Our finance team has a new shared address. We are waiting for confirmation of the new billing contact before changing the next invoice.',
    createdAt: '2026-10-27T12:20:00Z',
    updatedAt: '2026-10-27T15:40:00Z',
  },
  {
    id: 'REQ-1037',
    title: 'A faster way to apply labels to requests',
    customerId: 'cus_05',
    status: 'open',
    priority: 'low',
    labels: ['Feature request'],
    description:
      'It would help to paste several labels at once when triaging feedback after a customer interview. We often use the same labels across a group of requests.',
    createdAt: '2026-10-27T10:15:00Z',
    updatedAt: '2026-10-27T10:15:00Z',
  },
  {
    id: 'REQ-1036',
    title: 'Clarify guest access for external partners',
    customerId: 'cus_02',
    status: 'waiting',
    priority: 'normal',
    labels: ['Account'],
    description:
      'We would like two external partners to see a subset of requests without accessing the full customer directory. Please explain the available roles.',
    createdAt: '2026-10-26T14:00:00Z',
    updatedAt: '2026-10-27T09:15:00Z',
  },
  {
    id: 'REQ-1035',
    title: 'Import our existing customer list',
    customerId: 'cus_06',
    status: 'resolved',
    priority: 'normal',
    labels: ['Onboarding'],
    description:
      'The customer import is complete. We mapped the company and email columns and checked a sample of the imported records with Lucas.',
    createdAt: '2026-10-26T11:45:00Z',
    updatedAt: '2026-10-26T16:30:00Z',
  },
  {
    id: 'REQ-1034',
    title: 'Webhook deliveries stopped yesterday',
    customerId: 'cus_04',
    status: 'resolved',
    priority: 'urgent',
    labels: ['Integration'],
    description:
      'The destination endpoint was rejecting the current signing secret. After rotating the secret, webhook deliveries resumed and the queued events were replayed.',
    createdAt: '2026-10-25T09:05:00Z',
    updatedAt: '2026-10-26T08:40:00Z',
  },
  {
    id: 'REQ-1033',
    title: 'Keep saved views when switching workspaces',
    customerId: 'cus_01',
    status: 'open',
    priority: 'low',
    labels: ['Feature request'],
    description:
      'Our team would like a way to reuse a personal saved view across multiple workspaces with the same columns and filters.',
    createdAt: '2026-10-24T13:30:00Z',
    updatedAt: '2026-10-25T10:10:00Z',
  },
  {
    id: 'REQ-1032',
    title: 'Pause our workspace for the winter season',
    customerId: 'cus_07',
    status: 'resolved',
    priority: 'normal',
    labels: ['Account', 'Billing'],
    description:
      'The workspace is paused as requested. Existing conversations and customer records remain available for the team to review.',
    createdAt: '2026-10-23T10:20:00Z',
    updatedAt: '2026-10-24T12:00:00Z',
  },
  {
    id: 'REQ-1031',
    title: 'Confirm the data retention settings',
    customerId: 'cus_08',
    status: 'waiting',
    priority: 'high',
    labels: ['Account'],
    description:
      'The regional team is reviewing its retention policy. We have sent the current workspace settings and are waiting for their preferred retention period.',
    createdAt: '2026-10-22T14:30:00Z',
    updatedAt: '2026-10-24T09:30:00Z',
  },
];

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}
