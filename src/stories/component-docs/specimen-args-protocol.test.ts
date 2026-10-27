import { describe, expect, it } from 'vitest';
import {
  isSpecimenMessage,
  serializableRecord,
  specimenControlArgTypes,
  sameSpecimenValue,
  specimenArgOverrides,
  specimenArgsChannel,
  specimenArgsVersion,
} from './specimen-args-protocol';

describe('specimen args protocol', () => {
  it('hides lossy data controls while preserving safe wrapper data and primitive controls', () => {
    const initialArgs = {
      columns: [{ id: 'name', header: 'Name', accessorFn: () => 'Project' }],
      items: [{ label: 'Copy', icon: { $$typeof: Symbol.for('react.element'), type: 'svg' } }],
      options: [{ id: 'copy', label: 'Copy' }],
      disabled: false,
      optional: undefined,
    };
    expect(
      specimenControlArgTypes(
        { columns: { control: 'object' }, options: { control: 'object' } },
        initialArgs,
        initialArgs,
      ),
    ).toEqual({
      columns: { control: false },
      items: { control: false },
      options: { control: 'object' },
    });
  });
  it('protects class values, cycles and values JSON editing would coerce or omit', () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    const unsafe = {
      date: new Date('2026-10-25T12:00:00Z'),
      map: new Map([['key', 'value']]),
      cycle,
      missing: { value: undefined },
      invalid: [Number.NaN],
      sparse: new Array(1),
    };
    expect(specimenControlArgTypes({}, unsafe, {})).toEqual(
      Object.fromEntries(Object.keys(unsafe).map((key) => [key, { control: false }])),
    );
    const shared = { label: 'Reusable' };
    expect(specimenControlArgTypes({}, { options: [shared, shared] }, {})).toEqual({});
  });
  it('stores only changed args across a theme remount, including explicit undefined', () => {
    expect(
      specimenArgOverrides(
        { size: 'md', label: 'Edited', optional: undefined, data: [1, 2] },
        { size: 'md', label: 'Default', optional: 'Present', data: [1, 2] },
      ),
    ).toEqual({ label: 'Edited', optional: undefined });
    expect(specimenArgOverrides({ size: 'md' }, { size: 'md' })).toEqual({});
  });
  it('compares sanitized objects structurally and distinguishes absent keys', () => {
    expect(sameSpecimenValue({ a: 1, b: [false, null] }, { b: [false, null], a: 1 })).toBe(true);
    expect(sameSpecimenValue({ optional: undefined }, {})).toBe(false);
    expect(sameSpecimenValue([1, 2], [2, 1])).toBe(false);
  });
  it('preserves typed control values and explicit undefined resets', () => {
    const input = {
      disabled: false,
      size: 'lg',
      count: 0,
      optional: undefined,
      options: [1, null],
    };
    const result = serializableRecord(input);
    expect(result).toEqual(input);
    expect(Object.hasOwn(result, 'optional')).toBe(true);
    expect(result).not.toBe(input);
    expect(result.options).not.toBe(input.options);
  });

  it('omits executable and React values without dropping safe sibling args', () => {
    const result = serializableRecord({
      label: 'Create project',
      onClick: () => undefined,
      icon: { $$typeof: Symbol.for('react.transitional.element'), type: 'svg', props: {} },
      mapping: { primary: 'blue', secondary: () => undefined },
      invalid: Number.NaN,
      date: new Date('2026-10-25T12:00:00Z'),
    });
    expect(result).toEqual({
      label: 'Create project',
      mapping: { primary: 'blue' },
      date: '2026-10-25T12:00:00.000Z',
    });
  });

  it('removes cycles and unsafe keys while retaining repeated safe references', () => {
    const shared = { title: 'Shared' };
    const cyclic: Record<string, unknown> = { title: 'Current', first: shared, second: shared };
    cyclic.self = cyclic;
    Object.assign(cyclic, JSON.parse('{"constructor":"unsafe","prototype":"unsafe"}'));
    expect(serializableRecord(cyclic)).toEqual({ title: 'Current', first: shared, second: shared });
    expect(serializableRecord(JSON.parse('{"__proto__":{"polluted":true}}'))).toEqual({});
  });

  it('does not treat arbitrary class instances as an args record', () => {
    expect(serializableRecord(new Date())).toEqual({});
    expect(serializableRecord(new Map())).toEqual({});
    expect(serializableRecord(null)).toEqual({});
  });

  it('requires a matching version and explicit story/session identifiers', () => {
    const message = {
      channel: specimenArgsChannel,
      version: specimenArgsVersion,
      storyId: 'components-actions-button--playground',
      session: 'isolated-session',
      type: 'connect',
    };
    expect(isSpecimenMessage(message)).toBe(true);
    expect(isSpecimenMessage({ ...message, version: 99 })).toBe(false);
    expect(isSpecimenMessage({ ...message, session: undefined })).toBe(false);
    expect(isSpecimenMessage({ ...message, storyId: undefined })).toBe(false);
    expect(isSpecimenMessage({ ...message, channel: 'unrelated' })).toBe(false);
  });
});
