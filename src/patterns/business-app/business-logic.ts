import type { AiContextItem, AiRequest, AiStreamEvent, AiStreamOptions } from '@/lib/ai';
import { businessReferenceDate, type BusinessData, type BusinessRoute } from './business-types';

export function businessMetrics(data: BusinessData) {
  return {
    activeProjects: data.projects.filter((project) => project.status === 'Active').length,
    activeCustomers: data.customers.filter((customer) => customer.status === 'Active').length,
    collected: data.invoices
      .filter((invoice) => invoice.status === 'Paid')
      .reduce((sum, invoice) => sum + invoice.amount, 0),
    outstanding: data.invoices
      .filter((invoice) => invoice.status !== 'Paid')
      .reduce((sum, invoice) => sum + invoice.amount, 0),
    overdue: data.invoices.filter((invoice) => invoice.status === 'Overdue').length,
  };
}
export function revenueSeries(data: BusinessData, months = 6) {
  return Array.from({ length: months }, (_, index) => {
    const month = new Date(businessReferenceDate);
    month.setUTCDate(1);
    month.setUTCMonth(month.getUTCMonth() - months + index + 1);
    const key = month.toISOString().slice(0, 7);
    return {
      label: month.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      value: data.invoices
        .filter((invoice) => invoice.status === 'Paid' && invoice.issuedAt.startsWith(key))
        .reduce((sum, invoice) => sum + invoice.amount, 0),
    };
  });
}
export function businessContext(data: BusinessData, route: BusinessRoute): AiContextItem[] {
  if (route.recordId) {
    if (route.page === 'projects') {
      const project = data.projects.find((record) => record.id === route.recordId);
      if (project)
        return [
          {
            id: project.id,
            label: project.name,
            kind: 'record',
            description: `${project.status}; ${project.progress}% complete; budget $${project.budget}; spent $${project.spent}; due ${project.dueDate}. ${project.description}`,
          },
        ];
    }
    if (route.page === 'customers') {
      const customer = data.customers.find((record) => record.id === route.recordId);
      if (customer)
        return [
          {
            id: customer.id,
            label: customer.name,
            kind: 'record',
            description: `${customer.industry}; ${customer.status}; ${customer.plan} plan. ${data.projects.filter((project) => project.customerId === customer.id).length} related projects.`,
          },
        ];
    }
    if (route.page === 'team') {
      const member = data.team.find((record) => record.id === route.recordId);
      if (member)
        return [
          {
            id: member.id,
            label: member.name,
            kind: 'record',
            description: `${member.title}; ${member.department}; ${member.status}. ${data.projects.filter((project) => project.memberIds.includes(member.id)).length} assigned projects.`,
          },
        ];
    }
  }
  const metrics = businessMetrics(data);
  return [
    {
      id: 'workspace-summary',
      label: 'Workspace overview',
      kind: 'scope',
      description: `${metrics.activeProjects} active projects; ${metrics.activeCustomers} active customers; $${metrics.collected} collected; $${metrics.outstanding} outstanding; ${metrics.overdue} overdue invoices.`,
    },
    ...data.projects
      .filter((project) => project.status === 'On hold' || project.priority === 'High')
      .slice(0, 4)
      .map((project): AiContextItem => ({
        id: project.id,
        label: project.name,
        kind: 'record',
        description: `${project.status}; ${project.priority} priority; ${project.progress}% complete; due ${project.dueDate}.`,
      })),
  ];
}
const safeMarkdown = (text: string) => text.replace(/[\\`*_{}[\]<>]/g, '\\$&');
/** Local example provider: summaries are drawn only from the supplied business records. */
export async function* streamBusinessResponse(
  request: AiRequest,
  { signal, delayMs = 12 }: AiStreamOptions = {},
): AsyncGenerator<AiStreamEvent> {
  const check = () => {
    if (signal?.aborted) throw new DOMException('Generation stopped', 'AbortError');
  };
  check();
  yield {
    type: 'step',
    step: { id: 'review', label: 'Reviewing attached workspace records', status: 'working' },
  };
  const context = [...new Map((request.context ?? []).map((item) => [item.id, item])).values()];
  const records = context
    .map(
      (item) =>
        `- **${safeMarkdown(item.label)}**: ${safeMarkdown(item.description ?? 'No additional details supplied.')}`,
    )
    .join('\n');
  const content = context.length
    ? `## Workspace briefing\n\n${records}\n\n### Suggested next steps\n\n1. Review projects on hold with their owners and confirm the next milestone.\n2. Check outstanding invoices with the account owner before following up.\n3. Use each record’s details to update ownership, dates, or status.\n\nThis is a local sample summary of the attached records. No messages were sent and no records were changed.`
    : '## Add workspace context\n\nAttach a project, customer, or member to prepare a useful summary. This sample assistant uses only the records you provide.';
  for (const text of content.match(/\S+\s*/g) ?? []) {
    check();
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 50)));
    check();
    yield { type: 'token', text };
  }
  for (const citation of context.filter((item) => item.kind === 'record'))
    yield { type: 'citation', citation };
  check();
  yield {
    type: 'step',
    step: { id: 'review', label: 'Reviewed attached workspace records', status: 'complete' },
  };
  yield { type: 'complete' };
}
