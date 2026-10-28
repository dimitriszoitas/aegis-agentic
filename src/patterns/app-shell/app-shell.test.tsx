import { renderToStaticMarkup as render } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { AppShell } from './app-shell';
describe('AppShell landmarks', () => {
  it('has one main, named navigation, real skip link and unchanged host content', () => {
    const html = render(
      <AppShell
        brand="Local workspace"
        mainId="page-content"
        navigation={() => <a href="/records">Records</a>}
      >
        <input defaultValue="draft" />
      </AppShell>,
    );
    expect(html.match(/<main/g)).toHaveLength(1);
    expect(html).toContain('href="#page-content"');
    expect(html).toContain('aria-label="Main navigation"');
    expect(html).toContain('href="/records"');
    expect(html).toContain('value="draft"');
  });
  it('calls the navigation slot with explicit host adaptation methods', () => {
    let context: unknown;
    render(
      <AppShell
        brand="Workspace"
        navigation={(value) => {
          context = value;
          return null;
        }}
      >
        Content
      </AppShell>,
    );
    expect(context).toEqual({ compact: false, closeNavigation: expect.any(Function) });
  });
});
