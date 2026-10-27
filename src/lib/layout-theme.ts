import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

/** Presentation is independent of the light/dark color theme. */
export type LayoutTheme = 'fundamental' | 'fundamental-floating';
/** @deprecated Accepted only to migrate earlier saved preferences and API calls. */
export type LegacyLayoutTheme = 'floating' | 'fixed' | 'minimalistic' | 'v0-simple';
export type LayoutThemeInput = LayoutTheme | LegacyLayoutTheme;

export const defaultLayoutTheme: LayoutTheme = 'fundamental';
export const layoutThemeLabels: Record<LayoutTheme, string> = {
  fundamental: 'Fundamental',
  'fundamental-floating': 'Fundamental Floating',
};
export const layoutThemeOptions: readonly { value: LayoutTheme; label: string }[] = [
  { value: 'fundamental', label: layoutThemeLabels.fundamental },
  { value: 'fundamental-floating', label: layoutThemeLabels['fundamental-floating'] },
];
export const layoutThemeStorageKey = 'aegis-layout-theme';
const layoutThemeChangeEvent = 'aegis:layout-theme-change';
const legacyLayoutThemes: Record<LegacyLayoutTheme, LayoutTheme> = {
  floating: 'fundamental-floating',
  fixed: 'fundamental',
  minimalistic: 'fundamental',
  'v0-simple': 'fundamental',
};

/** True only for the two current selectable themes. */
export function isLayoutTheme(value: unknown): value is LayoutTheme {
  return value === 'fundamental' || value === 'fundamental-floating';
}

/** Resolve a current value or a legacy alias; unknown values remain distinguishable. */
export function normalizeLayoutTheme(value: unknown): LayoutTheme | undefined {
  if (isLayoutTheme(value)) return value;
  if (typeof value === 'string' && Object.hasOwn(legacyLayoutThemes, value))
    return legacyLayoutThemes[value as LegacyLayoutTheme];
  return undefined;
}

export function getInitialLayoutTheme(): LayoutTheme {
  if (typeof window === 'undefined') return defaultLayoutTheme;
  try {
    const stored = window.localStorage.getItem(layoutThemeStorageKey);
    const resolved = normalizeLayoutTheme(stored);
    if (resolved && resolved !== stored) {
      try {
        window.localStorage.setItem(layoutThemeStorageKey, resolved);
      } catch {
        // Read-only storage still permits the migrated theme for this session.
      }
    }
    return resolved ?? defaultLayoutTheme;
  } catch {
    return defaultLayoutTheme;
  }
}

/** Apply at the document root so portaled panels follow the selected presentation. */
export function applyLayoutTheme(
  theme: LayoutThemeInput,
  { persist = true }: { persist?: boolean } = {},
): LayoutTheme {
  const resolved = normalizeLayoutTheme(theme) ?? defaultLayoutTheme;
  if (typeof document === 'undefined') return resolved;
  document.documentElement.dataset.layoutTheme = resolved;
  if (persist) {
    try {
      window.localStorage.setItem(layoutThemeStorageKey, resolved);
    } catch {
      // Restricted embeds can still change the active presentation.
    }
  }
  window.dispatchEvent(new CustomEvent<LayoutTheme>(layoutThemeChangeEvent, { detail: resolved }));
  return resolved;
}

export function useLayoutTheme() {
  const [layoutTheme, setLayout] = useState<LayoutTheme>(getInitialLayoutTheme);
  useEffect(() => {
    const handleChange = (event: Event) => {
      const next = normalizeLayoutTheme((event as CustomEvent<unknown>).detail);
      if (next) setLayout(next);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === layoutThemeStorageKey || event.key === null)
        setLayout(getInitialLayoutTheme());
    };
    window.addEventListener(layoutThemeChangeEvent, handleChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(layoutThemeChangeEvent, handleChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
  useLayoutEffect(() => {
    applyLayoutTheme(layoutTheme, { persist: false });
  }, [layoutTheme]);
  const setLayoutTheme = useCallback((next: LayoutThemeInput) => {
    const resolved = applyLayoutTheme(next);
    setLayout(resolved);
  }, []);
  return { layoutTheme, setLayoutTheme };
}
