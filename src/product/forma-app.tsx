import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import {
  LayoutDashboard,
  UserRound,
  Layers,
  FileChartColumn,
  Settings,
  Sun,
  Moon,
  PanelLeft,
  ChevronRight,
} from '@/components/icon';
import { Modal } from '@/components/modal';
import { Notification } from '@/components/notification';
import { SideNav } from '@/components/side-nav';
import { Toaster, showToast } from '@/components/toast';
import { applyTheme } from '@/lib/theme';
import { applyLayoutTheme } from '@/lib/layout-theme';
import { componentToken } from '@/lib/component-design-tokens';
import { DashboardPage } from './dashboard';
import { UsersPage } from './users';
import { ProductsPage } from './products';
import { InvoicesPage } from './invoices';
import { SettingsPage } from './settings';
import { createInitialState, parseStoredState, STORAGE_KEY } from './model';
import type { FormaState, FormaStore, Page } from './types';
import './forma.css';

const pages = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'users', label: 'Users', Icon: UserRound },
  { id: 'products', label: 'Products', Icon: Layers },
  { id: 'invoices', label: 'Invoices', Icon: FileChartColumn },
  { id: 'settings', label: 'Settings', Icon: Settings },
] as const;
function currentPage(): Page {
  const id = window.location.hash.slice(1);
  return pages.find((p) => p.id === id)?.id ?? 'dashboard';
}
function loadWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: createInitialState(), warning: '' };
    const saved = parseStoredState(raw);
    return {
      state: saved ?? createInitialState(),
      warning: saved
        ? ''
        : 'The saved demo data was incompatible. A fresh demo workspace has been loaded.',
    };
  } catch {
    return {
      state: createInitialState(),
      warning: 'Browser storage is unavailable. Changes will last for this session only.',
    };
  }
}

export interface FormaAppProps {
  /** An embedding host owns document navigation and the theme of portaled content. */
  embedded?: boolean;
  theme?: FormaState['settings']['theme'];
  onThemeChange?: (theme: FormaState['settings']['theme']) => void;
}

