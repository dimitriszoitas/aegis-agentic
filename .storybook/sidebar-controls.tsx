import React, { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { useGlobals, useStorybookApi, useStorybookState } from 'storybook/manager-api';
import { useTheme } from 'storybook/theming';
import { version } from '../package.json';
import { managerTheme } from './manager-theme';
import { ManagerThemeSelect } from './theme-select';
import { readHubNavigationUpdate } from '../src/stories/component-docs/hub-navigation';

const mobileQuery = window.matchMedia('(max-width: 599px)');
const railWidth = 64;
const sidebarPreferenceKey = 'aegis-storybook-sidebar';
function readSidebarPreference(): { collapsed: boolean; width: number } | null {
  try {
    const stored = JSON.parse(localStorage.getItem(sidebarPreferenceKey) ?? 'null');
    return stored && typeof stored.collapsed === 'boolean'
      ? { collapsed: stored.collapsed, width: Math.max(240, Number(stored.width) || 280) }
      : null;
  } catch {
    return null;
  }
}
function saveSidebarPreference(collapsed: boolean, width: number) {
  try {
    localStorage.setItem(sidebarPreferenceKey, JSON.stringify({ collapsed, width }));
  } catch {
    // Session sizing still works when persistent storage is unavailable.
  }
}
function SidebarIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" />
      <path d="M5.5 3v10" stroke="currentColor" />
      <path d={expanded ? 'm10 6-2 2 2 2' : 'm9 6 2 2-2 2'} stroke="currentColor" />
    </svg>
  );
}
const subscribeMobile = (notify: () => void) => {
  mobileQuery.addEventListener('change', notify);
  return () => mobileQuery.removeEventListener('change', notify);
};

/** Storybook has no footer slot. Keep its native tree and mount only our controls
 * in its stable sidebar container from the supported preview-wrapper API. */
