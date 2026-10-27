import { describe, it, expect } from 'vitest';
import { parseTimePreset, resolveTimeRange } from './time-range';
describe('Time ranges', () => {
  const now = Date.UTC(2026, 9, 6, 12);
  it('parses supported relative presets and rejects unknown input', () => {
    expect(parseTimePreset('Last 15m')).toBe('15m');
    expect(parseTimePreset('7d')).toBe('7d');
    expect(() => parseTimePreset('forever')).toThrow(RangeError);
  });
  it('resolves all presets against the supplied clock', () => {
    for (const [preset, minutes] of [
      ['15m', 15],
      ['1h', 60],
      ['24h', 1440],
      ['7d', 10080],
      ['30d', 43200],
    ] as const) {
      const r = resolveTimeRange({ mode: 'relative', preset }, now);
      expect(+r.to).toBe(now);
      expect(+r.to - +r.from).toBe(minutes * 60_000);
    }
  });
  it('preserves absolute offsets as instants', () => {
    const r = resolveTimeRange({
      mode: 'absolute',
      from: '2026-10-06T10:00:00+03:00',
      to: '2026-10-06T08:00:00Z',
    });
    expect(r.from.toISOString()).toBe('2026-10-06T07:00:00.000Z');
    expect(+r.to - +r.from).toBe(3600_000);
  });
  it('rejects reversed and invalid absolute intervals', () => {
    expect(() =>
      resolveTimeRange({ mode: 'absolute', from: '2026-10-07', to: '2026-10-06' }),
    ).toThrow(RangeError);
    expect(() => resolveTimeRange({ mode: 'absolute', from: 'invalid', to: '2026-10-06' })).toThrow(
      RangeError,
    );
  });
});