export function FormaApp({ embedded = false, theme, onThemeChange }: FormaAppProps = {}) {
  const [loaded] = useState(loadWorkspace);
  const [workspace, setWorkspace] = useState<FormaState>(loaded.state);
  const state = useMemo(
    () =>
      theme === undefined || theme === workspace.settings.theme
        ? workspace
        : { ...workspace, settings: { ...workspace.settings, theme } },
    [workspace, theme],
  );
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);
  const [storageError, setStorageError] = useState(loaded.warning);
  const [page, setPage] = useState<Page>(() => (embedded ? 'dashboard' : currentPage()));
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const firstPage = useRef(true);
  const notice = useCallback((title: string) => {
    showToast({ title });
  }, []);
  const navigate = useCallback(
    (next: Page) => {
      if (!embedded) window.location.hash = next;
      setPage(next);
      setMobileNav(false);
    },
    [embedded],
  );
  const update = useCallback(
    (change: (current: FormaState) => FormaState) => {
      const current = stateRef.current;
      const next = change(current);
      stateRef.current = next;
      setWorkspace(next);
      if (next.settings.theme !== current.settings.theme) onThemeChange?.(next.settings.theme);
    },
    [onThemeChange],
  );
  useEffect(() => {
    if (embedded) return;
    function fromHistory() {
      setPage(currentPage());
    }
    window.addEventListener('hashchange', fromHistory);
    return () => window.removeEventListener('hashchange', fromHistory);
  }, [embedded]);
  useLayoutEffect(() => {
    if (embedded) return;
    applyTheme(state.settings.theme, { persist: false });
    applyLayoutTheme('fundamental-floating', { persist: false });
  }, [embedded, state.settings.theme]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setStorageError(
        'Your browser could not save these changes. Export your workspace in Settings to keep a copy.',
      );
    }
  }, [state]);
  useEffect(() => {
    if (!embedded) document.title = `${pages.find((p) => p.id === page)?.label} · Forma`;
    if (firstPage.current) {
      firstPage.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
    mainRef.current?.scrollTo({ top: 0 });
  }, [embedded, page]);
  const props: FormaStore = { state, update, notice, navigate };
  const activePage = pages.find((p) => p.id === page)!;
  const navItems = pages.map(({ id, label, Icon }) => ({
    id,
    label,
    icon: <Icon size={componentToken('application.icon-navigation')} />,
    ...(id === 'users' ? { count: state.users.length } : {}),
  }));
  const switchTheme = () =>
    update((s) => ({
      ...s,
      settings: { ...s.settings, theme: s.settings.theme === 'dark' ? 'light' : 'dark' },
    }));
  return (
    <div className="forma-app">
      <a
        className="forma-skip"
        href="#forma-main"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus({ preventScroll: true });
          mainRef.current?.scrollTo({ top: 0 });
        }}
      >
        Skip to content
      </a>
      <aside className="forma-sidebar">
        <SideNav
          brandName="forma"
          brandIcon={<Layers size={componentToken('application.icon-navigation')} />}
          workspace={state.settings.workspace}
          workspaceContent={
            <div className="forma-workspace-summary">
              <Avatar name={state.settings.workspace} size="sm" />
              <div className="forma-cell-person">
                <strong>{state.settings.workspace}</strong>
                <span className="forma-muted">Team workspace</span>
              </div>
            </div>
          }
          showSearch={false}
          sections={[{ label: 'WORKSPACE', items: navItems }]}
          activeId={page}
          onNavigate={(id) => navigate(id as Page)}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          footer={(isCollapsed) => (
            <div className="forma-nav-footer">
              {!isCollapsed && (
                <>
                  <span className="forma-eyebrow">YOUR WORKSPACE</span>
                  <span className="forma-muted">Demo data · saved in this browser</span>
                </>
              )}
              <Button
                emphasis="ghost"
                onClick={() => navigate('settings')}
                aria-label="Workspace settings"
              >
                <span className="forma-inline">
                  <Avatar name="Alex Morgan" size="sm" />
                  {!isCollapsed && (
                    <span className="forma-user-label">
                      Alex Morgan<small>Workspace owner</small>
                    </span>
                  )}
                </span>
              </Button>
            </div>
          )}
        />
      </aside>
      <div className="forma-workspace">
        <header className="forma-topbar">
          <div className="forma-inline">
            <span className="forma-mobile-menu">
              <IconButton
                aria-label="Open navigation"
                emphasis="ghost"
                onClick={() => setMobileNav(true)}
              >
                <PanelLeft size={componentToken('application.icon-navigation')} />
              </IconButton>
            </span>
            <span className="forma-topbar-workspace">{state.settings.workspace}</span>
            <ChevronRight size={componentToken('application.icon-sm')} />
            <span>{activePage.label}</span>
          </div>
          <div className="forma-inline">
            <span className="forma-local-label">Demo workspace</span>
            <IconButton
              aria-label={`Switch to ${state.settings.theme === 'dark' ? 'light' : 'dark'} mode`}
              emphasis="ghost"
              onClick={switchTheme}
            >
              {state.settings.theme === 'dark' ? (
                <Sun size={componentToken('application.icon-navigation')} />
              ) : (
                <Moon size={componentToken('application.icon-navigation')} />
              )}
            </IconButton>
            <IconButton
              aria-label="Open settings"
              emphasis="ghost"
              onClick={() => navigate('settings')}
            >
              <Avatar name="Alex Morgan" size="sm" />
            </IconButton>
          </div>
        </header>
        <main id="forma-main" className="forma-main" ref={mainRef} tabIndex={-1}>
          {storageError && (
            <Notification intent="warning" title="Local storage" description={storageError} />
          )}
          {page === 'dashboard' && <DashboardPage {...props} />}
          {page === 'users' && <UsersPage {...props} />}
          {page === 'products' && <ProductsPage {...props} />}
          {page === 'invoices' && <InvoicesPage {...props} />}
          {page === 'settings' && <SettingsPage {...props} />}
          <footer className="forma-page-footer">
            <span>Forma — a little more clarity.</span>
            <span>Sample data. Changes stay in this browser.</span>
          </footer>
        </main>
      </div>
      <Modal open={mobileNav} onOpenChange={setMobileNav} title="Your workspace" size="small">
        <nav aria-label="Mobile navigation" className="forma-stack">
          {pages.map(({ id, label, Icon }) => (
            <Button
              key={id}
              emphasis={page === id ? 'secondary' : 'ghost'}
              aria-current={page === id ? 'page' : undefined}
              leadingIcon={<Icon size={componentToken('application.icon-navigation')} />}
              onClick={() => navigate(id)}
            >
              {label}
            </Button>
          ))}
        </nav>
      </Modal>
      <Toaster position="top-center" />
    </div>
  );
}
