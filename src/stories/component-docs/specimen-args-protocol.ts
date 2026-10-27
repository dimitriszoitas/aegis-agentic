/** Isolated docs specimens exchange only serializable Storybook args, never executable code. */
export const specimenArgsChannel = 'aegis:specimen-args';
export const specimenArgsVersion = 1;
export type SpecimenArgs = Record<string, unknown>;
export interface SpecimenPresentation {
  theme: 'light' | 'dark';
  layoutTheme: 'fundamental' | 'fundamental-floating';
}
export interface SpecimenArgsSnapshot {
  storyId: string;
  args: SpecimenArgs;
  initialArgs: SpecimenArgs;
  argTypes: Record<string, SpecimenArgs>;
  globals: SpecimenArgs;
}
export type SpecimenArgsCommand = {
  channel: typeof specimenArgsChannel;
  version: typeof specimenArgsVersion;
  session: string;
  storyId: string;
} & (
  | { type: 'connect' }
  | { type: 'update'; args: SpecimenArgs }
  | { type: 'reset'; names?: string[] }
  | { type: 'presentation'; presentation: SpecimenPresentation }
);
export type SpecimenArgsEvent = {
  channel: typeof specimenArgsChannel;
  version: typeof specimenArgsVersion;
  session: string;
  storyId: string;
} & ({ type: 'state'; snapshot: SpecimenArgsSnapshot } | { type: 'error'; message: string });
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
/** Functions, React elements, class instances and cycles are deliberately omitted. */
export function serializableRecord(value: unknown): SpecimenArgs {
  const seen = new WeakSet<object>();
  function visit(input: unknown, depth: number): unknown {
    if (
      input === null ||
      input === undefined ||
      typeof input === 'string' ||
      typeof input === 'boolean'
    )
      return input;
    if (typeof input === 'number') return Number.isFinite(input) ? input : undefined;
    if (typeof input !== 'object' || depth > 12 || seen.has(input)) return undefined;
    if (input instanceof Date)
      return Number.isNaN(input.valueOf()) ? undefined : input.toISOString();
    if (
      !Array.isArray(input) &&
      Object.getPrototypeOf(input) !== Object.prototype &&
      Object.getPrototypeOf(input) !== null
    )
      return undefined;
    if ('$$typeof' in input) return undefined;
    seen.add(input);
    const result = Array.isArray(input)
      ? input.map((entry) => visit(entry, depth + 1))
      : Object.fromEntries(
          Object.entries(input)
            .filter(([key]) => !forbidden.has(key))
            .flatMap(([key, entry]) => {
              const next = visit(entry, depth + 1);
              return next === undefined && entry !== undefined ? [] : [[key, next]];
            }),
        );
    seen.delete(input);
    return result;
  }
  const result = isRecord(value) ? visit(value, 0) : undefined;
  return isRecord(result) ? result : {};
}

/** A JSON control must never replace an authored value after omitting its behavior or nodes. */
export function specimenControlArgTypes(
  argTypes: SpecimenArgs,
  args: SpecimenArgs,
  initialArgs: SpecimenArgs,
): SpecimenArgsSnapshot['argTypes'] {
  const result = serializableRecord(argTypes) as SpecimenArgsSnapshot['argTypes'];
  function editable(input: unknown, ancestors: Set<object>, depth: number): boolean {
    if (input === undefined) return depth === 0;
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return true;
    if (typeof input === 'number') return Number.isFinite(input);
    if (typeof input !== 'object' || depth > 11 || ancestors.has(input)) return false;
    if (
      '$$typeof' in input ||
      (!Array.isArray(input) &&
        Object.getPrototypeOf(input) !== Object.prototype &&
        Object.getPrototypeOf(input) !== null) ||
      Object.getOwnPropertySymbols(input).length > 0
    )
      return false;
    const next = new Set(ancestors).add(input);
    if (Array.isArray(input))
      return Array.from({ length: input.length }, (_, index) => index).every(
        (index) => Object.hasOwn(input, index) && editable(input[index], next, depth + 1),
      );
    return Object.entries(input).every(
      ([key, value]) => !forbidden.has(key) && editable(value, next, depth + 1),
    );
  }
  for (const values of [initialArgs, args]) {
    for (const [key, value] of Object.entries(values)) {
      if (!forbidden.has(key) && !editable(value, new Set(), 0))
        result[key] = { ...result[key], control: false };
    }
  }
  return result;
}
export function isSpecimenMessage(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value.channel === specimenArgsChannel &&
    value.version === specimenArgsVersion &&
    typeof value.storyId === 'string' &&
    typeof value.session === 'string'
  );
}

/** Inputs are already sanitized by serializableRecord. Preserve undefined vs missing keys. */
export function sameSpecimenValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right))
    return (
      left.length === right.length &&
      left.every((value, index) => sameSpecimenValue(value, right[index]))
    );
  if (isRecord(left) && isRecord(right)) {
    const keys = Object.keys(left);
    return (
      keys.length === Object.keys(right).length &&
      keys.every((key) => Object.hasOwn(right, key) && sameSpecimenValue(left[key], right[key]))
    );
  }
  return false;
}
export function specimenArgOverrides(args: SpecimenArgs, initialArgs: SpecimenArgs): SpecimenArgs {
  return Object.fromEntries(
    Object.entries(args).filter(
      ([key, value]) =>
        !Object.hasOwn(initialArgs, key) || !sameSpecimenValue(value, initialArgs[key]),
    ),
  );
}
