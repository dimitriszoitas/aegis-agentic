import { parseDocument } from 'yaml';

export type WorkflowField = 'status' | 'source' | 'severity';
export interface WorkflowCondition {
  field: WorkflowField;
  operator: 'equals' | 'contains';
  value: string;
}
export interface WorkflowAction {
  type: 'assign' | 'notify' | 'set-status';
  value: string;
}
export interface WorkflowDefinition {
  name: string;
  description?: string;
  source: string;
  enabled: boolean;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
}
export interface WorkflowValidation {
  value?: WorkflowDefinition;
  errors: string[];
}
const fields = new Set(['status', 'source', 'severity']);
const operators = new Set(['equals', 'contains']);
const actions = new Set(['assign', 'notify', 'set-status']);
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Bounded local configuration schema; unsupported conditions fail explicitly. */
export function validateWorkflowConfig(source: string): WorkflowValidation {
  if (source.length > 200000)
    return { errors: ['Keep the configuration below 200,000 characters.'] };
  try {
    const document = parseDocument(source, { uniqueKeys: true });
    if (document.errors.length) return { errors: document.errors.map((error) => error.message) };
    const value: unknown = document.toJS({ maxAliasCount: 100 });
    if (!isObject(value)) return { errors: ['The configuration must be a YAML mapping.'] };
    const errors: string[] = [];
    if (typeof value.name !== 'string' || !value.name.trim()) errors.push('Add a workflow name.');
    if (typeof value.source !== 'string' || !value.source.trim()) errors.push('Add a source.');
    if (typeof value.enabled !== 'boolean') errors.push('Set enabled to true or false.');
    if (value.description !== undefined && typeof value.description !== 'string')
      errors.push('Use text for the description.');
    if (!Array.isArray(value.conditions) || !value.conditions.length)
      errors.push('Add at least one condition.');
    else
      value.conditions.forEach((condition, index) => {
        if (
          !isObject(condition) ||
          !fields.has(String(condition.field)) ||
          !operators.has(String(condition.operator)) ||
          typeof condition.value !== 'string' ||
          !condition.value.trim()
        )
          errors.push(
            `Condition ${index + 1} needs status, source, or severity; equals or contains; and a nonempty text value.`,
          );
        else if (
          Object.keys(condition).some((key) => !['field', 'operator', 'value'].includes(key))
        )
          errors.push(`Condition ${index + 1} contains unsupported fields.`);
      });
    if (!Array.isArray(value.actions) || !value.actions.length)
      errors.push('Add at least one action.');
    else
      value.actions.forEach((action, index) => {
        if (
          !isObject(action) ||
          !actions.has(String(action.type)) ||
          typeof action.value !== 'string' ||
          !action.value.trim()
        )
          errors.push(
            `Action ${index + 1} needs assign, notify, or set-status and a nonempty text value.`,
          );
        else if (Object.keys(action).some((key) => !['type', 'value'].includes(key)))
          errors.push(`Action ${index + 1} contains unsupported fields.`);
      });
    return errors.length ? { errors } : { value: value as unknown as WorkflowDefinition, errors };
  } catch (error) {
    return {
      errors: [error instanceof Error ? error.message : 'The configuration could not be parsed.'],
    };
  }
}
export interface WorkflowSampleRecord {
  id: string;
  status: string;
  source: string;
  severity: string;
}
export interface WorkflowSimulationResult<T extends WorkflowSampleRecord> {
  record: T;
  matched: boolean;
  proposedActions: WorkflowAction[];
}
/** Simulates supplied records only. No record is mutated and no action is executed. */
export function simulateWorkflow<T extends WorkflowSampleRecord>(
  source: string,
  records: readonly T[],
): WorkflowSimulationResult<T>[] {
  const validation = validateWorkflowConfig(source);
  if (!validation.value) throw new Error(validation.errors[0]);
  if (records.length > 10000) throw new Error('Use at most 10,000 records in a local simulation.');
  const workflow = validation.value;
  return records.map((record) => {
    const matched =
      workflow.enabled &&
      record.source === workflow.source &&
      workflow.conditions.every((condition) => {
        const actual = record[condition.field];
        return condition.operator === 'equals'
          ? actual === condition.value
          : actual.includes(condition.value);
      });
    return {
      record,
      matched,
      proposedActions: matched ? workflow.actions.map((action) => ({ ...action })) : [],
    };
  });
}
export function setWorkflowMetadata(
  source: string,
  details: { name: string; description: string; id?: string },
): string {
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length || !isObject(document.toJS({ maxAliasCount: 100 })))
    throw new Error('Fix the YAML mapping before changing its metadata.');
  document.set('name', details.name);
  document.set('description', details.description);
  if (details.id) document.set('id', details.id);
  return document.toString();
}
/** Returns a reviewable proposal; the caller decides whether to apply it. */
export function proposeWorkflowUpdate(source: string, action: WorkflowAction): string {
  const validation = validateWorkflowConfig(source);
  if (!validation.value) throw new Error(validation.errors[0]);
  const document = parseDocument(source, { uniqueKeys: true });
  document.set('actions', [...validation.value.actions, action]);
  const proposed = document.toString();
  const next = validateWorkflowConfig(proposed);
  if (next.errors.length) throw new Error(next.errors[0]);
  return proposed;
}
