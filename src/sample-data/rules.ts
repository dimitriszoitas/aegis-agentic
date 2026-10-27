import type { WorkflowConfig } from './types';

const definitions: Omit<WorkflowConfig, 'yaml'>[] = [
  {
    id: 'WF-001',
    name: 'Project delivery review',
    description: 'Queue projects that need an owner review before their delivery date.',
    source: 'Projects',
    category: 'delivery',
  },
  {
    id: 'WF-002',
    name: 'Customer onboarding follow-up',
    description: 'Review accounts with incomplete onboarding tasks.',
    source: 'Customers',
    category: 'onboarding',
  },
  {
    id: 'WF-003',
    name: 'Invoice payment follow-up',
    description: 'Route unpaid invoices to the account owner after their due date.',
    source: 'Billing',
    category: 'payments',
  },
  {
    id: 'WF-004',
    name: 'Workspace membership review',
    description: 'Review pending invitations and incomplete member profiles.',
    source: 'Workspace',
    category: 'membership',
  },
  {
    id: 'WF-005',
    name: 'Project approval reminder',
    description: 'Send approved project changes to the next review stage.',
    source: 'Projects',
    category: 'approvals',
  },
  {
    id: 'WF-006',
    name: 'Account renewal preparation',
    description: 'Prepare customer renewal work before the contract end date.',
    source: 'Customers',
    category: 'renewals',
  },
  {
    id: 'WF-007',
    name: 'Budget variance review',
    description: 'Review project budgets when planned and actual totals differ.',
    source: 'Projects',
    category: 'budget',
  },
  {
    id: 'WF-008',
    name: 'Invoice reconciliation',
    description: 'Match invoice totals to payments recorded by the finance team.',
    source: 'Billing',
    category: 'reconciliation',
  },
  {
    id: 'WF-009',
    name: 'Customer handoff review',
    description: 'Confirm that each account handoff has an assigned owner.',
    source: 'Customers',
    category: 'handoff',
  },
  {
    id: 'WF-010',
    name: 'Workspace activity digest',
    description: 'Collect recent project and member changes for a weekly review.',
    source: 'Workspace',
    category: 'activity',
  },
];
export const workflows: WorkflowConfig[] = definitions.map((definition) => ({
  ...definition,
  yaml: `name: ${definition.name}
id: ${definition.id}
enabled: true
description: ${definition.description}
source: ${definition.source}
category: ${definition.category}
conditions:
  - field: status
    operator: equals
    value: in-review
actions:
  - type: assign
    value: elena
`,
}));
/** A proposed change kept separate until the user approves it. */
export const proposedWorkflow =
  workflows[2].yaml +
  `  - type: notify
    value: workspace
`;
