import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CollectionToolbar } from './collection-toolbar';

describe('CollectionToolbar ownership boundary', () => {
  it('rejects invalid counts rather than announcing misleading results', () => {
    for (const resultCount of [-1, 0.5, NaN, Infinity]) {
      expect(() =>
        renderToStaticMarkup(
          <CollectionToolbar
            label="Records"
            searchLabel="Search records"
            query=""
            onQueryChange={() => {}}
            resultCount={resultCount}
          />,
        ),
      ).toThrow(/nonnegative safe integer/);
    }
  });
  it('keeps busy informational and passes explicit state to both slots', () => {
    const states: unknown[] = [];
    const markup = renderToStaticMarkup(
      <CollectionToolbar
        label="Records"
        searchLabel="Search records"
        query="kept draft"
        onQueryChange={() => {}}
        resultCount={0}
        busy
        filters={(state) => {
          states.push(state);
          return <button disabled={state.disabled}>Filter</button>;
        }}
        actions={(state) => {
          states.push(state);
          return <button disabled={state.disabled}>Refresh</button>;
        }}
      />,
    );
    expect(states).toEqual([
      { busy: true, disabled: false },
      { busy: true, disabled: false },
    ]);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('value="kept draft"');
    expect(markup).not.toContain('disabled=""');
    expect(markup).not.toContain('<form');
    expect(markup).not.toContain('role="toolbar"');
  });
  it('disables its own search, retains the query, and allows a localized count', () => {
    const markup = renderToStaticMarkup(
      <CollectionToolbar
        label="Records"
        searchLabel="Search records"
        query="draft"
        onQueryChange={() => {}}
        resultCount={1}
        resultText="One matching request"
        disabled
      />,
    );
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('value="draft"');
    expect(markup).toContain('One matching request');
    expect(markup).not.toContain('Clear search');
  });
});
