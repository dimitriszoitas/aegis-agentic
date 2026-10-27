import { describe, expect, it } from 'vitest';
import { createBusinessData } from './business-data';
import {
  businessContext,
  businessMetrics,
  revenueSeries,
  streamBusinessResponse,
} from './business-logic';

describe('connected business workspace', () => {
  it('reconciles dashboard totals after an invoice is paid and a project completes', () => {
    const data = createBusinessData();
    const before = businessMetrics(data);
    const invoice = data.invoices.find((item) => item.status !== 'Paid')!;
    const amount = invoice.amount;
    invoice.status = 'Paid';
    data.projects.find((item) => item.status === 'Active')!.status = 'Completed';
    const after = businessMetrics(data);
    expect(after.collected).toBe(before.collected + amount);
    expect(after.outstanding).toBe(before.outstanding - amount);
    expect(after.activeProjects).toBe(before.activeProjects - 1);
    expect(revenueSeries(data).reduce((sum, point) => sum + point.value, 0)).toBe(after.collected);
    expect(revenueSeries(data, 3).map((point) => point.label)).toEqual(['Aug', 'Sep', 'Oct']);
  });
  it('limits detail context to its selected record rather than unrelated customer data', () => {
    const data = createBusinessData();
    for (const [page, id] of [
      ['projects', 'prj-1'],
      ['customers', 'cus-1'],
      ['team', 'usr-1'],
    ] as const) {
      const context = businessContext(data, { page, recordId: id });
      expect(context).toHaveLength(1);
      expect(context[0].id).toBe(id);
      expect(context[0].kind).toBe('record');
    }
  });
  it('streams supplied business context and citations without mutating records', async () => {
    const data = createBusinessData();
    const original = structuredClone(data);
    const context = businessContext(data, { page: 'projects', recordId: 'prj-1' });
    const events = [];
    for await (const event of streamBusinessResponse(
      { id: 'summary', prompt: 'Summarize this project', context },
      { delayMs: 0 },
    ))
      events.push(event);
    const content = events
      .filter((event) => event.type === 'token')
      .map((event) => event.text)
      .join('');
    expect(content).toContain(context[0].label);
    expect(events.filter((event) => event.type === 'citation')).toEqual([
      { type: 'citation', citation: context[0] },
    ]);
    expect(events.at(-1)).toEqual({ type: 'complete' });
    expect(data).toEqual(original);
    const controller = new AbortController();
    const stream = streamBusinessResponse(
      { id: 'stop', prompt: 'Summarize', context },
      { signal: controller.signal, delayMs: 0 },
    );
    await stream.next();
    controller.abort();
    await expect(stream.next()).rejects.toMatchObject({ name: 'AbortError' });
  });
});
