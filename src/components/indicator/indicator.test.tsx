import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { Indicator } from './indicator';
describe('Indicator', () => {
  it('caps display while preserving full accessible meaning and child name', () => {
    const html = renderToStaticMarkup(
      <Indicator count={120} label="120 unread">
        <button>Inbox</button>
      </Indicator>,
    );
    expect(html).toContain('99+');
    expect(html).toContain('aria-label="120 unread"');
    expect(html).toContain('<button>Inbox</button>');
    expect(html).not.toContain('aria-live');
  });
  it('hides zero and invalid numbers without removing its child', () => {
    for (const count of [0, -8, NaN, Infinity, -Infinity]) {
      const html = renderToStaticMarkup(
        <Indicator count={count} label="Unread">
          <button>Inbox</button>
        </Indicator>,
      );
      expect(html).not.toContain('aegis-indicator-marker');
      expect(html).toContain('Inbox');
    }
  });
  it('hides all non-finite counts even when zero is visible', () => {
    for (const count of [NaN, Infinity, -Infinity])
      expect(
        renderToStaticMarkup(
          <Indicator count={count} showZero label="Unread">
            Inbox
          </Indicator>,
        ),
      ).not.toContain('aegis-indicator-marker');
  });
  it('supports explicit zero, hidden and decorative states', () => {
    expect(
      renderToStaticMarkup(
        <Indicator count={0} showZero label="No unread">
          Inbox
        </Indicator>,
      ),
    ).toContain('aegis-indicator-marker');
    expect(
      renderToStaticMarkup(
        <Indicator hidden label="New">
          Inbox
        </Indicator>,
      ),
    ).not.toContain('aegis-indicator-marker');
    const html = renderToStaticMarkup(
      <Indicator decorative label="New">
        Inbox
      </Indicator>,
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('aria-label');
  });
});
