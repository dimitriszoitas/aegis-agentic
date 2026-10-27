import type { PlaygroundControl, PlaygroundControlValue } from './playground-controls';
import { isRecord, type SpecimenArgs } from './specimen-args-protocol';
import type { ComponentMetadata } from './types';

const nativeOptions = new Set([
  'children',
  'disabled',
  'readOnly',
  'required',
  'placeholder',
  'value',
  'defaultValue',
  'checked',
  'defaultChecked',
  'type',
  'min',
  'max',
  'step',
  'rows',
]);
const excluded =
  /^(?:on[A-Z]|aria-|data-)|^(?:ref|className|style|render|as|asChild|id|key|slot|tabIndex|form|formAction|formMethod|formTarget|formEncType|formNoValidate|autoFocus|nativeButton)$/;
const scalar = (value: unknown): value is PlaygroundControlValue =>
  typeof value === 'string' ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));

function defaultValue(value?: string): unknown {
  if (!value || value === 'undefined') return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
function literalOptions(type: string): PlaygroundControlValue[] {
  return [...type.matchAll(/(?:^|\|)\s*(?:"([^"]*)"|'([^']*)'|(-?\d+(?:\.\d+)?))\s*(?=\||$)/g)].map(
    (match) => match[1] ?? match[2] ?? Number(match[3]),
  );
}

/** Only supported component props and authored story options become controls. */
export function playgroundControls(
  meta: ComponentMetadata,
  argTypes: Record<string, SpecimenArgs>,
  args: SpecimenArgs,
): PlaygroundControl[] {
  const main = meta.exportNames?.[0] ?? meta.name;
  const props = new Map(
    meta.props.filter((prop) => prop.component === main).map((prop) => [prop.name, prop]),
  );
  const variants = new Map(meta.variants.map((variant) => [variant.name, variant]));
  const names = new Set([
    ...Object.keys(argTypes),
    ...Object.keys(args),
    ...[...props.values()]
      .filter((prop) => !prop.inherited || nativeOptions.has(prop.name))
      .map((prop) => prop.name),
  ]);
  const controls: PlaygroundControl[] = [];
  for (const name of names) {
    if (excluded.test(name)) continue;
    // These initialize uncontrolled state once; changing them is not a live control.
    if (/^(?:default|initial)[A-Z]/.test(name)) continue;
    const prop = props.get(name);
    const arg = argTypes[name] ?? {};
    const table = isRecord(arg.table) ? arg.table : {};
    if (arg.control === false || table.disable === true) continue;
    if (prop?.inherited && !nativeOptions.has(name)) continue;
    if (!prop && !Object.hasOwn(args, name) && !arg.control) continue;
    const configuration = isRecord(arg.control) ? arg.control : {};
    const kind = typeof arg.control === 'string' ? arg.control : configuration.type;
    const type =
      prop?.type ?? (isRecord(arg.type) && typeof arg.type.name === 'string' ? arg.type.name : '');
    const variant = variants.get(name);
    const options =
      Array.isArray(arg.options) && arg.options.every(scalar)
        ? arg.options
        : (variant?.values ?? literalOptions(type));
    const value = args[name];
    const control: PlaygroundControl = {
      name,
      label: typeof arg.name === 'string' ? arg.name : name,
      type: 'text',
      description:
        typeof arg.description === 'string'
          ? arg.description || undefined
          : prop?.description || undefined,
      defaultValue: value ?? defaultValue(prop?.defaultValue) ?? variant?.default,
    };
    if (kind === 'boolean') {
      control.type = 'boolean';
    } else if (
      options.length &&
      kind !== 'multi-select' &&
      kind !== 'check' &&
      kind !== 'inline-check'
    ) {
      control.type = 'select';
      const labels = isRecord(configuration.labels) ? configuration.labels : {};
      control.options = options.map((option) => ({
        value: option,
        label:
          typeof labels[String(option)] === 'string'
            ? (labels[String(option)] as string)
            : String(option),
      }));
    } else if (/^(?:boolean)(?:\s*\|\s*undefined)?$/.test(type) || typeof value === 'boolean') {
      control.type = 'boolean';
    } else if (
      kind === 'number' ||
      kind === 'range' ||
      /^(?:number)(?:\s*\|\s*undefined)?$/.test(type) ||
      typeof value === 'number'
    ) {
      control.type = 'number';
      for (const key of ['min', 'max', 'step'] as const) {
        if (typeof configuration[key] === 'number') control[key] = configuration[key];
      }
    } else if (
      kind === 'text' ||
      typeof value === 'string' ||
      /^(?:string)(?:\s*\|\s*undefined)?$/.test(type)
    ) {
      control.type = 'text';
      control.multiline = name === 'children' || name === 'description' || name === 'content';
    } else if (
      (kind === 'object' || kind === 'multi-select' || kind === 'check') &&
      value !== undefined &&
      value !== null &&
      (Array.isArray(value) || isRecord(value))
    ) {
      control.type = 'json';
    } else continue;
    controls.push(control);
  }
  return controls;
}
