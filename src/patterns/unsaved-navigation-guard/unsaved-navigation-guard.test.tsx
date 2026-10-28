import { renderToStaticMarkup as render } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { UnsavedNavigationGuard } from './unsaved-navigation-guard';
describe('UnsavedNavigationGuard explicit adapter', () => {
  it('renders host content without automatically invoking routes or opening a dialog', () => {
    let request: unknown;
    const html = render(
      <UnsavedNavigationGuard dirty>
        {(controller) => {
          request = controller.requestNavigation;
          return <a href="/unguarded">Host-owned link</a>;
        }}
      </UnsavedNavigationGuard>,
    );
    expect(typeof request).toBe('function');
    expect(html).toContain('href="/unguarded"');
    expect(html).not.toContain('role="alertdialog"');
  });
});
