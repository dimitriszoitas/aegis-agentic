import type { API_FilterFunction } from 'storybook/internal/types';

/** Keep all routes indexed while presenting one canonical entry per family. */
export const canonicalSidebarEntry: API_FilterFunction = (entry) => {
  if (entry.tags?.includes('aegis-component-hub')) return true;
  if (entry.tags?.includes('aegis-component-section')) return false;
  if (
    ['Welcome', 'Principles', 'Directory', 'AI Guidelines', 'Agentic Skills'].includes(entry.title)
  ) {
    return entry.type === 'docs';
  }
  if (entry.title.startsWith('Agentic Skills/')) return false;
  if (entry.title.startsWith('Components/') || entry.title.startsWith('Patterns/')) return false;
  if (entry.title.startsWith('Foundations/')) {
    // Icons uses the generated hub. Other foundations retain their native docs page.
    return entry.type === 'docs' && entry.id !== 'foundations-icons--docs';
  }
  return entry.id === 'console-application-demo--demo';
};
