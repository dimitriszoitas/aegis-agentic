import { createElement } from 'react';
import { addons, types } from 'storybook/manager-api';
import { canonicalSidebarEntry } from './sidebar';
import { SidebarControls } from './sidebar-controls';
import { managerTheme } from './manager-theme';
import './manager.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';

const preferredMode = window.matchMedia('(prefers-color-scheme: dark)');

addons.setConfig({
  theme: managerTheme(preferredMode.matches),
  layout: { navSize: 280, showPanel: false, showToolbar: false },
  layoutCustomisations: { showToolbar: () => false, showPanel: () => false },
  sidebar: {
    showRoots: true,
    filters: { 'aegis-canonical-navigation': canonicalSidebarEntry },
  },
});

// Keep the shell aligned with the same light/dark control as docs and examples.
addons.register('aegis/manager-theme', () => {
  addons.add('aegis/sidebar-controls', {
    type: types.PREVIEW,
    render: ({ children }) => createElement(SidebarControls, null, children),
  });
});
