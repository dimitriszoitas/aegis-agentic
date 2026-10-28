import { useEffect, useRef, useState } from 'react';
import { SideNav } from '@dimitriszoitas/aegis-agentic/side-nav';
import { Avatar } from '@dimitriszoitas/aegis-agentic/avatar';
import { Button } from '@dimitriszoitas/aegis-agentic/button';
import { Tag } from '@dimitriszoitas/aegis-agentic/tag';
import { applyTheme, type Theme } from '@dimitriszoitas/aegis-agentic/theme';
import { CustomersPage } from './customers';
import { RequestsPage } from './requests';
import { RelayMark } from './patterns';
import {
  initialCustomers,
  initialRequests,
  type NewRequestInput,
  type RelayRequest,
  type RequestPatch,
} from './model';

const requestsStorageKey = 'relay.demo.requests.v1';
const themeStorageKey = 'relay.demo.theme.v1';
type Page = 'requests' | 'customers';

function readRequests(): RelayRequest[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(requestsStorageKey) ?? 'null');
    if (
      Array.isArray(stored) &&
      stored.every(
        (request) =>
          request &&
          typeof request === 'object' &&
          typeof request.id === 'string' &&
          typeof request.title === 'string' &&
          typeof request.customerId === 'string' &&
          typeof request.description === 'string' &&
          typeof request.createdAt === 'string' &&
          typeof request.updatedAt === 'string' &&
          ['open', 'in-progress', 'waiting', 'resolved'].includes(request.status) &&
          ['low', 'normal', 'high', 'urgent'].includes(request.priority) &&
          Array.isArray(request.labels) &&
          request.labels.every((label: unknown) => typeof label === 'string'),
      )
    )
      return stored as RelayRequest[];
  } catch {
    /* Unavailable storage still permits an in-memory demo. */
  }
  return initialRequests.map((request) => ({ ...request, labels: [...request.labels] }));
}

function readTheme(): Theme {
  try {
    return localStorage.getItem(themeStorageKey) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}
function readPage(): Page {
  return window.location.hash === '#customers' ? 'customers' : 'requests';
}

function NavigationIcon({ kind }: { kind: Page }) {
  return (
    <svg
      className="relay-nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      {kind === 'requests' ? (
        <>
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M8 3v4M16 3v4M8 11h8M8 15h5" />
        </>
      ) : (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" />
        </>
      )}
    </svg>
  );
}

export function App() {
  const [page, setPage] = useState<Page>(readPage);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [requests, setRequests] = useState<RelayRequest[]>(readRequests);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const main = useRef<HTMLElement>(null);
  const openRequests = requests.filter((request) => request.status !== 'resolved').length;

  useEffect(() => {
    applyTheme(theme, { persist: false });
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      /* Theme remains active. */
    }
  }, [theme]);
  useEffect(() => {
    try {
      localStorage.setItem(requestsStorageKey, JSON.stringify(requests));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [requests]);
  useEffect(() => {
    const onHashChange = () => setPage(readPage());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  function navigate(id: string) {
    if (id !== 'requests' && id !== 'customers') return;
    setPage(id);
    window.location.hash = id;
    requestAnimationFrame(() => main.current?.focus());
  }
  function createRequest(input: NewRequestInput) {
    const title = input.title.trim();
    if (!title || !initialCustomers.some((customer) => customer.id === input.customerId)) return;
    setRequests((current) => {
      const number =
        Math.max(1042, ...current.map((request) => Number(request.id.replace('REQ-', '')) || 0)) +
        1;
      const now = new Date().toISOString();
      return [
        {
          id: `REQ-${number}`,
          title,
          customerId: input.customerId,
          status: 'open',
          priority: input.priority ?? 'normal',
          labels: input.labels ?? [],
          description: input.description?.trim() ?? '',
          createdAt: now,
          updatedAt: now,
        },
        ...current,
      ];
    });
  }
  function updateRequest(id: string, patch: RequestPatch) {
    setRequests((current) =>
      current.map((request) =>
        request.id === id ? { ...request, ...patch, updatedAt: new Date().toISOString() } : request,
      ),
    );
  }

  return (
    <div className="relay-app">
      <a className="relay-skip-link" href="#relay-main">
        Skip to content
      </a>
      <aside className="relay-sidebar">
        <SideNav
          brandName="Relay"
          brandIcon={<RelayMark />}
          activeId={page}
          onNavigate={navigate}
          showSearch={false}
          showWorkspace
          workspaceContent={
            <div className="relay-workspace">
              <Avatar name="Relay workspace" initials="R" size="sm" />
              <div>
                <strong>Relay workspace</strong>
                <span>Customer support</span>
              </div>
            </div>
          }
          sections={[
            {
              label: 'Workspace',
              items: [
                {
                  id: 'requests',
                  label: 'Requests',
                  icon: <NavigationIcon kind="requests" />,
                  count: openRequests,
                },
                { id: 'customers', label: 'Customers', icon: <NavigationIcon kind="customers" /> },
              ],
            },
          ]}
          footer={(collapsed) => (
            <div className="relay-profile">
              <Avatar name="Alex Morgan" initials="AM" size="sm" status="online" />
              {!collapsed && (
                <div>
                  <strong>Alex Morgan</strong>
                  <span>Support team</span>
                </div>
              )}
            </div>
          )}
        />
      </aside>
      <div className="relay-workspace-main">
        <header className="relay-topbar">
          <div className="relay-topbar-context">
            <span className="relay-mobile-brand">
              <RelayMark />
              <strong>Relay</strong>
            </span>
            <span className="relay-context-label">
              Workspace <span aria-hidden="true">/</span>{' '}
              <strong>{page === 'requests' ? 'Requests' : 'Customers'}</strong>
            </span>
          </div>
          <div className="relay-topbar-actions">
            <Tag size="sm">Local demo</Tag>
            <Button
              emphasis="ghost"
              size="sm"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </Button>
            <Avatar name="Alex Morgan" initials="AM" size="sm" />
          </div>
        </header>
        <nav className="relay-mobile-nav" aria-label="Mobile navigation">
          <Button
            emphasis={page === 'requests' ? 'secondary' : 'ghost'}
            aria-current={page === 'requests' ? 'page' : undefined}
            onClick={() => navigate('requests')}
          >
            Requests
          </Button>
          <Button
            emphasis={page === 'customers' ? 'secondary' : 'ghost'}
            aria-current={page === 'customers' ? 'page' : undefined}
            onClick={() => navigate('customers')}
          >
            Customers
          </Button>
        </nav>
        <main id="relay-main" className="relay-main" ref={main} tabIndex={-1}>
          <div hidden={page !== 'requests'}>
            <RequestsPage
              requests={requests}
              customers={initialCustomers}
              onCreateRequest={createRequest}
              onUpdateRequest={updateRequest}
            />
          </div>
          <div hidden={page !== 'customers'}>
            <CustomersPage customers={initialCustomers} requests={requests} />
          </div>
          <footer className="relay-page-footer">
            <span>Relay · A little more human.</span>
            <span>
              {storageAvailable
                ? 'Demo changes saved in this browser'
                : 'Demo changes available for this session'}{' '}
              · Atlas
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
