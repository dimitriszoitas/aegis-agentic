import { renderToStaticMarkup as render } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { ResourceState } from './resource-state';
describe('ResourceState explicit lifecycle', () => {
  it('distinguishes initial loading, empty collection and failed request', () => {
    const loading = render(<ResourceState label="Records" status="initial-loading" />);
    const empty = render(<ResourceState label="Records" status="empty" />);
    const error = render(<ResourceState label="Records" status="error" onRetry={() => {}} />);
    expect(loading).toContain('aria-busy="true"');
    expect(empty).toContain('data-preset="no-data"');
    expect(error).toContain('data-preset="error"');
    expect(error).toContain('Try again');
    expect(loading).not.toContain('data-resource-slot="content"');
  });
  it('retains host content for ready, refreshing and stale states without blanket disabling', () => {
    for (const status of ['ready', 'refreshing', 'stale'] as const) {
      const html = render(
        <ResourceState label="Records" status={status}>
          <input defaultValue="draft" />
        </ResourceState>,
      );
      expect(html).toContain('value="draft"');
      expect(html).not.toContain('disabled=""');
      expect(html).toContain('data-resource-slot="content"');
    }
  });
  it('only exposes retry when the host supplies it, and disables duplicate retry while pending', () => {
    expect(render(<ResourceState label="Records" status="error" />)).not.toContain('<button');
    expect(
      render(<ResourceState label="Records" status="error" onRetry={() => {}} retrying />),
    ).toContain('disabled=""');
  });
});
