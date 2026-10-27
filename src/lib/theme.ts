import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';
export interface ApplyThemeOptions {
  /** Persist user choices; toolbar and one-off previews can opt out. */
  persist?: boolean;
}
export interface UseThemeResult {
  theme: Theme;
  preference: ThemePreference;
  setTheme: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

export const themeStorageKey = 'aegis-theme';
const themeChangeEvent = 'aegis:theme-change';

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getSystemTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function getThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Keep the theme class, data attribute, and native control palette in sync. */
export function applyTheme(
  preference: ThemePreference,
  { persist = true }: ApplyThemeOptions = {},
): Theme {
  const resolvedTheme = preference === 'system' ? getSystemTheme() : preference;
  if (typeof document === 'undefined') return resolvedTheme;
  const root = document.documentElement;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  if (persist) {
    try {
      window.localStorage.setItem(themeStorageKey, preference);
    } catch {
      // Private browsing and restricted embeds can still switch the active theme.
    }
  }
  window.dispatchEvent(new CustomEvent<ThemePreference>(themeChangeEvent, { detail: preference }));
  return resolvedTheme;
}

export function useTheme(): UseThemeResult {
  const [preference, setPreference] = useState<ThemePreference>(getThemePreference);
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);
  const theme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    const handleThemeChange = (event: Event) => {
      const next = (event as CustomEvent<unknown>).detail;
      if (isThemePreference(next)) setPreference(next);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === themeStorageKey || event.key === null) {
        setPreference(getThemePreference());
      }
    };
    media.addEventListener('change', handleSystemChange);
    window.addEventListener(themeChangeEvent, handleThemeChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      media.removeEventListener('change', handleSystemChange);
      window.removeEventListener(themeChangeEvent, handleThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    applyTheme(preference, { persist: false });
  }, [preference, theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setPreference(next);
    applyTheme(next);
  }, []);
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  return { theme, preference, setTheme, toggleTheme };
}
