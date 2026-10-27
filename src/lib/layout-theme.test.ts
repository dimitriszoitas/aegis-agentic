import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyLayoutTheme,
  defaultLayoutTheme,
  getInitialLayoutTheme,
  isLayoutTheme,
  layoutThemeOptions,
  layoutThemeStorageKey,
  normalizeLayoutTheme,
} from './layout-theme';

function browserStorage(stored: string | null = null) {
  const values = new Map<string, string>();
  if (stored !== null) values.set(layoutThemeStorageKey, stored);
  const localStorage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
  const browser = Object.assign(new EventTarget(), { localStorage });
  const root = { dataset: { theme: 'dark' } as Record<string, string> };
  vi.stubGlobal('window', browser);
  vi.stubGlobal('document', { documentElement: root });
  return { browser, localStorage, root };
}

afterEach(() => vi.unstubAllGlobals());

describe('Presentation themes', () => {
  it('exposes only the two canonical themes and uses Fundamental without a browser or preference', () => {
    expect(layoutThemeOptions).toEqual([
      { value: 'fundamental', label: 'Fundamental' },
      { value: 'fundamental-floating', label: 'Fundamental Floating' },
    ]);
    expect(defaultLayoutTheme).toBe('fundamental');
    expect(getInitialLayoutTheme()).toBe('fundamental');
    browserStorage();
    expect(getInitialLayoutTheme()).toBe('fundamental');
    expect(isLayoutTheme('floating')).toBe(false);
    expect(isLayoutTheme('fundamental-floating')).toBe(true);
  });

  it('migrates earlier saved presentations without exposing legacy choices', () => {
    for (const [legacy, canonical] of [
      ['floating', 'fundamental-floating'],
      ['fixed', 'fundamental'],
      ['minimalistic', 'fundamental'],
      ['v0-simple', 'fundamental'],
    ] as const) {
      const { localStorage } = browserStorage(legacy);
      expect(normalizeLayoutTheme(legacy)).toBe(canonical);
      expect(getInitialLayoutTheme()).toBe(canonical);
      expect(localStorage.getItem(layoutThemeStorageKey)).toBe(canonical);
    }
  });

  it('does not rewrite valid preferences and rejects unknown or inherited object keys', () => {
    const { localStorage } = browserStorage('fundamental-floating');
    expect(getInitialLayoutTheme()).toBe('fundamental-floating');
    expect(localStorage.setItem).not.toHaveBeenCalled();
    for (const invalid of [null, undefined, '', 'unknown', 'toString', '__proto__', 1, {}])
      expect(normalizeLayoutTheme(invalid)).toBeUndefined();
    browserStorage('unknown');
    expect(getInitialLayoutTheme()).toBe('fundamental');
  });

  it('supports blocked and read-only storage without losing a resolved legacy preference', () => {
    const { localStorage } = browserStorage('floating');
    localStorage.setItem.mockImplementation(() => {
      throw new Error('Storage is read-only');
    });
    expect(getInitialLayoutTheme()).toBe('fundamental-floating');
    localStorage.getItem.mockImplementation(() => {
      throw new Error('Storage is blocked');
    });
    expect(getInitialLayoutTheme()).toBe('fundamental');
    expect(() => applyLayoutTheme('fundamental-floating')).not.toThrow();
  });

  it('normalizes API aliases for portals, persistence and observers without changing the color theme', () => {
    const { browser, localStorage, root } = browserStorage();
    const changes: unknown[] = [];
    browser.addEventListener('aegis:layout-theme-change', (event) => {
      changes.push((event as CustomEvent<unknown>).detail);
    });
    expect(applyLayoutTheme('floating')).toBe('fundamental-floating');
    expect(root.dataset).toEqual({ theme: 'dark', layoutTheme: 'fundamental-floating' });
    expect(localStorage.getItem(layoutThemeStorageKey)).toBe('fundamental-floating');
    expect(changes).toEqual(['fundamental-floating']);
    applyLayoutTheme('fundamental', { persist: false });
    expect(root.dataset.layoutTheme).toBe('fundamental');
    expect(localStorage.getItem(layoutThemeStorageKey)).toBe('fundamental-floating');
    expect(changes).toEqual(['fundamental-floating', 'fundamental']);
  });

  it('resolves legacy API calls during server rendering without accessing browser globals', () => {
    expect(applyLayoutTheme('floating')).toBe('fundamental-floating');
    expect(applyLayoutTheme('fixed')).toBe('fundamental');
  });
});
