import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { PresenceIndicator } from './presence-indicator';
describe('PresenceIndicator', () => {
  it('provides text in every presence state by default', () => {
    for (const status of ['online', 'away', 'busy', 'offline'] as const) {
      const html = renderToStaticMarkup(<PresenceIndicator status={status} />);
      expect(html).toContain(`data-status="${status}"`);
      expect(html).toContain('aegis-presence-label');
      expect(html).not.toContain('role="status"');
    }
  });
  it('names dot-only presence and supports deliberate decorative use', () => {
    const html = renderToStaticMarkup(
      <PresenceIndicator status="away" showLabel={false} label="Alex is away" />,
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Alex is away"');
    expect(html).not.toContain('aegis-presence-label');
    const decorative = renderToStaticMarkup(
      <PresenceIndicator status="away" showLabel={false} decorative />,
    );
    expect(decorative).not.toContain('role=');
    expect(decorative).toContain('aria-hidden="true"');
  });
});
