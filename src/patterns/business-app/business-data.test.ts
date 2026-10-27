import { describe, expect, it } from 'vitest';
import { createBusinessData } from './business-data';
import { businessReferenceDate } from './business-types';

describe('business example fixtures', () => {
  it('keeps every relationship and project completion total coherent', () => {
    const data = createBusinessData();
    const memberIds = new Set(data.team.map((member) => member.id));
    const customers = new Map(data.customers.map((customer) => [customer.id, customer]));
    const projects = new Map(data.projects.map((project) => [project.id, project]));
    expect([
      data.projects.length,
      data.customers.length,
      data.team.length,
      data.invoices.length,
      data.activity.length,
    ]).toEqual([32, 12, 18, 24, 12]);
    for (const collection of Object.values(data))
      expect(new Set(collection.map((record: { id: string }) => record.id)).size).toBe(
        collection.length,
      );
    for (const customer of data.customers) expect(memberIds.has(customer.ownerId)).toBe(true);
    for (const project of data.projects) {
      expect(customers.has(project.customerId)).toBe(true);
      expect(project.memberIds).toContain(project.ownerId);
      for (const id of project.memberIds) expect(memberIds.has(id)).toBe(true);
      for (const task of project.tasks) expect(project.memberIds).toContain(task.assigneeId);
      for (const note of project.notes) expect(memberIds.has(note.authorId)).toBe(true);
      expect(project.progress).toBe(
        (project.tasks.filter((task) => task.done).length / project.tasks.length) * 100,
      );
      if (project.status === 'Completed') expect(project.progress).toBe(100);
      expect(project.spent).toBeLessThanOrEqual(project.budget);
    }
    for (const invoice of data.invoices) {
      expect(projects.get(invoice.projectId)?.customerId).toBe(invoice.customerId);
      expect(invoice.issuedAt >= customers.get(invoice.customerId)!.joinedAt).toBe(true);
      expect(invoice.dueDate > invoice.issuedAt).toBe(true);
      if (invoice.status === 'Overdue') expect(invoice.dueDate < businessReferenceDate).toBe(true);
      if (invoice.status === 'Pending') expect(invoice.dueDate > businessReferenceDate).toBe(true);
    }
    for (const event of data.activity) {
      expect(memberIds.has(event.actorId)).toBe(true);
      if (event.page && event.recordId)
        expect(data[event.page].some((record) => record.id === event.recordId)).toBe(true);
    }
    const months = data.invoices.reduce<Record<string, number>>((result, invoice) => {
      const month = invoice.issuedAt.slice(0, 7);
      result[month] = (result[month] ?? 0) + 1;
      return result;
    }, {});
    expect(Object.values(months)).toEqual([4, 4, 4, 4, 4, 4]);
  });
  it('returns independent nested records for separate example sessions', () => {
    const first = createBusinessData();
    const second = createBusinessData();
    first.projects[0].tasks[0].done = false;
    first.projects[0].memberIds.push('usr-extra');
    first.customers[0].name = 'Edited customer';
    expect(second.projects[0].tasks[0].done).toBe(true);
    expect(second.projects[0].memberIds).not.toContain('usr-extra');
    expect(second.customers[0].name).toBe('Atlas Commerce');
  });
});
