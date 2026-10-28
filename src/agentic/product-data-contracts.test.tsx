import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DescriptionList } from '../components/description-list';
import { EmptyState } from '../components/empty-state';
import { MetricCard } from '../components/metric-card';
import { Pagination } from '../components/pagination';
import { Sparkline } from '../components/sparkline';
import { PageHeader } from '../patterns/page-header';

// These checks inspect rendered semantics only. Browser focus, events, geometry,
// contrast and live announcements remain separate acceptance work.
describe('product data contracts: bounded rendered semantics', () => {
  it('keeps zero meaningful while applying missing-field fallback narrowly', () => {
    const markup = renderToStaticMarkup(
      <DescriptionList
        emptyValue="Unavailable"
        items={[
          { id: 'zero', label: 'Count', value: 0 },
          { id: 'null', label: 'Owner', value: null },
          { id: 'undefined', label: 'Region', value: undefined },
          { id: 'empty', label: 'Note', value: '' },
          { id: 'boolean', label: 'Raw boolean', value: false },
        ]}
      />,
    );
    expect(markup).toMatch(/^<dl\b/);
    expect(markup).toContain('<dt>Count</dt><dd>0</dd>');
    expect(markup.match(/<dd>Unavailable<\/dd>/g)).toHaveLength(3);
    expect(markup).toContain('<dt>Raw boolean</dt><dd></dd>');
  });

  it('bounds a displayed page without claiming to correct the host state', () => {
    const requests: number[] = [];
    const markup = renderToStaticMarkup(
      <Pagination
        page={900}
        pageSize={10}
        total={21}
        onPageChange={(page) => requests.push(page)}
      />,
    );
    expect(markup).toContain('21–21 of 21 results');
    expect(markup).toMatch(/aria-label="Page 3" aria-current="page"/);
    expect(markup).toMatch(/aria-label="Next page" disabled=""/);
    expect(requests).toEqual([]);
  });

  it('renders zero-total pagination with every page navigation action disabled', () => {
    const markup = renderToStaticMarkup(
      <Pagination page={-1} pageSize={0} total={Number.NaN} onPageChange={() => undefined} />,
    );
    expect(markup).toContain('0 results');
    const buttons = markup.match(/<button\b[^>]*>/g) ?? [];
    expect(buttons).toHaveLength(3);
    expect(buttons.every((button) => button.includes('disabled=""'))).toBe(true);
    expect(buttons.every((button) => button.includes('type="button"'))).toBe(true);
  });

  it('distinguishes favorable decreases from direction and keeps zero neutral', () => {
    const decrease = renderToStaticMarkup(
      <MetricCard label="Resolution time" value={10} delta={-12} trendIsPositive />,
    );
    expect(decrease).toContain('data-trend="success"');
    expect(decrease).toContain('-12%');
    expect(decrease).toContain(', favorable change');
    const zero = renderToStaticMarkup(
      <MetricCard label="Open requests" value={0} delta={0} trendIsPositive />,
    );
    expect(zero).toContain('data-trend="neutral"');
    expect(zero).toContain(', unchanged');
    const invalid = renderToStaticMarkup(
      <MetricCard label="Open requests" value={1} delta={Number.NaN} />,
    );
    expect(invalid).not.toContain('aegis-metric-comparison');
  });

  it('replaces metric content with a named loading state instead of stale values', () => {
    const markup = renderToStaticMarkup(
      <MetricCard label="Throughput" value="STALE_VALUE" delta={2} sparkline={[1, 2]} loading />,
    );
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('role="status" aria-label="Loading throughput"');
    expect(markup).not.toContain('STALE_VALUE');
    expect(markup).not.toContain('aegis-metric-comparison');
    expect(markup).not.toContain('aegis-sparkline');
  });

  it('makes Sparkline normalization and replacement-state boundaries observable', () => {
    const populated = renderToStaticMarkup(<Sparkline data={[-4, Number.NaN, 8]} />);
    expect(populated).toContain('latest 8 events, peak 8');
    expect(populated).not.toContain('NaN');
    expect(populated).not.toContain('tabindex=');
    const empty = renderToStaticMarkup(<Sparkline data={[]} label="No hourly samples" />);
    expect(empty).toContain('role="img" aria-label="No hourly samples"');
    expect(empty).not.toContain('<svg');
    const loading = renderToStaticMarkup(<Sparkline data={[]} loading label="hourly samples" />);
    expect(loading).toContain('role="status" aria-label="Loading hourly samples"');
    expect(loading).not.toContain('aegis-sparkline-empty');
  });

  it('gives a back destination precedence without changing the requested heading identity', () => {
    const markup = renderToStaticMarkup(
      <PageHeader
        title="Request details"
        headingLevel={2}
        headingId="request-heading"
        back={{ label: 'All requests', href: '/requests' }}
        breadcrumbs={[{ label: 'Hidden breadcrumb', href: '/workspace' }]}
      />,
    );
    expect(markup).toMatch(/<h2 id="request-heading"[^>]*>Request details<\/h2>/);
    expect(markup).toContain('href="/requests"');
    expect(markup).not.toContain('Hidden breadcrumb');
    expect(markup).not.toContain('aegis-page-header-actions');
  });

  it('keeps empty, absent and failed results distinct without inventing an alert', () => {
    const empty = renderToStaticMarkup(<EmptyState preset="no-results" />);
    const absent = renderToStaticMarkup(<EmptyState preset="no-data" />);
    const error = renderToStaticMarkup(<EmptyState preset="error" />);
    expect(empty).toContain('No records match your filters');
    expect(absent).toContain('Your data will appear here');
    expect(error).toContain('We couldn’t load these records');
    const titleId = error.match(/aria-labelledby="([^"]+)"/)?.[1];
    const descriptionId = error.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(titleId).toBeTruthy();
    expect(descriptionId).toBeTruthy();
    expect(error).toContain(`<h3 id="${titleId}">`);
    expect(error).toContain(`<p id="${descriptionId}">`);
    expect(error).not.toContain('role="alert"');
    expect(error).not.toContain('aria-live=');
  });
});
