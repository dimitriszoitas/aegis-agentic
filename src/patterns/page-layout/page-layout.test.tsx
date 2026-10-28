import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PageLayout, ReadingColumn, ContentGrid, type PageLayoutProps } from './page-layout';
import { pageLayoutRecipes, validatePageLayoutRecipe } from './recipes';

describe('page recipe contract', () => {
  it('rejects incompatible slots, invalid choices, and unknown configuration keys', () => {
    expect(
      validatePageLayoutRecipe({
        archetype: 'collection',
        measure: 'wide',
        slots: ['header', 'main', 'aside'],
      }).map((issue) => issue.code),
    ).toEqual(['forbidden-option', 'forbidden-slot', 'invalid-value']);
    expect(
      validatePageLayoutRecipe({ archetype: 'dashboard', maxColumns: 5, gap: 23 }).map(
        (issue) => issue.code,
      ),
    ).toEqual(['unknown-property', 'invalid-value']);
    expect(
      validatePageLayoutRecipe({
        archetype: 'detail',
        slots: ['header', 'main', 'aside'],
        asideLabel: 'Record summary',
      }),
    ).toEqual([]);
    expect(
      validatePageLayoutRecipe({
        archetype: 'settings',
        slots: ['header', 'header'],
        measure: 'compact',
      }).map((issue) => issue.code),
    ).toEqual(['duplicate-slot', 'missing-slot']);
  });

  it('renders the collection in order with one shared heading and no reading clamp', () => {
    const markup = renderToStaticMarkup(
      <PageLayout
        archetype="collection"
        title="Requests"
        headingId="requests-title"
        filters={<input aria-label="Search" />}
        actions={<button>Add request</button>}
        footer="Page footer"
      >
        <table>
          <tbody>
            <tr>
              <td>Record</td>
            </tr>
          </tbody>
        </table>
      </PageLayout>,
    );
    expect(markup.match(/<h1\b/g)).toHaveLength(1);
    expect(markup).toContain('aria-labelledby="requests-title"');
    expect(markup).toContain('aegis-page-header');
    expect(markup.indexOf('data-page-slot="header"')).toBeLessThan(
      markup.indexOf('data-page-slot="filters"'),
    );
    expect(markup.indexOf('data-page-slot="filters"')).toBeLessThan(
      markup.indexOf('data-page-slot="main"'),
    );
    expect(markup.indexOf('data-page-slot="main"')).toBeLessThan(
      markup.indexOf('data-page-slot="footer"'),
    );
    expect(markup).not.toContain('aegis-reading-column');
    expect(markup).not.toContain('<main');
  });

  it('owns only layout wrappers and preserves child state boundaries and semantics', () => {
    const settings = renderToStaticMarkup(
      <PageLayout archetype="settings" title="Preferences">
        <form aria-label="Preferences form">
          <input defaultValue="Draft stays here" />
        </form>
      </PageLayout>,
    );
    expect(settings).toContain('data-measure="comfortable"');
    expect(settings).toContain('<form aria-label="Preferences form">');
    const detail = renderToStaticMarkup(
      <PageLayout
        archetype="detail"
        title="Request"
        aside={<p>Summary</p>}
        asideLabel="Record summary"
      >
        <article>Full main content</article>
      </PageLayout>,
    );
    expect(detail).toContain(
      '<aside class="aegis-page-layout-aside" data-page-slot="aside" aria-label="Record summary">',
    );
    expect(detail).not.toContain('aegis-reading-column');
    expect(
      renderToStaticMarkup(
        <ContentGrid maxColumns={2}>
          <article>One</article>
          <article>Two</article>
        </ContentGrid>,
      ).match(/class="aegis-content-grid-item"/g),
    ).toHaveLength(2);
  });

  it('fails clearly for JavaScript callers using invalid structural options', () => {
    const invalid = {
      archetype: 'collection',
      title: 'Invalid',
      children: 'Content',
      measure: 'wide',
    } as unknown as PageLayoutProps;
    expect(() => renderToStaticMarkup(<PageLayout {...invalid} />)).toThrow(
      'measure is not available for collection',
    );
    expect(() => renderToStaticMarkup(<ReadingColumn measure={'narrow' as 'wide'} />)).toThrow(
      'Unsupported reading measure',
    );
    expect(() => renderToStaticMarkup(<ContentGrid maxColumns={5 as 4} />)).toThrow(
      'maxColumns must be 1, 2, 3, or 4',
    );
    expect(pageLayoutRecipes.limits).toContain(
      'Reading measures are documented starting points, not universal readability guarantees.',
    );
  });
});

// These compile-time checks protect the discriminated public API against accidental widening.
function pageLayoutTypeContract() {
  const collection: PageLayoutProps = {
    archetype: 'collection',
    title: 'Data',
    children: null,
    // @ts-expect-error Collection data cannot receive a prose measure.
    measure: 'wide',
  };
  // @ts-expect-error A detail aside requires a label.
  const detail: PageLayoutProps = {
    archetype: 'detail',
    title: 'Detail',
    children: null,
    aside: 'Summary',
  };
  // @ts-expect-error Settings has one main region and no aside.
  const settings: PageLayoutProps = {
    archetype: 'settings',
    title: 'Settings',
    children: null,
    aside: 'Summary',
    asideLabel: 'Summary',
  };
  const dashboard: PageLayoutProps = {
    archetype: 'dashboard',
    title: 'Dashboard',
    children: null,
    // @ts-expect-error Dashboard maximum columns are a finite choice.
    maxColumns: 5,
  };
  return [collection, detail, settings, dashboard];
}
void pageLayoutTypeContract;