export function SidebarControls({ children }: PropsWithChildren) {
  const api = useStorybookApi();
  const { layout } = useStorybookState();
  const [globals, updateGlobals] = useGlobals();
  const theme = useTheme();
  const mobile = useSyncExternalStore(subscribeMobile, () => mobileQuery.matches);
  const collapsed = !mobile && layout.navSize <= railWidth;
  const expanded = mobile ? layout.showMobileNavigation : !collapsed;
  const storedPreference = useRef(readSidebarPreference());
  const preferenceRestored = useRef(false);
  const expandedWidth = useRef(storedPreference.current?.width ?? 280);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [header, setHeader] = useState<HTMLElement | null>(null);
  const nextFocus = useRef<'open' | 'closed' | null>(null);
  const dark =
    globals.theme === 'light' || globals.theme === 'dark'
      ? globals.theme === 'dark'
      : theme.base === 'dark';
  const colors = {
    '--manager-footer-background':
      globals.layoutTheme === 'fundamental-floating'
        ? theme.input.background
        : theme.background.app,
    '--manager-sidebar-surface': theme.input.background,
    '--manager-sidebar-shadow': dark
      ? '0 1px 2px rgb(8 9 10 / 7.8%), 0 4px 12px rgb(8 9 10 / 7.8%)'
      : '0 1px 2px rgb(8 9 10 / 3.84%), 0 4px 12px rgb(8 9 10 / 3.84%)',
    '--manager-footer-text': theme.color.defaultText,
    '--manager-footer-muted': theme.textMutedColor,
    '--manager-footer-border': theme.appBorderColor,
    '--manager-footer-control': theme.input.background,
    '--manager-footer-accent': theme.color.secondary,
  } as CSSProperties;

  useLayoutEffect(() => {
    const receive = (event: MessageEvent) => {
      const preview = document.querySelector<HTMLIFrameElement>('#storybook-preview-iframe');
      const query = readHubNavigationUpdate(
        event,
        preview?.contentWindow ?? null,
        new URL(window.location.href),
      );
      if (query) api.setQueryParams(query);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [api]);

  useLayoutEffect(() => {
    // SET_CONFIG reapplies Storybook's initial persisted layout. The public API
    // changes only the current theme, keeping sidebar width and drawer state.
    api.setOptions({ theme: managerTheme(dark) });
  }, [api, dark]);

  useLayoutEffect(() => {
    if (mobile) return;
    if (!preferenceRestored.current) {
      preferenceRestored.current = true;
      const stored = storedPreference.current;
      if (stored) {
        const size = stored.collapsed ? railWidth : stored.width;
        if (layout.navSize !== size) {
          api.setSizes({ navSize: size });
          return;
        }
      }
    }
    // Native hide shortcuts also collapse to the visible rail on desktop.
    if (layout.navSize === 0) {
      api.setSizes({ navSize: railWidth });
      return;
    }
    if (layout.navSize > railWidth) expandedWidth.current = Math.max(240, layout.navSize);
    saveSidebarPreference(layout.navSize <= railWidth, expandedWidth.current);
  }, [api, layout.navSize, mobile]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const setModality = (mode: 'pointer' | 'keyboard') => {
      root.dataset.aegisManagerFocus = mode;
    };
    const onPointer = () => setModality('pointer');
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const editing = target?.closest('input, textarea, [contenteditable="true"]');
      // Text entry and caret movement retain the field's activation mode. Tab,
      // search-result navigation and shortcuts deliberately reveal keyboard focus.
      const searchNavigation =
        target?.id === 'storybook-explorer-searchfield' &&
        ['ArrowDown', 'ArrowUp'].includes(event.key);
      if (
        event.key === 'Tab' ||
        searchNavigation ||
        (!editing && !['Shift', 'Control', 'Alt', 'Meta'].includes(event.key))
      )
        setModality('keyboard');
    };
    setModality('pointer');
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey, true);
      delete root.dataset.aegisManagerFocus;
    };
  }, []);

  useLayoutEffect(() => {
    if (!host) return;
    host.style.setProperty('--manager-search-active-border', theme.textMutedColor);
    host.style.setProperty('--manager-search-focus', theme.color.secondary);
    return () => {
      host.style.removeProperty('--manager-search-active-border');
      host.style.removeProperty('--manager-search-focus');
    };
  }, [host, theme.textMutedColor, theme.color.secondary]);

  useLayoutEffect(() => {
    const locateSidebar = () => {
      const sidebar = document.querySelector<HTMLElement>('.sidebar-container');
      setHost(sidebar);
      setHeader(sidebar?.querySelector<HTMLElement>('.sidebar-header') ?? null);
    };
    locateSidebar();
    const observer = new MutationObserver(locateSidebar);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (nextFocus.current === 'closed' && !expanded) {
      // The native mobile drawer removes its inert backdrop after this render.
      // Storybook's focus helper waits until the target can actually receive focus.
      api.focusOnUIElement(mobile ? 'aegis-sidebar-reopen' : 'aegis-sidebar-toggle', {
        poll: true,
      });
      nextFocus.current = null;
    } else if (nextFocus.current === 'open' && expanded && host) {
      if (mobile) {
        api.focusOnUIElement('storybook-explorer-tree', { poll: true, forceFocus: true });
      } else {
        api.focusOnUIElement('storybook-explorer-searchfield', { poll: true });
      }
      nextFocus.current = null;
    }
  }, [api, expanded, host, mobile]);

  useLayoutEffect(() => {
    if (!host) return;
    host.dataset.aegisCollapsed = String(collapsed);
    host.dataset.managerLayout =
      globals.layoutTheme === 'fundamental-floating' ? 'fundamental-floating' : 'fundamental';
    for (const [name, value] of Object.entries(colors)) host.style.setProperty(name, String(value));
    if (collapsed)
      for (const element of host.querySelectorAll<HTMLElement>('*'))
        if (element.scrollTop) element.scrollTop = 0;
  });

  const toggle = (open: boolean) => {
    nextFocus.current = open ? 'open' : 'closed';
    if (mobile) api.toggleNav(open);
    else api.setSizes({ navSize: open ? expandedWidth.current : railWidth });
  };

  return (
    <>
      {children}
      {header &&
        createPortal(
          <button
            id="aegis-sidebar-toggle"
            type="button"
            className="aegis-manager-sidebar-toggle"
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={expanded}
            aria-controls="storybook-explorer-tree"
            onClick={() => toggle(!expanded)}
          >
            <SidebarIcon expanded={expanded} />
          </button>,
          header,
        )}
      {host &&
        createPortal(
          <section className="aegis-manager-footer" aria-label="Appearance" style={colors}>
            {!collapsed && (
              <ManagerThemeSelect
                value={
                  globals.layoutTheme === 'fundamental-floating'
                    ? 'fundamental-floating'
                    : 'fundamental'
                }
                onValueChange={(layoutTheme) => updateGlobals({ layoutTheme })}
              />
            )}
            <div className="aegis-manager-color-mode">
              <span className="aegis-manager-mode-label">Dark mode</span>
              <button
                type="button"
                className="aegis-manager-mode-switch"
                role="switch"
                aria-label="Dark mode"
                aria-checked={dark}
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={() => updateGlobals({ theme: dark ? 'light' : 'dark' })}
              >
                <span className="aegis-manager-switch-thumb" />
              </button>
            </div>
            <div className="aegis-manager-footer-meta">
              <span aria-label={`Aegis version ${version}`}>v{version}</span>
            </div>
          </section>,
          host,
        )}
      {createPortal(
        <button
          id="aegis-sidebar-reopen"
          type="button"
          className="aegis-manager-reopen"
          style={colors}
          hidden={!mobile || expanded}
          aria-expanded={expanded}
          aria-controls="storybook-explorer-tree"
          onClick={() => toggle(true)}
        >
          Open sidebar
        </button>,
        document.body,
      )}
    </>
  );
}
