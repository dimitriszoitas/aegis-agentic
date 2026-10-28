import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InlineEdit } from './inline-edit';
describe('InlineEdit initial form boundary', () => {
  it('renders committed text safely with a named non-submitting action', () => {
    const html = renderToStaticMarkup(
      <InlineEdit label="Title" value="<script>example</script>" onSave={() => {}} />,
    );
    expect(html).toContain('&lt;script&gt;example&lt;/script&gt;');
    expect(html).toContain('aria-label="Edit Title"');
    expect(html).toContain('type="button"');
    expect(html).not.toContain('<input');
  });
  it('distinguishes disabled from read-only display and supports an empty value', () => {
    const disabled = renderToStaticMarkup(
      <InlineEdit label="Title" value="" onSave={() => {}} disabled emptyText="No title" />,
    );
    expect(disabled).toContain('disabled=""');
    expect(disabled).toContain('No title');
    const readOnly = renderToStaticMarkup(
      <InlineEdit label="Title" value="Atlas" onSave={() => {}} readOnly />,
    );
    expect(readOnly).not.toContain('<button');
  });
});
