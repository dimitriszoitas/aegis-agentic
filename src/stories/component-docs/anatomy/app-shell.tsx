import { AppShell } from '@/patterns/app-shell';
import { Button } from '@/components/button';
import type { AnatomyDefinition } from './types';
export const appShellAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="app-shell">
      <AppShell
        brand="Workspace"
        header="Account"
        footer="Local anatomy specimen"
        navigation={({ closeNavigation }) => (
          <Button emphasis="ghost" onClick={closeNavigation}>
            Overview
          </Button>
        )}
      >
        <h1>Overview</h1>
        <p>Host page content belongs here.</p>
      </AppShell>
    </div>
  ),
  note: 'The shell owns landmarks and responsive navigation placement. At narrow widths the shared SideSheet opens through the navigation button.',
  parts: [
    {
      name: 'Skip link',
      description: 'Moves keyboard focus directly to main.',
      selector: '[data-anatomy="app-shell"] .aegis-app-shell-skip',
    },
    {
      name: 'Header',
      description: 'Brand, optional host header and mobile navigation trigger.',
      selector: '[data-anatomy="app-shell"] [data-app-shell-slot="header"]',
    },
    {
      name: 'Main',
      description: 'Single persistent main landmark and focus target.',
      selector: '[data-anatomy="app-shell"] [data-app-shell-slot="main"]',
    },
    {
      name: 'Footer',
      description: 'Optional host footer.',
      selector: '[data-anatomy="app-shell"] [data-app-shell-slot="footer"]',
    },
  ],
};
