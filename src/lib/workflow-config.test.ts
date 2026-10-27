import { describe, expect, it } from 'vitest';
import { proposeWorkflowUpdate, simulateWorkflow, validateWorkflowConfig } from './workflow-config';
const source = `name: Invoice review
source: Billing
enabled: true
conditions:
  - field: status
    operator: equals
    value: in-review
actions:
  - type: assign
    value: elena
`;
describe('Local workflow configuration', () => {
  it('rejects unsupported predicates and duplicate keys rather than silently ignoring them', () => {
    expect(validateWorkflowConfig(source.replace('equals', 'regex')).errors).not.toHaveLength(0);
    expect(validateWorkflowConfig(source + 'enabled: false\n').errors).not.toHaveLength(0);
  });
  it('respects source, enabled state, and all conditions without changing the input', () => {
    const records = [
      { id: '1', source: 'Billing', status: 'in-review', severity: 'high' },
      { id: '2', source: 'Projects', status: 'in-review', severity: 'high' },
      { id: '3', source: 'Billing', status: 'completed', severity: 'high' },
    ];
    const before = structuredClone(records);
    expect(simulateWorkflow(source, records).map((result) => result.matched)).toEqual([
      true,
      false,
      false,
    ]);
    expect(
      simulateWorkflow(source.replace('enabled: true', 'enabled: false'), records).every(
        (result) => !result.matched && result.proposedActions.length === 0,
      ),
    ).toBe(true);
    expect(records).toEqual(before);
  });
  it('produces a separately reviewable action proposal and validates it', () => {
    const proposed = proposeWorkflowUpdate(source, { type: 'notify', value: 'workspace' });
    expect(validateWorkflowConfig(proposed).value?.actions).toHaveLength(2);
    expect(validateWorkflowConfig(source).value?.actions).toHaveLength(1);
  });
});
